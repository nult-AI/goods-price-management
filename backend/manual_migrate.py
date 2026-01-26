import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def migrate():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding source_url column to prices table...")
        try:
            await conn.execute(text("ALTER TABLE prices ADD COLUMN source_url VARCHAR(500)"))
            print("Successfully added source_url column.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column source_url already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
