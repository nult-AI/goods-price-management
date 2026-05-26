resource_group_name             = "rg-goods-management-test"
location                        = "East Asia"
acr_name                        = "acrgoodsmanagementtest"
acr_sku                         = "Basic"
container_app_environment_name  = "cae-goods-app-env"
log_analytics_workspace_name    = "log-goods-management"
log_analytics_sku               = "PerGB2018"
database_url                    = "postgresql+asyncpg://postgres.mvjlfzelnfuzncdvfqkk:8vQYsxSdh0IsztjD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
redis_url                       = "redis://ca-goods-redis:6379/0"
#api_image                       = "mcr.microsoft.com/azuredocs/aci-helloworld:latest" # Chạy ảnh test mẫu trước, sau này anh thay bằng ảnh trong ACR của anh
api_image                       = "acrgoodsmanagementtest.azurecr.io/goods-backend:v1" # official image
google_api_key                  = "AIzaSyD59d6jODi2fyaa0VQrp3NS0QAD8ixAwjo"
serper_api_key                  = "85e236b7678a8e3c76644aad5e929c49f5f4f108"
secret_key                      = "nult-secret-key"
access_token_expire_minutes     = "11520"

