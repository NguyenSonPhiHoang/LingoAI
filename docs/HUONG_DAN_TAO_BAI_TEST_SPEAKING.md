# Hướng Dẫn Tạo Bài Test Speaking Cho VSTEP

## Tổng Quan về VSTEP Speaking

### Cấu Trúc Bài Thi Speaking VSTEP
Theo chuẩn VSTEP (Vietnamese Standardized Test of English Proficiency), phần Speaking có cấu trúc như sau:

**Thời gian:** 12-15 phút  
**Số lượng:** 3 Parts

#### Part 1: Interview (Phỏng vấn) - 4-5 phút
- **Yêu cầu:** Trả lời các câu hỏi cá nhân về bản thân, gia đình, sở thích, công việc/học tập
- **Số câu hỏi:** 8-10 câu
- **Đặc điểm:**
  - Câu hỏi ngắn, trực tiếp
  - Chủ đề quen thuộc, đời sống hằng ngày
  - Warm-up để giúp thí sinh thoải mái
- **Ví dụ câu hỏi:**
  - "Where do you live?"
  - "What do you do in your free time?"
  - "Tell me about your family"
  - "What kind of music do you like?"

#### Part 2: Long Turn (Nói dài) - 3-4 phút
- **Yêu cầu:** Nói về một chủ đề được cho trong 1-2 phút (có 1 phút chuẩn bị)
- **Cấu trúc:** Thẻ cue card với chủ đề và gợi ý
- **Đặc điểm:**
  - Thí sinh được cho thẻ câu hỏi với 3-4 gợi ý
  - 1 phút chuẩn bị (có thể ghi chú)
  - Nói liên tục 1-2 phút
  - Giám khảo có thể hỏi 1-2 câu follow-up
- **Các dạng chủ đề phổ biến:**
  - Describe a person (người)
  - Describe a place (địa điểm)
  - Describe an event/experience (sự kiện/trải nghiệm)
  - Describe an object (vật)
  - Describe a skill or hobby (kỹ năng/sở thích)

**Ví dụ Cue Card:**
```
Describe a memorable trip you have taken.
You should say:
- Where you went
- Who you went with
- What you did there
- And explain why it was memorable
```

#### Part 3: Discussion (Thảo luận) - 4-5 phút
- **Yêu cầu:** Thảo luận sâu hơn về chủ đề liên quan đến Part 2
- **Số câu hỏi:** 4-6 câu
- **Đặc điểm:**
  - Câu hỏi trừu tượng, đòi hỏi phân tích
  - Thể hiện khả năng tranh luận, đưa ra ý kiến
  - Nói về xu hướng xã hội, so sánh quá khứ-hiện tại
- **Ví dụ câu hỏi:**
  - "How has tourism changed in your country?"
  - "What are the advantages and disadvantages of traveling alone?"
  - "Do you think people will travel more in the future?"

### Tiêu Chí Chấm Điểm
1. **Fluency and Coherence** (25%): Trôi chảy và mạch lạc
   - Nói liên tục không ngập ngừng nhiều
   - Sử dụng linking words hiệu quả
   - Phát triển ý rõ ràng

2. **Lexical Resource** (25%): Vốn từ vựng
   - Phạm vi từ vựng rộng
   - Sử dụng từ vựng chính xác
   - Paraphrase tốt

3. **Grammatical Range and Accuracy** (25%): Ngữ pháp
   - Sử dụng đa dạng cấu trúc câu
   - Độ chính xác cao
   - Lỗi không ảnh hưởng communication

4. **Pronunciation** (25%): Phát âm
   - Phát âm rõ ràng, dễ hiểu
   - Intonation và stress tự nhiên
   - Lỗi không ảnh hưởng hiểu nghĩa

---

## Thiết Kế Database cho Speaking Test

### Bảng: VtepSpeakingPrompts
Lưu trữ các câu hỏi và chủ đề Speaking

