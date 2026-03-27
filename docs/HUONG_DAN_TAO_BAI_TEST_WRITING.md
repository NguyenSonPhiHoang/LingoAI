# Hướng Dẫn Tạo Bài Test Writing Cho VSTEP

## Tổng Quan về VSTEP Writing

### Cấu Trúc Bài Thi Writing VSTEP
Theo chuẩn VSTEP (Vietnamese Standardized Test of English Proficiency), phần Writing có cấu trúc như sau:

**Thời gian:** 60 phút  
**Số lượng:** 2 Task

#### Task 1: Letter/Email Writing (Chiếm 33% điểm)
- **Yêu cầu:** Viết thư hoặc email (formal/informal)
- **Độ dài:** Khoảng 120-150 từ
- **Các dạng phổ biến:**
  - Thư yêu cầu thông tin (Request for information)
  - Thư khiếu nại (Complaint letter)
  - Thư cảm ơn (Thank you letter)
  - Thư mời (Invitation letter)
  - Thư xin việc (Job application)
  - Email gửi đồng nghiệp/bạn bè

#### Task 2: Essay Writing (Chiếm 67% điểm)
- **Yêu cầu:** Viết bài luận học thuật
- **Độ dài:** Tối thiểu 250 từ
- **Các dạng phổ biến:**
  - Opinion essay (Agree/Disagree)
  - Discussion essay (Discuss both views)
  - Advantages/Disadvantages
  - Problem/Solution essay
  - Two-part question

### Tiêu Chí Chấm Điểm
1. **Task Achievement/Response** (25%): Trả lời đầy đủ yêu cầu
2. **Coherence and Cohesion** (25%): Tính mạch lạc và liên kết
3. **Lexical Resource** (25%): Vốn từ vựng
4. **Grammatical Range and Accuracy** (25%): Ngữ pháp

---

## Thiết Kế Database cho Writing Test

### Bảng: VtepWritingPrompts
Lưu trữ các đề bài Writing (Task 1 và Task 2)

```sql
CREATE TABLE dbo.VtepWritingPrompts (
  Id NVARCHAR(100) PRIMARY KEY,
  TaskType NVARCHAR(20) NOT NULL,  -- 'task1' hoặc 'task2'
  Category NVARCHAR(100) NULL,      -- 'letter', 'email', 'opinion', 'discussion', etc.
  Level NVARCHAR(10) NULL,          -- 'b1', 'b2', 'c1'
  Title NVARCHAR(500) NOT NULL,     -- Tiêu đề ngắn gọn
  PromptText NVARCHAR(MAX) NOT NULL, -- Nội dung đề bài đầy đủ
  SampleAnswer NVARCHAR(MAX) NULL,   -- Bài mẫu (optional)
  KeyPoints NVARCHAR(MAX) NULL,      -- JSON: điểm cần có trong bài
  SuggestedVocab NVARCHAR(MAX) NULL, -- JSON: từ vựng gợi ý
  TimeLimit INT NULL,                -- Thời gian làm bài (phút)
  MinWords INT NULL,                 -- Số từ tối thiểu
  CreatedByUserId NVARCHAR(100) NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);

CREATE INDEX IX_VtepWritingPrompts_TaskType_Level 
  ON dbo.VtepWritingPrompts(TaskType, Level);
```

### Bảng: VtepWritingTests
Bài test Writing đầy đủ (có cả Task 1 và Task 2)

```sql
CREATE TABLE dbo.VtepWritingTests (
  Id NVARCHAR(100) PRIMARY KEY,
  Title NVARCHAR(500) NOT NULL,
  Description NVARCHAR(MAX) NULL,
  Level NVARCHAR(10) NULL,           -- 'b1', 'b2', 'c1'
  Task1PromptId NVARCHAR(100) NULL,  -- FK to VtepWritingPrompts
  Task2PromptId NVARCHAR(100) NULL,  -- FK to VtepWritingPrompts
  TotalTimeMinutes INT DEFAULT 60,
  IsActive BIT DEFAULT 0,
  IsPublic BIT DEFAULT 1,
  CreatedByUserId NVARCHAR(100) NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);
```

