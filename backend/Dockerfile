# Sử dụng ảnh nhẹ nhưng đủ công cụ
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 1. Cài đặt Redis và Supervisor từ hệ thống
RUN apt-get update && apt-get install -y --no-install-recommends \
    redis-server \
    supervisor \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Cài đặt dependencies (uv sẽ tạo venv tự động)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

COPY . .

# 3. Quan trọng: Cấp quyền cho User của Hugging Face (UID 1000)
# HF không chạy bằng root, nên các folder log/run phải được chmod
RUN mkdir -p /app/logs /var/log/supervisor /var/run/redis && \
    chmod -R 777 /app /var/log/supervisor /var/run/redis

# 4. Port mặc định của HF là 7860
EXPOSE 7860

# 5. Khởi chạy Supervisor thay vì chạy trực tiếp app
CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]