```sql
CREATE TABLE dbo.VtepSpeakingPrompts (
  Id NVARCHAR(100) PRIMARY KEY,
  PartNumber INT NOT NULL,           -- 1, 2, hoặc 3
  Category NVARCHAR(100) NULL,       -- 'personal', 'description', 'opinion', 'society', etc.
  Level NVARCHAR(10) NULL,           -- 'b1', 'b2', 'c1'
  Title NVARCHAR(500) NOT NULL,      -- Tiêu đề ngắn gọn
  PromptText NVARCHAR(MAX) NOT NULL, -- Câu hỏi hoặc chủ đề
  
  -- For Part 2 (Long Turn)
  CueCardBullets NVARCHAR(MAX) NULL, -- JSON: danh sách gợi ý (You should say:...)
  PreparationTime INT NULL,           -- Thời gian chuẩn bị (giây), default 60
  SpeakingTime INT NULL,              -- Thời gian nói (giây), default 120
  
  -- For all parts
  SampleAnswer NVARCHAR(MAX) NULL,    -- Câu trả lời mẫu
  KeyVocabulary NVARCHAR(MAX) NULL,   -- JSON: từ vựng quan trọng
  UsefulPhrases NVARCHAR(MAX) NULL,   -- JSON: cụm từ hữu ích
  
  CreatedByUserId NVARCHAR(100) NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);

CREATE INDEX IX_VtepSpeakingPrompts_Part_Level 
  ON dbo.VtepSpeakingPrompts(PartNumber, Level);
```

### Bảng: VtepSpeakingTests
Bài test Speaking đầy đủ (có cả 3 Parts)

```sql
CREATE TABLE dbo.VtepSpeakingTests (
  Id NVARCHAR(100) PRIMARY KEY,
  Title NVARCHAR(500) NOT NULL,
  Description NVARCHAR(MAX) NULL,
  Level NVARCHAR(10) NULL,           -- 'b1', 'b2', 'c1'
  
  -- Part 1: 8-10 prompts
  Part1PromptIds NVARCHAR(MAX) NULL, -- JSON: array of prompt IDs
  
  -- Part 2: 1 prompt (cue card)
  Part2PromptId NVARCHAR(100) NULL,  -- FK to VtepSpeakingPrompts
  
  -- Part 3: 4-6 prompts (follow-up questions)
  Part3PromptIds NVARCHAR(MAX) NULL, -- JSON: array of prompt IDs
  
  TotalTimeMinutes INT DEFAULT 15,
  IsActive BIT DEFAULT 0,
  IsPublic BIT DEFAULT 1,
  CreatedByUserId NVARCHAR(100) NULL,
  CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);
```

### Bảng: VtepSpeakingSubmissions
Lưu bài làm của học sinh

```sql
CREATE TABLE dbo.VtepSpeakingSubmissions (
  Id NVARCHAR(100) PRIMARY KEY,
  UserId NVARCHAR(100) NOT NULL,
  TestId NVARCHAR(100) NULL,         -- FK to VtepSpeakingTests
  PromptId NVARCHAR(100) NULL,       -- FK to VtepSpeakingPrompts (for single prompt)
  PartNumber INT NOT NULL,            -- 1, 2, hoặc 3
  
  -- Audio recording
  AudioUrl NVARCHAR(500) NULL,        -- URL to recorded audio file
  DurationSeconds INT NULL,           -- Thời gian nói thực tế
  
  -- Transcription
  TranscribedText NVARCHAR(MAX) NULL, -- Text từ speech-to-text
  
  -- AI Grading
  AiFeedback NVARCHAR(MAX) NULL,      -- JSON: chi tiết feedback
  AiScore NUMERIC(5,2) NULL,          -- Điểm tổng (0-10)
  ScoreFluency NUMERIC(5,2) NULL,     -- Fluency & Coherence
  ScoreLexical NUMERIC(5,2) NULL,     -- Lexical Resource
  ScoreGrammar NUMERIC(5,2) NULL,     -- Grammar
  ScorePronunciation NUMERIC(5,2) NULL, -- Pronunciation
  
  -- Manual Grading
  TeacherFeedback NVARCHAR(MAX) NULL,
  TeacherScore NUMERIC(5,2) NULL,
  GradedByUserId NVARCHAR(100) NULL,
  GradedAt DATETIMEOFFSET NULL,
  
  Status NVARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded', 'reviewed'
  SubmittedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  UpdatedAt DATETIMEOFFSET NULL
);

CREATE INDEX IX_VtepSpeakingSubmissions_User_Test 
  ON dbo.VtepSpeakingSubmissions(UserId, TestId);
```

