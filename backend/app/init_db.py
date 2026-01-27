import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.base import Base, User, UserRole, Region, AutoCrawlerConfig
from app.core.security import get_password_hash
from app.core.config import settings

async def init_db():
    # Handle SSL for Supabase/asyncpg
    connect_args = {}
    db_url = settings.DATABASE_URL
    if "sslmode=" in db_url:
        import re
        import ssl
        db_url = re.sub(r'([?&])sslmode=[^&]*', r'\1', db_url).replace('?&', '?').rstrip('?').rstrip('&')
        
        # Create an SSL context that skips verification
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx

    from sqlalchemy.pool import NullPool
    engine = create_async_engine(
        db_url, 
        echo=True, 
        connect_args=connect_args,
        poolclass=NullPool if settings.USE_SUPABASE_POOLER else None
    )
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with engine.begin() as conn:
        # Create schema 'goods_db' if it doesn't exist
        from sqlalchemy import text
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS goods_db"))
        
        # Recreate tables for fresh start if needed, or just create
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if admin exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                id=uuid.uuid4(),
                username="admin",
                hashed_password=get_password_hash("admin"),
                full_name="System Administrator",
                role=UserRole.ADMIN,
                must_change_password=True
            )
            session.add(admin)
            print("Admin user created with password 'admin'")
        
        # Add default region
        result = await session.execute(select(Region).where(Region.code == "VN"))
        vn_region = result.scalar_one_or_none()
        if not vn_region:
            vn_region = Region(
                id=uuid.uuid4(),
                name="Việt Nam",
                code="VN"
            )
            session.add(vn_region)
            print("Default region 'VN' created")

        # Add default crawler config
        result = await session.execute(select(AutoCrawlerConfig).limit(1))
        config = result.scalar_one_or_none()
        if not config:
            config = AutoCrawlerConfig(
                id=uuid.uuid4(),
                search_keywords=["giá lúa gạo hôm nay", "giá cà phê arabica robusta mới nhất", "giá sắt thép xây dựng hôm nay"],
                seed_urls=[], # Empty as requested to trigger LLM Search fallback
                scraping_interval_minutes=60,
                is_active=True
            )
            session.add(config)
            print("Default AutoCrawlerConfig created")

        await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db())
