title:	Create Unit Test for front-end
state:	OPEN
author:	nult2003 (Minh Nhat)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	1
--
### Mục tiêu
Tạo bộ unit test toàn diện cho các component và trang front-end chính của dự án.

### Công nghệ & Môi trường Test
- Framework: Vitest / Jest (kèm @testing-library/react)
- Vị trí lưu test: Thư mục `frontend/src/__tests__/` (hoặc đặt cạnh component với đuôi `.test.tsx`)

### Phạm vi kiểm thử (Scope)
Hãy tạo unit test cho các component / trang sau:
1. `frontend/src/components/...` (ví dụ: Button, Form nhập giá sản phẩm)
2. `frontend/src/pages/...` (ví dụ: Trang danh sách giá, Trang chi tiết)

### Các kịch bản cần bao phủ (Scenarios)
- [x] **Render thành công:** Component hiển thị đúng dữ liệu mặc định khi truyền props hợp lệ.
- [x] **Tương tác người dùng (User Events):** Test sự kiện click button, nhập input, submit form với dữ liệu hợp lệ và không hợp lệ.
- [x] **Xử lý trạng thái API (Mocking):**
  - Trạng thái đang tải (Loading spinner / skeleton).
  - Trạng thái thành công: Mock API trả về danh sách giá và hiển thị đúng vào bảng.
  - Trạng thái lỗi (400, 500): Hiển thị thông báo lỗi hoặc alert phù hợp.
- [x] **Validation:** Báo lỗi khi để trống trường bắt buộc hoặc nhập số âm.

### Yêu cầu kỹ thuật
- Mock toàn bộ các lệnh gọi API (không gọi trực tiếp tới backend thật).
- Chạy lệnh kiểm tra bằng: `npm test` (hoặc `yarn test` / `pnpm test`). Đảm bảo toàn bộ test case đều PASS.
