# Quản Lý Skill Thống Nhất

## Tổng Quan

Từ ngày 2026-02-03, tất cả các giá trị `Skill` trong hệ thống được quản lý tập trung qua bảng `Skills`. Điều này đảm bảo:

✅ **Tính nhất quán**: Tất cả các bảng sử dụng cùng tập skill values
✅ **Data integrity**: Foreign key constraints ngăn chặn skill values không hợp lệ  
✅ **Dễ bảo trì**: Thêm/sửa skill chỉ cần update một nơi
✅ **Dễ mapping**: Có thể JOIN giữa các bảng dựa trên Skill

---

## Bảng Skills Reference

### Schema

```sql
CREATE TABLE dbo.Skills (
  Id NVARCHAR(50) NOT NULL PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  DisplayName NVARCHAR(100) NOT NULL,
  Description NVARCHAR(500) NULL,
  Category NVARCHAR(50) NULL,
  SortOrder INT NOT NULL DEFAULT 0,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIMEOFFSET NOT NULL,
  UpdatedAt DATETIMEOFFSET NULL
);
```

### Standard Skills

| Id | DisplayName | Category | Description |
|----|-------------|----------|-------------|
| `Listening` | Listening Comprehension | language | Ability to understand spoken English |
| `Speaking` | Speaking Production | language | Ability to produce spoken English |
| `Reading` | Reading Comprehension | language | Ability to understand written English |
| `Writing` | Writing Production | language | Ability to produce written English |
| `Pronunciation` | Pronunciation | language | Ability to pronounce English correctly |
| `vocabulary` | Vocabulary Knowledge | language | Knowledge of English vocabulary |
| `Grammar` | Grammar Knowledge | language | Knowledge of English grammar rules |
| `Listening/Reading` | Combined Listening and Reading | language | Combined listening and reading skills |

---

## Các Bảng Có FK Constraints

### 1. Tests Table
```sql
ALTER TABLE dbo.Tests
  ADD CONSTRAINT FK_Tests_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

**Usage:**
```typescript
await TestRepository.create({
  userId,
  skill: "Listening", // Must exist in Skills table
  // ...
});
```

### 2. TestItems Table
```sql
ALTER TABLE dbo.TestItems
  ADD CONSTRAINT FK_TestItems_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

### 3. VtepTestItems Table
```sql
ALTER TABLE dbo.VtepTestItems
  ADD CONSTRAINT FK_VtepTestItems_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

### 4. LearningResources Table
```sql
ALTER TABLE dbo.LearningResources
  ADD CONSTRAINT FK_LearningResources_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

### 5. LibraryDocuments Table
```sql
ALTER TABLE dbo.LibraryDocuments
  ADD CONSTRAINT FK_LibraryDocuments_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

### 6. VtepTests Table
```sql
ALTER TABLE dbo.VtepTests
  ADD CONSTRAINT FK_VtepTests_Skill
    FOREIGN KEY (Skill) REFERENCES dbo.Skills(Id);
```

---

## Cách Sử Dụng

### ✅ ĐÚNG: Sử dụng Skill Có Trong Bảng

```typescript
// Backend - Controller
const result = await TestRepository.create({
  userId: req.user.id,
  type: "vtep",
  skill: "Listening", // ✅ Có trong Skills table
  score: 85,
  // ...
});

// Frontend
await apiPost("/api/tests", {
  skill: "Reading", // ✅ Có trong Skills table
  // ...
});
```

### ❌ SAI: Sử dụng Skill Không Có Trong Bảng

```typescript
// ❌ Lỗi FK constraint violation
await TestRepository.create({
  skill: "listening", // ❌ Sai! Phải là "Listening" (PascalCase)
});

await TestRepository.create({
  skill: "reading comprehension", // ❌ Sai! Không tồn tại
});