---

## Luồng Tạo Tài Liệu và Test

### Bước 1: Tạo Speaking Prompts (Câu Hỏi/Chủ Đề)

#### 1.1. Trang Admin: Quản Lý Speaking Prompts
**Location:** `/src/app/vtep-speaking-admin/prompts/page.tsx`

**Chức năng:**
- Danh sách tất cả prompts (Part 1, 2, 3)
- Lọc theo: Part, Level, Category
- Thêm/Sửa/Xóa prompts
- Import prompts từ file
- Generate prompts bằng AI

**UI Components:**
```tsx
<SpeakingPromptsManager>
  <FiltersBar>
    - Part: Part 1 / Part 2 / Part 3 / All
    - Level: B1 / B2 / C1 / All
    - Category: Personal / Description / Opinion / Society / etc.
    - Search by keyword
  </FiltersBar>
  
  <PromptsList>
    {prompts.map(prompt => (
      <PromptCard>
        <Badge>{prompt.partNumber === 1 ? 'Part 1' : prompt.partNumber === 2 ? 'Part 2' : 'Part 3'}</Badge>
        <Badge>{prompt.level}</Badge>
        <h3>{prompt.title}</h3>
        <p>{truncate(prompt.promptText)}</p>
        {prompt.partNumber === 2 && (
          <CueCardPreview>
            {prompt.cueCardBullets.map(bullet => (
              <li>{bullet}</li>
            ))}
          </CueCardPreview>
        )}
        <Actions>
          <Button>Edit</Button>
          <Button>Delete</Button>
          <Button>Duplicate</Button>
        </Actions>
      </PromptCard>
    ))}
  </PromptsList>
  
  <AddPromptDialog>
    <Select name="partNumber">
      <option value="1">Part 1 - Interview</option>
      <option value="2">Part 2 - Long Turn</option>
      <option value="3">Part 3 - Discussion</option>
    </Select>
    
    <Select name="level">
      <option value="b1">B1</option>
      <option value="b2">B2</option>
      <option value="c1">C1</option>
    </Select>
    
    <Input name="category" placeholder="e.g., personal, travel, technology" />
    <Input name="title" placeholder="Short title" />
    <Textarea name="promptText" placeholder="Question or topic" />
    
    {partNumber === 2 && (
      <CueCardBulletsEditor>
        <h4>Cue Card Bullets (You should say:)</h4>
        <Input placeholder="Bullet 1" />
        <Input placeholder="Bullet 2" />
        <Input placeholder="Bullet 3" />
        <Input placeholder="Bullet 4 (optional)" />
      </CueCardBulletsEditor>
    )}
    
    <Textarea name="sampleAnswer" placeholder="Sample answer (optional)" />
    <KeyVocabularyEditor />
    <UsefulPhrasesEditor />
    
    <Button type="submit">Create Prompt</Button>
  </AddPromptDialog>
</SpeakingPromptsManager>
```

#### 1.2. AI Generate Speaking Prompts
**Location:** `/src/ai/flows/generate-speaking-prompt-flow.ts`

```typescript
export async function generateSpeakingPrompt(input: {
  partNumber: 1 | 2 | 3;
  level: 'b1' | 'b2' | 'c1';
  category: string;
  topic?: string;
}): Promise<SpeakingPrompt> {
  // AI sẽ generate:
  // - Câu hỏi/chủ đề phù hợp với part
  // - Cue card bullets (nếu Part 2)
  // - Sample answer
  // - Key vocabulary
  // - Useful phrases
}
```

**Prompt Template cho AI:**
```
You are an expert VSTEP Speaking test creator.

Generate a Part {partNumber} speaking prompt for {level} level students.
Category: {category}
Topic (optional): {topic}

For Part 1 (Interview):
- Create a natural, conversational question
- Keep it simple and personal
- Focus on everyday topics

For Part 2 (Long Turn):
- Provide a clear topic with context
- Include 3-4 "You should say:" bullet points
- Make bullets guide the structure
- Preparation time: 1 minute, Speaking time: 1-2 minutes

For Part 3 (Discussion):
- Create an abstract, analytical question
- Related to typical Part 2 topics
- Encourage opinion, comparison, or prediction
- Suitable for deeper discussion

Also provide:
1. A sample answer demonstrating good speaking
2. Key vocabulary (10-12 words/phrases)
3. Useful phrases/expressions for this topic
4. Pronunciation tips for difficult words

Output as JSON.
```

