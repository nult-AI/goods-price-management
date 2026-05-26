from fastapi import FastAPI, Depends, HTTPException, status
print("Loading main.py...")
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.base import User, Category, Commodity, Price, UserRole, Region, AutoCrawlerConfig
from app.schemas.commodity import (
    User as UserSchema, 
    UserCreate, 
    UserLogin,
    Category as CategorySchema, 
    CategoryCreate,
    Commodity as CommoditySchema,
    CommodityCreate,
    CommodityWithLatest,
    PriceCreate,
    Token,
    CrawlerConfig as CrawlerConfigSchema,
    CrawlerConfigUpdate
)
from app.core.security import verify_password, create_access_token, get_password_hash
from app.tasks.worker import start_price_crawl_task
from app.api.deps import get_current_active_user, check_role
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from app.core.redis import redis_client
from contextlib import asynccontextmanager
from app.db.session import engine
from app.models.base import Base
from app.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed data
    print("Initializing database...")
    await init_db()
    
    # Start Redis listener
    task = asyncio.create_task(redis_listener())
    
    yield
    
    # Stop Redis listener
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"New WebSocket connection. Total: {len(self.active_connections)}")
        # Send a welcome message to verify connection
        await websocket.send_text(json.dumps({
            "type": "system",
            "message": "Connected to real-time price stream",
            "server_time": datetime.utcnow().isoformat()
        }))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        print(f"Broadcasting to {len(self.active_connections)} connections: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send to a websocket: {e}")

manager = ConnectionManager()

async def redis_listener():
    print("Starting Redis listener...")
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("price_updates")
    print("Subscribed to 'price_updates' channel")
    try:
        async for message in pubsub.listen():
            print(f"Redis message received: {message}")
            if message["type"] == "message":
                print(f"Broadcasting data: {message['data']}")
                await manager.broadcast(message["data"])
    except Exception as e:
        print(f"Redis listener error: {e}")
    finally:
        print("Redis listener shutting down...")
        await pubsub.unsubscribe("price_updates")

