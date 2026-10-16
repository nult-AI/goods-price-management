class CurrencyConversionService:
    @staticmethod
    def convert(amount: float, from_currency: str, to_currency: str, rate: float):
        """
        Quy đổi tiền tệ đơn giản.
        """
        if amount < 0:
            raise ValueError("Số tiền không được âm")
        if rate <= 0:
            raise ValueError("Tỷ giá phải lớn hơn 0")
            
        return amount * rate
