import asyncio
import time
import httpx
import json
import trafilatura
import uuid
from datetime import datetime, timedelta, timezone
from celery import Celery
from sqlalchemy import select, and_, or_
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from pydantic import BaseModel, Field

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from ..core.config import settings
from ..db.session import AsyncSessionLocal
from ..models.base import Commodity, Category, Price, Region, SearchCache, AutoCrawlerConfig, StagingPrice
from ..core.redis import redis_client

# Initialize Celery
worker = Celery("tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

# --- Automatic Scheduler (Celery Beat) ---
worker.conf.beat_schedule = {
    "price-crawler-scheduler": {
        "task": "check_automatic_crawl",
        "schedule": 3600.0, 
    },
    "staging-processor-scheduler": {
        "task": "process_staging_to_main",
        "schedule": 300.0, # Every 5 minutes process staged items
    },
}
worker.conf.timezone = 'UTC'

# --- LLM Models ---

class ExtractedCommodity(BaseModel):
    name: str = Field(description="Tên hàng hóa (ví dụ: Cà chua, Lúa OM 5451, Cà phê Robusta)")
    price: float = Field(description="Giá trị số của sản phẩm")
    unit: str = Field(description="Đơn vị tính (ví dụ: kg, tấn, tạ, bao 50kg)")
    category: str = Field(description="Gợi ý nhóm hàng (ví dụ: Nông sản, Thủy sản, Vật liệu xây dựng)")

class ExtractionResult(BaseModel):
    items: List[ExtractedCommodity] = Field(description="Danh sách các mặt hàng và giá thu thập được")

class SemanticMatch(BaseModel):
    staging_id: str = Field(description="ID của hàng hóa chưa xử lý")
    is_match: bool = Field(description="True nếu hàng hóa khớp với một hàng hóa hiện có")
    matched_id: Optional[str] = Field(description="ID của hàng hóa khớp được tìm thấy", default=None)
    reason: str = Field(description="Lý do khớp hoặc không khớp")

class BatchSemanticMatch(BaseModel):
    matches: List[SemanticMatch] = Field(description="Danh sách kết quả khớp cho từng hàng hóa")

extraction_parser = PydanticOutputParser(pydantic_object=ExtractionResult)
match_parser = PydanticOutputParser(pydantic_object=BatchSemanticMatch)

llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL, 
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0
)

# --- Prompts ---

extraction_prompt = PromptTemplate(
    template="""Bạn là một chuyên gia phân tích thị trường. Hãy trích xuất TẤT CẢ các thông tin về giá của MỌI mặt hàng hàng hóa được đề cập trong văn bản dưới đây. 
    
    Yêu cầu quan trọng:
    1. Chỉ lấy thông tin giá hàng hóa tại thị trường Việt Nam.
    2. Trích xuất đầy đủ tất cả các mặt hàng, không bỏ sót bất kỳ loại hàng nào (Nông sản, thủy sản, vật liệu, xăng dầu, thực phẩm...).
    3. Đặc biệt chú ý đến tên hàng hóa và ĐƠN VỊ TÍNH (ví dụ: kg, tấn, bao 50kg, khối...). Tên hàng hóa kèm đơn vị tính là chìa khóa để phân biệt.
    4. Dữ liệu cần trích xuất: Tên chính xác, Giá (số), Đơn vị tính, Nhóm hàng.
    
    Nội dung văn bản:
    {content}
    
    {format_instructions}
    """,
    input_variables=["content"],
    partial_variables={"format_instructions": extraction_parser.get_format_instructions()}
)

semantic_match_prompt = PromptTemplate(
    template="""Kiểm tra danh sách hàng hóa mới sau đây có khớp với bất kỳ hàng hóa nào trong hệ thống hiện tại không.
    Hàng hóa được coi là khớp nếu chúng cùng tên (hoặc tương đương) và CÙNG ĐƠN VỊ TÍNH.
    
    Yêu cầu:
    1. Duyệt qua từng hàng hóa trong 'Danh sách mới'.
    2. So sánh với 'Danh sách hiện tại' (ID - Tên - Đơn vị).
    3. Nếu khớp, trả về is_match=True và matched_id tương ứng.
    
    Danh sách mới (ID_Tạm_thời - Tên - Đơn vị):
    {new_items_list}
    
    Danh sách hiện tại trong hệ thống:
    {existing_list}
    
    {format_instructions}
    """,
    input_variables=["new_items_list", "existing_list"],
    partial_variables={"format_instructions": match_parser.get_format_instructions()}
)

