import { Request, Response } from "express";
import { VtepSpeakingRepository } from "../repositories/vtepSpeaking.repository";

export class VtepSpeakingController {
  // ==================== PROMPTS ====================

  static async createPrompt(req: Request, res: Response): Promise<void> {
    try {
      const {
        partNumber,
        category,
        level,
        title,
        promptText,
        cueCardBullets,
        preparationTime,
        speakingTime,
        sampleAnswer,
        keyVocabulary,
        usefulPhrases,
      } = req.body;

      if (!partNumber || ![1, 2, 3].includes(partNumber)) {
        res.status(400).json({ error: "Invalid part number (must be 1, 2, or 3)" });
        return;
      }

      if (!title || !promptText) {
        res.status(400).json({ error: "Title and prompt text are required" });
        return;
      }

      const userId = (req as any).user?.id;
      const result = await VtepSpeakingRepository.createPrompt({
        partNumber,
        category,
        level,
        title,
        promptText,
        cueCardBullets,
        preparationTime,
        speakingTime,
        sampleAnswer,
        keyVocabulary,
        usefulPhrases,
        createdByUserId: userId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating speaking prompt:", error);
      res.status(500).json({ error: "Failed to create speaking prompt" });
    }
  }

  static async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { partNumber, level, category, search } = req.query;

      const filters: any = {};
      if (partNumber) filters.partNumber = parseInt(partNumber as string);
      if (level) filters.level = level as string;
      if (category) filters.category = category as string;
      if (search) filters.search = search as string;

      console.log('🎤 [Speaking] listPrompts called with filters:', filters);
      const prompts = await VtepSpeakingRepository.listPrompts(filters);
      console.log(`🎤 [Speaking] Found ${prompts.length} prompts`);
      res.json({ data: prompts });
    } catch (error) {
      console.error("Error listing speaking prompts:", error);
      res.status(500).json({ error: "Failed to list speaking prompts" });
    }
  }

  static async getPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const prompt = await VtepSpeakingRepository.getPromptById(id);

