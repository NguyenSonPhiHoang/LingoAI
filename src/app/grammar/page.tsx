"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, BookOpenText } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createGrammarLesson,
  listGrammarLessons,
  type GrammarLessonListItem,
} from "@/services/grammar";

type GrammarLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

const GrammarPage: FC = () => {
  const { user, loading: authLoading, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [lessons, setLessons] = useState<GrammarLessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManage = isAdmin() || isTeacher();

  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addLevel, setAddLevel] = useState<GrammarLevel>("a1");
  const [addTopic, setAddTopic] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addResources, setAddResources] = useState<
    Array<{ title: string; url: string }>
  >([]);
  const [addPublished, setAddPublished] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const resetAddForm = useCallback(() => {
    setAddTitle("");
    setAddLevel("a1");
    setAddTopic("");
    setAddContent("");
    setAddPublished(true);
    setAddResources([]);
  }, []);

  const loadLessons = useCallback(async () => {
    const res = await listGrammarLessons();
    setLessons(res.lessons || []);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    setIsLoading(true);
    loadLessons()
      .catch((err) => {
        console.error("Failed to load grammar lessons", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load Grammar lessons.",
        });
      })
      .finally(() => setIsLoading(false));
  }, [authLoading, user, router, toast, loadLessons]);

  const onCreateLesson = async () => {
    if (!addTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Missing title",
        description: "Please enter a lesson title.",
      });
      return;
    }
    if (!addContent.trim()) {
      toast({
        variant: "destructive",
        title: "Missing content",
        description: "Please enter lesson content (Markdown).",
      });
      return;
    }
    const MAX_CONTENT = 3000;
    if (addContent.length > MAX_CONTENT) {
      toast({
        variant: "destructive",
        title: "Content too long",
        description: `Content must be at most ${MAX_CONTENT} characters.`,
      });
      return;
    }

    setIsCreating(true);
    try {
      await createGrammarLesson({
        title: addTitle.trim(),
        level: addLevel,
        topic: addTopic.trim() ? addTopic.trim() : null,
        contentMarkdown: addContent,
        resources:
          addResources && addResources.length ? addResources : undefined,
        isPublished: addPublished,
      });

      toast({
        title: "Created",
        description: "Grammar lesson created successfully.",
      });

      setAddOpen(false);
      resetAddForm();
      await loadLessons();
    } catch (err: any) {
      console.error("Failed to create grammar lesson", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not create lesson.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const grouped = useMemo(() => {
    const byLevel = new Map<string, GrammarLessonListItem[]>();
    for (const l of lessons) {
      const key = (l.level || "").toUpperCase();
      byLevel.set(key, [...(byLevel.get(key) || []), l]);
    }
    return Array.from(byLevel.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [lessons]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpenText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Grammar</h1>
            <p className="text-sm text-muted-foreground">
              Public grammar lessons with exercises and scoring.
            </p>
          </div>
        </div>

        {canManage ? (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetAddForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>Add lesson</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Grammar lesson</DialogTitle>
                <DialogDescription>
                  Create a new grammar lesson (Markdown content).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grammar-title">Title</Label>
                  <Input
                    id="grammar-title"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. Present Simple vs Present Continuous"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select
                      value={addLevel}
                      onValueChange={(v) => setAddLevel(v as GrammarLevel)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
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

                  <div className="space-y-2">
                    <Label htmlFor="grammar-topic">Topic (optional)</Label>
                    <Input
                      id="grammar-topic"
                      value={addTopic}
                      onChange={(e) => setAddTopic(e.target.value)}
                      placeholder="e.g. Tenses"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grammar-content">Content (Markdown)</Label>
                  <Textarea
                    id="grammar-content"
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    placeholder="Write the lesson explanation in Markdown..."
                    className="min-h-[180px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resources (optional)</Label>
                  <div className="space-y-2">
                    {addResources.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={r.title}
                          onChange={(e) =>
                            setAddResources((prev) =>
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
                            setAddResources((prev) =>
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
                            setAddResources((prev) =>
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
                        setAddResources((prev) => [
                          ...prev,
                          { title: "", url: "" },
                        ])
                      }
                    >
                      Add resource
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Published</div>
                    <div className="text-xs text-muted-foreground">
                      Only published lessons appear in the list.
                    </div>
                  </div>
                  <Switch
                    checked={addPublished}
                    onCheckedChange={setAddPublished}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={onCreateLesson} disabled={isCreating}>
                  {isCreating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No lessons yet</CardTitle>
            <CardDescription>
              Ask Admin/Teacher to add Grammar content.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([level, items]) => (
            <div key={level} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{level}</Badge>
                <span className="text-sm text-muted-foreground">
                  {items.length} lessons
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((lesson) => (
                  <Card key={lesson.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {lesson.title}
                      </CardTitle>
                      <CardDescription>
                        {lesson.topic ? lesson.topic : "General"} •{" "}
                        {lesson.exerciseCount} exercises
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link href={`/grammar/${lesson.id}`}>Open lesson</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrammarPage;
