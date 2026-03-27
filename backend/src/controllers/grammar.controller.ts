import { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  GrammarRepository,
  type GrammarExerciseForGrading,
} from "../repositories/grammar.repository";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import UserSettingsRepository from "../repositories/userSettings.repository";
import { RoleRepository } from "../repositories/role.repository";

function getUserId(req: AuthRequest): string | null {
  const sub = req.user?.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

function normalizeTextAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

function safeJsonParse(value: any): any {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function gradeExercise(
  ex: GrammarExerciseForGrading,
  userAnswer: any,
): {
  isCorrect: boolean;
  score: number;
  points: number;
  userAnswerJson: string | null;
} {
  const points = Number(ex.points) || 1;
  const expected = safeJsonParse(ex.answerJson) || {};

  // Save whatever user sent for attempt audit.
  const userAnswerJson =
    typeof userAnswer === "undefined" ? null : JSON.stringify(userAnswer);

  if (ex.type === "mcq") {
    const expectedId = String(expected.correctOptionId || "");
    const pickedId =
      userAnswer && typeof userAnswer === "object"
        ? String(userAnswer.optionId || "")
        : "";
    const isCorrect = !!expectedId && expectedId === pickedId;
    return { isCorrect, score: isCorrect ? points : 0, points, userAnswerJson };
  }

  if (ex.type === "multichoice") {
    const expectedIds: string[] = Array.isArray(expected.correctOptionIds)
      ? expected.correctOptionIds.map((s: any) => String(s))
      : [];

    const pickedIds: string[] =
      userAnswer &&
        typeof userAnswer === "object" &&
        Array.isArray(userAnswer.optionIds)
        ? userAnswer.optionIds.map((s: any) => String(s))
        : [];

    // Full credit only when selected set exactly matches expected set
    const setEq = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const sa = new Set(a);
      for (const x of b) if (!sa.has(x)) return false;
      return true;
    };

    const isCorrect = expectedIds.length > 0 && setEq(expectedIds, pickedIds);
    return { isCorrect, score: isCorrect ? points : 0, points, userAnswerJson };
  }

  // text
  const accepted: string[] = Array.isArray(expected.accepted)
    ? expected.accepted.map((s: any) => String(s))
    : [];
  const typed = typeof userAnswer === "string" ? userAnswer : userAnswer?.text;
  const typedNorm = typeof typed === "string" ? normalizeTextAnswer(typed) : "";
  const acceptedNorm = accepted.map((a) => normalizeTextAnswer(a));
  const isCorrect =
    !!typedNorm && acceptedNorm.length > 0 && acceptedNorm.includes(typedNorm);
  return { isCorrect, score: isCorrect ? points : 0, points, userAnswerJson };
}

export class GrammarController {
  static async listLessons(req: AuthRequest, res: Response) {
    try {
      const rows = await GrammarRepository.listPublished();
      return res.json({ lessons: rows });
    } catch (err: any) {
      console.error("Grammar list error:", err?.message || err);
      return res.status(500).json({ error: "failed to list grammar lessons" });
    }
  }

  static async getLesson(req: AuthRequest, res: Response) {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });

    try {
      // If user is admin or teacher, include answers by returning full lesson detail
      let lesson: any = null;
      try {
        const roleId = req.user?.roleId;
        if (roleId) {
          const role = await RoleRepository.findById(roleId);
          const roleName = role?.name?.toLowerCase();
          if (roleName === "admin" || roleName === "teacher") {
            lesson = await GrammarRepository.getLessonDetail(id);
          }
        }
      } catch (e) {
        // ignore role lookup errors and fall back to published view
        console.error("Role lookup error:", e);
      }

      if (!lesson) {
        lesson = await GrammarRepository.getPublishedLessonDetail(id);
      }

      if (!lesson) return res.status(404).json({ error: "not found" });
      return res.json({ lesson });
    } catch (err: any) {
      console.error("Grammar get error:", err?.message || err);
      return res.status(500).json({ error: "failed to get grammar lesson" });
    }
  }

  static async submitAttempt(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const lessonId = req.params.id;
    const { answers } = req.body || {};

    if (!lessonId) return res.status(400).json({ error: "lesson id required" });
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers must be an array" });
    }

    try {
      // Ensure lesson exists & is published
      const lesson = await GrammarRepository.getPublishedLessonDetail(lessonId);
      if (!lesson) return res.status(404).json({ error: "lesson not found" });

      const exercises =
        await GrammarRepository.getExercisesForGrading(lessonId);
      const byId = new Map(exercises.map((e) => [String(e.id), e]));

      let score = 0;
      let maxScore = 0;

      const results = exercises.map((ex) => {
        maxScore += Number(ex.points) || 1;

        const found = answers.find(
          (a: any) => String(a?.exerciseId) === String(ex.id),
        );
        const userAnswer = found?.answer;

        const graded = gradeExercise(ex, userAnswer);
        score += graded.score;

        return {
          exerciseId: ex.id,
          isCorrect: graded.isCorrect,
          score: graded.score,
          points: graded.points,
          explanation: ex.explanation || null,
        };
      });

      const attempt = await GrammarRepository.createAttempt({
        userId,
        lessonId,
        score,
        maxScore,
        answers: exercises.map((ex) => {
          const found = answers.find(
            (a: any) => String(a?.exerciseId) === String(ex.id),
          );
          const userAnswer = found?.answer;
          const graded = gradeExercise(ex, userAnswer);
          return {
            exerciseId: ex.id,
            userAnswerJson: graded.userAnswerJson,
            isCorrect: graded.isCorrect,
            score: graded.score,
            points: graded.points,
          };
        }),
      });

      return res.json({
        attemptId: attempt.id,
        score,
        maxScore,
        results,
      });
    } catch (err: any) {
      console.error("Grammar submit error:", err?.message || err);
      return res.status(500).json({ error: "failed to submit attempt" });
    }
  }

  // Admin/Teacher create lesson
  static async createLesson(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    const { title, level, topic, contentMarkdown, isPublished, resources } =
      req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title required" });
    }
    const levelNorm = String(level || "").toLowerCase();
    if (
      !/[abc][12]/.test(levelNorm) ||
      !["a1", "a2", "b1", "b2", "c1", "c2"].includes(levelNorm)
    ) {
      return res
        .status(400)
        .json({ error: "level must be one of a1,a2,b1,b2,c1,c2" });
    }
    if (!contentMarkdown || typeof contentMarkdown !== "string") {
      return res.status(400).json({ error: "contentMarkdown required" });
    }

    try {
      const created = await GrammarRepository.createLesson({
        title: title.trim(),
        level: levelNorm as any,
        topic: typeof topic === "string" ? topic.trim() : null,
        contentMarkdown,
        resources: Array.isArray(resources) ? resources : undefined,
        createdByUserId: userId,
        isPublished: typeof isPublished === "boolean" ? isPublished : true,
      });

      return res.json({ id: created.id });
    } catch (err: any) {
      console.error("Grammar create error:", err?.message || err);
      return res.status(500).json({ error: "failed to create lesson" });
    }
  }

  // Admin/Teacher update lesson
  static async updateLesson(req: AuthRequest, res: Response) {
    const lessonId = req.params.id;
    const { title, level, topic, contentMarkdown, isPublished, resources } =
      req.body || {};

    if (!lessonId) return res.status(400).json({ error: "lesson id required" });

    try {
      await GrammarRepository.updateLesson({
        id: lessonId,
        title: typeof title === "string" ? title.trim() : undefined,
        level: typeof level === "string" ? (level as any) : undefined,
        topic: typeof topic === "string" ? topic.trim() : undefined,
        contentMarkdown:
          typeof contentMarkdown === "string" ? contentMarkdown : undefined,
        resourcesJson: typeof resources === "undefined" ? undefined : resources,
        isPublished: typeof isPublished === "boolean" ? isPublished : undefined,
      });

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Grammar update error:", err?.message || err);
      return res.status(500).json({ error: "failed to update lesson" });
    }
  }

  // Admin/Teacher upsert exercises
  static async upsertExercises(req: AuthRequest, res: Response) {
    const lessonId = req.params.id;
    const { exercises } = req.body || {};

    if (!lessonId) return res.status(400).json({ error: "lesson id required" });
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: "exercises array required" });
    }

    try {
      await GrammarRepository.upsertExercises(lessonId, exercises);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Grammar exercises error:", err?.message || err);
      return res.status(500).json({ error: "failed to upsert exercises" });
    }
  }

  static async generateExercises(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const lessonId = req.params.id;
    if (!lessonId) return res.status(400).json({ error: "lesson id required" });

    try {
      const lesson = await GrammarRepository.getLessonDetail(lessonId);
      if (!lesson) return res.status(404).json({ error: "lesson not found" });

      // Get API key for user or fallback to server key
      let userKey: string | null = null;
      try {
        const row = await UserSettingsRepository.getByUserId(userId);
        userKey = row?.GeminiApiKey ?? null;
      } catch (settingsErr: any) {
        console.warn(
          "Could not fetch user Gemini API key (falling back to server key):",
          settingsErr?.message || settingsErr,
        );
      }
      const apiKey =
        typeof userKey === "string" && userKey.trim()
          ? userKey.trim()
          : typeof config.geminiApiKey === "string" &&
            config.geminiApiKey.trim()
            ? config.geminiApiKey.trim()
            : null;
      if (!apiKey)
        return res.status(400).json({ error: "Gemini API key not configured" });

      const client = new GoogleGenerativeAI(apiKey);
      const modelName =
        typeof config.geminiModel === "string" && config.geminiModel.trim()
          ? config.geminiModel.trim()
          : "gemini-2.5-flash";

      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction:
          "You are an assistant that generates short grammar exercises in JSON format.",
      });

      // Build prompt to request 5 MCQ, 5 text, 5 multichoice exercises
      const prompt = `Given the following grammar lesson content, generate exercises for learners.

Lesson content:
${lesson.contentMarkdown}

Produce a JSON array with 15 objects. Each object should have:
- type: one of \"mcq\", \"text\", \"multichoice\";
- prompt: the question/prompt text;
- options: for mcq and multichoice, an array of option labels (strings). For text, this should be an empty array or omitted;
- correct: for mcq a single string equal to the correct option label; for multichoice an array of strings equal to the correct option labels; for text an array of accepted answers (can be empty).
- explanation: brief explanation (optional).

Requirements:
- Generate exactly 5 objects of type \"mcq\" (each with 4 options and one correct), 5 of type \"text\" (short answer prompts), and 5 of type \"multichoice\" (each with 3-5 options and 1-3 correct options).
- Return ONLY valid JSON (no extra text). Use option labels (not ids). Example object:
  { "type": "mcq", "prompt": "...", "options": ["A","B","C","D"], "correct": "A", "explanation": "..." }

Return the JSON array.`;

      const result = await model.generateContent(prompt);
      const raw = (result.response.text() || "").trim();

      // Try a sequence of tolerant parsing strategies to extract a JSON array
      let parsed: any[] = [];

      function extractJsonArrayByBrackets(s: string): string | null {
        const start = s.indexOf("[");
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < s.length; i++) {
          const ch = s[i];
          if (ch === "[") depth++;
          else if (ch === "]") {
            depth--;
            if (depth === 0) return s.slice(start, i + 1);
          }
        }
        return null;
      }

      function sanitizeLikelyJson(s: string): string {
        return (
          s
            .replace(/[“”]/g, '"')
            .replace(/[’]/g, "'")
            // remove trailing commas before closing objects/arrays
            .replace(/,\s*(\]|\})/g, "$1")
            .trim()
        );
      }

      // 1) direct parse
      try {
        parsed = JSON.parse(raw);
      } catch (e1) {
        // 2) try to extract via bracket matching
        const sub = extractJsonArrayByBrackets(raw);
        if (sub) {
          try {
            parsed = JSON.parse(sub);
          } catch (e2) {
            // 3) try regex fallback
            const m = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (m) {
              try {
                parsed = JSON.parse(m[0]);
              } catch (e3) {
                // 4) attempt sanitized parse
                try {
                  const san = sanitizeLikelyJson(m[0]);
                  parsed = JSON.parse(san);
                } catch (e4) {
                  console.error(
                    "AI returned invalid JSON (parse failures). Raw output:\n",
                    raw,
                  );
                  return res.status(500).json({
                    error: "AI returned invalid JSON",
                    raw: String(raw).slice(0, 2000),
                  });
                }
              }
            } else {
              // 4) try sanitized full raw
              try {
                const san = sanitizeLikelyJson(raw);
                parsed = JSON.parse(san);
              } catch (e5) {
                console.error(
                  "AI returned invalid JSON (could not extract array). Raw output:\n",
                  raw,
                );
                return res.status(500).json({
                  error: "AI returned invalid JSON",
                  raw: String(raw).slice(0, 2000),
                });
              }
            }
          }
        } else {
          // try regex match
          const m = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch (e6) {
              try {
                const san = sanitizeLikelyJson(m[0]);
                parsed = JSON.parse(san);
              } catch (e7) {
                console.error(
                  "AI returned invalid JSON (regex extract failed). Raw output:\n",
                  raw,
                );
                return res.status(500).json({
                  error: "AI returned invalid JSON",
                  raw: String(raw).slice(0, 2000),
                });
              }
            }
          } else {
            try {
              const san = sanitizeLikelyJson(raw);
              parsed = JSON.parse(san);
            } catch (e8) {
              console.error("AI returned invalid format. Raw output:\n", raw);
              return res.status(500).json({
                error: "AI returned invalid format",
                raw: String(raw).slice(0, 2000),
              });
            }
          }
        }
      }

      // Normalize parsed objects into upsert payload
      const payload: any[] = [];
      let optCounter = 0;
      function normalizeLabelForMatch(v: any) {
        if (typeof v !== "string") return "";
        return v
          .trim()
          .toLowerCase()
          .replace(/[“”]/g, '"')
          .replace(/[’]/g, "'")
          .replace(/^[A-Za-z0-9]\s*[\.\)]\s*/g, "")
          .replace(/\s+/g, " ");
      }
      for (const p of parsed) {
        const type =
          p.type === "text"
            ? "text"
            : p.type === "multichoice"
              ? "multichoice"
              : "mcq";
        const promptText =
          typeof p.prompt === "string" ? p.prompt : String(p.prompt || "");

        const optionLabels: string[] = Array.isArray(p.options)
          ? p.options.map((s: any) => String(s))
          : [];
        const options = optionLabels.map((label) => ({
          id: `opt-${Date.now()}-${optCounter++}-${Math.random().toString(36).slice(2, 8)}`,
          label,
        }));

        let answerJson: any = undefined;
        if (type === "mcq") {
          const correctLabel =
            typeof p.correct === "string"
              ? p.correct
              : Array.isArray(p.correct)
                ? p.correct[0]
                : null;
          const desired = normalizeLabelForMatch(correctLabel);
          let correctOpt = options.find(
            (o) => normalizeLabelForMatch(o.label) === desired,
          );
          // Fallback: if correctLabel is a single letter (A/B/C...) map to index
          if (!correctOpt && typeof correctLabel === "string") {
            const s = correctLabel.trim().toUpperCase();
            if (/^[A-Z]$/.test(s)) {
              const idx = s.charCodeAt(0) - 65;
              if (idx >= 0 && idx < options.length) correctOpt = options[idx];
            }
          }
          answerJson = { correctOptionId: correctOpt ? correctOpt.id : null };
        } else if (type === "multichoice") {
          const correctArr: string[] = Array.isArray(p.correct)
            ? p.correct.map((s: any) => String(s))
            : [];
          const desiredSet = correctArr.map((s) => normalizeLabelForMatch(s));
          const correctIds: string[] = [];
          for (let i = 0; i < options.length; i++) {
            const o = options[i];
            const norm = normalizeLabelForMatch(o.label);
            if (desiredSet.includes(norm)) {
              correctIds.push(o.id);
            }
          }
          // Fallback: if no matches, try mapping letters in correctArr
          if (correctIds.length === 0) {
            for (const c of correctArr) {
              const s = String(c || "")
                .trim()
                .toUpperCase();
              if (/^[A-Z]$/.test(s)) {
                const idx = s.charCodeAt(0) - 65;
                if (idx >= 0 && idx < options.length)
                  correctIds.push(options[idx].id);
              }
            }
          }
          answerJson = { correctOptionIds: correctIds };
        } else {
          const accepted = Array.isArray(p.correct)
            ? p.correct.map((s: any) => String(s))
            : [];
          answerJson = { accepted };
        }

        payload.push({
          id: undefined,
          type:
            type === "multichoice"
              ? "multichoice"
              : type === "text"
                ? "text"
                : "mcq",
          prompt: promptText,
          optionsJson: options.length ? options : undefined,
          answerJson,
          explanation: typeof p.explanation === "string" ? p.explanation : null,
          points: Number(p.points || 1) || 1,
          sortOrder: 0,
        });
      }

      // Persist generated exercises
      await GrammarRepository.upsertExercises(lessonId, payload as any);

      return res.json({ ok: true, count: payload.length });
    } catch (err: any) {
      const errMsg = err?.message || String(err) || "unknown error";
      console.error("Generate exercises error:", errMsg, err);
      return res.status(500).json({ error: `failed to generate exercises: ${errMsg}` });
    }
  }
}
