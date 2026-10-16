# Issue #2: Bổ sung và hoàn thiện bộ Unit Test cho Backend API

## 1. Mục tiêu (Objective)
Thiết lập và viết đầy đủ các unit test cho toàn bộ module nghiệp vụ backend của ứng dụng Quản lý Giá Hàng hóa (`goods_price_management`). Đảm bảo các logic tính toán giá cả, chuyển đổi tiền tệ, validation dữ liệu và các API endpoint xử lý nghiệp vụ chính xác, cô lập và đạt độ bao phủ (code coverage) tối thiểu 80%.

---

## 2. Phạm vi kiểm thử (Scope of Work)

### A. Core Services & Business Logic
- [x] **Goods Price Calculation Service**:
  - [x] Test tính toán giá nhập, giá bán lẻ, giá sỉ và tỷ suất lợi nhuận.
  - [x] Test áp dụng thuế VAT, chiết khấu phần trăm và chiết khấu cố định.
  - [x] Test trường hợp dữ liệu biên: giá trị bằng 0, số âm, số lẻ thập phân lớn.
- [x] **Currency Conversion Service**:
  - [x] Test tỷ giá quy đổi giữa các đơn vị tiền tệ.
  - [x] Test cơ chế fallback khi tỷ giá bên ngoài không khả dụng hoặc trả về null.
- [x] **Data Validation & Sanitization**:
  - [x] Test kiểm tra ràng buộc mã sản phẩm (SKU/Barcode) hợp lệ và không trùng lặp.
  - [x] Test từ chối payload thiếu trường bắt buộc hoặc sai định dạng.

### B. Controller / API Endpoints (Integration/Unit API Tests)
- [ ] **Goods Controller**:
  - [ ] `GET /api/goods`: Test trả về danh sách có phân trang và bộ lọc.
  - [ ] `POST /api/goods`: Test tạo mới hàng hóa thành công và xử lý lỗi validate (400 Bad Request).
  - [ ] `PUT /api/goods/:id/price`: Test cập nhật giá và lưu lịch sử biến động giá.
  - [ ] `DELETE /api/goods/:id`: Test xóa mềm / xóa thành công và xử lý trường hợp không tìm thấy (404 Not Found).
- [ ] **Mocking & Database Isolation**:
  - [ ] Mock toàn bộ lời gọi cơ sở dữ liệu (ORM/Repository) hoặc sử dụng SQLite In-Memory / Test DB cô lập.
  - [ ] Không để unit test ghi đè dữ liệu vào môi trường dev thực tế.

---

## 3. Checklist công việc dành cho Agent (Agent Implementation Checklist)

- [ ] **Khảo sát cấu trúc**: Đọc file cấu hình backend (`package.json`, `.csproj`, hoặc cấu hình test framework hiện có trong thư mục backend).
- [ ] **Môi trường Test**: Cài đặt hoặc tinh chỉnh test runner (Jest, Vitest, hoặc xUnit/NUnit tùy theo stack backend của dự án) kèm runner script trong file cấu hình.
- [ ] **Viết Test Cases**: Tạo các file test tương ứng tại thư mục `tests/` hoặc `__tests__/` theo danh sách phạm vi ở trên.
- [ ] **Tối ưu hóa chạy test**:
  - [ ] Đảm bảo test chạy độc lập, không phụ thuộc vào thứ tự thực thi.
  - [ ] Chạy test bằng lệnh tóm tắt (reporter basic) để hạn chế log quá dài, tránh quá tải token.
- [ ] **Kiểm tra Pass 100%**: Thực thi lệnh test toàn bộ và xác nhận không có test case nào bị fail.
- [ ] **Cập nhật tài liệu**: Đánh dấu hoàn thành toàn bộ checklist trong file này sau khi test pass.

---

## 4. Tiêu chí nghiệm thu (Definition of Done)
1. Lệnh chạy test backend (`npm run test:backend` hoặc lệnh tương đương) thực thi thành công 100% không báo lỗi.
2. Tất cả các ca kiểm thử chính (Happy path, Edge cases, Error handling) đều được bao phủ.
3. Không làm thay đổi logic hoạt động của các API hiện tại (trừ trường hợp sửa bug logic được test phát hiện).
