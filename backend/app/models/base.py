from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Table, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, DeclarativeBase
import enum

class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DATA_ENTRY = "data_entry"

# Association table for User-Category permissions (which user can update which categories)
user_category_permissions = Table(
    'user_category_permissions',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete="CASCADE")),
    Column('category_id', UUID(as_uuid=True), ForeignKey('categories.id', ondelete="CASCADE"))
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.DATA_ENTRY, nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True) # Force change on first login or reset
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Categories this user is authorized to manage (if role is DATA_ENTRY)
    permitted_categories = relationship("Category", secondary=user_category_permissions, back_populates="authorized_users")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    
    commodities = relationship("Commodity", back_populates="category")
    authorized_users = relationship("User", secondary=user_category_permissions, back_populates="permitted_categories")

class Region(Base):
    __tablename__ = "regions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False) # e.g., "US", "EU", "VN"
    
    prices = relationship("Price", back_populates="region")

class Commodity(Base):
    __tablename__ = "commodities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id', ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    unit = Column(String(20), nullable=False)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="commodities")
    prices = relationship("Price", back_populates="commodity", order_by="desc(Price.timestamp)")

class Price(Base):
    __tablename__ = "prices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commodity_id = Column(UUID(as_uuid=True), ForeignKey('commodities.id', ondelete="CASCADE"), nullable=False)
    region_id = Column(UUID(as_uuid=True), ForeignKey('regions.id', ondelete="SET NULL"), nullable=True)
    price = Column(Numeric(18, 4), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    commodity = relationship("Commodity", back_populates="prices")
    region = relationship("Region", back_populates="prices")