### Bảng: VtepWritingSubmissions
Lưu bài làm của học sinh

```sql
CREATE TABLE dbo.VtepWritingSubmissions (
  Id NVARCHAR(100) PRIMARY KEY,
  UserId NVARCHAR(100) NOT NULL,
  TestId NVARCHAR(100) NULL,         -- FK to VtepWritingTests (optional)
  PromptId NVARCHAR(100) NULL,       -- FK to VtepWritingPrompts (for single task)
  TaskType NVARCHAR(20) NOT NULL,    -- 'task1' hoặc 'task2'
  SubmittedText NVARCHAR(MAX) NOT NULL,
  WordCount INT NULL,
  TimeSpentSeconds INT NULL,
  
  -- AI Grading
  AiFeedback NVARCHAR(MAX) NULL,     -- JSON: Feedback từ AI
  AiScore FLOAT NULL,                -- Điểm tổng từ AI (0-10)
  ScoreTaskAchievement FLOAT NULL,   -- Điểm tiểu mục
  ScoreCoherence FLOAT NULL,
  ScoreLexical FLOAT NULL,
  ScoreGrammar FLOAT NULL,
  
  -- Human Grading (optional)
  TeacherFeedback NVARCHAR(MAX) NULL,
  TeacherScore FLOAT NULL,
  GradedByUserId NVARCHAR(100) NULL,
  GradedAt DATETIMEOFFSET NULL,
  
  SubmittedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);

CREATE INDEX IX_VtepWritingSubmissions_User_Submitted 
  ON dbo.VtepWritingSubmissions(UserId, SubmittedAt DESC);
```

---

## Luồng Tạo Tài Liệu và Test

### Bước 1: Tạo Writing Prompts (Đề Bài)

#### 1.1. Trang Admin: Quản Lý Writing Prompts
**Location:** `/src/app/vtep-writing-admin/page.tsx`

**Chức năng:**
- Danh sách tất cả prompts (Task 1 và Task 2)
- Lọc theo: TaskType, Level, Category
- Thêm/Sửa/Xóa prompts
- Import prompts từ file Excel/JSON
- Generate prompts bằng AI

**UI Components:**
```tsx
<WritingPromptsManager>
  <FiltersBar>
    - Task Type: Task 1 / Task 2 / All
    - Level: B1 / B2 / C1 / All
    - Category: Letter / Email / Opinion / Discussion / etc.
  </FiltersBar>
  
  <PromptsList>
    {prompts.map(prompt => (
      <PromptCard key={prompt.id}>
        <Badge>{prompt.taskType}</Badge>
        <Badge>{prompt.level}</Badge>
        <h3>{prompt.title}</h3>
        <p>{truncate(prompt.promptText, 100)}</p>
        <Actions>
          <Button>Edit</Button>
          <Button>Preview</Button>
          <Button>Delete</Button>
        </Actions>
      </PromptCard>
    ))}
  </PromptsList>
  
  <CreatePromptDialog>
    - Task Type (Task 1 / Task 2)
    - Category (dropdown based on task type)
    - Level (B1, B2, C1)
    - Title
    - Prompt Text (rich text editor)
    - Sample Answer (optional)
    - Key Points (JSON array)
    - Suggested Vocabulary (JSON array)
    - Time Limit (minutes)
    - Min Words
  </CreatePromptDialog>
</WritingPromptsManager>
```

#### 1.2. AI Generate Writing Prompts
**Location:** `/src/ai/flows/generate-writing-prompt-flow.ts`

```typescript
export async function generateWritingPrompt(input: {
  taskType: 'task1' | 'task2';
  level: 'b1' | 'b2' | 'c1';
  category: string;
  topic?: string;
}): Promise<WritingPrompt> {
  // AI sẽ generate:
  // - Đề bài chi tiết và rõ ràng
  // - Sample answer (bài mẫu)
  // - Key points cần có
  // - Suggested vocabulary
  // - Rubric/tiêu chí chấm điểm
}
```

