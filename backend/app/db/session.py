from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

# asyncpg doesn't support 'sslmode' but 'ssl'. 
# We handle it by passing it into connect_args if the URL implies SSL.
connect_args = {}
db_url = settings.DATABASE_URL

if "sslmode=" in db_url:
    # Strip sslmode from URL to prevent asyncpg error
    import re
    db_url = re.sub(r'([?&])sslmode=[^&]*', r'\1', db_url).replace('?&', '?').rstrip('?').rstrip('&')
    # Using ssl=True is standard for asyncpg to require SSL
    connect_args["ssl"] = True

# Use NullPool when connecting to Supabase Pooler (often on port 54322 or with 'supabase' in host)
# Standard Postgres should use the default QueuePool for performance.
is_supabase = "supabase" in db_url or "54322" in db_url or "6543" in db_url

engine = create_async_engine(
    db_url, 
    echo=False,
    connect_args=connect_args,
    poolclass=NullPool if is_supabase else None
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
