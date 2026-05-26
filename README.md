# CommodityLive - Price Management System

A production-ready full-stack application for tracking commodity prices using a read-heavy, mobile-first architecture.

## 🏗️ Architecture
- **Frontend**: Next.js (App Router) with ISR (Incremental Static Regeneration) for lightning-fast public access.
- **Backend**: FastAPI (Python) with async SQLAlchemy and JWT authentication for admin writes.
- **Database**: PostgreSQL with time-series optimized indices.
- **Caching**: Redis for "Latest Price" lookups and rate limiting.

## 🚀 Quick Start (Local Development)

### 1. Setup Environment
```bash
cp .env.example .env
```
*Note: Update `POSTGRES_PORT=5436` and `REDIS_PORT=6383` in `.env` as per your local setup.*

### 2. Run Backend
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Docker Production (Alternative)
```bash
docker-compose up --build
```

## 📡 Key API Design
- `GET /api/v1/commodities`: Public, cache-friendly list of prices.
- `POST /api/v1/prices`: Admin-only, requires JWT. Invalidate Redis cache on success.

## 📈 Scalability Notes
- **ISR**: Public pages remain fast even under high traffic because they are served as static files.
- **Async Backend**: FastAPI handles concurrent I/O efficiently.
- **Redis Cache**: Prevents the database from becoming a bottleneck during read spikes.

# chạy worker: 
 - uv run celery -A app.tasks.worker worker --loglevel=info -P solo
 - uv run celery -A app.tasks.worker worker --loglevel=info -P solo --concurrency=2

 - run auto for window: 
   + Terminal 1: uv run celery -A app.tasks.worker worker --loglevel=info -P solo --concurrency=2
   + Terminal 2: uv run celery -A app.tasks.worker beat --loglevel=info
- run auto for linux:
   + uv run celery -A app.tasks.worker worker --beat --loglevel=info -P solo


## Test huggingface config at the local:
- Run: docker-compose -f docker-compose-hf-test.yml up -d --build
- Backend: work với  Dockerfile

## Deployment:
- Frontend: Vercel
- Backend: Hungging face
  + Đứng tại thư mục gốc dự án (nơi chứa folder backend)
    # B1: Tách lịch sử backend ra một nhánh tạm tên là 'deploy'
    git subtree split --prefix backend -b deploy

    # B2: Đẩy nhánh 'deploy' này lên 'main' của HF
    # cần thêm hf remote vào setting của git
    git remote add hf https://huggingface.co/spaces/nult2003/goods-price-api
    git push hf deploy:main --force

    # B3: Xóa nhánh tạm sau khi xong (không ảnh hưởng đến code gốc)
    git branch -D deploy


- Database: supabase
 + Cần chạy ở mode pooler for hugging face
 + 



