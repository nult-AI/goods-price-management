variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the resources."
  default     = "rg-goods-management-test"
}

variable "location" {
  type        = string
  description = "The Azure region where resources will be deployed."
  default     = "East Asia"
}

variable "acr_name" {
  type        = string
  description = "The name of the Azure Container Registry. Must be globally unique, alphanumeric only."
  default     = "acrgoodsmanagementtest"
}

variable "acr_sku" {
  type        = string
  description = "The SKU of the Azure Container Registry."
  default     = "Basic"
}

variable "container_app_environment_name" {
  type        = string
  description = "The name of the Container App Environment."
  default     = "cae-goods-app-env"
}

variable "log_analytics_workspace_name" {
  type        = string
  description = "The name of the Log Analytics Workspace."
  default     = "log-goods-management"
}

variable "log_analytics_sku" {
  type        = string
  description = "The SKU of the Log Analytics Workspace."
  default     = "Basic"
}

variable "database_url" {
  type        = string
  description = "The connection string to the Azure Postgres database."
  sensitive   = true
}

variable "redis_url" {
  type        = string
  description = "The Redis connection URL."
  default     = "redis://ca-goods-redis:6379/0"
}

variable "api_image" {
  type        = string
  description = "The Docker image for the FastAPI API backend, Celery worker, and Celery beat."
  default     = "acrnultcashiertest.azurecr.io/goods-api:latest"
}

variable "google_api_key" {
  type        = string
  description = "Google API Key for AI features."
  sensitive   = true
}

variable "serper_api_key" {
  type        = string
  description = "Serper API Key for search functionality."
  sensitive   = true
}