app = FastAPI(title="Commodity Price Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    # Simple check for 'admin' or email-like username
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Username hoặc mật khẩu không đúng")
    
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/api/auth/change-password")
async def change_password(
    new_password: str, 
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.hashed_password = get_password_hash(new_password)
    current_user.must_change_password = False
    await db.commit()
    return {"message": "Đổi mật khẩu thành công"}

# --- ADMIN: USER MANAGEMENT ---

@app.post("/api/admin/users", response_model=UserSchema)
async def create_user(
    data: UserCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    # Default password is 123456 as requested, but hashed
    hashed_password = get_password_hash(data.password or "123456")
    new_user = User(
        id=uuid.uuid4(),
        username=data.username,
        full_name=data.full_name or data.username.split('@')[0],
        hashed_password=hashed_password,
        role=data.role or UserRole.DATA_ENTRY,
        must_change_password=True
    )
    db.add(new_user)
    try:
        await db.commit()
        # Use selectinload to avoid lazy loading issues with the response schema
        from sqlalchemy.orm import selectinload
        stmt = select(User).options(selectinload(User.permitted_categories)).where(User.id == new_user.id)
        result = await db.execute(stmt)
        new_user = result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Tài khoản này đã tồn tại hoặc có lỗi: {str(e)}")
    return new_user

@app.get("/api/admin/users", response_model=List[UserSchema])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(User).options(selectinload(User.permitted_categories)))
    return result.scalars().all()

@app.post("/api/admin/categories", response_model=CategorySchema)
async def create_category(
    data: CategoryCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    slug = data.slug
    if not slug:
        slug = data.name.lower().replace(" ", "-")
        
    new_cat = Category(
        id=uuid.uuid4(),
        name=data.name,
        slug=slug
    )
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat

@app.post("/api/admin/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: uuid.UUID,
    category_ids: List[uuid.UUID],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    from sqlalchemy.orm import selectinload
    
    # Eagerly load the user with their current permissions
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.permitted_categories))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Fetch the new categories
    cat_result = await db.execute(select(Category).where(Category.id.in_(category_ids)))
    categories = cat_result.scalars().all()
    
    # Update the relationship
    user.permitted_categories = list(categories)
    await db.commit()
    
    # Refresh to get updated data
    await db.refresh(user, attribute_names=['permitted_categories'])
    
    return {"message": "Đã phân quyền thành công"}

@app.post("/api/admin/commodities", response_model=CommoditySchema)
async def create_commodity(
    data: CommodityCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    new_item = Commodity(
        id=uuid.uuid4(),
        name=data.name,
        slug=data.slug,
        unit=data.unit,
        description=data.description,
        category_id=data.category_id,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_item)
    await db.commit()
    
    # Reload with category for the response schema
    from sqlalchemy.orm import selectinload
    stmt = select(Commodity).options(selectinload(Commodity.category)).where(Commodity.id == new_item.id)
    result = await db.execute(stmt)
    commodity = result.scalar_one()

    # Notify via Redis
    try:
        from app.core.redis import redis_client
        pub_payload = {
            "commodity_id": str(commodity.id),
            "name": commodity.name,
            "slug": commodity.slug,
            "unit": commodity.unit,
            "price": 0, # Initial price
            "timestamp": commodity.created_at.isoformat(),
            "category": {
                "id": str(commodity.category.id),
                "name": commodity.category.name,
                "slug": commodity.category.slug
            } if commodity.category else None,
            "region": None # Default manual creation
        }
        await redis_client.publish("price_updates", json.dumps(pub_payload))
    except Exception as e:
        print(f"Failed to publish new commodity: {e}")

    return commodity

@app.patch("/api/admin/commodities/bulk-category")
async def bulk_update_commodities_category(
    commodity_ids: List[uuid.UUID],
    category_id: Optional[uuid.UUID],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    from sqlalchemy import update
    query = update(Commodity).where(Commodity.id.in_(commodity_ids)).values(category_id=category_id)
    await db.execute(query)
    await db.commit()
    return {"message": f"Đã cập nhật nhóm cho {len(commodity_ids)} hàng hóa thành công"}

@app.patch("/api/admin/commodities/{commodity_id}/category")
async def update_commodity_category(
    commodity_id: uuid.UUID,
    category_id: Optional[uuid.UUID],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    result = await db.execute(select(Commodity).where(Commodity.id == commodity_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Commodity not found")
    
    item.category_id = category_id
    await db.commit()
    return {"message": "Đã cập nhật nhóm hàng hóa thành công"}

@app.get("/api/admin/crawler-config", response_model=CrawlerConfigSchema)
async def get_crawler_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    config = await db.scalar(select(AutoCrawlerConfig).limit(1))
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return config

@app.patch("/api/admin/crawler-config", response_model=CrawlerConfigSchema)
async def update_crawler_config(
    data: CrawlerConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    config = await db.scalar(select(AutoCrawlerConfig).limit(1))
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    if data.search_keywords is not None:
        config.search_keywords = data.search_keywords
    if data.seed_urls is not None:
        config.seed_urls = data.seed_urls
    if data.scraping_interval_minutes is not None:
        config.scraping_interval_minutes = data.scraping_interval_minutes
    if data.is_active is not None:
        config.is_active = data.is_active
        
    await db.commit()
    await db.refresh(config)
    return config

@app.post("/api/admin/crawler/run")
async def trigger_crawler(
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    start_price_crawl_task.delay()
    return {"message": "Crawler đã được kích hoạt chạy ngầm"}

# --- PUBLIC: COMMODITIES & CATEGORIES ---

@app.get("/api/public/categories", response_model=List[CategorySchema])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    return result.scalars().all()

@app.get("/api/public/commodities", response_model=List[CommodityWithLatest])
async def list_commodities(
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    before: Optional[datetime] = None,
    size: int = 15,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    query = select(Commodity).options(
        selectinload(Commodity.category),
        selectinload(Commodity.prices).selectinload(Price.region)
    ).order_by(Commodity.created_at.desc()) # Order by latest first
    
    if category_slug:
        query = query.join(Category).where(Category.slug == category_slug)
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.where(func.lower(Commodity.name).like(search_pattern))
    
    if before:
        query = query.where(Commodity.created_at < before)
    
    query = query.limit(size)
    
    result = await db.execute(query)
    commodities = result.scalars().unique().all()
    
    return commodities

@app.get("/api/data-entry/my-commodities", response_model=List[CommodityWithLatest])
async def get_my_commodities(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import selectinload
    
    # Get user's permitted category IDs
    permitted_cat_ids = [cat.id for cat in user.permitted_categories]
    
    # If user has no permissions, return empty list
    if not permitted_cat_ids:
        return []
    
    # Query commodities in permitted categories
    query = select(Commodity).options(
        selectinload(Commodity.category),
        selectinload(Commodity.prices).selectinload(Price.region)
    ).where(Commodity.category_id.in_(permitted_cat_ids))
    
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.where(func.lower(Commodity.name).like(search_pattern))
    
    result = await db.execute(query)
    return result.scalars().all()

# --- DATA ENTRY: PRICE UPDATES ---

@app.post("/api/data-entry/prices")
async def update_price(
    data: PriceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    # Check if commodity exists
    commodity_result = await db.execute(select(Commodity).where(Commodity.id == data.commodity_id))
    commodity = commodity_result.scalar_one_or_none()
    
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")
    
    # Check permissions - user must have access to this commodity's category
    if user.role == UserRole.DATA_ENTRY:
        permitted_cat_ids = [cat.id for cat in user.permitted_categories]
        if commodity.category_id not in permitted_cat_ids:
            raise HTTPException(status_code=403, detail="You don't have permission to update this commodity")
    
    # Get or create default region
    region_result = await db.execute(select(Region).where(Region.code == "VN"))
    region = region_result.scalar_one_or_none()

    # Get today's start and end for UTC
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    
    # Check if a price record already exists for this commodity and region today
    from sqlalchemy import and_
    existing_price_result = await db.execute(
        select(Price).where(
            and_(
                Price.commodity_id == data.commodity_id,
                Price.region_id == (region.id if region else None),
                Price.timestamp >= today_start
            )
        )
    )
    existing_price = existing_price_result.scalar_one_or_none()
    
    if existing_price:
        # Update existing record for today
        existing_price.price = data.price
        existing_price.timestamp = now
        await db.commit()
        
        # Cache in Redis and Publish
        price_data = {
            "commodity_id": str(data.commodity_id),
            "price": float(data.price),
            "timestamp": now.isoformat()
        }
        payload = json.dumps(price_data)
        
        print(f"Syncing to Redis: {payload}")
        try:
            await redis_client.set(f"price:latest:{data.commodity_id}", payload)
            await redis_client.publish("price_updates", payload)
        except Exception as re:
            print(f"Redis error: {re}")
        
        return {"message": "Đã cập nhật giá hôm nay thành công"}
    else:
        # Create new record for today
        new_price = Price(
            id=uuid.uuid4(),
            commodity_id=data.commodity_id,
            region_id=region.id if region else None,
            price=data.price,
            timestamp=now
        )
        db.add(new_price)
        await db.commit()

        # Cache in Redis and Publish
        price_data = {
            "commodity_id": str(data.commodity_id),
            "price": float(data.price),
            "timestamp": now.isoformat()
        }
        payload = json.dumps(price_data)
        
        print(f"Syncing to Redis (new): {payload}")
        try:
            await redis_client.set(f"price:latest:{data.commodity_id}", payload)
            await redis_client.publish("price_updates", payload)
        except Exception as re:
            print(f"Redis error: {re}")

        return {"message": "Cập nhật giá thành công"}

# Health check
@app.get("/health")
async def health():
    return {"status": "ok. chao mung den voi GPM API!"}

@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
