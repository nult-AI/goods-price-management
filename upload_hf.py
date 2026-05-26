from huggingface_hub import HfApi
import shutil
import tempfile
import os

# Tạo thư mục tạm sạch
with tempfile.TemporaryDirectory() as temp_dir:
    # Copy chỉ file cần thiết
    shutil.copytree("./backend", temp_dir, dirs_exist_ok=True)
    
    # Xóa file rác
    for root, dirs, files in os.walk(temp_dir):
        for d in list(dirs):
            if d in ['__pycache__', '.venv', '.git', 'tests']:
                shutil.rmtree(os.path.join(root, d))
                dirs.remove(d)
        for f in files:
            if f.endswith('.pyc') or f in ['.env', 'Dockerfile.local', '.python-version', 'README.md']:
                os.remove(os.path.join(root, f))
    
    # Upload
    api = HfApi()
    api.upload_folder(
        folder_path=temp_dir,
        repo_id="nult2003/goods-price-api",
        repo_type="space"
    )