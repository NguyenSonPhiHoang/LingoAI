# ❌ TẠI SAO KHÔNG CÓ DỮ LIỆU TRONG TESTS VÀ TESTITEMS?

## 🔴 VẤN ĐỀ

Bạn đã **TẠO TEST TEMPLATE** nhưng không thấy dữ liệu trong bảng `Tests` và `TestItems`.

## ✅ GIẢI THÍCH

Speaking test có **3 BƯỚC** riêng biệt:

### 📝 BƯỚC 1: Tạo Test Template (Admin/Teacher)
- **Làm gì:** Tạo template/mẫu bài test
- **API:** `POST /api/vtep-speaking/tests`
- **Lưu vào:** `VtepSpeakingTests` (chỉ template)
- **KHÔNG lưu vào:** `Tests`, `TestItems`

```sql
-- Kiểm tra templates đã tạo
SELECT * FROM VtepSpeakingTests;
```

### 🎯 BƯỚC 2: Student Bắt Đầu Làm Bài (Instantiate)
- **Làm gì:** Student click "Start Test" 
- **API:** `POST /api/vtep-speaking/tests/:id/instantiate`
- **Lưu vào:** `Tests` (tạo 1 row mới)
  - `skill = "Speaking"`
  - `score = NULL` (chưa có điểm)
  - `completedAt = NULL` (chưa nộp)
- **CHƯA lưu vào:** `TestItems` (chưa có items)

```sql
-- Kiểm tra tests đã instantiate
SELECT * FROM Tests 
WHERE Type = 'vtep' AND Skill = 'Speaking';
```

### ✅ BƯỚC 3: Student Nộp Bài (Submit)
- **Làm gì:** Student record audio và click "Submit"
- **API:** `PUT /api/tests/:id`
- **Update:** `Tests` 
  - `score = 0` (chờ chấm)
  - `completedAt = <timestamp>`
- **Tạo mới:** `TestItems` (nhiều rows cho từng prompt)

```sql
-- Kiểm tra test items đã submit
SELECT * FROM TestItems 
WHERE Skill = 'Speaking';
```

## 🚨 NGUYÊN NHÂN CỦA VẤN ĐỀ

Bạn **CHỈ LÀM BƯỚC 1** (tạo template) mà **CHƯA LÀM BƯỚC 2 & 3**.

Nếu:
- ✅ Có trong `VtepSpeakingTests` → Template đã tạo
- ❌ Không có trong `Tests` → Chưa có student nào bắt đầu làm
- ❌ Không có trong `TestItems` → Chưa có student nào nộp bài

## 📋 CÁCH KIỂM TRA

### 1. Kiểm tra template có tồn tại không:
```sql
SELECT Id, Title, IsActive, IsPublic 
FROM VtepSpeakingTests
ORDER BY CreatedAt DESC;
```

**Nếu có:** ✅ Template đã tạo thành công

### 2. Kiểm tra có student bắt đầu làm chưa:
```sql
SELECT Id, UserId, Score, CompletedAt, CreatedAt
FROM Tests
WHERE Type = 'vtep' AND Skill = 'Speaking'
ORDER BY CreatedAt DESC;
```

**Nếu trống:** ❌ Chưa có student nào click "Start Test"

### 3. Kiểm tra có student nộp bài chưa:
```sql
SELECT TestId, COUNT(*) as ItemCount
FROM TestItems
WHERE Skill = 'Speaking'
GROUP BY TestId;
```

**Nếu trống:** ❌ Chưa có student nào nộp bài

## ✅ CÁCH SỬA

### Để có dữ liệu trong `Tests` và `TestItems`:

1. **Đảm bảo test Active và Public:**
   ```sql
   UPDATE VtepSpeakingTests 
   SET IsActive = 1, IsPublic = 1 
   WHERE Id = '<test-id>';
   ```

2. **Vào trang Student:**
   - Truy cập: `/vtep-student`
   - Chọn speaking test
   - Click **"Start Test"** → Tạo row trong `Tests`

3. **Làm bài và nộp:**
   - Record audio cho các prompts
   - Click **"Submit Test"** → Tạo rows trong `TestItems`

## 📊 SO SÁNH CÁC BẢNG

| Bảng | Khi nào có dữ liệu | Lưu gì |
|------|-------------------|--------|
| `VtepSpeakingTests` | Admin tạo template | Template/mẫu bài test |
| `Tests` | Student click "Start Test" | Thông tin bài làm của student |
| `TestItems` | Student click "Submit Test" | Chi tiết từng câu trả lời |

## 🎓 KẾT LUẬN

- `VtepSpeakingTests` = **Template** (mẫu bài test)
- `Tests` = **Instance** (bài làm của student)
- `TestItems` = **Answers** (câu trả lời chi tiết)

**Template ≠ Instance**

Giống như:
- Template = Đề thi trắc nghiệm (mẫu chung)
- Instance = Bài thi của 1 học sinh cụ thể
- Items = Từng câu trả lời của học sinh đó

---

## 🔍 DEBUG STEPS

1. Check template exists:
   ```sql
   SELECT * FROM VtepSpeakingTests;
   ```

2. Check active tests available:
   ```sql
   SELECT * FROM VtepSpeakingTests WHERE IsActive=1 AND IsPublic=1;
   ```

3. Check student tests:
   ```sql
   SELECT * FROM Tests WHERE Skill='Speaking';
   ```

4. Check test items:
   ```sql
   SELECT * FROM TestItems WHERE Skill='Speaking';
   ```

5. Check frontend logs:
   - Open browser console
   - Navigate to `/vtep-student`
   - Look for "instantiate" API calls

---

## 💡 TÓM TẮT

**Vấn đề:** Bạn tạo template (admin) nhưng chưa có student nào làm bài.

**Giải pháp:** 
1. Đảm bảo test `IsActive=1` và `IsPublic=1`
2. Vào `/vtep-student` với tài khoản student
3. Click "Start Test" 
4. Record và Submit

Sau đó mới có dữ liệu trong `Tests` và `TestItems`! 🎉