extraction_chain = extraction_prompt | llm | extraction_parser
match_chain = semantic_match_prompt | llm | match_parser

# --- Utils ---

_GLOBAL_LOOP = None

def get_or_create_loop():
    global _GLOBAL_LOOP
    if _GLOBAL_LOOP is None:
        import sys
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        _GLOBAL_LOOP = asyncio.new_event_loop()
        asyncio.set_event_loop(_GLOBAL_LOOP)
    return _GLOBAL_LOOP

def run_async_task(coro):
    loop = get_or_create_loop()
    try:
        return loop.run_until_complete(coro)
    except Exception as e:
        print(f"CELERY ASYNC ERROR: {e}")
        return str(e)

@worker.task(name="check_automatic_crawl")
def check_automatic_crawl():
    return run_async_task(evaluate_automatic_trigger())

async def evaluate_automatic_trigger():
    async with AsyncSessionLocal() as db:
        stmt = select(AutoCrawlerConfig).where(AutoCrawlerConfig.is_active == True).limit(1)
        config = await db.scalar(stmt)
        if not config: return "No active config"

        now = datetime.utcnow()
        last_run = config.last_run_at
        interval = float(config.scraping_interval_minutes or 60)
        
        if last_run is None or (now - last_run).total_seconds() / 60 >= interval:
            config.last_run_at = now
            await db.commit()
            start_price_crawl_task.delay()
            return "Triggered crawl"
        return "Idle"

@worker.task(name="start_price_crawl_task")
def start_price_crawl_task():
    return run_async_task(process_price_crawling())

async def process_price_crawling():
    async with AsyncSessionLocal() as db:
        config = await db.scalar(select(AutoCrawlerConfig).limit(1))
        if not config: return "No config"

        # 1. Get URLs (Prioritize Seed URLs, else Broad Search)
        urls = list(config.seed_urls or [])
        
        # Removed processing of search_keywords as per user request.
        # Use a fixed set of broad Vietnamese market keywords if no seed URLs are provided.
        if not urls:
            broad_topics = [
                "bảng giá nông sản thực phẩm hôm nay",
                "giá cả thị trường mới nhất tại việt nam",
                "giá vật liệu xây dựng sắt thép phân bón",
                "giá thủy hải sản gia súc gia cầm"
            ]
            print(f"CRAWLER: Seed URLs empty. Performing broad search for multiple categories...")
            for kw in broad_topics:
                found_urls = await search_google_prices(kw)
                urls.extend(found_urls)
        
        urls = list(set(urls)) 
        print(f"CRAWLER: Processing {len(urls)} target URLs for broad extraction")

        for url in urls:
            try:
                print(f"CRAWLER: Scraping {url}")
                downloaded = trafilatura.fetch_url(url)
                if not downloaded: continue
                
                content = trafilatura.extract(downloaded, include_tables=True)
                if not content or len(content) < 200: continue

                # LLM Extraction
                res = await extraction_chain.ainvoke({"content": content[:5000]})
                
                for item in res.items:
                    try:
                        # Save to Staging instead of processing immediately to avoid rate limits
                        db.add(StagingPrice(
                            id=uuid.uuid4(),
                            name=item.name,
                            price=item.price,
                            unit=item.unit,
                            category_name=item.category,
                            source_url=url,
                            created_at=datetime.utcnow()
                        ))
                        await db.commit()
                        print(f"STAGED: {item.name} ({item.unit})")
                    except Exception as item_err:
                        print(f"STAGING ERROR [{item.name}]: {item_err}")
                        await db.rollback()
                    
            except Exception as e:
                print(f"CRAWLER ERROR [{url}]: {e}")

async def search_google_prices(keyword: str) -> List[str]:
    """Fetch search results via Serper.dev"""
    if not settings.SERPER_API_KEY:
        print("SERPER_API_KEY not configured")
        return []

    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": keyword,
        "gl": "vn",
        "hl": "vi"
    })
    headers = {
        'X-API-KEY': settings.SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"SERPER: Searching for '{keyword}'")
            response = await client.post(url, headers=headers, data=payload)
            response.raise_for_status()
            results = response.json()
            links = [item['link'] for item in results.get('organic', [])]
            return links
        except Exception as e:
            print(f"SERPER ERROR: {e}")
            return []