---

### Bước 2: Tạo Speaking Tests (Bộ Đề Thi)

#### 2.1. Trang Admin: Tạo Speaking Test
**Location:** `/src/app/vtep-speaking-admin/tests/page.tsx`

**Chức năng:**
- Tạo bộ đề thi có cả 3 Parts
- Chọn prompts từ danh sách có sẵn
- Hoặc generate ngẫu nhiên theo level
- Set thời gian, trạng thái (active/inactive)

**UI Components:**
```tsx
<SpeakingTestCreator>
  <TestMetadata>
    - Title
    - Description
    - Level (B1, B2, C1)
    - Total Time (default: 15 minutes)
    - Is Active
    - Is Public
  </TestMetadata>
  
  <PartsSelector>
    <Part1Selector>
      <h3>Part 1: Interview (8-10 questions)</h3>
      <MultiSelect>
        {part1Prompts.map(p => (
          <option value={p.id}>{p.title}</option>
        ))}
      </MultiSelect>
      <Button onClick={generateRandomPart1}>
        Random Part 1 Questions
      </Button>
      <SelectedQuestionsPreview>
        {selectedPart1Prompts.map(p => (
          <QuestionCard>{p.promptText}</QuestionCard>
        ))}
      </SelectedQuestionsPreview>
    </Part1Selector>
    
    <Part2Selector>
      <h3>Part 2: Long Turn (1 cue card)</h3>
      <Select>
        {part2Prompts.map(p => (
          <option value={p.id}>{p.title}</option>
        ))}
      </Select>
      <Button onClick={generateRandomPart2}>
        Random Part 2 Topic
      </Button>
      <CueCardPreview>{selectedPart2Prompt}</CueCardPreview>
    </Part2Selector>
    
    <Part3Selector>
      <h3>Part 3: Discussion (4-6 questions)</h3>
      <MultiSelect>
        {part3Prompts.map(p => (
          <option value={p.id}>{p.title}</option>
        ))}
      </MultiSelect>
      <Button onClick={generateRandomPart3}>
        Random Part 3 Questions
      </Button>
      <SelectedQuestionsPreview>
        {selectedPart3Prompts.map(p => (
          <QuestionCard>{p.promptText}</QuestionCard>
        ))}
      </SelectedQuestionsPreview>
    </Part3Selector>
  </PartsSelector>
  
  <Actions>
    <Button>Save as Draft</Button>
    <Button>Publish Test</Button>
  </Actions>
</SpeakingTestCreator>
```

---

### Bước 3: Học Sinh Làm Bài Speaking

#### 3.1. Trang Làm Bài: Speaking Test Taker
**Location:** `/src/app/vstep-speaking-student/page.tsx`

**Chức năng:**
- Hiển thị danh sách bài test available
- Làm bài với audio recording cho từng part
- Speech-to-text tự động
- Submit và xem feedback từ AI

