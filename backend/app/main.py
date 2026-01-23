from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.base import User, Category, Commodity, Price, UserRole, Region
from app.schemas.commodity import (
    User as UserSchema, 
    UserCreate, 
    UserLogin,
    Category as CategorySchema, 
    CategoryCreate,
    Commodity as CommoditySchema,
    CommodityCreate,
    CommodityWithLatest,
    PricePublic,
    Token
)
from app.core.security import verify_password, create_access_token, get_password_hash
from app.api.deps import get_current_active_user, check_role
from contextlib import asynccontextmanager
from app.db.session import engine
from app.models.base import Base
from app.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed data
    print("Initializing database...")
    await init_db()
    yield

app = FastAPI(title="Commodity Price Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
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
    # Default password is 123456 as requested
    hashed_password = get_password_hash("123456")
    new_user = User(
        id=uuid.uuid4(),
        username=data.username,
        full_name=data.username.split('@')[0], # Default name from email
        hashed_password=hashed_password,
        role=UserRole.DATA_ENTRY,
        must_change_password=True
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except:
        await db.rollback()
        raise HTTPException(status_code=400, detail="User đã tồn tại")
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
    new_cat = Category(
        id=uuid.uuid4(),
        name=data.name,
        slug=data.slug or data.get_slug_from_name() # Assuming we have or handle it
    )
    # Simpler slug logic if not in model
    if not new_cat.slug:
        new_cat.slug = data.name.lower().replace(" ", "-")

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
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update permissions
    cat_result = await db.execute(select(Category).where(Category.id.in_(category_ids)))
    categories = cat_result.scalars().all()
    user.permitted_categories = list(categories)
    await db.commit()
    return {"message": "Dự án đã được phân quyền thành công"}

@app.post("/api/admin/commodities", response_model=CommoditySchema)
async def create_commodity(
    data: CommodityCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(UserRole.ADMIN))
):
    new_item = Commodity(
        id=uuid.uuid4(),
        **data.model_dump(),
        created_at=datetime.utcnow()
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

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

# --- PUBLIC: COMMODITIES & CATEGORIES ---

@app.get("/api/public/categories", response_model=List[CategorySchema])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    return result.scalars().all()

@app.get("/api/public/commodities", response_model=List[CommodityWithLatest])
async def list_commodities(
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    query = select(Commodity).options(selectinload(Commodity.category))
    if category_slug:
        query = query.join(Category).where(Category.slug == category_slug)
    if search:
        query = query.where(Commodity.name.ilike(f"%{search}%"))
    
    result = await db.execute(query)
    commodities = result.scalars().all()
    
    # In a real app, we'd use a more efficient join or subquery for latest price
    # For now, we'll return them as is
    return commodities

# --- DATA ENTRY: PRICE UPDATES ---

@app.post("/api/data-entry/prices")
async def update_price(
    commodity_id: uuid.UUID,
    price: float,
    region_code: str = "VN",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(check_role(UserRole.DATA_ENTRY))
):
    # Check permissions (TODO: check user.permitted_categories)
    
    result = await db.execute(select(Region).where(Region.code == region_code))
    region = result.scalar_one_or_none()
    
    new_price = Price(
        id=uuid.uuid4(),
        commodity_id=commodity_id,
        region_id=region.id if region else None,
        price=price,
        timestamp=datetime.utcnow()
    )
    db.add(new_price)
    await db.commit()
    return {"message": "Cập nhật giá thành công"}

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}
