import sys
from pathlib import Path
import pytest

# Ensure 'app' is importable
CURRENT_FILE = Path(__file__).resolve()
POSSIBLE_PATHS = [
    CURRENT_FILE.parent.parent / "backend",
    CURRENT_FILE.parent.parent,
]
for p in POSSIBLE_PATHS:
    if (p / "app").exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

from app.services.price_calculation import PriceCalculationService

def test_calculate_prices_success():
    import_price = 100.0
    margin = 0.2
    vat = 0.1
    
    result = PriceCalculationService.calculate_prices(import_price, margin, vat)
    
    assert result["import_price"] == 100.0
    assert result["wholesale_price"] == 120.0
    assert result["retail_price"] == 132.0
    assert result["profit_margin"] == 20.0


from app.services.currency_conversion import CurrencyConversionService
from app.services.data_validation import DataValidationService

def test_currency_conversion_success():
    assert CurrencyConversionService.convert(100.0, "USD", "VND", 25000.0) == 2500000.0

def test_currency_conversion_negative_amount():
    with pytest.raises(ValueError, match="Số tiền không được âm"):
        CurrencyConversionService.convert(-100.0, "USD", "VND", 25000.0)

def test_data_validation_sku_valid():
    assert DataValidationService.is_valid_sku("SKU123") is True

def test_data_validation_sku_invalid_short():
    assert DataValidationService.is_valid_sku("SKU") is False

def test_data_validation_sku_invalid_chars():
    assert DataValidationService.is_valid_sku("SKU-123") is False

def test_calculate_prices_negative_import_price():
    with pytest.raises(ValueError, match="Giá nhập không được âm"):
        PriceCalculationService.calculate_prices(-10.0, 0.2)

def test_calculate_prices_zero_import_price():
    result = PriceCalculationService.calculate_prices(0.0, 0.2)
    assert result["import_price"] == 0.0
    assert result["wholesale_price"] == 0.0
    assert result["retail_price"] == 0.0