**Prompt Template cho AI:**
```
You are an expert VSTEP Writing test creator.

Generate a {taskType} writing prompt for {level} level students.
Category: {category}
Topic (optional): {topic}

For Task 1 (Letter/Email):
- Provide a realistic scenario
- Include 3-4 bullet points of what to write about
- Specify formal or informal tone
- Word count: 120-150 words

For Task 2 (Essay):
- Present a clear topic/question
- Provide context if needed
- Specify essay type (opinion, discussion, etc.)
- Word count: minimum 250 words

Also provide:
1. A sample answer that meets all criteria
2. Key points that should be addressed
3. Suggested vocabulary (10-15 words/phrases)
4. Grading rubric for each criterion
```

---

### Bước 2: Tạo Writing Tests (Bộ Đề Thi)

#### 2.1. Trang Admin: Tạo Writing Test
**Location:** `/src/app/vtep-writing-admin/tests/page.tsx`

**Chức năng:**
- Tạo bộ đề thi có cả Task 1 và Task 2
- Chọn prompts từ danh sách có sẵn
- Hoặc generate ngẫu nhiên theo level
- Set thời gian, trạng thái (active/inactive)

**UI Components:**
```tsx
<WritingTestCreator>
  <TestMetadata>
    - Title
    - Description
    - Level (B1, B2, C1)
    - Total Time (default: 60 minutes)
    - Is Active
    - Is Public
  </TestMetadata>
  
  <TaskSelector>
    <Task1Selector>
      <h3>Task 1: Letter/Email</h3>
      <Select>
        {task1Prompts.map(p => (
          <option value={p.id}>{p.title}</option>
        ))}
      </Select>
      <Button onClick={generateRandomTask1}>Random Task 1</Button>
      <PreviewCard>{selectedTask1Prompt}</PreviewCard>
    </Task1Selector>
    
    <Task2Selector>
      <h3>Task 2: Essay</h3>
      <Select>
        {task2Prompts.map(p => (
          <option value={p.id}>{p.title}</option>
        ))}
      </Select>
      <Button onClick={generateRandomTask2}>Random Task 2</Button>
      <PreviewCard>{selectedTask2Prompt}</PreviewCard>
    </Task2Selector>
  </TaskSelector>
  
  <Actions>
    <Button>Save as Draft</Button>
    <Button>Publish Test</Button>
  </Actions>
</WritingTestCreator>
```

---

### Bước 3: Học Sinh Làm Bài Writing

#### 3.1. Trang Làm Bài: Writing Test Taker
**Location:** `/src/app/vstep-writing-student/page.tsx`

**Chức năng:**
- Hiển thị danh sách bài test available
- Làm bài với timer
- Đếm số từ real-time
- Auto-save draft
- Submit và xem feedback từ AI

