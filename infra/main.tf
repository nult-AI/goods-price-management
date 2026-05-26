# ==============================================================================
# 0. TERRAFORM & PROVIDERS CONFIGURATION
# ==============================================================================
terraform {
  required_version = ">= 1.3.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ==============================================================================
# 1. MÔI TRƯỜNG NỀN TẢNG (ENVIRONMENT & DATABASE)
# ==============================================================================

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Tạo con ACR mới tinh cho dự án Goods Management
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = var.acr_sku
  admin_enabled       = true # Bật lên để lấy password cấu hình nếu cần
}

# Vùng mạng chung cho các container nói chuyện nội bộ
resource "azurerm_container_app_environment" "env" {
  name                       = var.container_app_environment_name
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = var.log_analytics_workspace_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = var.log_analytics_sku
}

# ==============================================================================
# 2. CONTAINER APP: REDIS SERVICE
# ==============================================================================
resource "azurerm_container_app" "redis" {
  name                         = "ca-goods-redis"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name    = "redis"
      image   = "redis:7-alpine"
      cpu     = "0.25"
      memory  = "0.5Gi"
      command = ["redis-server", "--appendonly", "yes"]
    }
    min_replicas = 1
    max_replicas = 1
  }

}

# ==============================================================================
# 3. CONTAINER APP: FASTAPI (API BACKEND)
# ==============================================================================
resource "azurerm_container_app" "api" {
  name                         = "ca-goods-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  # 1. CẤP QUYỀN TRUY CẬP VÀO CON ACR MỚI TỰ ĐỘNG
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password" # Đặt tên nhãn secret tham chiếu
  }

  # 2. ĐƯA PASSWORD CỦA ACR MỚI VÀO KHO SECRET NỘI BỘ
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password # Terraform tự bốc pass của ACR mới bỏ vào đây
  }

  secret {
    name  = "google-api-key"
    value = var.google_api_key
  }
  secret {
    name  = "serper-api-key"
    value = var.serper_api_key
  }

  template {
    container {
      name   = "goods-api"
      image  = var.api_image
      cpu    = "0.25"
      memory = "0.5Gi"

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }
      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
      env {
        name        = "GOOGLE_API_KEY"
        secret_name = "google-api-key"
      }
      env {
        name        = "SERPER_API_KEY"
        secret_name = "serper-api-key"
      }
    }
    min_replicas = 0 # Không có request tự động tắt về 0 để tiết kiệm tiền
    max_replicas = 5
  }

  ingress {
    external_enabled = true # MỞ RA NGOÀI ĐỂ FRONTEND VÀ USER GỌI
    target_port      = 7860 # cùng port expose trên docker file, dùng chung port của hugging face
    
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ==============================================================================
# 4. CONTAINER APP: CELERY WORKER (XỬ LÝ AI NGẦM)
# ==============================================================================
resource "azurerm_container_app" "worker" {
  name                         = "ca-goods-worker"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  # 1. CẤP QUYỀN TRUY CẬP VÀO CON ACR MỚI TỰ ĐỘNG
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password" # Đặt tên nhãn secret tham chiếu
  }

  # 2. ĐƯA PASSWORD CỦA ACR MỚI VÀO KHO SECRET NỘI BỘ
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password # Terraform tự bốc pass của ACR mới bỏ vào đây
  }

  secret {
    name  = "google-api-key"
    value = var.google_api_key
  }

  template {
    container {
      name    = "goods-worker"
      image   = var.api_image
      cpu     = "0.5" # Cho CPU cao hơn vì có xử lý tính toán AI
      memory  = "1.0Gi"
      command = ["uv", "run", "celery", "-A", "app.tasks.worker", "worker", "--loglevel=info", "-P", "solo", "--concurrency=2"]

      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
      env {
        name        = "GOOGLE_API_KEY"
        secret_name = "google-api-key"
      }
    }
    min_replicas = 0 # Không có task AI ngầm tự động scale về 0
    max_replicas = 3
  }
}

# ==============================================================================
# 5. CONTAINER APP: CELERY BEAT (CHẠY ĐỊNH KỲ)
# ==============================================================================
resource "azurerm_container_app" "beat" {
  name                         = "ca-goods-beat"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  # 1. CẤP QUYỀN TRUY CẬP VÀO CON ACR MỚI TỰ ĐỘNG
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password" # Đặt tên nhãn secret tham chiếu
  }

  # 2. ĐƯA PASSWORD CỦA ACR MỚI VÀO KHO SECRET NỘI BỘ
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password # Terraform tự bốc pass của ACR mới bỏ vào đây
  }

  template {
    container {
      name    = "goods-beat"
      image   = var.api_image
      cpu     = "0.25"
      memory  = "0.5Gi"
      command = ["uv", "run", "celery", "-A", "app.tasks.worker", "beat", "--loglevel=info"]

      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }
    }
    min_replicas = 1 # BẮT BUỘC LUÔN BẰNG 1
    max_replicas = 1
  }
}