**UI Layout:**
```tsx
<SpeakingTestTaker>
  {!testStarted ? (
    <TestSelection>
      <h2>Available Speaking Tests</h2>
      {tests.map(test => (
        <TestCard>
          <h3>{test.title}</h3>
          <Badge>{test.level}</Badge>
          <p>Duration: {test.totalTimeMinutes} minutes</p>
          <p>Parts: 1 (Interview) + 2 (Long Turn) + 3 (Discussion)</p>
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
        <PartIndicator>Part {currentPart}/3</PartIndicator>
        <Timer>{formatTime(timeRemaining)}</Timer>
      </Header>
      
      {currentPart === 1 && (
        <Part1Interface>
          <h3>Part 1: Interview</h3>
          <Instructions>
            Answer the following questions naturally. You have about 30 seconds per question.
          </Instructions>
          
          <QuestionDisplay>
            <h4>Question {currentQuestionIndex + 1}/{part1Questions.length}</h4>
            <p className="text-lg">{currentQuestion.promptText}</p>
          </QuestionDisplay>
          
          <AudioRecorder>
            <Button onClick={startRecording} disabled={isRecording}>
              <Mic /> Start Recording
            </Button>
            <Button onClick={stopRecording} disabled={!isRecording}>
              <Square /> Stop
            </Button>
            {isRecording && <RecordingIndicator>Recording...</RecordingIndicator>}
            {audioUrl && <audio src={audioUrl} controls />}
          </AudioRecorder>
          
          {transcribedText && (
            <TranscriptionDisplay>
              <h5>Your answer:</h5>
              <p>{transcribedText}</p>
            </TranscriptionDisplay>
          )}
          
          <Navigation>
            <Button onClick={nextQuestion}>Next Question</Button>
          </Navigation>
        </Part1Interface>
      )}
      
      {currentPart === 2 && (
        <Part2Interface>
          <h3>Part 2: Long Turn</h3>
          <Instructions>
            You will have 1 minute to prepare. Then speak for 1-2 minutes.
          </Instructions>
          
          <CueCard>
            <h4>{part2Prompt.title}</h4>
            <p>{part2Prompt.promptText}</p>
            <ul>
              {part2Prompt.cueCardBullets.map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              ))}
            </ul>
          </CueCard>
          
          {preparationPhase ? (
            <PreparationTimer>
              <h4>Preparation Time</h4>
              <Timer>{formatTime(preparationTime)}</Timer>
              <Textarea 
                placeholder="Make notes here..."
                rows={8}
              />
              <Button onClick={startSpeaking}>
                Ready to Speak
              </Button>
            </PreparationTimer>
          ) : (
            <>
              <SpeakingTimer>
                Speaking Time: {formatTime(speakingTime)} / 2:00
              </SpeakingTimer>
              
              <AudioRecorder>
                {/* Same as Part 1 */}
              </AudioRecorder>
              
              {transcribedText && (
                <TranscriptionDisplay>
                  <h5>Your answer:</h5>
                  <p>{transcribedText}</p>
                </TranscriptionDisplay>
              )}
              
              <Button onClick={finishPart2}>Continue to Part 3</Button>
            </>
          )}
        </Part2Interface>
      )}
      
      {currentPart === 3 && (
        <Part3Interface>
          <h3>Part 3: Discussion</h3>
          <Instructions>
            Answer the following questions in more depth. Give reasons and examples.
          </Instructions>
          
          {/* Similar structure to Part 1 */}
          <QuestionDisplay>
            <h4>Question {currentQuestionIndex + 1}/{part3Questions.length}</h4>
            <p className="text-lg">{currentQuestion.promptText}</p>
          </QuestionDisplay>
          
          <AudioRecorder>
            {/* Same as Part 1 */}
          </AudioRecorder>
          
          {transcribedText && (
            <TranscriptionDisplay>
              <h5>Your answer:</h5>
              <p>{transcribedText}</p>
            </TranscriptionDisplay>
          )}
          
          <Navigation>
            {currentQuestionIndex < part3Questions.length - 1 ? (
              <Button onClick={nextQuestion}>Next Question</Button>
            ) : (
              <Button onClick={submitTest}>Submit Test</Button>
            )}
          </Navigation>
        </Part3Interface>
      )}
      
      <Footer>
        <Button variant="outline" onClick={pauseTest}>
          Pause Test
        </Button>
      </Footer>
    </TestInterface>
  )}
  
  {/* Results Dialog */}
  {showResults && (
    <ResultsDialog>
      <h2>Your Speaking Test Results</h2>
      
      <OverallScore>
        <h3>Overall Score: {overallScore}/10</h3>
        <Progress value={overallScore * 10} />
      </OverallScore>
      
      <CriteriaBreakdown>
        <ScoreItem>
          <h4>Fluency & Coherence</h4>
          <Score>{scores.fluency}/10</Score>
          <Feedback>{feedback.fluency}</Feedback>
        </ScoreItem>
        
        <ScoreItem>
          <h4>Lexical Resource</h4>
          <Score>{scores.lexical}/10</Score>
          <Feedback>{feedback.lexical}</Feedback>
        </ScoreItem>
        
        <ScoreItem>
          <h4>Grammatical Range & Accuracy</h4>
          <Score>{scores.grammar}/10</Score>
          <Feedback>{feedback.grammar}</Feedback>
        </ScoreItem>
        
        <ScoreItem>
          <h4>Pronunciation</h4>
          <Score>{scores.pronunciation}/10</Score>
          <Feedback>{feedback.pronunciation}</Feedback>
        </ScoreItem>
      </CriteriaBreakdown>
      
      <PartScores>
        <h3>Scores by Part</h3>
        <PartScoreItem>
          Part 1: {partScores.part1}/10
        </PartScoreItem>
        <PartScoreItem>
          Part 2: {partScores.part2}/10
        </PartScoreItem>
        <PartScoreItem>
          Part 3: {partScores.part3}/10
        </PartScoreItem>
      </PartScores>
      
      <Actions>
        <Button onClick={viewDetailedFeedback}>
          View Detailed Feedback
        </Button>
        <Button onClick={downloadReport}>
          Download Report
        </Button>
        <Button onClick={close}>Close</Button>
      </Actions>
    </ResultsDialog>
  )}
</SpeakingTestTaker>
```

