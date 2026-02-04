# Tài Liệu: Triển Khai Lưu Skill Cho Tất Cả Bài Test

## Tổng Quan
Đã cập nhật toàn bộ hệ thống để đảm bảo tất cả các bài test đều lưu skill tương ứng vào bảng `Tests` và `TestItems` để phục vụ việc đánh giá kết quả người dùng theo từng kỹ năng.

## Các Luồng Đã Cập Nhật

### 1. Backend - VTEP Test Instantiation

#### 1.1. VTEP Listening/Reading Instantiate
**File:** `backend/src/controllers/vteptest.controller.ts`

```typescript
await TestRepository.create({
  id: testId,
  userId: userId,
  type: "vtep",
  skill: vtepTest.skill || null, // ✅ Lấy skill từ template
  data: JSON.stringify(testData),
});
```

**Skill source:** Lấy từ `VtepTests` template dựa trên:
- Nếu có Writing prompt → `"Writing"`
- Nếu có Listening + Reading items → `"Listening/Reading"`
- Nếu chỉ có Listening → `"Listening"`
- Nếu chỉ có Reading → `"Reading"`

#### 1.2. VTEP Speaking Instantiate
**File:** `backend/src/controllers/vtepSpeaking.controller.ts`

```typescript
await TestRepository.create({
  id: testId,
  userId: userId,
  type: "vtep",
  skill: "Speaking", // ✅ Luôn là "Speaking"
  data: JSON.stringify(testData),
});
```

### 2. Frontend - Test Creation & Submission

#### 2.1. Placement Test
**File:** `src/components/lingo/placement-test.tsx`

```typescript
await addTestResult(user.uid, {
  correctAnswers: totalCorrect,
  totalQuestions: questions.length,
  percentage: (totalCorrect / questions.length) * 100,
  recommendedLevel: recLevel,
  testType: "Placement Test",
  skill: "reading", // ✅ Placement test là reading comprehension
  durationSeconds: durationTaken,
  data: { ... }
});
```

**Items skill:** Mỗi item có `skill: "reading"`

#### 2.2. Review Test
**File:** `src/components/lingo/review-test-view.tsx`

```typescript
await addTestResult(user.uid, {
  correctAnswers: totalCorrect,
  totalQuestions: allQuestions.length,
  percentage: scorePercentage,
  testType: "Review Test",
  skill: "reading", // ✅ Review test chủ yếu là reading + vocab
  durationSeconds: durationTaken,
  data: { ... }
});
```

**Items skill:** 
- Vocab questions: `skill: "vocabulary"`
- Reading questions: `skill: "reading"`

#### 2.3. Practice Tests (Lesson-based)
**File:** `src/components/lingo/lesson-detail-view.tsx`

Tất cả các practice tests đều đã có `skill` field:

**Reading Practice:**
```typescript
await addTestResult(user.uid, {
  testType: "Practice",
  skill, // ✅ Từ lesson.skill
  ...
});
```

**Writing Practice:**
```typescript
await addTestResult(user.uid, {
  testType: "Practice",
  skill, // ✅ Từ lesson.skill
  ...
});
```

**Listening Practice, Speaking Practice, Pronunciation Practice:** Tương tự

#### 2.4. Review Exercises
**File:** `src/components/lingo/review-view.tsx`

```typescript
addTestResult(user.uid, {
  testType: "Practice",
  skill: "vocabulary", // ✅ Review exercises là vocabulary
  ...
});
```

#### 2.5. VTEP Student Submissions
**File:** `src/app/vtep-student/page.tsx`

**Writing/Listening/Reading Tests:**
```typescript
// Xác định skill từ items
const skillSet = new Set(
  itemsForTest
    .map((it) => it.skill)
    .filter((s): s is string => !!s)
);
let testSkill: string | null = null;
if (skillSet.size === 1) {
  testSkill = Array.from(skillSet)[0];
} else if (skillSet.has('Writing')) {
  testSkill = 'Writing';
} else if (skillSet.has('Listening') && skillSet.has('Reading')) {
  testSkill = 'Listening/Reading';
}

const payload = {
  skill: testSkill, // ✅ Auto-detect từ items
  score: percentage,
  ...
};
```

**Speaking Tests:**
```typescript
const updatePayload = {
  skill: "Speaking", // ✅ Luôn là Speaking
  score: 0,
  ...
};
```

### 3. Backend - Test Storage

#### 3.1. Tests Table
**Stored Procedure:** `sp_Tests_Insert`, `sp_Tests_Update`

Các field được lưu:
```sql
- Skill NVARCHAR(50) NULL
- TotalQuestions INT NULL
- CorrectAnswers INT NULL
- DurationSeconds INT NULL
- Score FLOAT NULL
- ClientCreatedAt DATETIMEOFFSET NULL
- CompletedAt DATETIMEOFFSET NULL
```

#### 3.2. TestItems Table
**Stored Procedure:** `sp_TestItems_Insert`

