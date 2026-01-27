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

# Đảm bảo quyền sở hữu cho user 1000 ngay tại thư mục app
RUN chown -R 1000:1000 /app

# Quan trọng: Chạy supervisord với flag -n (nodaemon) 
# và không cần trỏ đường dẫn tuyệt đối quá phức tạp
#USER 1000

# 4. Port mặc định của HF là 7860
EXPOSE 7860

# 5. Khởi chạy Supervisor thay vì chạy trực tiếp app
CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]