---

### Bước 4: AI Chấm Điểm Tự Động

#### 4.1. AI Flow: Grade Speaking Submission
**Location:** `/backend/src/ai/flows/grade-speaking-submission-flow.ts`

```typescript
export async function gradeSpeakingSubmission(input: {
  promptText: string;
  transcribedText: string;
  audioUrl: string;
  partNumber: 1 | 2 | 3;
  level: 'b1' | 'b2' | 'c1';
  durationSeconds: number;
}): Promise<SpeakingGrade> {
  // Step 1: Analyze transcribed text
  // Step 2: Analyze audio for pronunciation (using speech recognition API)
  // Step 3: Grade based on 4 criteria
  // Step 4: Provide detailed feedback
  
  return {
    overallScore: 7.5,
    fluency: {
      score: 7.0,
      feedback: "Good flow with some hesitation...",
      strengths: ["Natural pace", "Good linking words"],
      weaknesses: ["Some fillers like 'um', 'uh'"]
    },
    lexical: {
      score: 8.0,
      feedback: "Wide range of vocabulary...",
      strengths: ["Good collocations", "Topic-specific words"],
      weaknesses: ["Some repetition"]
    },
    grammar: {
      score: 7.5,
      feedback: "Generally accurate with variety...",
      strengths: ["Complex sentences", "Good tense control"],
      weaknesses: ["Minor article errors"]
    },
    pronunciation: {
      score: 7.0,
      feedback: "Clear and understandable...",
      strengths: ["Clear consonants", "Good word stress"],
      weaknesses: ["Some vowel sounds need improvement"]
    }
  };
}
```

**Prompt Template cho AI Grading:**
```
You are an expert VSTEP Speaking examiner.

Grade this Part {partNumber} speaking submission according to VSTEP criteria.

Prompt: {promptText}
Transcribed answer: {transcribedText}
Speaking duration: {durationSeconds} seconds
Level: {level}

Grading Criteria (each 0-10):

1. Fluency and Coherence (25%)
   - Speaks at length without noticeable effort
   - Coherent and cohesive discourse
   - Uses cohesive devices
   - Develops topics coherently

2. Lexical Resource (25%)
   - Range of vocabulary
   - Accuracy of word choice
   - Use of less common vocabulary
   - Paraphrasing ability

3. Grammatical Range and Accuracy (25%)
   - Range of structures
   - Accuracy in grammar
   - Error-free sentences
   - Appropriate tense usage

4. Pronunciation (25%)
   - Individual sounds
   - Word and sentence stress
   - Intonation and rhythm
   - Intelligibility

For each criterion, provide:
- Score (0-10, decimals allowed)
- Brief feedback (2-3 sentences)
- Strengths (2-3 points)
- Areas for improvement (2-3 points)

Also provide:
- Overall feedback summary
- Specific vocabulary/grammar errors spotted
- Pronunciation issues
- Suggestions for improvement

Output as JSON.
```

#### 4.2. Speech-to-Text Integration
**Service:** `/backend/src/services/speech-to-text.service.ts`

```typescript
export async function transcribeAudio(audioUrl: string): Promise<{
  text: string;
  confidence: number;
  wordTimings: Array<{ word: string; startTime: number; endTime: number }>;
}> {
  // Use Google Speech-to-Text API or OpenAI Whisper
  // Return transcribed text with timing information
}

export async function analyzePronunciation(audioUrl: string, expectedText: string): Promise<{
  overallScore: number;
  wordAccuracy: Array<{ word: string; score: number }>;
  issues: Array<{ word: string; issue: string }>;
}> {
  // Use pronunciation assessment APIs
  // Compare with expected pronunciation
}
```