      if (!prompt) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      res.json({ data: prompt });
    } catch (error) {
      console.error("Error getting speaking prompt:", error);
      res.status(500).json({ error: "Failed to get speaking prompt" });
    }
  }

  static async updatePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        category,
        level,
        title,
        promptText,
        cueCardBullets,
        preparationTime,
        speakingTime,
        sampleAnswer,
        keyVocabulary,
        usefulPhrases,
      } = req.body;

      await VtepSpeakingRepository.updatePrompt(id, {
        category,
        level,
        title,
        promptText,
        cueCardBullets,
        preparationTime,
        speakingTime,
        sampleAnswer,
        keyVocabulary,
        usefulPhrases,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating speaking prompt:", error);
      res.status(500).json({ error: "Failed to update speaking prompt" });
    }
  }

  static async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await VtepSpeakingRepository.deletePrompt(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting speaking prompt:", error);
      res.status(500).json({ error: "Failed to delete speaking prompt" });
    }
  }

  // ==================== TESTS ====================

  static async createTest(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        level,
        part1PromptIds,
        part2PromptId,
        part3PromptIds,
        totalTimeMinutes,
        isActive,
        isPublic,
      } = req.body;

      if (!title) {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      const userId = (req as any).user?.id;
      const result = await VtepSpeakingRepository.createTest({
        title,
        description,
        level,
        part1PromptIds,
        part2PromptId,
        part3PromptIds,
        totalTimeMinutes,
        isActive,
        isPublic,
        createdByUserId: userId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating speaking test:", error);
      res.status(500).json({ error: "Failed to create speaking test" });
    }
  }

  static async createRandomTest(req: Request, res: Response): Promise<void> {
    try {
      const { level, title, documentId } = req.body;
      const userId = (req as any).user?.id;

      const result = await VtepSpeakingRepository.createRandomTest({
        level,
        title,
        documentId,
        createdByUserId: userId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating random speaking test:", error);
      res.status(500).json({ error: "Failed to create random speaking test" });
    }
  }

  static async listTests(req: Request, res: Response): Promise<void> {
    try {
      const { level, isActive, isPublic } = req.query;

      const filters: any = {};
      if (level) filters.level = level as string;
      if (isActive !== undefined) filters.isActive = isActive === "true";
      if (isPublic !== undefined) filters.isPublic = isPublic === "true";

      console.log('📋 Listing speaking tests with filters:', filters);
      const tests = await VtepSpeakingRepository.listTests(filters);
      console.log('📋 Found tests:', tests.length);
      res.json({ data: tests });
    } catch (error) {
      console.error("Error listing speaking tests:", error);
      res.status(500).json({ error: "Failed to list speaking tests" });
    }
  }

  static async getTest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const test = await VtepSpeakingRepository.getTestById(id);

      if (!test) {
        res.status(404).json({ error: "Test not found" });
        return;
      }

      // Parse JSON fields
      if (test.part1PromptIds) {
        try {
          (test as any).part1Prompts = JSON.parse(test.part1PromptIds);
        } catch (e) {
          console.error("Failed to parse part1PromptIds");
        }
      }
      if (test.part3PromptIds) {
        try {
          (test as any).part3Prompts = JSON.parse(test.part3PromptIds);
        } catch (e) {
          console.error("Failed to parse part3PromptIds");
        }
      }

      res.json(test);
    } catch (error) {
      console.error("Error getting speaking test:", error);
      res.status(500).json({ error: "Failed to get speaking test" });
    }
  }

  static async getTestWithPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const test = await VtepSpeakingRepository.getTestById(id);

      if (!test) {
        res.status(404).json({ error: "Test not found" });
        return;
      }

      // Fetch all prompts
      const part1Ids = test.part1PromptIds ? JSON.parse(test.part1PromptIds) : [];
      const part3Ids = test.part3PromptIds ? JSON.parse(test.part3PromptIds) : [];

      const part1Prompts = await Promise.all(
        part1Ids.map((id: string) => VtepSpeakingRepository.getPromptById(id))
      );

      let part2Prompt = null;
      if (test.part2PromptId) {
        part2Prompt = await VtepSpeakingRepository.getPromptById(test.part2PromptId);
      }

      const part3Prompts = await Promise.all(
        part3Ids.map((id: string) => VtepSpeakingRepository.getPromptById(id))
      );

      res.json({
        ...test,
        part1Prompts: part1Prompts.filter(Boolean),
        part2Prompt,
        part3Prompts: part3Prompts.filter(Boolean),
      });
    } catch (error) {
      console.error("Error getting speaking test with prompts:", error);
      res.status(500).json({ error: "Failed to get speaking test with prompts" });
    }
  }

  static async updateTest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        level,
        part1PromptIds,
        part2PromptId,
        part3PromptIds,
        totalTimeMinutes,
        isActive,
        isPublic,
      } = req.body;

      await VtepSpeakingRepository.updateTest(id, {
        title,
        description,
        level,
        part1PromptIds,
        part2PromptId,
        part3PromptIds,
        totalTimeMinutes,
        isActive,
        isPublic,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating speaking test:", error);
      res.status(500).json({ error: "Failed to update speaking test" });
    }
  }

  static async deleteTest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await VtepSpeakingRepository.deleteTest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting speaking test:", error);
      res.status(500).json({ error: "Failed to delete speaking test" });
    }
  }

  static async instantiateTest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id || null;

      console.log("🎯 [InstantiateSpeakingTest] Starting instantiation:", {
        testId: id,
        userId: userId,
        hasUser: !!(req as any).user,
      });

      // Get the test
      const test = await VtepSpeakingRepository.getTestById(id);
      if (!test) {
        console.log("❌ [InstantiateSpeakingTest] Test not found:", id);
        res.status(404).json({ error: "Test not found" });
        return;
      }

      console.log("✅ [InstantiateSpeakingTest] Test found:", {
        title: test.title,
        isActive: test.isActive,
        isPublic: test.isPublic,
      });

      if (!test.isActive) {
        console.log("❌ [InstantiateSpeakingTest] Test not active");
        res.status(403).json({ error: "Test is not active" });
        return;
      }

      // Get all prompts for this test
      const part1PromptIds = test.part1PromptIds ? JSON.parse(test.part1PromptIds) : [];
      const part2PromptId = test.part2PromptId;
      const part3PromptIds = test.part3PromptIds ? JSON.parse(test.part3PromptIds) : [];

      const allPromptIds = [
        ...part1PromptIds,
        ...(part2PromptId ? [part2PromptId] : []),
        ...part3PromptIds,
      ];

      console.log("📋 [InstantiateSpeakingTest] Prompts:", {
        part1Count: part1PromptIds.length,
        hasPart2: !!part2PromptId,
        part3Count: part3PromptIds.length,
        totalPrompts: allPromptIds.length,
      });

      const prompts = await Promise.all(
        allPromptIds.map((promptId: string) =>
          VtepSpeakingRepository.getPromptById(promptId)
        )
      );

      // Create a Tests row for this speaking test attempt
      const { v4: uuidv4 } = await import("uuid");
      const { TestRepository } = await import("../repositories/test.repository");
      
      const testId = uuidv4();
      const testData = { 
        vtepTestId: id, 
        title: test.title,
        skill: "Speaking"
      };
      
      console.log("💾 [InstantiateSpeakingTest] Creating Tests row:", {
        testId: testId,
        userId: userId,
        type: "vtep",
        skill: "Speaking",
      });

      await TestRepository.create({
        id: testId,
        userId: userId,
        type: "vtep",
        skill: "Speaking",
        data: JSON.stringify(testData),
      });

      console.log("✅ [InstantiateSpeakingTest] Tests row created successfully");

      // Return test with prompts for the student to start
      res.json({
        testId: testId, // Return the new Tests row ID for saving later
        vtepTestId: test.id, // Original speaking test template ID
        title: test.title,
        description: test.description,
        level: test.level,
        totalTimeMinutes: test.totalTimeMinutes,
        part1Prompts: prompts.filter(
          (p) => p && part1PromptIds.includes(p.id)
        ),
        part2Prompt: prompts.find((p) => p && p.id === part2PromptId) || null,
        part3Prompts: prompts.filter(
          (p) => p && part3PromptIds.includes(p.id)
        ),
      });
    } catch (error) {
      console.error("❌ [InstantiateSpeakingTest] Error:", error);
      res.status(500).json({ error: "Failed to instantiate speaking test" });
    }
  }

  // ==================== SUBMISSIONS ====================

  static async createSubmission(req: Request, res: Response): Promise<void> {
    try {
      const {
        testId,
        promptId,
        partNumber,
        audioUrl,
        durationSeconds,
        transcribedText,
        transcriptionConfidence,
      } = req.body;

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!partNumber || ![1, 2, 3].includes(partNumber)) {
        res.status(400).json({ error: "Invalid part number (must be 1, 2, or 3)" });
        return;
      }

      const result = await VtepSpeakingRepository.createSubmission({
        userId,
        testId,
        promptId,
        partNumber,
        audioUrl,
        durationSeconds,
        transcribedText,
        transcriptionConfidence,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating speaking submission:", error);
      res.status(500).json({ error: "Failed to create speaking submission" });
    }
  }

  static async listSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId, testId, status } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (testId) filters.testId = testId as string;
      if (status) filters.status = status as string;

      const submissions = await VtepSpeakingRepository.listSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      console.error("Error listing speaking submissions:", error);
      res.status(500).json({ error: "Failed to list speaking submissions" });
    }
  }

  static async getSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const submission = await VtepSpeakingRepository.getSubmissionById(id);

      if (!submission) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      res.json(submission);
    } catch (error) {
      console.error("Error getting speaking submission:", error);
      res.status(500).json({ error: "Failed to get speaking submission" });
    }
  }

  static async updateSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        audioUrl,
        durationSeconds,
        transcribedText,
        transcriptionConfidence,
        aiFeedback,
        aiScore,
        scoreFluency,
        scoreLexical,
        scoreGrammar,
        scorePronunciation,
        teacherFeedback,
        teacherScore,
        status,
      } = req.body;

      const userId = (req as any).user?.id;

      await VtepSpeakingRepository.updateSubmission(id, {
        audioUrl,
        durationSeconds,
        transcribedText,
        transcriptionConfidence,
        aiFeedback,
        aiScore,
        scoreFluency,
        scoreLexical,
        scoreGrammar,
        scorePronunciation,
        teacherFeedback,
        teacherScore,
        gradedByUserId: userId,
        status,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating speaking submission:", error);
      res.status(500).json({ error: "Failed to update speaking submission" });
    }
  }

  static async deleteSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await VtepSpeakingRepository.deleteSubmission(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting speaking submission:", error);
      res.status(500).json({ error: "Failed to delete speaking submission" });
    }
  }

  // ==================== GRADING ====================

  static async gradeSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const submission = await VtepSpeakingRepository.getSubmissionById(id);

      if (!submission) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      // TODO: Implement AI grading flow
      // This will be implemented in the AI flows directory
      // For now, return a placeholder response

      res.json({
        message: "AI grading not yet implemented",
        submissionId: id,
      });
    } catch (error) {
      console.error("Error grading speaking submission:", error);
      res.status(500).json({ error: "Failed to grade speaking submission" });
    }
  }
}
