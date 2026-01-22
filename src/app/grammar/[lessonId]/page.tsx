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
  upsertGrammarExercises,
  updateGrammarLesson,
} from "@/services/grammar";

type AnswerState = Record<string, any>;

type EditorExercise = {
  id?: string;
  type: "mcq" | "text";
  prompt: string;
  options?: Array<{ id: string; label: string }>;
  correctOptionId?: string | null;
  acceptedAnswers?: string[];
  explanation?: string | null;
  points?: number;
  sortOrder?: number;
};

function safeParseOptions(
  optionsJson: string | null,
): Array<{ id: string; label: string }> {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (o) => o && typeof o.id === "string" && typeof o.label === "string",
      )
      .map((o) => ({ id: o.id, label: o.label }));
  } catch {
    return [];
  }
}

function toEditorExercises(
  exercises: any[] | undefined | null,
): EditorExercise[] {
  return (exercises || []).map((e: any) => {
    let options: Array<{ id: string; label: string }> | undefined = undefined;
    try {
      if (e.optionsJson) {
        const parsed =
          typeof e.optionsJson === "string"
            ? JSON.parse(e.optionsJson)
            : e.optionsJson;
        if (Array.isArray(parsed)) {
          options = parsed.map((o: any) => ({
            id: String(o.id),
            label: String(o.label),
          }));
        }
      }
    } catch {
      options = undefined;
    }

    let correctOptionId: string | null = null;
    let acceptedAnswers: string[] | undefined = undefined;
    try {
      const ans = (e as any).answerJson;
      const parsedAns = typeof ans === "string" ? JSON.parse(ans) : ans;
      if (e.type === "mcq") {
        correctOptionId = parsedAns?.correctOptionId
          ? String(parsedAns.correctOptionId)
          : null;
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
  const [isSavingExercises, setIsSavingExercises] = useState(false);
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
    overflow: "hidden",
    transition: "max-height 260ms ease, opacity 200ms ease",
    opacity: open ? 1 : 0,
  });

  // Edit lesson dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLevel, setEditLevel] =
    useState<GrammarLessonDetail["level"]>("a1");
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

  useEffect(() => {
    if (editOpen && lesson) {
      setEditTitle(lesson.title || "");
      setEditLevel(lesson.level || "a1");
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
      const acceptedAnswers = (ex.acceptedAnswers || []).join("|");
      return {
        type: ex.type,
        prompt: ex.prompt,
        options: optionsLabels,
        correct: correctLabel,
        acceptedAnswers,
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

    setExercisesEditable((prev) => {
      const base = replace ? [] : prev;
      const withSort = [...base, ...imported].map((e, i) => ({
        ...e,
        sortOrder: i,
      }));
      return withSort;
    });

    toast({
      title: "Imported",
      description: `Loaded ${imported.length} exercises from Excel.`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
            <Button variant="ghost" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
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
        </CardHeader>
        <div style={collapseStyle(openExercises, 1200)}>
          <CardContent className="space-y-6">
            {lesson.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exercises for this lesson yet.
              </p>
            ) : (
              lesson.exercises.map((ex, idx) => (
                <div key={ex.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Question {idx + 1} • {ex.points} pts
                      </div>
                      <div className="font-medium">{ex.prompt}</div>
                    </div>
                  </div>
                  <div className="border-b pt-3" />
                </div>
              ))
            )}
          </CardContent>
        </div>
      </Card>
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

export default GrammarLessonPage;
