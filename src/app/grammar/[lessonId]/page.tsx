"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  ChevronLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Upload,
  Download,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  getGrammarLesson,
  submitGrammarAttempt,
  type GrammarLessonDetail,
  type GrammarExercise,
  type SubmitGrammarAttemptResult,
  GRAMMAR_LEVELS,
  type GrammarLevel,
  upsertGrammarExercises,
  updateGrammarLesson,
  generateGrammarExercises,
} from "@/services/grammar";

type AnswerState = Record<string, any>;

type EditorExercise = {
  id?: string;
  type: "mcq" | "text" | "multichoice";
  prompt: string;
  options?: Array<{ id: string; label: string }>;
  correctOptionId?: string | null;
  correctOptionIds?: string[] | null;
  acceptedAnswers?: string[];
  explanation?: string | null;
  points?: number;
  sortOrder?: number;
};

function isGrammarLevel(value: unknown): value is GrammarLevel {
  return (
    typeof value === "string" &&
    (GRAMMAR_LEVELS as readonly string[]).includes(value)
  );
}

function safeParseOptions(
  optionsJson: string | null,
): Array<{ id: string; label: string }> {
  if (!optionsJson) return [];
  try {
    let parsed: any =
      typeof optionsJson === "string" ? JSON.parse(optionsJson) : optionsJson;

    // Handle double-encoded JSON strings like '"[... ]"' or other nested encodings
    let attempts = 0;
    while (typeof parsed === "string" && attempts < 3) {
      const trimmed = parsed.trim();
      if (
        trimmed.startsWith("[") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith('"[')
      ) {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          break;
        }
      } else {
        break;
      }
      attempts++;
    }

    if (!Array.isArray(parsed)) {
      // fallback: if it's a string with separators, try split by | or comma or newline
      if (typeof parsed === "string") {
        const sep = parsed.includes("|")
          ? "|"
          : parsed.includes(",")
            ? ","
            : "\n";
        const parts = parsed
          .split(sep)
          .map((s: string) => s.trim())
          .filter(Boolean);
        return parts.map((p: string) => ({ id: p, label: p }));
      }
      return [];
    }

    // Support multiple shapes: [{id,label}], [{label}], ["option1","option2"]
    const normalized: Array<{ id: string; label: string }> = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        normalized.push({ id: item, label: item });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const label =
        item.label || item.title || item.text || item.value || item.name;
      const id = item.id || label || String(item.value) || JSON.stringify(item);
      if (typeof label === "string") {
        normalized.push({ id: String(id), label: label });
        continue;
      }
    }

    return normalized;
  } catch {
    return [];
  }
}

function toEditorExercises(
  exercises: any[] | undefined | null,
): EditorExercise[] {
  return (exercises || []).map((e: any) => {
    // Normalize options using safeParseOptions which handles double-encoded
    // JSON shapes, arrays-of-strings and legacy formats.
    let options: Array<{ id: string; label: string }> | undefined = undefined;
    try {
      options = safeParseOptions(e?.optionsJson ?? null);
      if (options && options.length === 0) options = undefined;
    } catch {
      options = undefined;
    }

    let correctOptionId: string | null = null;
    let correctOptionIds: string[] | null = null;
    let acceptedAnswers: string[] | undefined = undefined;
    try {
      // Support nested/double-encoded answer JSON like the options parsing
      let ans = (e as any).answerJson;
      let parsedAns = typeof ans === "string" ? JSON.parse(ans) : ans;
      let attempts = 0;
      while (typeof parsedAns === "string" && attempts < 5) {
        try {
          parsedAns = JSON.parse(parsedAns);
        } catch {
          break;
        }
        attempts++;
      }
      if (e.type === "mcq") {
        correctOptionId = parsedAns?.correctOptionId
          ? String(parsedAns.correctOptionId)
          : null;
      } else if (e.type === "multichoice") {
        if (parsedAns && Array.isArray(parsedAns.correctOptionIds)) {
          correctOptionIds = parsedAns.correctOptionIds.map((s: any) =>
            String(s),
          );
        }
      } else {
        if (parsedAns && Array.isArray(parsedAns.accepted)) {
          acceptedAnswers = parsedAns.accepted.map((s: any) => String(s));
        }
      }
    } catch {
      // ignore
    }

    return {
      id: e.id,
      type: (e.type as any) || "mcq",
      prompt: e.prompt || "",
      options,
      correctOptionId,
      correctOptionIds,
      acceptedAnswers,
      explanation: e.explanation || null,
      points: e.points || 1,
      sortOrder: e.sortOrder || 0,
    };
  });
}

const GrammarLessonPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const lessonId = String((params as any)?.lessonId || "");

  const [lesson, setLesson] = useState<GrammarLessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitGrammarAttemptResult | null>(null);
  const { isAdmin, isTeacher } = useAuth();

  const canManage = isAdmin() || isTeacher();

  // Exercise editor state for admins/teachers
  const [editorOpen, setEditorOpen] = useState(false);
  const [exercisesEditable, setExercisesEditable] = useState<EditorExercise[]>(
    [],
  );
  const [rawExercises, setRawExercises] = useState<any[] | null>(null);
  const [isSavingExercises, setIsSavingExercises] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Collapsible sections
  const [openLesson, setOpenLesson] = useState(true);
  const [openResources, setOpenResources] = useState(true);
  const [openExercises, setOpenExercises] = useState(true);

  useEffect(() => {
    if (!lesson) return;
    setOpenResources(!!(lesson.resources && lesson.resources.length > 0));
    setOpenExercises(!!(lesson.exercises && lesson.exercises.length > 0));
  }, [lesson]);

  // Helper for smooth collapse animation
  const collapseStyle = (open: boolean, max = 800) => ({
    maxHeight: open ? `${max}px` : "0px",
    overflow: open ? "auto" : "hidden",
    transition: "max-height 260ms ease, opacity 200ms ease",
    opacity: open ? 1 : 0,
  });

  // Edit lesson dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLevel, setEditLevel] = useState<GrammarLevel>("a1");
  const [editTopic, setEditTopic] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editResources, setEditResources] = useState<
    Array<{ title: string; url: string }>
  >([]);
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!lessonId) return;

    setIsLoading(true);
    getGrammarLesson(lessonId)
      .then((res) => {
        setLesson(res.lesson);
        setResult(null);
        setAnswers({});
        setExercisesEditable(toEditorExercises(res.lesson.exercises as any[]));
      })
      .catch((err) => {
        console.error("Failed to load grammar lesson", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load this lesson.",
        });
        router.push("/grammar");
      })
      .finally(() => setIsLoading(false));
  }, [authLoading, user, lessonId, router, toast]);

  // When opening the exercises editor, populate editable state from current lesson
  useEffect(() => {
    if (editorOpen && lesson) {
      setExercisesEditable(toEditorExercises(lesson.exercises as any[]));
      setRawExercises(lesson.exercises as any[]);
    }
  }, [editorOpen, lesson]);

  useEffect(() => {
    if (editOpen && lesson) {
      setEditTitle(lesson.title || "");
      setEditLevel(isGrammarLevel(lesson.level) ? lesson.level : "a1");
      setEditTopic(lesson.topic || null);
      setEditContent(lesson.contentMarkdown || "");
      setEditResources(
        lesson.resources
          ? lesson.resources.map((r) => ({
              title: r.title || "",
              url: r.url || "",
            }))
          : [],
      );
    }
  }, [editOpen, lesson]);

  const saveLessonEdits = async () => {
    if (!lesson) return;
    console.log("Saving lesson edits...", {
      editTitle,
      editLevel,
      editContent,
    });
    setIsSavingLesson(true);
    try {
      await updateGrammarLesson({
        id: lesson.id,
        title: editTitle.trim(),
        level: editLevel,
        topic: editTopic && editTopic.trim() ? editTopic.trim() : null,
        contentMarkdown: editContent,
        resources:
          editResources && editResources.length ? editResources : undefined,
      });
      setEditOpen(false);
      // reload lesson
      const res = await getGrammarLesson(lesson.id);
      setLesson(res.lesson);
      setExercisesEditable(toEditorExercises(res.lesson.exercises as any[]));
      toast({ title: "Saved", description: "Lesson updated." });
    } catch (err: any) {
      console.error("Failed to save lesson edits", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not save lesson.",
      });
    } finally {
      setIsSavingLesson(false);
    }
  };

  const saveExercises = async () => {
    if (!lesson) return;
    setIsSavingExercises(true);
    try {
      const payload = exercisesEditable.map((ex) => {
        const options =
          ex.options && ex.options.length ? ex.options : undefined;
        const optionsJson = options ? JSON.stringify(options) : undefined;
        let answerJson: any = undefined;
        if (ex.type === "mcq") {
          answerJson = { correctOptionId: ex.correctOptionId || null };
        } else if (ex.type === "multichoice") {
          answerJson = { correctOptionIds: ex.correctOptionIds || [] };
        } else {
          answerJson = { accepted: ex.acceptedAnswers || [] };
        }
        return {
          id: ex.id || undefined,
          type: ex.type,
          prompt: ex.prompt,
          optionsJson: optionsJson,
          answerJson: JSON.stringify(answerJson),
          explanation: ex.explanation || null,
          points: ex.points || 1,
          sortOrder: ex.sortOrder || 0,
        };
      });

      await upsertGrammarExercises(lesson.id, payload as any);
      setEditorOpen(false);
      const res = await getGrammarLesson(lesson.id);
      setLesson(res.lesson);
      setExercisesEditable(toEditorExercises(res.lesson.exercises as any[]));
      toast({ title: "Saved", description: "Exercises updated." });
    } catch (err: any) {
      console.error("Failed to save exercises", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not save exercises.",
      });
    } finally {
      setIsSavingExercises(false);
    }
  };

  const resultByExerciseId = useMemo(() => {
    const map = new Map<
      string,
      SubmitGrammarAttemptResult["results"][number]
    >();
    for (const r of result?.results || []) map.set(r.exerciseId, r);
    return map;
  }, [result]);

  const onSubmit = async () => {
    if (!lesson) return;

    setSubmitting(true);
    try {
      const payload = lesson.exercises.map((ex) => ({
        exerciseId: ex.id,
        answer: answers[ex.id],
      }));

      const res = await submitGrammarAttempt(lesson.id, payload);
      setResult(res);
    } catch (err: any) {
      console.error("Submit attempt failed", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not submit answers.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) return null;

  const downloadExercisesTemplate = async () => {
    const XLSX = await import("xlsx");

    const rows = [
      {
        type: "mcq",
        prompt: "What is the past tense of 'go'?",
        options: "went|goed|goes",
        correct: "went",
        acceptedAnswers: "",
        explanation: "Past tense of go is went.",
        points: 1,
      },
      {
        type: "text",
        prompt: "Write a sentence using 'however'.",
        options: "",
        correct: "",
        acceptedAnswers: "(free text)",
        explanation: "",
        points: 2,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exercises");

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grammar-exercises-template-${lessonId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const exportCurrentExercises = async () => {
    const XLSX = await import("xlsx");
    const rows = exercisesEditable.map((ex) => {
      const optionsLabels = (ex.options || []).map((o) => o.label).join("|");
      const correctLabel =
        ex.type === "mcq"
          ? (ex.options || []).find((o) => o.id === ex.correctOptionId)
              ?.label || ""
          : "";

      return {
        type: ex.type,
        prompt: ex.prompt,
        options: optionsLabels,
        correct: correctLabel,
        acceptedAnswers: (ex.acceptedAnswers || []).join("|") || "",
        explanation: ex.explanation || "",
        points: ex.points || 1,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exercises");

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grammar-exercises-${lessonId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const importExercisesFromFile = async (file: File) => {
    const XLSX = await import("xlsx");

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const imported: EditorExercise[] = [];
    for (const row of rows) {
      const rawType = String(row.type || row.Type || "")
        .trim()
        .toLowerCase();
      const type = rawType === "text" ? "text" : "mcq";

      const prompt = String(row.prompt || row.Prompt || "").trim();
      if (!prompt) continue;

      const points = Number(row.points || row.Points || 1) || 1;
      const explanation =
        String(row.explanation || row.Explanation || "").trim() || null;

      if (type === "mcq") {
        const optionsStr = String(row.options || row.Options || "").trim();
        const optionLabels = optionsStr
          ? optionsStr
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const options = optionLabels.map((label, i) => ({
          id: `opt-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}-${i}`,
          label,
        }));

        const correctRaw = String(row.correct || row.Correct || "").trim();
        let correctOptionId: string | null = null;
        if (correctRaw) {
          const asIndex = Number(correctRaw);
          if (
            Number.isFinite(asIndex) &&
            asIndex >= 1 &&
            asIndex <= options.length
          ) {
            correctOptionId = options[asIndex - 1]?.id || null;
          } else {
            const found = options.find(
              (o) => o.label.toLowerCase() === correctRaw.toLowerCase(),
            );
            correctOptionId = found?.id || null;
          }
        }

        imported.push({
          id: "",
          type: "mcq",
          prompt,
          options,
          correctOptionId,
          acceptedAnswers: [],
          explanation,
          points,
          sortOrder: 0,
        });
      } else {
        const acceptedStr = String(
          row.acceptedAnswers || row.AcceptedAnswers || "",
        ).trim();
        const acceptedAnswers = acceptedStr
          ? acceptedStr
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        imported.push({
          id: "",
          type: "text",
          prompt,
          options: undefined,
          correctOptionId: null,
          acceptedAnswers,
          explanation,
          points,
          sortOrder: 0,
        });
      }
    }

    if (imported.length === 0) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "No valid rows found. Please use the template columns.",
      });
      return;
    }

    const replace = window.confirm(
      `Import ${imported.length} exercises.\n\nOK = Replace existing\nCancel = Append to existing`,
    );

    // Update editor state and immediately persist to DB (auto-save)
    const withSort = [...(replace ? [] : exercisesEditable), ...imported].map(
      (e, i) => ({ ...e, sortOrder: i }),
    );

    setExercisesEditable(withSort);

    // Auto-save imported exercises to backend
    setIsSavingExercises(true);
    try {
      const payload = withSort.map((ex) => {
        const options =
          ex.options && ex.options.length ? ex.options : undefined;
        const optionsJson = options ? JSON.stringify(options) : undefined;
        let answerJson: any = undefined;
        if (ex.type === "mcq") {
          answerJson = { correctOptionId: ex.correctOptionId || null };
        } else {
          answerJson = { accepted: ex.acceptedAnswers || [] };
        }
        return {
          id: ex.id || undefined,
          type: ex.type,
          prompt: ex.prompt,
          optionsJson: optionsJson,
          answerJson: JSON.stringify(answerJson),
          explanation: ex.explanation || null,
          points: ex.points || 1,
          sortOrder: ex.sortOrder || 0,
        };
      });

      await upsertGrammarExercises(lesson.id, payload as any);
      // reload lesson from server
      const res = await getGrammarLesson(lesson.id);
      setLesson(res.lesson);
      setExercisesEditable(toEditorExercises(res.lesson.exercises as any[]));
      setEditorOpen(false);
      toast({
        title: "Imported & Saved",
        description: `Saved ${imported.length} exercises.`,
      });
    } catch (err: any) {
      console.error("Failed to save imported exercises", err);
      toast({
        variant: "destructive",
        title: "Import saved failed",
        description: err?.message || "Could not save imported exercises.",
      });
    } finally {
      setIsSavingExercises(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{lesson.level?.toUpperCase()}</Badge>
            {lesson.topic ? (
              <Badge variant="outline">{lesson.topic}</Badge>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold truncate">{lesson.title}</h1>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/grammar")}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          {canManage ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  console.log("Edit button clicked, canManage:", canManage);
                  setEditOpen(true);
                }}
              >
                Edit
              </Button>
              <Button variant="outline" onClick={() => setEditorOpen(true)}>
                Manage exercises
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Card className="mx-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Lesson</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpenLesson((v) => !v)}
          >
            <ChevronDown
              className={
                "h-4 w-4 transition-transform " +
                (openLesson ? "rotate-180" : "")
              }
            />
          </Button>
        </CardHeader>
        <div style={collapseStyle(openLesson, 1600)}>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson.contentMarkdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </div>
      </Card>

      {lesson.resources && lesson.resources.length > 0 ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Resources</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenResources((v) => !v)}
            >
              <ChevronDown
                className={
                  "h-4 w-4 transition-transform " +
                  (openResources ? "rotate-180" : "")
                }
              />
            </Button>
          </CardHeader>
          <div style={collapseStyle(openResources, 400)}>
            <CardContent>
              <ul className="space-y-2">
                {lesson.resources.map((r, i) => (
                  <li key={i}>
                    <div className="rounded-md bg-muted/30 p-3">
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-foreground truncate">
                          {r.title || r.url}
                        </div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm break-all"
                        >
                          {r.url}
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Exercises</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenExercises((v) => !v)}
            >
              <ChevronDown
                className={
                  "h-4 w-4 transition-transform " +
                  (openExercises ? "rotate-180" : "")
                }
              />
            </Button>
            {canManage ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditorOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Manage
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={downloadExercisesTemplate}
                >
                  <Download className="mr-2 h-4 w-4" /> Template
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exportCurrentExercises}
                >
                  <Upload className="mr-2 h-4 w-4" /> Export
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importExercisesFromFile(f);
                    e.currentTarget.value = "";
                  }}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <div style={collapseStyle(openExercises, 1200)}>
          <CardContent className="space-y-6">
            {lesson.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exercises for this lesson yet.
              </p>
            ) : (
              <div className="space-y-6">
                {lesson.exercises.map((ex, idx) => (
                  <div key={ex.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Question {idx + 1} • {ex.points} pts
                        </div>
                        <div className="font-medium">{ex.prompt}</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      {ex.type === "mcq" ? (
                        <McqExercise
                          exercise={ex}
                          value={
                            (answers[ex.id] &&
                              (answers[ex.id].optionId || "")) as string
                          }
                          onChange={(optionId) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [ex.id]: { optionId },
                            }))
                          }
                          disabled={!!result}
                        />
                      ) : ex.type === "multichoice" ? (
                        <MultiChoiceExercise
                          exercise={ex}
                          value={
                            (answers[ex.id] && answers[ex.id].optionIds) || []
                          }
                          onChange={(optionIds: string[]) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [ex.id]: { optionIds },
                            }))
                          }
                          disabled={!!result}
                        />
                      ) : (
                        <div>
                          <Textarea
                            value={
                              typeof answers[ex.id] === "string"
                                ? (answers[ex.id] as string)
                                : answers[ex.id]?.text || ""
                            }
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [ex.id]: e.target.value,
                              }))
                            }
                            disabled={!!result}
                          />
                        </div>
                      )}

                      {resultByExerciseId.get(ex.id) ? (
                        <div className="mt-2 text-sm">
                          {resultByExerciseId.get(ex.id)?.isCorrect ? (
                            <div className="text-green-600">Correct</div>
                          ) : (
                            <div className="text-red-600">Incorrect</div>
                          )}
                          {ex.explanation ? (
                            <div className="text-xs text-muted-foreground">
                              {ex.explanation}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="border-b pt-3" />
                  </div>
                ))}

                <div className="flex items-center justify-end gap-2">
                  <Button onClick={onSubmit} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit answers"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Edit lesson dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            <div>
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Level</Label>
                <Select
                  value={editLevel}
                  onValueChange={(v) => setEditLevel(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a1">A1</SelectItem>
                    <SelectItem value="a2">A2</SelectItem>
                    <SelectItem value="b1">B1</SelectItem>
                    <SelectItem value="b2">B2</SelectItem>
                    <SelectItem value="c1">C1</SelectItem>
                    <SelectItem value="c2">C2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Input
                  value={editTopic || ""}
                  onChange={(e) => setEditTopic(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Content (Markdown)</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[180px]"
              />
            </div>

            <div>
              <Label>Resources</Label>
              <div className="space-y-2">
                {editResources.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={r.title}
                      onChange={(e) =>
                        setEditResources((prev) =>
                          prev.map((p, ii) =>
                            ii === i ? { ...p, title: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="Title"
                    />
                    <Input
                      value={r.url}
                      onChange={(e) =>
                        setEditResources((prev) =>
                          prev.map((p, ii) =>
                            ii === i ? { ...p, url: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="https://..."
                    />
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setEditResources((prev) =>
                          prev.filter((_, ii) => ii !== i),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditResources((prev) => [
                      ...prev,
                      { title: "", url: "" },
                    ])
                  }
                >
                  Add resource
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSavingLesson}
            >
              Cancel
            </Button>
            <Button onClick={saveLessonEdits} disabled={isSavingLesson}>
              {isSavingLesson ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercises editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle>Manage Exercises</DialogTitle>
            {canManage ? (
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!lesson) return;
                    if (
                      !confirm(
                        "Generate 15 exercises (5 MCQ, 5 Text, 5 Multichoice) using AI?",
                      )
                    )
                      return;
                    setIsGenerating(true);
                    try {
                      const data = await generateGrammarExercises(lesson.id);
                      // reload lesson and exercises
                      const updated = await getGrammarLesson(lesson.id);
                      setLesson(updated.lesson);
                      setExercisesEditable(
                        toEditorExercises(updated.lesson.exercises as any[]),
                      );
                      toast({
                        title: "Generated",
                        description: `Created ${data.count || 0} exercises.`,
                      });
                    } catch (err: any) {
                      console.error("Generate exercises error", err);
                      const msg =
                        err?.message || "Could not generate exercises.";
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: msg,
                      });
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                    </span>
                  ) : (
                    "Generate (AI)"
                  )}
                </Button>
              </div>
            ) : null}
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            {exercisesEditable.map((ex, idx) => (
              <div key={idx} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {ex.type.toUpperCase()} • Question {idx + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setExercisesEditable((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Input
                    value={ex.prompt}
                    onChange={(e) =>
                      setExercisesEditable((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, prompt: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={ex.type}
                      onValueChange={(v) =>
                        setExercisesEditable((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, type: v as any } : p,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="multichoice">Multichoice</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={String(ex.points || 1)}
                      onChange={(e) =>
                        setExercisesEditable((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, points: Number(e.target.value || 1) }
                              : p,
                          ),
                        )
                      }
                    />
                  </div>
                </div>

                {ex.type !== "text" ? (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {(ex.options || []).map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Input
                          value={opt.label}
                          onChange={(e) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      options: (p.options || []).map((o, ii) =>
                                        ii === oi
                                          ? { ...o, label: e.target.value }
                                          : o,
                                      ),
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      options: (p.options || []).filter(
                                        (_, ii) => ii !== oi,
                                      ),
                                    }
                                  : p,
                              ),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      onClick={() =>
                        setExercisesEditable((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  options: [
                                    ...(p.options || []),
                                    {
                                      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                      label: "",
                                    },
                                  ],
                                }
                              : p,
                          ),
                        )
                      }
                    >
                      Add option
                    </Button>
                    {ex.type === "mcq" ? (
                      <div>
                        <Label>Correct option</Label>
                        <Select
                          value={ex.correctOptionId || ""}
                          onValueChange={(v) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, correctOptionId: v || null }
                                  : p,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct option" />
                          </SelectTrigger>
                          <SelectContent>
                            {(ex.options || []).map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label || opt.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <Label>Correct options (multi)</Label>
                        <div className="space-y-1">
                          {(ex.options || []).map((opt) => {
                            const checked = (
                              ex.correctOptionIds || []
                            ).includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setExercisesEditable((prev) =>
                                      prev.map((p, i) =>
                                        i === idx
                                          ? {
                                              ...p,
                                              correctOptionIds: e.target.checked
                                                ? Array.from(
                                                    new Set([
                                                      ...(p.correctOptionIds ||
                                                        []),
                                                      opt.id,
                                                    ]),
                                                  )
                                                : (
                                                    p.correctOptionIds || []
                                                  ).filter(
                                                    (id) => id !== opt.id,
                                                  ),
                                            }
                                          : p,
                                      ),
                                    )
                                  }
                                />
                                <div>{opt.label || opt.id}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label>Accepted answers (one per line)</Label>
                    <Textarea
                      value={(ex.acceptedAnswers || []).join("\n")}
                      onChange={(e) =>
                        setExercisesEditable((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  acceptedAnswers: e.target.value
                                    .split(/\r?\n/)
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }
                              : p,
                          ),
                        )
                      }
                    />
                  </div>
                )}

                <div>
                  <Label>Explanation (optional)</Label>
                  <Input
                    value={ex.explanation || ""}
                    onChange={(e) =>
                      setExercisesEditable((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, explanation: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  setExercisesEditable((prev) => [
                    ...prev,
                    {
                      id: "",
                      type: "mcq",
                      prompt: "",
                      options: [],
                      correctOptionId: null,
                      acceptedAnswers: [],
                      explanation: null,
                      points: 1,
                      sortOrder: prev.length,
                    },
                  ])
                }
              >
                Add MCQ
              </Button>
              <Button
                onClick={() =>
                  setExercisesEditable((prev) => [
                    ...prev,
                    {
                      id: "",
                      type: "text",
                      prompt: "",
                      options: undefined,
                      correctOptionId: null,
                      acceptedAnswers: [],
                      explanation: null,
                      points: 1,
                      sortOrder: prev.length,
                    },
                  ])
                }
              >
                Add Text
              </Button>
              <Button
                onClick={() =>
                  setExercisesEditable((prev) => [
                    ...prev,
                    {
                      id: "",
                      type: "multichoice",
                      prompt: "",
                      options: [],
                      correctOptionIds: [],
                      acceptedAnswers: [],
                      explanation: null,
                      points: 1,
                      sortOrder: prev.length,
                    },
                  ])
                }
              >
                Add Multichoice
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={isSavingExercises}
            >
              Cancel
            </Button>
            <Button onClick={saveExercises} disabled={isSavingExercises}>
              {isSavingExercises ? "Saving..." : "Save exercises"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const McqExercise: FC<{
  exercise: GrammarExercise;
  value: string;
  onChange: (optionId: string) => void;
  disabled?: boolean;
}> = ({ exercise, value, onChange, disabled }) => {
  const options = useMemo(
    () => safeParseOptions(exercise.optionsJson),
    [exercise.optionsJson],
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No options configured.</p>
    );
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="space-y-2"
    >
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center space-x-2">
          <RadioGroupItem value={opt.id} id={`${exercise.id}-${opt.id}`} />
          <Label htmlFor={`${exercise.id}-${opt.id}`}>{opt.label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
};

const MultiChoiceExercise: FC<{
  exercise: GrammarExercise;
  value: string[];
  onChange: (optionIds: string[]) => void;
  disabled?: boolean;
}> = ({ exercise, value, onChange, disabled }) => {
  const options = useMemo(
    () => safeParseOptions((exercise as any).optionsJson),
    [exercise.optionsJson],
  );

  const selected = new Set(value || []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No options configured.</p>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center space-x-2">
          <input
            id={`${exercise.id}-${opt.id}`}
            type="checkbox"
            checked={selected.has(opt.id)}
            onChange={() => toggle(opt.id)}
            disabled={!!disabled}
            className="mt-1"
          />
          <Label htmlFor={`${exercise.id}-${opt.id}`}>{opt.label}</Label>
        </div>
      ))}
    </div>
  );
};

export default GrammarLessonPage;
