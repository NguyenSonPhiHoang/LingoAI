# Hướng Dẫn Tạo Bài Test Reading Có Đính Kèm Bài Đọc

## Vấn Đề
Khi tạo bài test từ tài liệu đọc (reading documents), bài test không hiển thị bài đọc gốc khi học sinh làm bài.

## Giải Pháp Đã Thực Hiện
Đã cập nhật code để tự động hiển thị bài đọc khi làm test. Bài đọc sẽ xuất hiện ở trên mỗi câu hỏi thuộc về passage tương ứng.

## Cách Tạo Bài Test Mới Có Bài Đọc

### Bước 1: Tạo VTEP Document
1. Vào trang **VTEP** (Admin/Teacher)
2. Click **Create New Document** hoặc upload PDF

### Bước 2: Thêm Bài Đọc và Câu Hỏi
1. Chọn document vừa tạo
2. Click **Add Items**
3. Chọn skill: **Reading**
4. Nhập bài đọc vào ô **"Reading Passage Input"**
5. Nhập câu hỏi theo format:

```
PASSAGE 1

[Nội dung bài đọc]

1. What is the main idea?
A. Option A
B. Option B
C. Option C
D. Option D
Answer: A

2. According to the passage...
A. Option A
B. Option B
C. Option C
D. Option D
Answer: B
```

### Bước 3: Parse và Lưu
1. Click **"Parse passages + questions"**
2. Kiểm tra kết quả parse
3. Click **"Save Items to Document"**

### Bước 4: Tạo Test
1. Vào tab **"Practice Set"**
2. Chọn document vừa tạo
3. Chọn số câu hỏi muốn lấy
4. Click **"Generate Practice Set"**
5. Click **"Save as VTEP Test"**

## Kết Quả
- Khi học sinh mở test và làm bài, bài đọc sẽ tự động hiển thị phía trên câu hỏi
- Mỗi passage chỉ hiển thị cho các câu hỏi thuộc passage đó
- Bài đọc được format đẹp mắt với viền xanh và icon sách

## Lưu Ý
- Các test được tạo trước khi có tính năng này sẽ KHÔNG hiển thị bài đọc
- Để có bài đọc, cần tạo lại test mới theo hướng dẫn trên
- Đảm bảo câu hỏi có `part` = "Passage 1", "Passage 2", v.v. để hệ thống biết hiển thị đúng bài đọc