**UI Layout:**
```tsx
<WritingTestTaker>
  {!testStarted ? (
    <TestSelection>
      <h2>Available Writing Tests</h2>
      {tests.map(test => (
        <TestCard>
          <h3>{test.title}</h3>
          <Badge>{test.level}</Badge>
          <p>Time: {test.totalTimeMinutes} minutes</p>
          <Button onClick={() => startTest(test.id)}>
            Start Test
          </Button>
        </TestCard>
      ))}
    </TestSelection>
  ) : (
    <TestInterface>
      <Header>
        <h2>{currentTest.title}</h2>
        <Timer>{formatTime(timeRemaining)}</Timer>
      </Header>
      
      <TwoColumnLayout>
        <LeftPanel>
          {/* Task 1 */}
          <TaskSection>
            <TaskHeader>
              <h3>Task 1: Letter/Email</h3>
              <Badge>Suggested time: 20 minutes</Badge>
            </TaskHeader>
            <PromptDisplay>
              {currentTest.task1Prompt.promptText}
            </PromptDisplay>
            <Textarea
              value={task1Answer}
              onChange={handleTask1Change}
              placeholder="Write your letter/email here..."
              rows={15}
            />
            <WordCount>
              Words: {countWords(task1Answer)} / 120-150
            </WordCount>
          </TaskSection>
          
          <Divider />
          
          {/* Task 2 */}
          <TaskSection>
            <TaskHeader>
              <h3>Task 2: Essay</h3>
              <Badge>Suggested time: 40 minutes</Badge>
            </TaskHeader>
            <PromptDisplay>
              {currentTest.task2Prompt.promptText}
            </PromptDisplay>
            <Textarea
              value={task2Answer}
              onChange={handleTask2Change}
              placeholder="Write your essay here..."
              rows={20}
            />
            <WordCount>
              Words: {countWords(task2Answer)} / min 250
            </WordCount>
          </TaskSection>
        </LeftPanel>
        
        <RightPanel>
          <WritingTips>
            <h4>Writing Tips</h4>
            <ul>
              <li>Read the prompt carefully</li>
              <li>Plan your answer (2-3 minutes)</li>
              <li>Use paragraphs</li>
              <li>Check grammar and spelling</li>
              <li>Leave time to review</li>
            </ul>
          </WritingTips>
          
          <VocabularySuggestions>
            <h4>Suggested Vocabulary</h4>
            {suggestedVocab.map(word => (
              <Chip key={word.word}>
                {word.word} - {word.meaning}
              </Chip>
            ))}
          </VocabularySuggestions>
        </RightPanel>
      </TwoColumnLayout>
      
      <Footer>
        <Button variant="outline" onClick={saveDraft}>
          Save Draft
        </Button>
        <Button onClick={submitTest}>
          Submit Test
        </Button>
      </Footer>
    </TestInterface>
  )}
  
  {/* Results Dialog */}
  {showResults && (
    <ResultsDialog>
      <h2>Your Writing Test Results</h2>
      
      <OverallScore>
        <h3>Overall Score: {overallScore}/10</h3>
        <Progress value={overallScore * 10} />
      </OverallScore>
      
      <TaskResults>
        <Task1Results>
          <h4>Task 1 Score: {task1Score}/10</h4>
          <ScoreBreakdown>
            <ScoreItem>
              Task Achievement: {scores.task1.taskAchievement}/10
            </ScoreItem>
            <ScoreItem>
              Coherence: {scores.task1.coherence}/10
            </ScoreItem>
            <ScoreItem>
              Lexical: {scores.task1.lexical}/10
            </ScoreItem>
            <ScoreItem>
              Grammar: {scores.task1.grammar}/10
            </ScoreItem>
          </ScoreBreakdown>
          <FeedbackSection>
            <h5>Feedback:</h5>
            <p>{task1Feedback}</p>
          </FeedbackSection>
        </Task1Results>
        
        <Task2Results>
          {/* Similar structure */}
        </Task2Results>
      </TaskResults>
      
      <Actions>
        <Button onClick={viewDetailedFeedback}>
          View Detailed Feedback
        </Button>
        <Button onClick={close}>Close</Button>
      </Actions>
    </ResultsDialog>
  )}
</WritingTestTaker>
```

---

### Bước 4: AI Chấm Điểm Tự Động

#### 4.1. AI Flow: Grade Writing Submission
**Location:** `/src/ai/flows/grade-writing-submission-flow.ts`

```typescript
export async function gradeWritingSubmission(input: {
  taskType: 'task1' | 'task2';
  prompt: string;
  submittedText: string;
  level: 'b1' | 'b2' | 'c1';
  keyPoints?: string[];
}): Promise<WritingGrade> {
  // AI đánh giá dựa trên 4 tiêu chí:
  return {
    overallScore: 7.5, // 0-10
    scores: {
      taskAchievement: 7.0,
      coherence: 8.0,
      lexical: 7.5,
      grammar: 7.5,
    },
    feedback: {
      strengths: [
        "Clear thesis statement",
        "Good use of linking words",
        "Appropriate vocabulary for the topic"
      ],
      weaknesses: [
        "Some grammatical errors in complex sentences",
        "Could use more variety in sentence structures"
      ],
      suggestions: [
        "Review conditional sentences",
        "Practice using more advanced vocabulary"
      ]
    },
    corrections: [
      {
        original: "I am writing to complaining about...",
        corrected: "I am writing to complain about...",
        explanation: "Use infinitive after 'to' in this context"
      }
    ]
  };
}
```

