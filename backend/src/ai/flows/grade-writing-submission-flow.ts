import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Type definitions for grading output
export interface CriterionGrade {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface WritingGrade {
  overallScore: number;
  taskAchievement: CriterionGrade;
  coherenceCohesion: CriterionGrade;
  lexicalResource: CriterionGrade;
  grammaticalRange: CriterionGrade;
  generalStrengths: string[];
  generalWeaknesses: string[];
  suggestions: string[];
  wordCount: number;
  meetsMinimumWords: boolean;
}

interface GradeWritingInput {
  taskType: "task1" | "task2";
  promptText: string;
  submittedText: string;
  minWords: number;
  level?: string;
  keyPoints?: string[];
}

export async function gradeWritingSubmission(
  input: GradeWritingInput
): Promise<WritingGrade> {
  const { taskType, promptText, submittedText, minWords, level = "b2", keyPoints = [] } = input;

  console.log("🤖 AI Grading Started:", {
    taskType,
    submittedTextLength: submittedText.length,
    minWords,
    level,
    apiKeySet: !!process.env.GEMINI_API_KEY,
  });

  const taskDescription = taskType === "task1" 
    ? "a letter or email (formal or informal)" 
    : "an academic essay";

  const expectedLength = taskType === "task1" 
    ? "120-150 words" 
    : "at least 250 words";

  const prompt = `You are an expert VSTEP (Vietnamese Standardized Test of English Proficiency) Writing examiner. 

Your task is to grade ${taskDescription} written by a student at ${level.toUpperCase()} level according to VSTEP Writing criteria.

**PROMPT GIVEN TO STUDENT:**
${promptText}

${keyPoints.length > 0 ? `**KEY POINTS THAT SHOULD BE ADDRESSED:**
${keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}
` : ''}

**MINIMUM WORD REQUIREMENT:** ${minWords} words (expected: ${expectedLength})

**STUDENT'S SUBMISSION:**
${submittedText}

---

**GRADING INSTRUCTIONS:**

Grade this writing using the 4 VSTEP Writing criteria, each weighted equally at 25%:

1. **TASK ACHIEVEMENT/RESPONSE (25%)**
   - Does the response fully address all parts of the task?
   - Is the position/purpose clear throughout?
   - Are all key points covered adequately?
   - Is the format appropriate (letter/email or essay)?

2. **COHERENCE AND COHESION (25%)**
   - Is the information logically organized?
   - Are paragraphs well-structured?
   - Are cohesive devices used effectively?
   - Is there clear progression throughout?

3. **LEXICAL RESOURCE (25%)**
   - Is there a range of vocabulary appropriate for the task?
   - Are less common words used accurately?
   - Is spelling and word choice correct?

4. **GRAMMATICAL RANGE AND ACCURACY (25%)**
   - Is there a variety of sentence structures?
   - Are grammatical structures used accurately?
   - Is punctuation used correctly?

**SCORING SCALE (0-10 for each criterion):**
- 9-10: Exceptional
- 8-8.9: Excellent
- 7-7.9: Good
- 6-6.9: Competent
- 5-5.9: Modest
- 4-4.9: Limited
- 0-3.9: Very Limited

**REQUIRED OUTPUT FORMAT (JSON):**
\`\`\`json
{
  "overallScore": 7.5,
  "taskAchievement": {
    "score": 7.0,
    "feedback": "Detailed feedback here",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1"]
  },
  "coherenceCohesion": {
    "score": 8.0,
    "feedback": "Detailed feedback here",
    "strengths": ["strength 1"],
    "weaknesses": ["weakness 1"]
  },
  "lexicalResource": {
    "score": 7.5,
    "feedback": "Detailed feedback here",
    "strengths": ["strength 1"],
    "weaknesses": ["weakness 1"]
  },
  "grammaticalRange": {
    "score": 7.0,
    "feedback": "Detailed feedback here",
    "strengths": ["strength 1"],
    "weaknesses": ["weakness 1"]
  },
  "generalStrengths": ["overall strength 1", "overall strength 2"],
  "generalWeaknesses": ["overall weakness 1"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "wordCount": 245,
  "meetsMinimumWords": true
}
\`\`\`

Provide ONLY the JSON output, no additional text.`;

  try {
    console.log("📡 Calling Gemini API for grading...");
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    console.log("⏳ Waiting for AI response...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log("✅ AI Response received, parsing JSON...");
    console.log("📄 Raw response length:", text.length);
    
    // Parse JSON response
    const grade: WritingGrade = JSON.parse(text);
    
    console.log("✅ AI Grading completed successfully:", {
      overallScore: grade.overallScore,
      criteriaScores: {
        taskAchievement: grade.taskAchievement?.score,
        coherenceCohesion: grade.coherenceCohesion?.score,
        lexicalResource: grade.lexicalResource?.score,
        grammaticalRange: grade.grammaticalRange?.score,
      }
    });
    
    // Validate and ensure all required fields exist
    if (!grade.overallScore || !grade.taskAchievement || !grade.coherenceCohesion || 
        !grade.lexicalResource || !grade.grammaticalRange) {
      throw new Error("Invalid AI response structure");
    }

    return grade;
  } catch (error) {
    console.error("Error grading writing submission:", error);
    
    // Fallback to mock grading if AI fails
    console.warn("⚠️ AI grading failed, using fallback mock grading");
    return {
      overallScore: 6.5,
      taskAchievement: {
        score: 6.5,
        feedback: "Unable to grade automatically. Please review manually.",
        strengths: ["Submission received"],
        weaknesses: ["Could not analyze content"],
      },
      coherenceCohesion: {
        score: 6.5,
        feedback: "Unable to grade automatically.",
        strengths: [],
        weaknesses: ["Automatic grading unavailable"],
      },
      lexicalResource: {
        score: 6.5,
        feedback: "Unable to grade automatically.",
        strengths: [],
        weaknesses: ["Automatic grading unavailable"],
      },
      grammaticalRange: {
        score: 6.5,
        feedback: "Unable to grade automatically.",
        strengths: [],
        weaknesses: ["Automatic grading unavailable"],
      },
      generalStrengths: ["Submission completed"],
      generalWeaknesses: ["Automatic grading failed - manual review required"],
      suggestions: ["Please have a teacher review this submission manually"],
      wordCount: submittedText.split(/\s+/).length,
      meetsMinimumWords: submittedText.split(/\s+/).length >= minWords,
    };
  }
}

// Helper function to calculate final weighted score for VSTEP
export function calculateVstepScore(grade: WritingGrade, taskType: "task1" | "task2"): {
  criteriaAverage: number;
  weightedScore: number;
  percentage: number;
  vstepBand: string;
} {
  // Average of 4 criteria (each 25%)
  const criteriaAverage = (
    grade.taskAchievement.score +
    grade.coherenceCohesion.score +
    grade.lexicalResource.score +
    grade.grammaticalRange.score
  ) / 4;

  // Task 1 = 33% of total, Task 2 = 67% of total
  const taskWeight = taskType === "task1" ? 0.33 : 0.67;
  const weightedScore = criteriaAverage * taskWeight;
  
  // Convert to percentage
  const percentage = (criteriaAverage / 10) * 100;

  // Determine VSTEP band based on criteria average (0-10 scale)
  let vstepBand = "";
  if (criteriaAverage >= 9) vstepBand = "5.0-6.0 (C1-C2)";
  else if (criteriaAverage >= 8) vstepBand = "4.5-5.0 (B2-C1)";
  else if (criteriaAverage >= 7) vstepBand = "4.0-4.5 (B2)";
  else if (criteriaAverage >= 6) vstepBand = "3.5-4.0 (B1-B2)";
  else if (criteriaAverage >= 5) vstepBand = "3.0-3.5 (B1)";
  else if (criteriaAverage >= 4) vstepBand = "2.5-3.0 (A2-B1)";
  else vstepBand = "Below 2.5 (A2 or lower)";

  return {
    criteriaAverage: Math.round(criteriaAverage * 100) / 100,
    weightedScore: Math.round(weightedScore * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    vstepBand,
  };
}
