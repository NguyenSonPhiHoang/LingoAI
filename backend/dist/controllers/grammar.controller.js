"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrammarController = void 0;
const grammar_repository_1 = require("../repositories/grammar.repository");
function getUserId(req) {
    const sub = req.user?.sub;
    return typeof sub === "string" && sub.trim() ? sub : null;
}
function normalizeTextAnswer(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'");
}
function safeJsonParse(value) {
    if (typeof value !== "string")
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function gradeExercise(ex, userAnswer) {
    const points = Number(ex.points) || 1;
    const expected = safeJsonParse(ex.answerJson) || {};
    // Save whatever user sent for attempt audit.
    const userAnswerJson = typeof userAnswer === "undefined" ? null : JSON.stringify(userAnswer);
    if (ex.type === "mcq") {
        const expectedId = String(expected.correctOptionId || "");
        const pickedId = userAnswer && typeof userAnswer === "object"
            ? String(userAnswer.optionId || "")
            : "";
        const isCorrect = !!expectedId && expectedId === pickedId;
        return { isCorrect, score: isCorrect ? points : 0, points, userAnswerJson };
    }
    // text
    const accepted = Array.isArray(expected.accepted)
        ? expected.accepted.map((s) => String(s))
        : [];
    const typed = typeof userAnswer === "string" ? userAnswer : userAnswer?.text;
    const typedNorm = typeof typed === "string" ? normalizeTextAnswer(typed) : "";
    const acceptedNorm = accepted.map((a) => normalizeTextAnswer(a));
    const isCorrect = !!typedNorm && acceptedNorm.length > 0 && acceptedNorm.includes(typedNorm);
    return { isCorrect, score: isCorrect ? points : 0, points, userAnswerJson };
}
class GrammarController {
    static async listLessons(req, res) {
        try {
            const rows = await grammar_repository_1.GrammarRepository.listPublished();
            return res.json({ lessons: rows });
        }
        catch (err) {
            console.error("Grammar list error:", err?.message || err);
            return res.status(500).json({ error: "failed to list grammar lessons" });
        }
    }
    static async getLesson(req, res) {
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ error: "id required" });
        try {
            const lesson = await grammar_repository_1.GrammarRepository.getPublishedLessonDetail(id);
            if (!lesson)
                return res.status(404).json({ error: "not found" });
            return res.json({ lesson });
        }
        catch (err) {
            console.error("Grammar get error:", err?.message || err);
            return res.status(500).json({ error: "failed to get grammar lesson" });
        }
    }
    static async submitAttempt(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const lessonId = req.params.id;
        const { answers } = req.body || {};
        if (!lessonId)
            return res.status(400).json({ error: "lesson id required" });
        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: "answers must be an array" });
        }
        try {
            // Ensure lesson exists & is published
            const lesson = await grammar_repository_1.GrammarRepository.getPublishedLessonDetail(lessonId);
            if (!lesson)
                return res.status(404).json({ error: "lesson not found" });
            const exercises = await grammar_repository_1.GrammarRepository.getExercisesForGrading(lessonId);
            const byId = new Map(exercises.map((e) => [String(e.id), e]));
            let score = 0;
            let maxScore = 0;
            const results = exercises.map((ex) => {
                maxScore += Number(ex.points) || 1;
                const found = answers.find((a) => String(a?.exerciseId) === String(ex.id));
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
            const attempt = await grammar_repository_1.GrammarRepository.createAttempt({
                userId,
                lessonId,
                score,
                maxScore,
                answers: exercises.map((ex) => {
                    const found = answers.find((a) => String(a?.exerciseId) === String(ex.id));
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
        }
        catch (err) {
            console.error("Grammar submit error:", err?.message || err);
            return res.status(500).json({ error: "failed to submit attempt" });
        }
    }
    // Admin/Teacher create lesson
    static async createLesson(req, res) {
        const userId = getUserId(req);
        const { title, level, topic, contentMarkdown, isPublished } = req.body || {};
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ error: "title required" });
        }
        const levelNorm = String(level || "").toLowerCase();
        if (!/[abc][12]/.test(levelNorm) ||
            !["a1", "a2", "b1", "b2", "c1", "c2"].includes(levelNorm)) {
            return res
                .status(400)
                .json({ error: "level must be one of a1,a2,b1,b2,c1,c2" });
        }
        if (!contentMarkdown || typeof contentMarkdown !== "string") {
            return res.status(400).json({ error: "contentMarkdown required" });
        }
        try {
            const created = await grammar_repository_1.GrammarRepository.createLesson({
                title: title.trim(),
                level: levelNorm,
                topic: typeof topic === "string" ? topic.trim() : null,
                contentMarkdown,
                createdByUserId: userId,
                isPublished: typeof isPublished === "boolean" ? isPublished : true,
            });
            return res.json({ id: created.id });
        }
        catch (err) {
            console.error("Grammar create error:", err?.message || err);
            return res.status(500).json({ error: "failed to create lesson" });
        }
    }
    // Admin/Teacher upsert exercises
    static async upsertExercises(req, res) {
        const lessonId = req.params.id;
        const { exercises } = req.body || {};
        if (!lessonId)
            return res.status(400).json({ error: "lesson id required" });
        if (!Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: "exercises array required" });
        }
        try {
            await grammar_repository_1.GrammarRepository.upsertExercises(lessonId, exercises);
            return res.json({ ok: true });
        }
        catch (err) {
            console.error("Grammar exercises error:", err?.message || err);
            return res.status(500).json({ error: "failed to upsert exercises" });
        }
    }
}
exports.GrammarController = GrammarController;
