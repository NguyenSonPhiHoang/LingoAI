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
  optionsJson: string | null
): Array<{ id: string; label: string }> {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (o) => o && typeof o.id === "string" && typeof o.label === "string"
      )
      .map((o) => ({ id: o.id, label: o.label }));
  } catch {
    return [];
  }
}

function toEditorExercises(
  exercises: any[] | undefined | null
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
    []
  );
  const [isSavingExercises, setIsSavingExercises] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
              (o) => o.label.toLowerCase() === correctRaw.toLowerCase()
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
          row.acceptedAnswers || row.AcceptedAnswers || ""
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
      `Import ${imported.length} exercises.\n\nOK = Replace existing\nCancel = Append to existing`
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
        <Button
          variant="outline"
          onClick={() => router.push("/grammar")}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {canManage ? (
          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost">Manage exercises</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-5xl">
              <DialogHeader>
                <DialogTitle>Manage Exercises</DialogTitle>
              </DialogHeader>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    await importExercisesFromFile(file);
                  } catch (err) {
                    console.error("Import exercises failed", err);
                    toast({
                      variant: "destructive",
                      title: "Import failed",
                      description: "Could not read the Excel file.",
                    });
                  }
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Tip: Use “Download template” then fill and import.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadExercisesTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Import Excel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportCurrentExercises}
                    disabled={exercisesEditable.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" /> Export current
                  </Button>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {exercisesEditable.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    className="space-y-2 border p-3 rounded"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-start gap-2 w-full">
                        <Select
                          value={ex.type}
                          onValueChange={(v) =>
                            setExercisesEditable((prev) =>
                              prev.map((e, i) =>
                                i === idx ? { ...e, type: v as any } : e
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">MCQ</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>

                        <Textarea
                          value={ex.prompt}
                          onChange={(e) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, prompt: e.target.value } : p
                              )
                            )
                          }
                          className="w-full min-h-[80px]"
                          placeholder="Enter the exercise question..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={String(ex.points || 1)}
                          onChange={(e) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      points: Number(e.target.value) || 1,
                                    }
                                  : p
                              )
                            )
                          }
                          className="w-20"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExercisesEditable((prev) => {
                                if (idx === 0) return prev;
                                const copy = [...prev];
                                const a = copy[idx - 1];
                                copy[idx - 1] = copy[idx];
                                copy[idx] = a;
                                return copy;
                              })
                            }
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExercisesEditable((prev) => {
                                if (idx === prev.length - 1) return prev;
                                const copy = [...prev];
                                const a = copy[idx + 1];
                                copy[idx + 1] = copy[idx];
                                copy[idx] = a;
                                return copy;
                              })
                            }
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              setExercisesEditable((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {ex.type === "mcq" ? (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="space-y-2">
                          {(ex.options || []).map((opt, oi) => (
                            <div
                              key={opt.id || oi}
                              className="flex items-center gap-2"
                            >
                              <RadioGroup
                                value={ex.correctOptionId || ""}
                                onValueChange={(v) =>
                                  setExercisesEditable((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? { ...p, correctOptionId: v }
                                        : p
                                    )
                                  )
                                }
                              >
                                <RadioGroupItem
                                  value={opt.id}
                                  id={`opt-${idx}-${oi}`}
                                />
                              </RadioGroup>
                              <Input
                                value={opt.label}
                                onChange={(e) =>
                                  setExercisesEditable((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            options: (p.options || []).map(
                                              (o, ii) =>
                                                ii === oi
                                                  ? {
                                                      ...o,
                                                      label: e.target.value,
                                                    }
                                                  : o
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setExercisesEditable((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            options: (p.options || []).filter(
                                              (_, ii) => ii !== oi
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            onClick={() =>
                              setExercisesEditable((prev) =>
                                prev.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        options: [
                                          ...(p.options || []),
                                          {
                                            id: `opt-${Date.now()}-${Math.random()
                                              .toString(36)
                                              .slice(2, 6)}`,
                                            label: "Option",
                                          },
                                        ],
                                      }
                                    : p
                                )
                              )
                            }
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add option
                          </Button>
                        </div>

                        <Label>Explanation (optional)</Label>
                        <Textarea
                          value={ex.explanation || ""}
                          onChange={(e) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, explanation: e.target.value }
                                  : p
                              )
                            )
                          }
                          className="min-h-[80px]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Accepted answers</Label>
                        <div className="space-y-2">
                          {(ex.acceptedAnswers || []).map((ans, ai) => (
                            <div key={ai} className="flex items-center gap-2">
                              <Input
                                value={ans}
                                onChange={(e) =>
                                  setExercisesEditable((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            acceptedAnswers: (
                                              p.acceptedAnswers || []
                                            ).map((a, ii) =>
                                              ii === ai ? e.target.value : a
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setExercisesEditable((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            acceptedAnswers: (
                                              p.acceptedAnswers || []
                                            ).filter((_, ii) => ii !== ai),
                                          }
                                        : p
                                    )
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            onClick={() =>
                              setExercisesEditable((prev) =>
                                prev.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        acceptedAnswers: [
                                          ...(p.acceptedAnswers || []),
                                          "",
                                        ],
                                      }
                                    : p
                                )
                              )
                            }
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add accepted
                            answer
                          </Button>
                        </div>

                        <Label>Explanation (optional)</Label>
                        <Textarea
                          value={ex.explanation || ""}
                          onChange={(e) =>
                            setExercisesEditable((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, explanation: e.target.value }
                                  : p
                              )
                            )
                          }
                          className="min-h-[80px]"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <Button
                    onClick={() => {
                      setExercisesEditable((prev) => [
                        ...prev,
                        {
                          id: "",
                          type: "mcq",
                          prompt: "",
                          options: [
                            { id: `opt-${Date.now()}`, label: "Option 1" },
                          ],
                          correctOptionId: null,
                          acceptedAnswers: [],
                          explanation: null,
                          points: 1,
                          sortOrder: prev.length,
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add exercise
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditorOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (!lesson) return;
                    setIsSavingExercises(true);
                    try {
                      // Map to upsert input
                      const payload = exercisesEditable.map((e, i) => ({
                        id: e.id || undefined,
                        type: e.type,
                        prompt: e.prompt,
                        optionsJson:
                          e.options && e.options.length ? e.options : undefined,
                        answerJson:
                          e.type === "mcq"
                            ? { correctOptionId: e.correctOptionId }
                            : { accepted: e.acceptedAnswers || [] },
                        explanation: e.explanation || null,
                        points: e.points || 1,
                        sortOrder: i,
                      }));

                      await upsertGrammarExercises(lesson.id, payload);
                      toast({
                        title: "Saved",
                        description: "Exercises updated.",
                      });
                      setEditorOpen(false);
                      // reload lesson
                      const res = await getGrammarLesson(lesson.id);
                      setLesson(res.lesson);
                      setExercisesEditable(
                        toEditorExercises(res.lesson.exercises as any[])
                      );
                    } catch (err: any) {
                      console.error("Failed to save exercises", err);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description:
                          err?.message || "Could not save exercises.",
                      });
                    } finally {
                      setIsSavingExercises(false);
                    }
                  }}
                  disabled={isSavingExercises}
                >
                  {isSavingExercises ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lesson.contentMarkdown}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lesson.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exercises for this lesson yet.
            </p>
          ) : (
            lesson.exercises.map((ex, idx) => {
              const r = resultByExerciseId.get(ex.id);
              return (
                <div key={ex.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Question {idx + 1} • {ex.points} pts
                      </div>
                      <div className="font-medium">{ex.prompt}</div>
                    </div>
                    {r ? (
                      <Badge variant={r.isCorrect ? "default" : "destructive"}>
                        {r.isCorrect ? "Correct" : "Wrong"}
                      </Badge>
                    ) : null}
                  </div>

                  {ex.type === "mcq" ? (
                    <McqExercise
                      exercise={ex}
                      value={answers[ex.id]?.optionId || ""}
                      onChange={(optionId) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [ex.id]: { optionId },
                        }))
                      }
                      disabled={!!result}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor={`ex-${ex.id}`}>Your answer</Label>
                      <Input
                        id={`ex-${ex.id}`}
                        value={
                          typeof answers[ex.id] === "string"
                            ? answers[ex.id]
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

                  {r?.explanation ? (
                    <div className="text-sm text-muted-foreground">
                      Explanation: {r.explanation}
                    </div>
                  ) : null}

                  <div className="border-b pt-3" />
                </div>
              );
            })
          )}

          {lesson.exercises.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              {result ? (
                <div className="text-sm">
                  Score: <span className="font-semibold">{result.score}</span>/
                  {result.maxScore}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Submit to get your score.
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                  disabled={submitting}
                >
                  Reset
                </Button>
                <Button onClick={onSubmit} disabled={submitting || !!result}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
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
    [exercise.optionsJson]
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