**Prompt Template cho AI Grading:**
```
You are an expert VSTEP Writing examiner.

Grade this {taskType} submission according to VSTEP criteria.

Prompt: {prompt}
Student's answer: {submittedText}
Level: {level}
Word count: {wordCount}

Grading Criteria (each 0-10):
1. Task Achievement/Response (25%)
   - Addresses all parts of the task
   - Presents a clear position/response
   - Develops ideas sufficiently

2. Coherence and Cohesion (25%)
   - Logical organization
   - Clear progression throughout
   - Uses cohesive devices appropriately

3. Lexical Resource (25%)
   - Range of vocabulary
   - Accuracy in word choice
   - Spelling and word formation

4. Grammatical Range and Accuracy (25%)
   - Variety of structures
   - Accuracy of grammar
   - Punctuation

Provide:
1. Score for each criterion (0-10)
2. Overall score (weighted average)
3. Strengths (3-5 points)
4. Weaknesses (3-5 points)
5. Specific corrections with explanations
6. Suggestions for improvement
```

---

## Backend API Endpoints

### Writing Prompts Management
```
POST   /api/vtep-writing/prompts          - Create prompt
GET    /api/vtep-writing/prompts          - List prompts (with filters)
GET    /api/vtep-writing/prompts/:id      - Get prompt detail
PUT    /api/vtep-writing/prompts/:id      - Update prompt
DELETE /api/vtep-writing/prompts/:id      - Delete prompt
POST   /api/vtep-writing/prompts/generate - AI generate prompt
```

### Writing Tests Management
```
POST   /api/vtep-writing/tests             - Create test
GET    /api/vtep-writing/tests             - List tests
GET    /api/vtep-writing/tests/active      - List active tests (for students)
GET    /api/vtep-writing/tests/:id         - Get test detail
PUT    /api/vtep-writing/tests/:id         - Update test
DELETE /api/vtep-writing/tests/:id         - Delete test
```

### Student Submissions
```
POST   /api/vtep-writing/submissions       - Submit writing
GET    /api/vtep-writing/submissions/me    - Get my submissions
GET    /api/vtep-writing/submissions/:id   - Get submission detail
POST   /api/vtep-writing/submissions/:id/grade - AI grade submission
PUT    /api/vtep-writing/submissions/:id/teacher-grade - Teacher grade
```

---

## Tính Năng Mở Rộng (Phase 2)

### 1. Plagiarism Detection
- Kiểm tra đạo văn
- So sánh với database bài mẫu
- Cảnh báo nếu similarity > 30%

### 2. Writing Progress Tracking
- Lưu lại tất cả submissions
- Biểu đồ tiến bộ theo thời gian
- Phân tích điểm yếu thường gặp
- Gợi ý bài tập luyện tập

### 3. Peer Review System
- Học sinh chấm chéo cho nhau
- Giáo viên xem và điều chỉnh
- Học kỹ năng đánh giá bài viết

### 4. Writing Templates Library
- Templates cho từng loại letter/essay
- Useful phrases by category
- Sample answers with annotations

### 5. Real-time Writing Assistant
- Grammar checking while typing
- Vocabulary suggestions
- Sentence structure variety checker
- Plagiarism detection

---

## Migration Scripts

### Create Tables
**File:** `/backend/db/migrations/20260130_add_vstep_writing.sql`

