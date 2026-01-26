from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum

# --- Auth & User ---
class UserRole(str, Enum):
    ADMIN = "admin"
    DATA_ENTRY = "data_entry"

# We will move User class later in the file to avoid forward ref issues

# --- Region ---
class RegionBase(BaseModel):
    name: str
    code: str

class Region(RegionBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID

# --- Category ---
class CategoryBase(BaseModel):
    name: str
    slug: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID

# --- Auth & User ---
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    is_active: bool
    must_change_password: bool
    created_at: datetime
    permitted_categories: List[Category] = []

# --- Commodity ---
class CommodityBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2)
    unit: str = Field(..., max_length=20)
    description: Optional[str] = None
    category_id: Optional[UUID] = None

class CommodityCreate(CommodityBase):
    pass

class Commodity(CommodityBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    category: Optional[Category] = None

# --- Price ---
class PriceCreate(BaseModel):
    commodity_id: UUID
    region_id: Optional[UUID] = None
    price: float = Field(..., gt=0)

class PricePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    price: float
    timestamp: datetime
    region: Optional[Region] = None

class CommodityWithLatest(Commodity):
    latest_price: Optional[PricePublic] = None
    prices: List[PricePublic] = []

# --- Responses ---
class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[CommodityWithLatest]

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    username: str
    password: str

# --- Crawler ---
class CrawlerConfigUpdate(BaseModel):
    search_keywords: Optional[List[str]] = None
    seed_urls: Optional[List[str]] = None
    scraping_interval_minutes: Optional[float] = None
    is_active: Optional[bool] = None

class CrawlerConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    search_keywords: List[str]
    seed_urls: List[str]
    scraping_interval_minutes: float
    last_run_at: Optional[datetime] = None
    is_active: bool