Các field được lưu:
```sql
- TestId UNIQUEIDENTIFIER NOT NULL
- Skill NVARCHAR(50) NULL
- Kind NVARCHAR(50) NULL
- IsCorrect BIT NULL
- Score FLOAT NULL
- Data NVARCHAR(MAX) NULL
```

## Luồng Dữ Liệu Skill

### Từ Template đến Test Instance

```
VtepTests.skill
    ↓
VtepTestController.instantiate()
    ↓
TestRepository.create({ skill: vtepTest.skill })
    ↓
Tests.Skill (database)
    ↓
Insights API: /api/insights/me
    ↓
Dashboard Overall Skills
```

### Từ Frontend đến Database

```
Frontend Component (skill field)
    ↓
addTestResult({ skill: "..." })
    ↓
POST /api/tests (skill in payload)
    ↓
TestController.create()
    ↓
sp_Tests_Insert (Skill parameter)
    ↓
Tests.Skill (database)
```

## Cách Skill Được Sử Dụng

### 1. Dashboard Overview
**File:** `src/components/lingo/dashboard-overview.tsx`

```typescript
// Lấy insights từ API
const insights = await getMyInsights(30, token);

// insights.bySkill chứa:
[
  { skill: "Listening", attempts: 5, avgScore: 75, accuracy: 0.8 },
  { skill: "Speaking", attempts: 3, avgScore: 65, accuracy: null },
  { skill: "Reading", attempts: 10, avgScore: 85, accuracy: 0.9 },
  { skill: "Writing", attempts: 2, avgScore: 70, accuracy: null },
  ...
]
```

### 2. Insights API
**File:** `backend/src/controllers/insights.controller.ts`

Query để lấy skill progress:
```sql
SELECT
  Skill,
  COUNT(1) AS Attempts,
  AVG(CASE WHEN Score IS NULL THEN NULL ELSE Score END) AS AvgScore,
  SUM(TotalQuestions) AS TotalQuestions,
  SUM(CorrectAnswers) AS CorrectAnswers
FROM dbo.Tests
WHERE UserId = @UserId
  AND CompletedAt >= @Since
  AND Skill IS NOT NULL
GROUP BY Skill
ORDER BY Attempts DESC;
```

## Skill Values Được Sử Dụng

### Standard Skills
- `"Listening"` - Listening comprehension
- `"Speaking"` - Speaking practice/tests
- `"Reading"` - Reading comprehension
- `"Writing"` - Writing tasks
- `"Pronunciation"` - Pronunciation exercises
- `"vocabulary"` - Vocabulary reviews (lowercase trong một số chỗ)

### Combined Skills
- `"Listening/Reading"` - VTEP tests có cả hai
- `"Listening/Speaking"` - Nếu có test kết hợp (hiếm)

## Kiểm Tra & Validation

### Kiểm tra skill đã được lưu
```sql
-- Xem distribution của skills
SELECT Skill, COUNT(*) as Count
FROM dbo.Tests
WHERE Skill IS NOT NULL
GROUP BY Skill
ORDER BY Count DESC;

-- Xem tests gần đây có skill
SELECT TOP 20
  Id,
  Type,
  Skill,
  Score,
  TotalQuestions,
  CorrectAnswers,
  CreatedAt
FROM dbo.Tests
WHERE UserId = '<user-id>'
ORDER BY CreatedAt DESC;
```

### Kiểm tra TestItems có skill
```sql
SELECT TOP 20
  ti.TestId,
  ti.Skill,
  ti.Kind,
  ti.IsCorrect,
  ti.Score,
  t.Type as TestType
FROM dbo.TestItems ti
JOIN dbo.Tests t ON t.Id = ti.TestId
WHERE t.UserId = '<user-id>'
ORDER BY ti.CreatedAt DESC;
```

## Notes & Best Practices

1. **Skill Naming Convention:**
   - Sử dụng PascalCase: "Listening", "Speaking", "Reading", "Writing", "Pronunciation"
   - Exception: "vocabulary" (lowercase) trong review exercises

2. **Skill Detection:**
   - VTEP tests: Skill được xác định từ template khi instantiate
   - Practice tests: Skill từ lesson.skill
   - Review/Placement: Hard-coded "reading"/"vocabulary"

3. **Backward Compatibility:**
   - Tests cũ không có skill vẫn hoạt động bình thường
   - Query insights sử dụng `WHERE Skill IS NOT NULL` để filter

4. **Future Enhancements:**
   - Normalize skill values (tất cả dùng PascalCase)
   - Add skill validation ở backend
   - Support multi-skill tests (array thay vì string)

## Testing Checklist

- [x] VTEP Listening/Reading instantiate lưu skill
- [x] VTEP Speaking instantiate lưu skill
- [x] Placement test lưu skill
- [x] Review test lưu skill
- [x] Practice tests lưu skill
- [x] VTEP student submissions lưu skill
- [x] Insights API query skill correctly
- [x] Dashboard hiển thị skill progress

## Date
Created: February 3, 2026
Last Updated: February 3, 2026