```sql
-- VtepWritingPrompts
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingPrompts]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepWritingPrompts (
    Id NVARCHAR(100) PRIMARY KEY,
    TaskType NVARCHAR(20) NOT NULL,
    Category NVARCHAR(100) NULL,
    Level NVARCHAR(10) NULL,
    Title NVARCHAR(500) NOT NULL,
    PromptText NVARCHAR(MAX) NOT NULL,
    SampleAnswer NVARCHAR(MAX) NULL,
    KeyPoints NVARCHAR(MAX) NULL,
    SuggestedVocab NVARCHAR(MAX) NULL,
    TimeLimit INT NULL,
    MinWords INT NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepWritingPrompts_TaskType_Level 
    ON dbo.VtepWritingPrompts(TaskType, Level);
END
GO

-- VtepWritingTests
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingTests]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepWritingTests (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Level NVARCHAR(10) NULL,
    Task1PromptId NVARCHAR(100) NULL,
    Task2PromptId NVARCHAR(100) NULL,
    TotalTimeMinutes INT DEFAULT 60,
    IsActive BIT DEFAULT 0,
    IsPublic BIT DEFAULT 1,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepWritingTests_Level_IsActive 
    ON dbo.VtepWritingTests(Level, IsActive);
END
GO

-- VtepWritingSubmissions
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingSubmissions]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepWritingSubmissions (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    TestId NVARCHAR(100) NULL,
    PromptId NVARCHAR(100) NULL,
    TaskType NVARCHAR(20) NOT NULL,
    SubmittedText NVARCHAR(MAX) NOT NULL,
    WordCount INT NULL,
    TimeSpentSeconds INT NULL,
    
    AiFeedback NVARCHAR(MAX) NULL,
    AiScore FLOAT NULL,
    ScoreTaskAchievement FLOAT NULL,
    ScoreCoherence FLOAT NULL,
    ScoreLexical FLOAT NULL,
    ScoreGrammar FLOAT NULL,
    
    TeacherFeedback NVARCHAR(MAX) NULL,
    TeacherScore FLOAT NULL,
    GradedByUserId NVARCHAR(100) NULL,
    GradedAt DATETIMEOFFSET NULL,
    
    SubmittedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepWritingSubmissions_User_Submitted 
    ON dbo.VtepWritingSubmissions(UserId, SubmittedAt DESC);
    
  CREATE INDEX IX_VtepWritingSubmissions_Test 
    ON dbo.VtepWritingSubmissions(TestId);
END
GO
```

---

## Checklist Triển Khai

### Phase 1: Core Features
- [ ] Tạo migration scripts cho database
- [ ] Tạo Repository classes (VtepWritingPromptRepository, etc.)
- [ ] Tạo Controller (VtepWritingController)
- [ ] Tạo API routes
- [ ] Tạo AI flows (generate-writing-prompt, grade-writing-submission)
- [ ] Tạo UI: Writing Prompts Manager (Admin)
- [ ] Tạo UI: Writing Tests Manager (Admin)
- [ ] Tạo UI: Writing Test Taker (Student)
- [ ] Tạo UI: Results & Feedback Display
- [ ] Testing và bug fixing

### Phase 2: Advanced Features
- [ ] Progress tracking dashboard
- [ ] Writing templates library
- [ ] Peer review system
- [ ] Real-time writing assistant
- [ ] Plagiarism detection

---

## Kết Luận

Hệ thống VSTEP Writing được thiết kế toàn diện với:
1. **Database schema** hoàn chỉnh cho prompts, tests, và submissions
2. **AI integration** cho việc generate prompts và auto-grading
3. **UI/UX** trực quan cho cả admin và học sinh
4. **Scalable architecture** dễ mở rộng thêm tính năng

Với cấu trúc này, hệ thống có thể:
- Tạo và quản lý kho đề bài Writing phong phú
- Tổ chức bài test Writing theo chuẩn VSTEP
- Chấm điểm tự động bằng AI với feedback chi tiết
- Tracking tiến độ học tập của học sinh
- Mở rộng thêm nhiều tính năng nâng cao
