import re

class DataValidationService:
    @staticmethod
    def is_valid_sku(sku: str) -> bool:
        """
        Kiểm tra mã SKU (ví dụ: tối thiểu 5 ký tự, chỉ chữ và số).
        """
        if not sku or len(sku) < 5:
            return False
        return bool(re.match(r'^[a-zA-Z0-9]+$', sku))