await TestRepository.create({
  skill: "VTEP", // ❌ Sai! Không phải là skill
});
```

---

## Thêm Skill Mới

### Bước 1: Insert vào bảng Skills

```sql
INSERT INTO dbo.Skills (Id, Name, DisplayName, Description, Category, SortOrder, IsActive, CreatedAt)
VALUES (
  'NewSkill',
  'NewSkill',
  'New Skill Display Name',
  'Description of the new skill',
  'language',
  10,
  1,
  SYSDATETIMEOFFSET()
);
```

### Bước 2: Sử dụng trong code

```typescript
// Bây giờ có thể dùng "NewSkill"
await TestRepository.create({
  skill: "NewSkill",
  // ...
});
```

---

## Query Examples

### Lấy tất cả skills đang active

```sql
SELECT Id, DisplayName, Description, Category
FROM dbo.Skills
WHERE IsActive = 1
ORDER BY SortOrder;
```

### Xem distribution của tests theo skill

```sql
SELECT 
  s.DisplayName,
  COUNT(t.Id) as TestCount,
  AVG(t.Score) as AvgScore
FROM dbo.Skills s
LEFT JOIN dbo.Tests t ON t.Skill = s.Id
WHERE s.IsActive = 1
GROUP BY s.Id, s.DisplayName
ORDER BY TestCount DESC;
```

### Mapping skills giữa các bảng

```sql
-- Tất cả tests, test items, và learning resources cho một skill
SELECT 
  'Test' as SourceTable,
  t.Id as RecordId,
  t.CreatedAt,
  t.Score,
  s.DisplayName as Skill
FROM dbo.Tests t
JOIN dbo.Skills s ON s.Id = t.Skill
WHERE t.UserId = @UserId

UNION ALL

SELECT 
  'TestItem' as SourceTable,
  ti.Id,
  ti.CreatedAt,
  ti.Score,
  s.DisplayName
FROM dbo.TestItems ti
JOIN dbo.Skills s ON s.Id = ti.Skill
WHERE ti.UserId = @UserId

UNION ALL

SELECT 
  'LearningResource' as SourceTable,
  lr.Id,
  lr.CreatedAt,
  NULL as Score,
  s.DisplayName
FROM dbo.LearningResources lr
JOIN dbo.Skills s ON s.Id = lr.Skill

ORDER BY CreatedAt DESC;
```

---

## Validation & Error Handling

### Backend Validation

Tạo helper function để validate skill:

```typescript
// backend/src/utils/skill-validator.ts
import { getPool } from "../db";

export async function isValidSkill(skillId: string): Promise<boolean> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("SkillId", skillId)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.Skills
      WHERE Id = @SkillId AND IsActive = 1
    `);
  
  return result.recordset[0].count > 0;
}

export async function validateSkill(skillId: string | null): Promise<void> {
  if (skillId === null) return; // NULL is allowed
  
  const valid = await isValidSkill(skillId);
  if (!valid) {
    throw new Error(`Invalid skill: ${skillId}. Must be one of the values in Skills table.`);
  }
}
```

### Controller Usage

```typescript
// backend/src/controllers/test.controller.ts
import { validateSkill } from "../utils/skill-validator";

static async create(req: AuthRequest, res: Response) {
  const { skill, ...data } = req.body;
  
  try {
    // Validate skill before creating test
    await validateSkill(skill);
    
    const result = await TestRepository.create({
      skill,
      ...data
    });
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Invalid skill')) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
}
```

### Frontend Validation

```typescript
// src/constants/skills.ts
export const VALID_SKILLS = [
  "Listening",
  "Speaking",
  "Reading",
  "Writing",
  "Pronunciation",
  "vocabulary",
  "Grammar",
  "Listening/Reading"
] as const;

export type SkillType = typeof VALID_SKILLS[number];

// src/services/test-service.ts
export function validateSkill(skill: string): boolean {
  return VALID_SKILLS.includes(skill as SkillType);
}
```

---

## Migration Files

1. **20260203_add_skills_reference_table.sql**
   - Tạo bảng Skills
   - Insert standard skill values
   - Add FK constraints to all related tables

