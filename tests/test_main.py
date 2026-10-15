import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

# Ensure 'app' is importable whether pytest is executed from root or backend/
CURRENT_FILE = Path(__file__).resolve()
POSSIBLE_PATHS = [
    CURRENT_FILE.parent.parent / "backend",
    CURRENT_FILE.parent.parent,
]
for p in POSSIBLE_PATHS:
    if (p / "app").exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.main import app
from app.models.base import AutoCrawlerConfig, Category, Commodity, Price, Region, User, UserRole


# ============================================================================
# Mock Helpers
# ============================================================================

class MockResult:
    """Helper to simulate SQLAlchemy async execution results."""
    def __init__(self, item=None, items=None):
        self._item = item
        self._items = items if items is not None else ([item] if item is not None else [])

    def scalar_one_or_none(self):
        return self._item

    def scalar_one(self):
        if self._item is None:
            raise Exception("No item found")
        return self._item

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return self._items


class MockAsyncSession:
    """Mock async SQLAlchemy session for unit tests."""
    def __init__(self):
        self.execute_results = []
        self.scalar_results = []
        self.added = []
        self.committed = False
        self.rolled_back = False

    def add_execute_result(self, item=None, items=None):
        self.execute_results.append(MockResult(item=item, items=items))

    def add_scalar_result(self, val):
        self.scalar_results.append(val)

    async def execute(self, stmt, *args, **kwargs):
        if self.execute_results:
            return self.execute_results.pop(0)
        return MockResult()

    async def scalar(self, stmt, *args, **kwargs):
        if self.scalar_results:
            return self.scalar_results.pop(0)
        return None

    def add(self, instance):
        self.added.append(instance)

    async def commit(self):
        self.committed = True

    async def rollback(self):
        self.rolled_back = True

    async def refresh(self, instance, attribute_names=None):
        pass


def _extract_admin_dependency():
    """Retrieve the dependency callable produced by check_role(UserRole.ADMIN)."""
    for route in app.routes:
        if getattr(route, "path", None) == "/api/admin/crawler/run":
            for dep in route.dependant.dependencies:
                return dep.call
    return None


ADMIN_ROLE_DEP = _extract_admin_dependency()


# ============================================================================
# Pytest Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def mock_external_services():
    """Prevent actual network connections to Redis, PostgreSQL, and Celery."""
    with patch("app.main.init_db", new=AsyncMock()), \
         patch("app.main.redis_listener", new=AsyncMock()), \
         patch("app.main.redis_client") as mock_redis, \
         patch("app.main.start_price_crawl_task") as mock_celery:
        mock_redis.publish = AsyncMock(return_value=1)
        mock_redis.set = AsyncMock(return_value=True)
        mock_celery.delay = MagicMock()
        yield {
            "redis": mock_redis,
            "celery": mock_celery,
        }


@pytest.fixture
def mock_db():
    return MockAsyncSession()


@pytest.fixture
def sample_category():
    return Category(
        id=uuid.uuid4(),
        name="Nông sản",
        slug="nong-san",
    )


@pytest.fixture
def sample_admin_user(sample_category):
    return User(
        id=uuid.uuid4(),
        username="admin_user",
        full_name="Admin User",
        hashed_password="hashed_password_123",
        role=UserRole.ADMIN,
        must_change_password=False,
        is_active=True,
        permitted_categories=[sample_category],
    )


@pytest.fixture
def sample_data_entry_user(sample_category):
    return User(
        id=uuid.uuid4(),
        username="staff_user",
        full_name="Data Entry Staff",
        hashed_password="hashed_password_123",
        role=UserRole.DATA_ENTRY,
        must_change_password=False,
        is_active=True,
        permitted_categories=[sample_category],
    )


@pytest.fixture
def sample_commodity(sample_category):
    return Commodity(
        id=uuid.uuid4(),
        name="Gạo ST25",
        slug="gao-st25-kg",
        unit="kg",
        description="Gạo đặc sản",
        category_id=sample_category.id,
        category=sample_category,
        is_active=True,
        created_at=datetime.utcnow(),
        prices=[],
    )


