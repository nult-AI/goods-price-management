param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Target, # Có thể truyền số Issue (ví dụ: 12) hoặc tên file task cụ thể

    [switch]$NoTest  # Cờ bỏ qua chạy pytest nếu chỉ muốn sửa nhanh
)

# 1. Đảm bảo thư mục lưu task tồn tại
$taskDir = "tasks"
if (-not (Test-Path $taskDir)) {
    New-Item -ItemType Directory -Path $taskDir | Out-Null
}

$taskFile = ""

# 2. Phân loại đầu vào: Nếu là số nguyên thì kéo từ GitHub Issue, nếu là file thì dùng file có sẵn
if ($Target -match '^\d+$') {
    $issueNum = $Target
    $taskFile = "$taskDir/issue-$issueNum.md"
    Write-Host ">>> [1/4] Dang keo requirement tu GitHub Issue #$issueNum..." -ForegroundColor Cyan
    gh issue view $issueNum > $taskFile

    # Tự động tạo hoặc chuyển sang nhánh tương ứng
    $branchName = "feature/issue-$issueNum"
    Write-Host ">>> [2/4] Chuyen sang branch: $branchName..." -ForegroundColor Cyan
    git checkout -B $branchName
} else {
    $taskFile = $Target
    Write-Host ">>> [1/4] Su dung file task cuc bo: $taskFile" -ForegroundColor Cyan
}

if (-not (Test-Path $taskFile)) {
    Write-Error "Khong tim thay file task tai duong dan: $taskFile"
    exit 1
}

# 3. Kích hoạt Aider đọc task và xử lý code
Write-Host ">>> [3/4] Khoi chay Aider xu ly requirement..." -ForegroundColor Green
aider --read $taskFile --message "Doc ky requirement trong file $taskFile, doi chieu voi PROJECT_GUIDE.md va thuc hien code day du logic kem unit test tuong ung."

# 4. Tự động chạy Pytest để nghiệm thu kết quả (nếu không bật cờ -NoTest)
if (-not $NoTest) {
    # Đọc nội dung task để xem task này thuộc frontend hay backend
    $taskContent = Get-Content $taskFile -Raw

    if ($taskContent -match "frontend|front-end|react|vitest|jest") {
        Write-Host ">>> [4/4] Phat hien task Front-end -> Chay npm test..." -ForegroundColor Yellow
        if (Test-Path "frontend") {
            Push-Location frontend
            npm test -- --watchAll=false --run
            Pop-Location
        } else {
            npm test -- --watchAll=false --run
        }
    } else {
        Write-Host ">>> [4/4] Phat hien task Back-end -> Chay pytest..." -ForegroundColor Yellow
        pytest tests/ -v
    }
}