2. **20260203_fix_writing_submission_fk.sql** (related)
   - Fix VtepWritingSubmissions FK constraints
   - Separate TestTemplateId and TestInstanceId

---

## Testing & Verification

### Test FK Constraints

```sql
-- ✅ Should succeed
INSERT INTO dbo.Tests (Id, UserId, Type, Skill, CreatedAt)
VALUES (NEWID(), 'test-user', 'vtep', 'Listening', SYSDATETIMEOFFSET());

-- ❌ Should fail with FK constraint error
INSERT INTO dbo.Tests (Id, UserId, Type, Skill, CreatedAt)
VALUES (NEWID(), 'test-user', 'vtep', 'InvalidSkill', SYSDATETIMEOFFSET());
```

### Check All Skills

```sql
-- List all skills with usage count
SELECT 
  s.Id,
  s.DisplayName,
  s.IsActive,
  COUNT(DISTINCT t.Id) as TestCount,
  COUNT(DISTINCT ti.Id) as TestItemCount,
  COUNT(DISTINCT lr.Id) as ResourceCount
FROM dbo.Skills s
LEFT JOIN dbo.Tests t ON t.Skill = s.Id
LEFT JOIN dbo.TestItems ti ON ti.Skill = s.Id
LEFT JOIN dbo.LearningResources lr ON lr.Skill = s.Id
GROUP BY s.Id, s.DisplayName, s.IsActive
ORDER BY s.SortOrder;
```

---

## Best Practices

### 1. **Luôn Sử Dụng PascalCase**
- ✅ "Listening", "Reading", "Speaking", "Writing"
- ❌ "listening", "LISTENING", "reading comprehension"
- **Exception**: "vocabulary" (lowercase, legacy reason)

### 2. **NULL Values Are Allowed**
- Tests.Skill, TestItems.Skill, VtepTestItems.Skill: Cho phép NULL
- LearningResources.Skill, LibraryDocuments.Skill: NOT NULL

### 3. **Check Active Status**
- Khi query skills, filter by `IsActive = 1`
- Inactive skills vẫn tồn tại cho data integrity

### 4. **Don't Delete Skills**
- Set `IsActive = 0` thay vì DELETE
- Giữ historical data integrity

### 5. **Add New Skills via Migration**
- Không hardcode insert trong application code
- Tạo migration file mới để add skills

---

## Troubleshooting

### FK Constraint Error

**Error:**
```
The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Tests_Skill"
```

**Solution:**
```sql
-- Check if skill exists
SELECT * FROM dbo.Skills WHERE Id = 'YourSkillValue';

-- If not exists, insert it
INSERT INTO dbo.Skills (Id, Name, DisplayName, Category, SortOrder, IsActive, CreatedAt)
VALUES ('YourSkillValue', 'YourSkillValue', 'Your Skill Display', 'language', 99, 1, SYSDATETIMEOFFSET());
```

### Case Sensitivity

SQL Server collation mặc định là case-insensitive, nhưng để consistency:
- Backend: Enforce exact casing in TypeScript
- Database: Store exact values as defined in Skills table

---

## Related Files

- Migration: [backend/db/migrations/20260203_add_skills_reference_table.sql](../backend/db/migrations/20260203_add_skills_reference_table.sql)
- Schema: [backend/db/schema.sql](../backend/db/schema.sql) (các bảng có Skill column)
- Documentation: [SKILL_TRACKING_IMPLEMENTATION.md](./SKILL_TRACKING_IMPLEMENTATION.md)

---

## Summary

✅ **Bảng Skills** là single source of truth cho tất cả skill values
✅ **FK Constraints** đảm bảo data integrity
✅ **Mapping dễ dàng** giữa Tests, TestItems, VtepTests, LearningResources, LibraryDocuments
✅ **Thêm skill mới** chỉ cần INSERT vào Skills table
✅ **Query linh hoạt** với JOIN qua Skills table

⚠️ **Quan trọng**: Luôn check Skills table trước khi insert data vào các bảng related!