@pytest.fixture
def sample_crawler_config():
    return AutoCrawlerConfig(
        id=uuid.uuid4(),
        search_keywords=["giá gạo", "giá cà phê"],
        seed_urls=["https://nongsanviet.vn"],
        scraping_interval_minutes=60,
        is_active=True,
        last_run_at=datetime.utcnow(),
    )


@pytest.fixture
def client(mock_db):
    """TestClient with database dependency overridden by mock_db."""
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ============================================================================
# SYSTEM HEALTH & WEBSOCKET TESTS
# ============================================================================

def test_health_check_returns_ok_200(client):
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert "status" in response.json()
    assert "ok" in response.json()["status"].lower()


def test_ping_endpoint_returns_pong_200(client):
    response = client.get("/ping")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "pong"}


def test_websocket_stream_connect_receives_welcome_message(client):
    with client.websocket_connect("/ws/prices") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "system"
        assert "Connected to real-time price stream" in data["message"]
        assert "server_time" in data


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

def test_auth_login_valid_credentials_returns_token_200(client, mock_db, sample_admin_user):
    mock_db.add_execute_result(item=sample_admin_user)
    with patch("app.main.verify_password", return_value=True), \
         patch("app.main.create_access_token", return_value="fake_access_token_jwt"):
        response = client.post(
            "/api/auth/login",
            json={"username": sample_admin_user.username, "password": "correct_password"},
        )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["access_token"] == "fake_access_token_jwt"
    assert body["token_type"] == "bearer"


