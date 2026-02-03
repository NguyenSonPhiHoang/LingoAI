"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Edit, Trash2, Save, X } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

type WritingPrompt = {
  id: string;
  taskType: "task1" | "task2";
  category: string | null;
  level: string | null;
  title: string;
  promptText: string;
  sampleAnswer: string | null;
  keyPoints: any;
  suggestedVocab: any;
  timeLimit: number;
  minWords: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type WritingTest = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  task1PromptId: string | null;
  task2PromptId: string | null;
  totalTimeMinutes: number;
  isActive: boolean;
  isPublic: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

interface VtepWritingManagerProps {
  onPromptChange?: () => void;
}

export default function VtepWritingManager({ onPromptChange }: VtepWritingManagerProps = {}) {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [tests, setTests] = useState<WritingTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [mode, setMode] = useState<"prompt" | "test">("prompt");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  
  // Filter states
  const [promptTaskFilter, setPromptTaskFilter] = useState<"all" | "task1" | "task2">("all");
  const [promptLevelFilter, setPromptLevelFilter] = useState<"all" | "a1" | "a2" | "b1" | "b2" | "c1" | "c2">("all");

  // Form states
  const [promptForm, setPromptForm] = useState({
    taskType: "task1" as "task1" | "task2",
    category: "",
    level: "b1",
    title: "",
    promptText: "",
    sampleAnswer: "",
    timeLimit: 20,
    minWords: 120,
  });

  const [testForm, setTestForm] = useState({
    title: "",
    description: "",
    level: "b1",
    task1PromptId: "",
    task2PromptId: "",
    totalTimeMinutes: 60,
    isActive: true,
    isPublic: true,
  });

  // Fetch prompts
  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/vtep-writing/prompts");
      setPrompts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Error loading prompts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch tests
  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/vtep-writing/tests");
      setTests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Error loading tests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create prompt
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiPost("/api/vtep-writing/prompts", promptForm);

      toast({
        title: "Success",
        description: "Prompt created successfully",
      });

      // Reset form and reload
      setPromptForm({
        taskType: "task1",
        category: "",
        level: "b1",
        title: "",
        promptText: "",
        sampleAnswer: "",
        timeLimit: 20,
        minWords: 120,
      });
      fetchPrompts();
      onPromptChange?.();
    } catch (error: any) {
      toast({
        title: "Error creating prompt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create test
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiPost("/api/vtep-writing/tests", testForm);

      toast({
        title: "Success",
        description: "Test created successfully",
      });

      // Reset form and reload
      setTestForm({
        title: "",
        description: "",
        level: "b1",
        task1PromptId: "",
        task2PromptId: "",
        totalTimeMinutes: 60,
        isActive: true,
        isPublic: true,
      });
      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error creating test",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchTests();
  }, []);

  // Filtered prompts based on task type and level
  const filteredPrompts = prompts.filter(p => {
    if (promptTaskFilter !== "all" && p.taskType !== promptTaskFilter) return false;
    if (promptLevelFilter !== "all" && p.level !== promptLevelFilter) return false;
    return true;
  });

  // Delete prompt
  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    
    try {
      await apiDelete(`/api/vtep-writing/prompts/${promptId}`);

      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
      fetchPrompts();
      onPromptChange?.();
    } catch (error: any) {
      toast({
        title: "Error deleting prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update prompt
  const handleUpdatePrompt = async (promptId: string, updatedData: Partial<WritingPrompt>) => {
    try {
      await apiPut(`/api/vtep-writing/prompts/${promptId}`, updatedData);

      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });
      setEditingPromptId(null);
      fetchPrompts();
    } catch (error: any) {
      toast({
        title: "Error updating prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete test
  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    
    try {
      await apiDelete(`/api/vtep-writing/tests/${testId}`);

      toast({
        title: "Success",
        description: "Test deleted successfully",
      });
      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error deleting test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update test
  const handleUpdateTest = async (testId: string, updatedData: Partial<WritingTest>) => {
    try {
      await apiPut(`/api/vtep-writing/tests/${testId}`, updatedData);

      toast({
        title: "Success",
        description: "Test updated successfully",
      });
      setEditingTestId(null);
      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error updating test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Create random test
  const handleCreateRandomTest = async () => {
    try {
      setLoading(true);
      const result = await apiPost("/api/vtep-writing/tests/random", {
        level: testForm.level || null,
        title: testForm.title || undefined,
      });

      toast({
        title: "Success",
        description: `Random test created with Task 1: "${result.selectedPrompts.task1.title}" and Task 2: "${result.selectedPrompts.task2.title}"`,
      });

      // Reset form and reload
      setTestForm({
        title: "",
        description: "",
        level: "b1",
        task1PromptId: "",
        task2PromptId: "",
        totalTimeMinutes: 60,
        isActive: true,
        isPublic: true,
      });
      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error creating random test",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Mode Switch */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "prompt" ? "default" : "outline"}
          onClick={() => setMode("prompt")}
        >
          Prompt
        </Button>
        <Button
          size="sm"
          variant={mode === "test" ? "default" : "outline"}
          onClick={() => setMode("test")}
        >
          Test
        </Button>
      </div>

      {/* Prompt Form */}
      {mode === "prompt" && (
        <>
          <form onSubmit={handleCreatePrompt} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Task Type</Label>
                <Select
                  value={promptForm.taskType}
                  onValueChange={(value: "task1" | "task2") =>
                    setPromptForm({ ...promptForm, taskType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task1">Task 1 (Letter/Email)</SelectItem>
                    <SelectItem value="task2">Task 2 (Essay)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Level</Label>
                <Select
                  value={promptForm.level}
                  onValueChange={(value) =>
                    setPromptForm({ ...promptForm, level: value })
                  }
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
            </div>

            <div>
              <Label>Category</Label>
              <Input
                value={promptForm.category}
                onChange={(e) =>
                  setPromptForm({ ...promptForm, category: e.target.value })
                }
                placeholder="e.g., Personal, Formal, Opinion"
              />
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                required
                value={promptForm.title}
                onChange={(e) =>
                  setPromptForm({ ...promptForm, title: e.target.value })
                }
                placeholder="Brief title"
              />
            </div>

            <div>
              <Label>Prompt Text *</Label>
              <Textarea
                required
                value={promptForm.promptText}
                onChange={(e) =>
                  setPromptForm({ ...promptForm, promptText: e.target.value })
                }
                placeholder="Full prompt text..."
                rows={4}
              />
            </div>

            <div>
              <Label>Sample Answer</Label>
              <Textarea
                value={promptForm.sampleAnswer}
                onChange={(e) =>
                  setPromptForm({ ...promptForm, sampleAnswer: e.target.value })
                }
                placeholder="Optional sample answer..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Time Limit (min)</Label>
                <Input
                  type="number"
                  value={promptForm.timeLimit}
                  onChange={(e) =>
                    setPromptForm({
                      ...promptForm,
                      timeLimit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Min Words</Label>
                <Input
                  type="number"
                  value={promptForm.minWords}
                  onChange={(e) =>
                    setPromptForm({
                      ...promptForm,
                      minWords: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Prompt"}
            </Button>
          </form>

          {/* View Existing Prompts */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrompts(!showPrompts)}
              className="w-full"
            >
              {showPrompts ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Existing Prompts ({filteredPrompts.length}/{prompts.length})
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View Existing Prompts ({prompts.length})
                </>
              )}
            </Button>
            
            {showPrompts && (
              <>
                {/* Filters */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Task Type</Label>
                    <Select
                      value={promptTaskFilter}
                      onValueChange={(value: any) => setPromptTaskFilter(value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tasks</SelectItem>
                        <SelectItem value="task1">Task 1</SelectItem>
                        <SelectItem value="task2">Task 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Level</Label>
                    <Select
                      value={promptLevelFilter}
                      onValueChange={(value: any) => setPromptLevelFilter(value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="a1">A1</SelectItem>
                        <SelectItem value="a2">A2</SelectItem>
                        <SelectItem value="b1">B1</SelectItem>
                        <SelectItem value="b2">B2</SelectItem>
                        <SelectItem value="c1">C1</SelectItem>
                        <SelectItem value="c2">C2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto border rounded p-2">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-2 border rounded hover:bg-gray-50"
                  >
                    {editingPromptId === prompt.id ? (
                      <div className="space-y-2">
                        <Input
                          value={prompt.title}
                          onChange={(e) => {
                            setPrompts(prompts.map(p => 
                              p.id === prompt.id ? {...p, title: e.target.value} : p
                            ));
                          }}
                          placeholder="Title"
                          className="text-xs"
                        />
                        <Textarea
                          value={prompt.promptText}
                          onChange={(e) => {
                            setPrompts(prompts.map(p => 
                              p.id === prompt.id ? {...p, promptText: e.target.value} : p
                            ));
                          }}
                          placeholder="Prompt text"
                          rows={3}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePrompt(prompt.id, {
                              title: prompt.title,
                              promptText: prompt.promptText,
                            })}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPromptId(null);
                              fetchPrompts(); // Reload to reset changes
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-xs">{prompt.title}</h3>
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {prompt.taskType.toUpperCase()}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingPromptId(prompt.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeletePrompt(prompt.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {prompt.promptText}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          <span>Level: {prompt.level || "N/A"}</span>
                          <span>•</span>
                          <span>{prompt.timeLimit}min</span>
                          <span>•</span>
                          <span>{prompt.minWords} words</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredPrompts.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-xs">
                    {prompts.length === 0 
                      ? "No prompts yet. Create your first prompt!"
                      : "No prompts match the current filters."}
                  </p>
                )}
              </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Test Form */}
      {mode === "test" && (
        <>
          <form onSubmit={handleCreateTest} className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                required
                value={testForm.title}
                onChange={(e) =>
                  setTestForm({ ...testForm, title: e.target.value })
                }
                placeholder="Test name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={testForm.description}
                onChange={(e) =>
                  setTestForm({ ...testForm, description: e.target.value })
                }
                placeholder="Test description..."
                rows={2}
              />
            </div>

            <div>
              <Label>Level</Label>
              <Select
                value={testForm.level}
                onValueChange={(value) =>
                  setTestForm({ ...testForm, level: value })
                }
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
              <Label>Task 1 Prompt</Label>
              <Select
                value={testForm.task1PromptId}
                onValueChange={(value) =>
                  setTestForm({ ...testForm, task1PromptId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Task 1 prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {prompts
                    .filter((p) => p.taskType === "task1")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Task 2 Prompt</Label>
              <Select
                value={testForm.task2PromptId}
                onValueChange={(value) =>
                  setTestForm({ ...testForm, task2PromptId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Task 2 prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {prompts
                    .filter((p) => p.taskType === "task2")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Total Time (min)</Label>
              <Input
                type="number"
                value={testForm.totalTimeMinutes}
                onChange={(e) =>
                  setTestForm({
                    ...testForm,
                    totalTimeMinutes: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testForm.isActive}
                  onChange={(e) =>
                    setTestForm({ ...testForm, isActive: e.target.checked })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testForm.isPublic}
                  onChange={(e) =>
                    setTestForm({ ...testForm, isPublic: e.target.checked })
                  }
                />
                <span className="text-sm">Public</span>
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Test"}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              disabled={loading} 
              className="w-full"
              onClick={handleCreateRandomTest}
            >
              {loading ? "Creating..." : "🎲 Create Random Test"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Randomly select 1 Task 1 and 1 Task 2 prompt{testForm.level && testForm.level !== "b1" ? ` (Level: ${testForm.level.toUpperCase()})` : ""}
            </p>
          </form>

          {/* View Existing Tests */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTests(!showTests)}
              className="w-full"
            >
              {showTests ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Existing Tests ({tests.length})
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View Existing Tests ({tests.length})
                </>
              )}
            </Button>
            
            {showTests && (
              <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto border rounded p-2">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="p-2 border rounded hover:bg-gray-50"
                  >
                    {editingTestId === test.id ? (
                      <div className="space-y-2">
                        <Input
                          value={test.title}
                          onChange={(e) => {
                            setTests(tests.map(t => 
                              t.id === test.id ? {...t, title: e.target.value} : t
                            ));
                          }}
                          placeholder="Title"
                          className="text-xs"
                        />
                        <Textarea
                          value={test.description || ""}
                          onChange={(e) => {
                            setTests(tests.map(t => 
                              t.id === test.id ? {...t, description: e.target.value} : t
                            ));
                          }}
                          placeholder="Description"
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTest(test.id, {
                              title: test.title,
                              description: test.description,
                            })}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTestId(null);
                              fetchTests(); // Reload to reset changes
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-xs">{test.title}</h3>
                          <div className="flex gap-1 items-center">
                            {test.isActive && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                            {test.isPublic && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                Public
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingTestId(test.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteTest(test.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {test.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {test.description}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          <span>Level: {test.level || "N/A"}</span>
                          <span>•</span>
                          <span>{test.totalTimeMinutes}min</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {tests.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-xs">
                    No tests yet. Create your first test!
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