---

## Backend API Endpoints

### Speaking Prompts
```typescript
// GET /api/vtep-speaking/prompts
// Query params: partNumber, level, category, search
router.get("/prompts", VtepSpeakingController.listPrompts);

// POST /api/vtep-speaking/prompts
router.post("/prompts", requireAuth, requireRole("Admin", "Teacher"), 
  VtepSpeakingController.createPrompt);

// GET /api/vtep-speaking/prompts/:id
router.get("/prompts/:id", VtepSpeakingController.getPrompt);

// PUT /api/vtep-speaking/prompts/:id
router.put("/prompts/:id", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.updatePrompt);

// DELETE /api/vtep-speaking/prompts/:id
router.delete("/prompts/:id", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.deletePrompt);
```

### Speaking Tests
```typescript
// GET /api/vtep-speaking/tests
router.get("/tests", VtepSpeakingController.listTests);

// POST /api/vtep-speaking/tests
router.post("/tests", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.createTest);

// POST /api/vtep-speaking/tests/random
// Generate random test by level
router.post("/tests/random", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.createRandomTest);

// GET /api/vtep-speaking/tests/:id
router.get("/tests/:id", requireAuth, VtepSpeakingController.getTest);

// PUT /api/vtep-speaking/tests/:id
router.put("/tests/:id", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.updateTest);

// DELETE /api/vtep-speaking/tests/:id
router.delete("/tests/:id", requireAuth, requireRole("Admin", "Teacher"),
  VtepSpeakingController.deleteTest);
```

### Speaking Submissions
```typescript
// POST /api/vtep-speaking/submissions
// Student submits audio recording
router.post("/submissions", requireAuth, VtepSpeakingController.createSubmission);

// GET /api/vtep-speaking/submissions
// List student's submissions
router.get("/submissions", requireAuth, VtepSpeakingController.listSubmissions);

// GET /api/vtep-speaking/submissions/:id
router.get("/submissions/:id", requireAuth, VtepSpeakingController.getSubmission);

// POST /api/vtep-speaking/submissions/:id/grade
// Trigger AI grading
router.post("/submissions/:id/grade", requireAuth,
  VtepSpeakingController.gradeSubmission);

// PUT /api/vtep-speaking/submissions/:id/teacher-grade
// Teacher manual grading
router.put("/submissions/:id/teacher-grade", requireAuth, 
  requireRole("Admin", "Teacher"),
  VtepSpeakingController.teacherGradeSubmission);
```

### Audio Upload
```typescript
// POST /api/vtep-speaking/upload-audio
// Upload audio file (mp3, wav, etc.)
router.post("/upload-audio", requireAuth, upload.single("audio"),
  VtepSpeakingController.uploadAudio);
```

---

## Tính Năng Mở Rộng (Phase 2)

### 1. Real-time Speaking Coach
- Real-time feedback trong khi nói
- Pronunciation correction
- Grammar suggestions
- Vocabulary enhancement

### 2. Speaking Analytics Dashboard
- Track fluency improvement over time
- Vocabulary range expansion
- Common error patterns
- Speaking time trends

### 3. Mock Interview Mode
- Simulate real VSTEP Speaking test
- Random question selection
- Timed responses
- Instant AI feedback

### 4. Speaking Templates & Strategies
- Templates for each part
- Useful expressions by topic
- Sample answers with audio
- Strategy guides

### 5. Peer Practice
- Connect with other students
- Practice speaking together
- Give feedback to each other
- Speaking challenges

---

## Migration Scripts

### Create Tables
**File:** `/backend/db/migrations/20260131_add_vstep_speaking.sql`