def test_auth_login_user_not_found_returns_400(client, mock_db):
    mock_db.add_execute_result(item=None)
    response = client.post(
        "/api/auth/login",
        json={"username": "non_existent_user", "password": "any_password"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username hoặc mật khẩu không đúng" in response.json()["detail"]


def test_auth_login_invalid_password_returns_400(client, mock_db, sample_admin_user):
    mock_db.add_execute_result(item=sample_admin_user)
    with patch("app.main.verify_password", return_value=False):
        response = client.post(
            "/api/auth/login",
            json={"username": sample_admin_user.username, "password": "wrong_password"},
        )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username hoặc mật khẩu không đúng" in response.json()["detail"]


def test_auth_login_missing_fields_returns_422(client):
    response = client.post("/api/auth/login", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_auth_me_authenticated_user_returns_user_200(client, sample_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: sample_admin_user
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["id"] == str(sample_admin_user.id)
    assert body["username"] == sample_admin_user.username


def test_auth_me_unauthenticated_returns_401(client):
    app.dependency_overrides[get_current_active_user] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_change_password_valid_password_returns_success_200(client, sample_admin_user, mock_db):
    app.dependency_overrides[get_current_active_user] = lambda: sample_admin_user
    with patch("app.main.get_password_hash", return_value="new_hashed_pwd"):
        response = client.post("/api/auth/change-password?new_password=newSecretPass123")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Đổi mật khẩu thành công"}
    assert sample_admin_user.hashed_password == "new_hashed_pwd"
    assert sample_admin_user.must_change_password is False
    assert mock_db.committed is True


def test_auth_change_password_missing_password_returns_422(client, sample_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: sample_admin_user
    response = client.post("/api/auth/change-password")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_auth_change_password_unauthenticated_returns_401(client):
    app.dependency_overrides[get_current_active_user] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.post("/api/auth/change-password?new_password=newSecret123")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# ADMIN: USER MANAGEMENT
# ============================================================================

def test_admin_create_user_valid_data_returns_created_user_200(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    created_user = User(
        id=uuid.uuid4(),
        username="new_staff@company.com",
        full_name="New Staff",
        hashed_password="hashed_default_pwd",
        role=UserRole.DATA_ENTRY,
        must_change_password=True,
        is_active=True,
        permitted_categories=[],
    )
    mock_db.add_execute_result(item=created_user)

    payload = {
        "username": "new_staff@company.com",
        "password": "mypassword123",
        "full_name": "New Staff",
        "role": "data_entry",
    }
    response = client.post("/api/admin/users", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "new_staff@company.com"
    assert mock_db.committed is True


def test_admin_create_user_duplicate_username_returns_400(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.commit = AsyncMock(side_effect=Exception("duplicate key value violates unique constraint"))

    payload = {
        "username": "duplicate_user@company.com",
        "password": "password123",
        "full_name": "Duplicate User",
        "role": "data_entry",
    }
    response = client.post("/api/admin/users", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Tài khoản này đã tồn tại" in response.json()["detail"]
    assert mock_db.rolled_back is True


def test_admin_create_user_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.post(
        "/api/admin/users",
        json={"username": "staff@test.com", "password": "123"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_create_user_unauthenticated_returns_401(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.post(
        "/api/admin/users",
        json={"username": "staff@test.com", "password": "123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_admin_create_user_missing_required_fields_returns_422(client, sample_admin_user):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    response = client.post("/api/admin/users", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_admin_list_users_as_admin_returns_user_list_200(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(items=[sample_admin_user])

    response = client.get("/api/admin/users")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["username"] == sample_admin_user.username


def test_admin_list_users_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.get("/api/admin/users")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_list_users_unauthenticated_returns_401(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.get("/api/admin/users")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# ADMIN: CATEGORIES & COMMODITIES
# ============================================================================

def test_admin_create_category_with_explicit_slug_returns_category_200(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    payload = {"name": "Vật liệu xây dựng", "slug": "vat-lieu-xd"}

    response = client.post("/api/admin/categories", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Vật liệu xây dựng"
    assert data["slug"] == "vat-lieu-xd"
    assert mock_db.committed is True


def test_admin_create_category_auto_generates_slug_returns_category_200(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    payload = {"name": "Gia Cầm", "slug": None}

    response = client.post("/api/admin/categories", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["slug"] == "gia-cầm"


def test_admin_create_category_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.post("/api/admin/categories", json={"name": "Nông sản"})
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_create_category_missing_name_returns_422(client, sample_admin_user):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    response = client.post("/api/admin/categories", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_admin_update_user_permissions_valid_user_and_categories_returns_success_200(
    client, sample_admin_user, sample_data_entry_user, sample_category, mock_db
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(item=sample_data_entry_user)
    mock_db.add_execute_result(items=[sample_category])

    url = f"/api/admin/users/{sample_data_entry_user.id}/permissions"
    response = client.post(url, json=[str(sample_category.id)])
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Đã phân quyền thành công"}
    assert mock_db.committed is True


def test_admin_update_user_permissions_user_not_found_returns_404(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(item=None)

    url = f"/api/admin/users/{uuid.uuid4()}/permissions"
    response = client.post(url, json=[str(uuid.uuid4())])
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found" in response.json()["detail"]


def test_admin_update_user_permissions_invalid_uuid_returns_422(client, sample_admin_user):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    response = client.post("/api/admin/users/invalid-uuid/permissions", json=[str(uuid.uuid4())])
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_admin_create_commodity_valid_data_returns_commodity_200(
    client, sample_admin_user, sample_commodity, mock_db, mock_external_services
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(item=sample_commodity)

    payload = {
        "name": sample_commodity.name,
        "slug": sample_commodity.slug,
        "unit": sample_commodity.unit,
        "description": sample_commodity.description,
        "category_id": str(sample_commodity.category_id),
    }
    response = client.post("/api/admin/commodities", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == sample_commodity.name
    assert mock_db.committed is True
    assert mock_external_services["redis"].publish.called


def test_admin_create_commodity_missing_fields_returns_422(client, sample_admin_user):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    response = client.post("/api/admin/commodities", json={"name": "Lúa"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_admin_create_commodity_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.post(
        "/api/admin/commodities",
        json={"name": "Lúa", "slug": "lua", "unit": "kg"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_bulk_update_commodities_category_valid_ids_returns_success_200(
    client, sample_admin_user, sample_category, mock_db
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    commodity_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
    payload = {
        "commodity_ids": commodity_ids,
        "category_id": str(sample_category.id),
    }
    response = client.patch("/api/admin/commodities/bulk-category", json=payload)
    assert response.status_code == status.HTTP_200_OK
    assert "Đã cập nhật nhóm cho 2 hàng hóa thành công" in response.json()["message"]
    assert mock_db.committed is True


def test_admin_bulk_update_commodities_category_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.patch(
        "/api/admin/commodities/bulk-category",
        json={"commodity_ids": [str(uuid.uuid4())], "category_id": None},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_admin_update_commodity_category_valid_id_returns_success_200(
    client, sample_admin_user, sample_commodity, sample_category, mock_db
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(item=sample_commodity)

    url = f"/api/admin/commodities/{sample_commodity.id}/category?category_id={sample_category.id}"
    response = client.patch(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Đã cập nhật nhóm hàng hóa thành công"}
    assert sample_commodity.category_id == sample_category.id
    assert mock_db.committed is True


def test_admin_update_commodity_category_not_found_returns_404(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_execute_result(item=None)

    url = f"/api/admin/commodities/{uuid.uuid4()}/category"
    response = client.patch(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Commodity not found" in response.json()["detail"]


# ============================================================================
# ADMIN: CRAWLER CONFIG & RUN
# ============================================================================

def test_admin_get_crawler_config_config_exists_returns_config_200(
    client, sample_admin_user, sample_crawler_config, mock_db
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_scalar_result(sample_crawler_config)

    response = client.get("/api/admin/crawler-config")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["scraping_interval_minutes"] == sample_crawler_config.scraping_interval_minutes
    assert data["search_keywords"] == sample_crawler_config.search_keywords


def test_admin_get_crawler_config_not_found_returns_404(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_scalar_result(None)

    response = client.get("/api/admin/crawler-config")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Config not found" in response.json()["detail"]


def test_admin_update_crawler_config_valid_data_returns_updated_config_200(
    client, sample_admin_user, sample_crawler_config, mock_db
):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_scalar_result(sample_crawler_config)

    payload = {
        "scraping_interval_minutes": 120,
        "is_active": False,
        "search_keywords": ["giá tiêu"],
    }
    response = client.patch("/api/admin/crawler-config", json=payload)
    assert response.status_code == status.HTTP_200_OK
    assert sample_crawler_config.scraping_interval_minutes == 120
    assert sample_crawler_config.is_active is False
    assert mock_db.committed is True


def test_admin_update_crawler_config_not_found_returns_404(client, sample_admin_user, mock_db):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user
    mock_db.add_scalar_result(None)

    response = client.patch("/api/admin/crawler-config", json={"scraping_interval_minutes": 30})
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_admin_trigger_crawler_as_admin_triggers_task_200(client, sample_admin_user, mock_external_services):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: sample_admin_user

    response = client.post("/api/admin/crawler/run")
    assert response.status_code == status.HTTP_200_OK
    assert "Crawler đã được kích hoạt chạy ngầm" in response.json()["message"]
    assert mock_external_services["celery"].delay.called


def test_admin_trigger_crawler_non_admin_returns_403(client):
    app.dependency_overrides[ADMIN_ROLE_DEP] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    )
    response = client.post("/api/admin/crawler/run")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

def test_public_list_categories_returns_category_list_200(client, sample_category, mock_db):
    mock_db.add_execute_result(items=[sample_category])
    response = client.get("/api/public/categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["name"] == sample_category.name


def test_public_list_commodities_without_filters_returns_commodities_200(client, sample_commodity, mock_db):
    mock_db.add_execute_result(items=[sample_commodity])
    response = client.get("/api/public/commodities")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["name"] == sample_commodity.name


def test_public_list_commodities_with_filters_returns_commodities_200(client, sample_commodity, mock_db):
    mock_db.add_execute_result(items=[sample_commodity])
    params = {
        "category_slug": "nong-san",
        "search": "st25",
        "size": 10,
        "before": datetime.utcnow().isoformat(),
    }
    response = client.get("/api/public/commodities", params=params)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1


# ============================================================================
# DATA ENTRY ENDPOINTS
# ============================================================================

def test_data_entry_my_commodities_with_permitted_categories_returns_commodities_200(
    client, sample_data_entry_user, sample_commodity, mock_db
):
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    mock_db.add_execute_result(items=[sample_commodity])

    response = client.get("/api/data-entry/my-commodities")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == str(sample_commodity.id)


def test_data_entry_my_commodities_empty_permitted_categories_returns_empty_list_200(
    client, sample_data_entry_user
):
    sample_data_entry_user.permitted_categories = []
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user

    response = client.get("/api/data-entry/my-commodities")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_data_entry_my_commodities_unauthenticated_returns_401(client):
    app.dependency_overrides[get_current_active_user] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.get("/api/data-entry/my-commodities")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_data_entry_update_price_commodity_not_found_returns_404(client, sample_data_entry_user, mock_db):
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    mock_db.add_execute_result(item=None)

    payload = {"commodity_id": str(uuid.uuid4()), "price": 15000.0}
    response = client.post("/api/data-entry/prices", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Commodity not found" in response.json()["detail"]


def test_data_entry_update_price_category_not_permitted_returns_403(
    client, sample_data_entry_user, sample_commodity, mock_db
):
    # Set commodity category to an unpermitted one
    unpermitted_cat_id = uuid.uuid4()
    sample_commodity.category_id = unpermitted_cat_id
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    mock_db.add_execute_result(item=sample_commodity)

    payload = {"commodity_id": str(sample_commodity.id), "price": 20000.0}
    response = client.post("/api/data-entry/prices", json=payload)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "You don't have permission" in response.json()["detail"]


def test_data_entry_update_price_existing_record_today_updates_price_200(
    client, sample_data_entry_user, sample_commodity, mock_db, mock_external_services
):
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    region = Region(id=uuid.uuid4(), name="Việt Nam", code="VN")
    existing_price = Price(
        id=uuid.uuid4(),
        commodity_id=sample_commodity.id,
        region_id=region.id,
        price=18000.0,
        timestamp=datetime.utcnow(),
    )

    mock_db.add_execute_result(item=sample_commodity)
    mock_db.add_execute_result(item=region)
    mock_db.add_execute_result(item=existing_price)

    payload = {"commodity_id": str(sample_commodity.id), "price": 19500.0}
    response = client.post("/api/data-entry/prices", json=payload)

    assert response.status_code == status.HTTP_200_OK
    assert "Đã cập nhật giá hôm nay thành công" in response.json()["message"]
    assert existing_price.price == 19500.0
    assert mock_db.committed is True
    assert mock_external_services["redis"].set.called
    assert mock_external_services["redis"].publish.called


def test_data_entry_update_price_new_record_today_creates_price_200(
    client, sample_data_entry_user, sample_commodity, mock_db, mock_external_services
):
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    region = Region(id=uuid.uuid4(), name="Việt Nam", code="VN")

    mock_db.add_execute_result(item=sample_commodity)
    mock_db.add_execute_result(item=region)
    mock_db.add_execute_result(item=None)  # No existing price today

    payload = {"commodity_id": str(sample_commodity.id), "price": 22000.0}
    response = client.post("/api/data-entry/prices", json=payload)

    assert response.status_code == status.HTTP_200_OK
    assert "Cập nhật giá thành công" in response.json()["message"]
    assert mock_db.committed is True
    assert len(mock_db.added) == 1
    assert mock_db.added[0].price == 22000.0
    assert mock_external_services["redis"].set.called
    assert mock_external_services["redis"].publish.called


def test_data_entry_update_price_missing_fields_returns_422(client, sample_data_entry_user):
    app.dependency_overrides[get_current_active_user] = lambda: sample_data_entry_user
    response = client.post("/api/data-entry/prices", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_data_entry_update_price_unauthenticated_returns_401(client):
    app.dependency_overrides[get_current_active_user] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    )
    response = client.post(
        "/api/data-entry/prices",
        json={"commodity_id": str(uuid.uuid4()), "price": 10000.0},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
