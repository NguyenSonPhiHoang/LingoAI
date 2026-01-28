"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type FC,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, BookOpenText } from "lucide-react";
import MarkdownToolbar from "@/components/lingo/markdown-toolbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  getGrammarLesson,
  type GrammarLessonListItem,
  updateGrammarLesson,
} from "@/services/grammar";

type GrammarLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

const GRAMMAR_FILTER_KEY = "grammar_lesson_filters";

const GrammarPage: FC = () => {
  const { user, loading: authLoading, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [lessons, setLessons] = useState<GrammarLessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManage = isAdmin() || isTeacher();

  const ALL_SENTINEL = "__all__";

  // Initialize filter state from localStorage
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>(ALL_SENTINEL);
  const [levelFilter, setLevelFilter] = useState<string>(ALL_SENTINEL);
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "title">(
    "newest",
  );
  const [isFilterLoaded, setIsFilterLoaded] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addLevel, setAddLevel] = useState<GrammarLevel>("a1");
  const [addTopic, setAddTopic] = useState("");
  const [addContent, setAddContent] = useState("");
  const addContentRef = useRef<HTMLTextAreaElement | null>(null);
  const [addResources, setAddResources] = useState<
    Array<{ title: string; url: string }>
  >([]);
  const [addPublished, setAddPublished] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetAddForm = useCallback(() => {
    setAddTitle("");
    setAddLevel("a1");
    setAddTopic("");
    setAddContent("");
    setAddPublished(true);
    setAddResources([]);
    setEditingId(null);
  }, []);

  // Load filters from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(GRAMMAR_FILTER_KEY);
        if (saved) {
          const filters = JSON.parse(saved);
          if (filters.searchQuery !== undefined)
            setSearchQuery(filters.searchQuery);
          if (filters.topicFilter !== undefined)
            setTopicFilter(filters.topicFilter);
          if (filters.levelFilter !== undefined)
            setLevelFilter(filters.levelFilter);
          if (filters.sortOption !== undefined)
            setSortOption(filters.sortOption);
        }
      } catch (err) {
        console.error("Failed to load grammar filters", err);
      }
      setIsFilterLoaded(true);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isFilterLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          GRAMMAR_FILTER_KEY,
          JSON.stringify({
            searchQuery,
            topicFilter,
            levelFilter,
            sortOption,
          }),
        );
      } catch (err) {
        console.error("Failed to save grammar filters", err);
      }
    }
  }, [searchQuery, topicFilter, levelFilter, sortOption, isFilterLoaded]);

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
    // No client-side character limit here to allow long lesson content

    setIsCreating(true);
    try {
      if (editingId) {
        await updateGrammarLesson({
          id: editingId,
          title: addTitle.trim(),
          level: addLevel,
          topic: addTopic.trim() ? addTopic.trim() : null,
          contentMarkdown: addContent,
          resources:
            addResources && addResources.length ? addResources : undefined,
          isPublished: addPublished,
        });
        toast({ title: "Updated", description: "Grammar lesson updated." });
      } else {
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
      }

      setAddOpen(false);
      resetAddForm();
      await loadLessons();
    } catch (err: any) {
      console.error("Failed to save grammar lesson", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not save lesson.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const onEditLesson = async (lesson: {
    id: string;
    title: string;
    level: string;
    topic: string | null;
    contentMarkdown?: string;
    resources?: any[];
    isPublished?: boolean;
  }) => {
    // Fetch full lesson detail since list items do not include contentMarkdown/resources
    try {
      const res = await getGrammarLesson(lesson.id);
      const full = res.lesson;
      setEditingId(full.id);
      setAddTitle(full.title || "");
      setAddLevel((full.level || "a1") as any);
      setAddTopic(full.topic || "");
      setAddContent(full.contentMarkdown || "");
      setAddResources(full.resources || []);
      setAddPublished(
        typeof full.isPublished === "boolean" ? full.isPublished : true,
      );
      setAddOpen(true);
    } catch (err: any) {
      console.error("Failed to fetch lesson for edit", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load lesson for editing.",
      });
    }
  };

  const onDeleteLesson = async (id: string) => {
    if (!confirm("Are you sure you want to delete/unpublish this lesson?"))
      return;
    try {
      await updateGrammarLesson({ id, isPublished: false });
      toast({ title: "Deleted", description: "Lesson unpublished." });
      await loadLessons();
    } catch (err: any) {
      console.error("Failed to delete lesson", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Could not delete lesson.",
      });
    }
  };

  const topics = useMemo(() => {
    const s = new Set<string>();
    for (const l of lessons) if (l.topic) s.add(l.topic as string);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return lessons.filter((l) => {
      if (levelFilter !== ALL_SENTINEL) {
        if ((l.level || "") !== levelFilter) return false;
      }
      if (topicFilter !== ALL_SENTINEL) {
        if ((l.topic || "") !== topicFilter) return false;
      }
      if (!q) return true;
      const inTitle = (l.title || "").toLowerCase().includes(q);
      const inTopic = (l.topic || "").toLowerCase().includes(q);
      return inTitle || inTopic;
    });
  }, [lessons, searchQuery, topicFilter, levelFilter]);

  const sortedLessons = useMemo(() => {
    const arr = [...filteredLessons];
    if (sortOption === "title") {
      arr.sort((x, y) => (x.title || "").localeCompare(y.title || ""));
    } else if (sortOption === "oldest") {
      arr.sort(
        (x, y) =>
          new Date(x.updatedAt).getTime() - new Date(y.updatedAt).getTime(),
      );
    } else {
      // newest
      arr.sort(
        (x, y) =>
          new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime(),
      );
    }
    return arr;
  }, [filteredLessons, sortOption]);

  const grouped = useMemo(() => {
    const byLevel = new Map<string, GrammarLessonListItem[]>();
    for (const l of filteredLessons) {
      const key = (l.level || "").toUpperCase();
      byLevel.set(key, [...(byLevel.get(key) || []), l]);
    }
    // Apply sort within each level
    for (const [k, arr] of Array.from(byLevel.entries())) {
      if (sortOption === "title") {
        arr.sort((x, y) => (x.title || "").localeCompare(y.title || ""));
      } else if (sortOption === "oldest") {
        arr.sort(
          (x, y) =>
            new Date(x.updatedAt).getTime() - new Date(y.updatedAt).getTime(),
        );
      } else {
        // newest
        arr.sort(
          (x, y) =>
            new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime(),
        );
      }
      byLevel.set(k, arr);
    }

    return Array.from(byLevel.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredLessons, sortOption]);

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
          <div />
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search lessons by title or topic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[220px]"
          />

          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v)}>
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v)}>
            <SelectTrigger className="min-w-[100px]">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>All levels</SelectItem>
              <SelectItem value="a1">A1</SelectItem>
              <SelectItem value="a2">A2</SelectItem>
              <SelectItem value="b1">B1</SelectItem>
              <SelectItem value="b2">B2</SelectItem>
              <SelectItem value="c1">C1</SelectItem>
              <SelectItem value="c2">C2</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(v) => setSortOption(v as any)}
          >
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title A → Z</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setTopicFilter(ALL_SENTINEL);
              setLevelFilter(ALL_SENTINEL);
              // Also clear from localStorage
              if (typeof window !== "undefined") {
                localStorage.removeItem(GRAMMAR_FILTER_KEY);
              }
            }}
          >
            Clear
          </Button>
        </div>

        {canManage ? (
          <>
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
                    {/* Markdown toolbar inserted here */}
                    <div className="flex items-center justify-between">
                      <MarkdownToolbar
                        textareaRef={addContentRef}
                        onChange={setAddContent}
                      />
                      <div className="ml-2">
                        <Button
                          variant="outline"
                          onClick={() => setPreviewOpen(true)}
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="grammar-content"
                      value={addContent}
                      onChange={(e) => setAddContent(e.target.value)}
                      placeholder="Write the lesson explanation in Markdown..."
                      className="min-h-[180px]"
                      ref={(el: HTMLTextAreaElement) => {
                        // keep both the react state and the ref in sync
                        addContentRef.current = el;
                      }}
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
                                  ii === i
                                    ? { ...p, title: e.target.value }
                                    : p,
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
            <div className="ml-3 inline-flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Preview</DialogTitle>
                  <DialogDescription>
                    Rendered Markdown preview
                  </DialogDescription>
                </DialogHeader>
                <div className="prose dark:prose-invert max-h-[60vh] overflow-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {addContent || ""}
                  </ReactMarkdown>
                </div>
                <DialogFooter>
                  <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
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
      ) : viewMode === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-2">Title</th>
                <th className="p-2">Level</th>
                <th className="p-2">Topic</th>
                <th className="p-2">Exercises</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLessons.map((lesson) => (
                <tr key={lesson.id} className="border-t">
                  <td className="p-2 align-top">
                    <div className="font-medium">{lesson.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {lesson.createdAt}
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    {(lesson.level || "").toUpperCase()}
                  </td>
                  <td className="p-2 align-top">{lesson.topic || "General"}</td>
                  <td className="p-2 align-top">{lesson.exerciseCount}</td>
                  <td className="p-2 align-top">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditLesson(lesson as any)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteLesson(lesson.id)}
                      >
                        Delete
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/grammar/${lesson.id}`} className="">
                          Open
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((lesson) => (
                  <Card key={lesson.id} className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {lesson.title}
                      </CardTitle>
                      <CardDescription>
                        {lesson.topic ? lesson.topic : "General"} •{" "}
                        {lesson.exerciseCount} exercises
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto">
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