```sql
-- VtepSpeakingPrompts
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingPrompts]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingPrompts (
    Id NVARCHAR(100) PRIMARY KEY,
    PartNumber INT NOT NULL,
    Category NVARCHAR(100) NULL,
    Level NVARCHAR(10) NULL,
    Title NVARCHAR(500) NOT NULL,
    PromptText NVARCHAR(MAX) NOT NULL,
    CueCardBullets NVARCHAR(MAX) NULL,
    PreparationTime INT NULL,
    SpeakingTime INT NULL,
    SampleAnswer NVARCHAR(MAX) NULL,
    KeyVocabulary NVARCHAR(MAX) NULL,
    UsefulPhrases NVARCHAR(MAX) NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepSpeakingPrompts_Part_Level 
    ON dbo.VtepSpeakingPrompts(PartNumber, Level);
END;

-- VtepSpeakingTests
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingTests]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingTests (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Level NVARCHAR(10) NULL,
    Part1PromptIds NVARCHAR(MAX) NULL,
    Part2PromptId NVARCHAR(100) NULL,
    Part3PromptIds NVARCHAR(MAX) NULL,
    TotalTimeMinutes INT DEFAULT 15,
    IsActive BIT DEFAULT 0,
    IsPublic BIT DEFAULT 1,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );
END;

-- VtepSpeakingSubmissions
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingSubmissions]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingSubmissions (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    TestId NVARCHAR(100) NULL,
    PromptId NVARCHAR(100) NULL,
    PartNumber INT NOT NULL,
    AudioUrl NVARCHAR(500) NULL,
    DurationSeconds INT NULL,
    TranscribedText NVARCHAR(MAX) NULL,
    AiFeedback NVARCHAR(MAX) NULL,
    AiScore NUMERIC(5,2) NULL,
    ScoreFluency NUMERIC(5,2) NULL,
    ScoreLexical NUMERIC(5,2) NULL,
    ScoreGrammar NUMERIC(5,2) NULL,
    ScorePronunciation NUMERIC(5,2) NULL,
    TeacherFeedback NVARCHAR(MAX) NULL,
    TeacherScore NUMERIC(5,2) NULL,
    GradedByUserId NVARCHAR(100) NULL,
    GradedAt DATETIMEOFFSET NULL,
    Status NVARCHAR(50) DEFAULT 'submitted',
    SubmittedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepSpeakingSubmissions_User_Test 
    ON dbo.VtepSpeakingSubmissions(UserId, TestId);
END;
```

---

## Checklist Triển Khai

### Phase 1: Basic Infrastructure
- [ ] Database tables (Prompts, Tests, Submissions)
- [ ] Backend API endpoints
- [ ] Admin UI: Manage prompts
- [ ] Admin UI: Create tests
- [ ] Student UI: Take speaking test
- [ ] Audio recording functionality
- [ ] Speech-to-text integration
- [ ] Basic AI grading

### Phase 2: Enhanced Features
- [ ] Pronunciation assessment
- [ ] Detailed feedback generation
- [ ] Analytics dashboard
- [ ] Export test results
- [ ] Audio playback with transcript highlighting
- [ ] Vocabulary suggestions during test

### Phase 3: Advanced Features
- [ ] Real-time speaking coach
- [ ] Mock interview mode
- [ ] Peer practice
- [ ] Speaking templates library
- [ ] Progress tracking over time

---

## Kết Luận

Hệ thống VSTEP Speaking được thiết kế toàn diện với:
1. **Database schema** hoàn chỉnh cho prompts, tests, và submissions
2. **AI integration** cho việc generate prompts, speech-to-text, và auto-grading
3. **UI/UX** trực quan cho cả admin và học sinh
4. **Audio recording** và playback
5. **Scalable architecture** dễ mở rộng thêm tính năng

Với cấu trúc này, hệ thống có thể:
- Tạo và quản lý kho câu hỏi Speaking phong phú
- Tổ chức bài test Speaking theo chuẩn VSTEP (3 Parts)
- Chấm điểm tự động bằng AI với feedback chi tiết
- Đánh giá pronunciation và fluency
- Tracking tiến độ speaking của học sinh

**Ưu điểm so với Writing:**
- Speaking đòi hỏi audio recording/playback
- Cần speech-to-text cho transcription
- Pronunciation assessment là unique challenge
- Thời gian test ngắn hơn (12-15 phút vs 60 phút)
- 3 parts khác nhau về format và skill level

**Thách thức kỹ thuật:**
- Audio file storage và streaming
- Real-time speech-to-text
- Pronunciation scoring
- Network bandwidth cho audio upload/download
