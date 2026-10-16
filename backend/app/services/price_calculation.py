class PriceCalculationService:
    @staticmethod
    def calculate_prices(import_price: float, margin_percent: float, vat_percent: float = 0.1):
        """
        Tính toán các loại giá dựa trên giá nhập và tỷ suất lợi nhuận.
        
        Args:
            import_price: Giá nhập
            margin_percent: Tỷ suất lợi nhuận (ví dụ: 0.2 cho 20%)
            vat_percent: Thuế VAT (mặc định 10%)
        
        Returns:
            dict: {
                "import_price": float,
                "wholesale_price": float, # Giá sỉ = Giá nhập * (1 + margin)
                "retail_price": float,    # Giá bán lẻ = Giá sỉ * (1 + VAT)
                "profit_margin": float
            }
        """
        if import_price < 0:
            raise ValueError("Giá nhập không được âm")
            
        wholesale_price = import_price * (1 + margin_percent)
        retail_price = wholesale_price * (1 + vat_percent)
        
        return {
            "import_price": import_price,
            "wholesale_price": wholesale_price,
            "retail_price": retail_price,
            "profit_margin": import_price * margin_percent
        }
