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


## Deployment:
- Frontend: Vercel
- Backend: Hungging face
- Database: supabase




