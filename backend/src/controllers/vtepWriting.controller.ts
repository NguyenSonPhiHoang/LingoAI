import { Request, Response } from "express";
import { VtepWritingRepository } from "../repositories/vtepWriting.repository";
import { gradeWritingSubmission, calculateVstepScore } from "../ai/flows/grade-writing-submission-flow";

type AuthRequest = Request & { user?: { sub?: string; id?: string } };

export class VtepWritingController {
  // ==================== PROMPTS ====================
  
  // POST /api/vtep-writing/prompts
  static async createPrompt(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || null;
      const {
        taskType,
        category,
        level,
        title,
        promptText,
        sampleAnswer,
        keyPoints,
        suggestedVocab,
        timeLimit,
        minWords,
      } = req.body;

      if (!taskType || !title || !promptText) {
        return res
          .status(400)
          .json({ error: "taskType, title, and promptText are required" });
      }

      const result = await VtepWritingRepository.createPrompt({
        taskType,
        category,
        level,
        title,
        promptText,
        sampleAnswer,
        keyPoints,
        suggestedVocab,
        timeLimit,
        minWords,
        createdByUserId: userId,
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error("Create prompt error:", err);
      return res.status(500).json({ error: err.message || "Create failed" });
    }
  }

  // GET /api/vtep-writing/prompts
  static async listPrompts(req: Request, res: Response) {
    try {
      const { taskType, level, category, search } = req.query;

      const prompts = await VtepWritingRepository.listPrompts({
        taskType: taskType as any,
        level: level as string,
        category: category as string,
        search: search as string,
      });

      return res.json(prompts);
    } catch (err: any) {
      console.error("List prompts error:", err);
      return res.status(500).json({ error: err.message || "List failed" });
    }
  }

  // GET /api/vtep-writing/prompts/:id
  static async getPrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const prompt = await VtepWritingRepository.getPromptById(id);

      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      return res.json(prompt);
    } catch (err: any) {
      console.error("Get prompt error:", err);
      return res.status(500).json({ error: err.message || "Get failed" });
    }
  }

  // PUT /api/vtep-writing/prompts/:id
  static async updatePrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        category,
        level,
        title,
        promptText,
        sampleAnswer,
        keyPoints,
        suggestedVocab,
        timeLimit,
        minWords,
      } = req.body;

      await VtepWritingRepository.updatePrompt(id, {
        category,
        level,
        title,
        promptText,
        sampleAnswer,
        keyPoints,
        suggestedVocab,
        timeLimit,
        minWords,
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Update prompt error:", err);
      return res.status(500).json({ error: err.message || "Update failed" });
    }
  }

  // DELETE /api/vtep-writing/prompts/:id
  static async deletePrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await VtepWritingRepository.deletePrompt(id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Delete prompt error:", err);
      return res.status(500).json({ error: err.message || "Delete failed" });
    }
  }

  // ==================== TESTS ====================

  // POST /api/vtep-writing/tests
  static async createTest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || null;
      const {
        title,
        description,
        level,
        task1PromptId,
        task2PromptId,
        totalTimeMinutes,
        isActive,
        isPublic,
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      const result = await VtepWritingRepository.createTest({
        title,
        description,
        level,
        task1PromptId,
        task2PromptId,
        totalTimeMinutes,
        isActive,
        isPublic,
        createdByUserId: userId,
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error("Create test error:", err);
      return res.status(500).json({ error: err.message || "Create failed" });
    }
  }

  // POST /api/vtep-writing/tests/random
  static async createRandomTest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || null;
      const { level, title } = req.body;

      // Get all prompts
      const task1Prompts = await VtepWritingRepository.listPrompts({
        taskType: "task1",
        level: level || undefined,
      });
      
      const task2Prompts = await VtepWritingRepository.listPrompts({
        taskType: "task2",
        level: level || undefined,
      });

      if (task1Prompts.length === 0 || task2Prompts.length === 0) {
        return res.status(400).json({ 
          error: "Not enough prompts available. Need at least 1 Task 1 and 1 Task 2 prompt" + 
                 (level ? ` for level ${level}` : "")
        });
      }

      // Get all existing tests to avoid duplicates
      const existingTests = await VtepWritingRepository.listTests({
        level: level || undefined,
      });
      
      // Create set of used prompt combinations
      const usedCombinations = new Set(
        existingTests.map(t => `${t.task1PromptId}-${t.task2PromptId}`)
      );

      // Find an unused combination
      let randomTask1;
      let randomTask2;
      let attempts = 0;
      const maxAttempts = task1Prompts.length * task2Prompts.length;
      
      do {
        randomTask1 = task1Prompts[Math.floor(Math.random() * task1Prompts.length)];
        randomTask2 = task2Prompts[Math.floor(Math.random() * task2Prompts.length)];
        attempts++;
        
        // If we've tried all combinations, break
        if (attempts >= maxAttempts) {
          return res.status(400).json({
            error: "All possible prompt combinations have been used. Please add more prompts or delete existing tests.",
            stats: {
              task1PromptsCount: task1Prompts.length,
              task2PromptsCount: task2Prompts.length,
              totalPossible: maxAttempts,
              alreadyUsed: usedCombinations.size
            }
          });
        }
      } while (usedCombinations.has(`${randomTask1.id}-${randomTask2.id}`));

      // Create test with random prompts
      const testTitle = title || `Random Test - ${new Date().toLocaleString()}`;
      const result = await VtepWritingRepository.createTest({
        title: testTitle,
        description: `Auto-generated test with random prompts (${level || 'mixed levels'})`,
        level: level || null,
        task1PromptId: randomTask1.id,
        task2PromptId: randomTask2.id,
        totalTimeMinutes: 60,
        isActive: true,
        isPublic: true,
        createdByUserId: userId,
      });

      return res.status(201).json({
        ...result,
        selectedPrompts: {
          task1: { id: randomTask1.id, title: randomTask1.title },
          task2: { id: randomTask2.id, title: randomTask2.title },
        }
      });
    } catch (err: any) {
      console.error("Create random test error:", err);
      return res.status(500).json({ error: err.message || "Create failed" });
    }
  }

  // GET /api/vtep-writing/tests
  static async listTests(req: Request, res: Response) {
    try {
      const { level, isActive, isPublic } = req.query;

      const tests = await VtepWritingRepository.listTests({
        level: level as string,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        isPublic: isPublic === "true" ? true : isPublic === "false" ? false : undefined,
      });

      return res.json(tests);
    } catch (err: any) {
      console.error("List tests error:", err);
      return res.status(500).json({ error: err.message || "List failed" });
    }
  }

  // GET /api/vtep-writing/tests/active
  static async listActiveTests(req: Request, res: Response) {
    try {
      const tests = await VtepWritingRepository.listTests({
        isActive: true,
        isPublic: true,
      });

      return res.json(tests);
    } catch (err: any) {
      console.error("List active tests error:", err);
      return res.status(500).json({ error: err.message || "List failed" });
    }
  }

  // GET /api/vtep-writing/tests/:id
  static async getTest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const test = await VtepWritingRepository.getTestById(id);

      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }

      // Also fetch the prompts
      const task1Prompt = test.task1PromptId
        ? await VtepWritingRepository.getPromptById(test.task1PromptId)
        : null;
      const task2Prompt = test.task2PromptId
        ? await VtepWritingRepository.getPromptById(test.task2PromptId)
        : null;

      return res.json({
        ...test,
        task1Prompt,
        task2Prompt,
      });
    } catch (err: any) {
      console.error("Get test error:", err);
      return res.status(500).json({ error: err.message || "Get failed" });
    }
  }

  // PUT /api/vtep-writing/tests/:id
  static async updateTest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        level,
        task1PromptId,
        task2PromptId,
        totalTimeMinutes,
        isActive,
        isPublic,
      } = req.body;

      await VtepWritingRepository.updateTest(id, {
        title,
        description,
        level,
        task1PromptId,
        task2PromptId,
        totalTimeMinutes,
        isActive,
        isPublic,
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Update test error:", err);
      return res.status(500).json({ error: err.message || "Update failed" });
    }
  }

  // DELETE /api/vtep-writing/tests/:id
  static async deleteTest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await VtepWritingRepository.deleteTest(id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Delete test error:", err);
      return res.status(500).json({ error: err.message || "Delete failed" });
    }
  }

  // ==================== SUBMISSIONS ====================

  // POST /api/vtep-writing/submissions
  static async createSubmission(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        testId, // This is testInstanceId from Tests table
        testTemplateId, // Optional: template ID from VtepWritingTests
        promptId,
        taskType,
        submittedText,
        wordCount,
        timeSpentSeconds,
      } = req.body;

      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📝 [${requestId}] Creating submission:`, {
        userId,
        testInstanceId: testId,
        testTemplateId,
        promptId,
        taskType,
        wordCount,
        submittedTextLength: submittedText?.length,
      });

      if (!taskType || !submittedText) {
        return res
          .status(400)
          .json({ error: "taskType and submittedText are required" });
      }

      const result = await VtepWritingRepository.createSubmission({
        userId,
        testInstanceId: testId, // Save to TestInstanceId column for skill tracking
        testTemplateId, // Save to TestTemplateId column for template reference
        promptId,
        taskType,
        submittedText,
        wordCount,
        timeSpentSeconds,
      });

      // Auto-grade the submission immediately after creation
      console.log(`🤖 [${requestId}] Auto-grading submission:`, result.id);
      
      try {
        // Get the prompt details
        let promptDetails = null;
        let minWords = 120; // Default
        let keyPoints: string[] = [];

        if (promptId) {
          promptDetails = await VtepWritingRepository.getPromptById(promptId);
          if (promptDetails) {
            minWords = promptDetails.minWords || (taskType === "task1" ? 120 : 250);
            try {
              keyPoints = promptDetails.keyPoints ? JSON.parse(promptDetails.keyPoints) : [];
            } catch (e) {
              keyPoints = [];
            }
          }
        }

        // Call AI to grade the submission
        const aiGrade = await gradeWritingSubmission({
          taskType: taskType as "task1" | "task2",
          promptText: promptDetails?.promptText || "No prompt provided",
          submittedText,
          minWords,
          level: promptDetails?.level || "b2",
          keyPoints,
        });

        console.log(`✅ [${requestId}] AI grading completed:`, aiGrade.overallScore);

        // Calculate VSTEP weighted scores
        const vstepScores = calculateVstepScore(aiGrade, taskType as "task1" | "task2");

        // Prepare feedback for database
        const aiFeedback = {
          overallScore: aiGrade.overallScore,
          criteriaAverage: vstepScores.criteriaAverage,
          weightedScore: vstepScores.weightedScore,
          percentage: vstepScores.percentage,
          criteria: {
            taskAchievement: aiGrade.taskAchievement,
            coherenceCohesion: aiGrade.coherenceCohesion,
            lexicalResource: aiGrade.lexicalResource,
            grammaticalRange: aiGrade.grammaticalRange,
          },
          strengths: aiGrade.generalStrengths,
          weaknesses: aiGrade.generalWeaknesses,
          suggestions: aiGrade.suggestions,
          wordCount: aiGrade.wordCount,
          meetsMinimumWords: aiGrade.meetsMinimumWords,
        };

        // Update submission with AI grades
        await VtepWritingRepository.updateSubmissionGrade(result.id, {
          aiFeedback,
          aiScore: vstepScores.criteriaAverage,
          scoreTaskAchievement: aiGrade.taskAchievement.score,
          scoreCoherence: aiGrade.coherenceCohesion.score,
          scoreLexical: aiGrade.lexicalResource.score,
          scoreGrammar: aiGrade.grammaticalRange.score,
        });

        // Return submission with grade - include all fields frontend expects
        return res.status(201).json({ 
          ...result,
          grade: {
            aiFeedback,
            aiScore: vstepScores.criteriaAverage,
            percentage: vstepScores.percentage,
            vstepBand: vstepScores.vstepBand,
            taskAchievementScore: aiGrade.taskAchievement.score,
            coherenceCohesionScore: aiGrade.coherenceCohesion.score,
            lexicalResourceScore: aiGrade.lexicalResource.score,
            grammaticalRangeScore: aiGrade.grammaticalRange.score,
          }
        });
      } catch (gradeError) {
        console.error(`❌ [${requestId}] Auto-grading failed, but submission saved:`, gradeError);
        // Return submission even if grading fails
        return res.status(201).json({ 
          ...result,
          gradingFailed: true,
          message: "Submission saved but auto-grading failed. A teacher will review it manually."
        });
      }
    } catch (err: any) {
      console.error("Create submission error:", err);
      return res.status(500).json({ error: err.message || "Create failed" });
    }
  }

  // GET /api/vtep-writing/submissions/me
  static async getMySubmissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const submissions = await VtepWritingRepository.listUserSubmissions(userId);
      return res.json(submissions);
    } catch (err: any) {
      console.error("Get my submissions error:", err);
      return res.status(500).json({ error: err.message || "Get failed" });
    }
  }

  // GET /api/vtep-writing/submissions/:id
  static async getSubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const submission = await VtepWritingRepository.getSubmissionById(id);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check authorization
      const userId = req.user?.sub || req.user?.id;
      if (submission.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.json(submission);
    } catch (err: any) {
      console.error("Get submission error:", err);
      return res.status(500).json({ error: err.message || "Get failed" });
    }
  }

  // POST /api/vtep-writing/submissions/:id/grade
  static async gradeSubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const submission = await VtepWritingRepository.getSubmissionById(id);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get the prompt details
      let promptDetails = null;
      let minWords = 120; // Default
      let keyPoints: string[] = [];

      if (submission.promptId) {
        promptDetails = await VtepWritingRepository.getPromptById(submission.promptId);
        if (promptDetails) {
          minWords = promptDetails.minWords || (submission.taskType === "task1" ? 120 : 250);
          try {
            keyPoints = promptDetails.keyPoints ? JSON.parse(promptDetails.keyPoints) : [];
          } catch (e) {
            keyPoints = [];
          }
        }
      }

      // Call AI to grade the submission
      console.log("🤖 Calling AI to grade submission:", id);
      const aiGrade = await gradeWritingSubmission({
        taskType: submission.taskType as "task1" | "task2",
        promptText: promptDetails?.promptText || "No prompt provided",
        submittedText: submission.submittedText,
        minWords,
        level: promptDetails?.level || "b2",
        keyPoints,
      });

      console.log("✅ AI grading completed:", aiGrade.overallScore);

      // Calculate VSTEP weighted scores
      const vstepScores = calculateVstepScore(aiGrade, submission.taskType as "task1" | "task2");

      // Prepare feedback for database
      const aiFeedback = {
        overallScore: aiGrade.overallScore,
        criteriaAverage: vstepScores.criteriaAverage,
        weightedScore: vstepScores.weightedScore,
        percentage: vstepScores.percentage,
        criteria: {
          taskAchievement: aiGrade.taskAchievement,
          coherenceCohesion: aiGrade.coherenceCohesion,
          lexicalResource: aiGrade.lexicalResource,
          grammaticalRange: aiGrade.grammaticalRange,
        },
        strengths: aiGrade.generalStrengths,
        weaknesses: aiGrade.generalWeaknesses,
        suggestions: aiGrade.suggestions,
        wordCount: aiGrade.wordCount,
        meetsMinimumWords: aiGrade.meetsMinimumWords,
      };

      // Update submission with AI grades
      await VtepWritingRepository.updateSubmissionGrade(id, {
        aiFeedback,
        aiScore: vstepScores.criteriaAverage,
        scoreTaskAchievement: aiGrade.taskAchievement.score,
        scoreCoherence: aiGrade.coherenceCohesion.score,
        scoreLexical: aiGrade.lexicalResource.score,
        scoreGrammar: aiGrade.grammaticalRange.score,
      });

      return res.json({ 
        success: true, 
        grade: {
          ...aiFeedback,
          aiScore: vstepScores.criteriaAverage,
          scoreTaskAchievement: aiGrade.taskAchievement.score,
          scoreCoherence: aiGrade.coherenceCohesion.score,
          scoreLexical: aiGrade.lexicalResource.score,
          scoreGrammar: aiGrade.grammaticalRange.score,
        }
      });
    } catch (err: any) {
      console.error("Grade submission error:", err);
      return res.status(500).json({ 
        error: err.message || "Grade failed",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
}