@worker.task(name="process_staging_to_main")
def process_staging_to_main():
    """Batch process staged items to main tables using minimized LLM calls"""
    return run_async_task(run_staging_processing_logic())

async def run_staging_processing_logic():
    async with AsyncSessionLocal() as db:
        # 1. Fetch unprocessed items (batch of 10)
        stmt = select(StagingPrice).where(StagingPrice.processed == False).limit(10)
        staged_items = (await db.execute(stmt)).scalars().all()
        if not staged_items: return "No staged items"

        print(f"STAGING: Processing batch of {len(staged_items)} items")

        # 2. Get existing commodities for matching info
        existing_result = await db.execute(select(Commodity))
        existing_commodities = existing_result.scalars().all()
        
        # 3. Batch semantic match via Gemini
        match_map = {}
        if existing_commodities:
            new_items_str = "\n".join([f"{item.id} - {item.name} - {item.unit}" for item in staged_items])
            existing_str = "\n".join([f"{c.id} - {c.name} - {c.unit}" for c in existing_commodities])
            
            try:
                res = await match_chain.ainvoke({
                    "new_items_list": new_items_str,
                    "existing_list": existing_str
                })
                for m in res.matches:
                    match_map[m.staging_id] = m
            except Exception as e:
                print(f"BATCH MATCH ERROR: {e}")

        # 4. Save to Main Tables
        for item in staged_items:
            try:
                match_res = match_map.get(str(item.id))
                matched_id = match_res.matched_id if match_res and match_res.is_match else None
                
                # Get or Create Category
                cat_name = item.category_name or "Chưa phân loại"
                cat_slug = cat_name.lower().replace(" ", "-")
                cat_stmt = select(Category).where(or_(Category.slug == cat_slug, Category.name == cat_name))
                cat = await db.scalar(cat_stmt)
                if not cat:
                    cat = Category(id=uuid.uuid4(), name=cat_name, slug=cat_slug)
                    db.add(cat)
                    await db.flush()

                # Get or Create Commodity
                commodity = None
                if matched_id:
                    try:
                        commodity = await db.get(Commodity, uuid.UUID(matched_id))
                    except:
                        commodity = None
                
                if not commodity:
                    base_slug = item.name.lower().replace(" ", "-")
                    unit_slug = item.unit.lower().replace(" ", "-")
                    full_slug = f"{base_slug}-{unit_slug}"
                    
                    slug_stmt = select(Commodity).where(Commodity.slug == full_slug)
                    existing_slug = await db.scalar(slug_stmt)
                    if existing_slug:
                        commodity = existing_slug
                    else:
                        commodity = Commodity(
                            id=uuid.uuid4(),
                            name=item.name,
                            slug=full_slug,
                            unit=item.unit,
                            category_id=cat.id,
                            description=f"Tự động đồng bộ từ {item.source_url}"
                        )
                        db.add(commodity)
                        await db.flush()

                # Save Final Price
                region_stmt = select(Region).where(Region.code == "VN")
                region = await db.scalar(region_stmt)
                if not region:
                    region = Region(id=uuid.uuid4(), name="Việt Nam", code="VN")
                    db.add(region)
                    await db.flush()

                db.add(Price(
                    id=uuid.uuid4(),
                    commodity_id=commodity.id,
                    region_id=region.id,
                    price=item.price,
                    source_url=item.source_url,
                    timestamp=item.created_at
                ))
                
                item.processed = True
                await db.commit()
                
                # Prepare payload for real-time notification
                # Include full commodity details to allow frontend to add new items
                pub_payload = {
                    "commodity_id": str(commodity.id),
                    "name": commodity.name,
                    "slug": commodity.slug,
                    "unit": commodity.unit,
                    "price": float(item.price),
                    "timestamp": item.created_at.isoformat(),
                    "category": {
                        "id": str(cat.id),
                        "name": cat.name,
                        "slug": cat.slug
                    },
                    "region": {
                        "id": str(region.id),
                        "name": region.name,
                        "code": region.code
                    }
                }
                await redis_client.publish("price_updates", json.dumps(pub_payload))
                
                print(f"PROCESSED & PUBLISHED: {item.name} -> Main DB")

            except Exception as e:
                print(f"MAIN SAVE ERROR [{item.name}]: {e}")
                await db.rollback()

        return f"Processed {len(staged_items)} items"
