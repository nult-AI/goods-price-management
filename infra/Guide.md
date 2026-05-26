# Azure Steps:
1. Login Azure CLI: az login
2. Set subscription: az account set --subscription "name-or-id"

+ Khi run: terraform apply bị issue về đăng ký Microsoft.App thì chạy command sau:
- az provider register --namespace Microsoft.App
- az provider show --namespace Microsoft.App --query "registrationState" # check status: registering or registered

3. Login to ACR: az acr login --name acrgoodsmanagementtest
4. Build image: docker build -t acrgoodsmanagementtest.azurecr.io/goods-backend:v1 .
5. Push image: docker push acrgoodsmanagementtest.azurecr.io/goods-backend:v1


# CI/CD with github:
- chạy lệnh bên đưới để lấy azure credentials, sau đó dán vào secret của github repository
  - Name: AZURE_CREDENTIALS
  - Value: output của lệnh bên dưới
az ad sp create-for-rbac --name "github-actions-rsa" --role contributor --scopes /subscriptions/33ec68a6-22a4-4ae4-84da-fa8a82cc7694/resourceGroups/rg-nult-cashier-test --sdk-auth

