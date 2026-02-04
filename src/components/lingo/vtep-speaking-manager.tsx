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
import { ChevronDown, ChevronUp, Edit, Trash2, Save, X, Mic, Plus, Check } from "lucide-react";
import * as vtepSpeaking from "@/services/vtep-speaking";

type SpeakingPrompt = vtepSpeaking.SpeakingPrompt;
type SpeakingTest = vtepSpeaking.SpeakingTest;

// Helper to parse JSON arrays from API
const parseJsonArray = (json: string | null): string[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

interface VtepSpeakingManagerProps {
  onPromptChange?: () => void;
  mode?: 'create' | 'manage';
  documentId?: string;
}

export default function VtepSpeakingManager({ onPromptChange, mode = 'manage', documentId }: VtepSpeakingManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'prompts' | 'tests'>('prompts');
  
  // Prompt states
  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  
  // Test states
  const [tests, setTests] = useState<SpeakingTest[]>([]);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  
  // Filter states
  const [promptPartFilter, setPromptPartFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [promptLevelFilter, setPromptLevelFilter] = useState<"all" | "a1" | "a2" | "b1" | "b2" | "c1" | "c2">("all");

  // Prompt Form states
  const [promptForm, setPromptForm] = useState({
    partNumber: 1 as 1 | 2 | 3,
    level: "b1",
    title: "",
    promptText: "",
    followUpQuestions: "",
    speakingTime: 180,
    keyVocabulary: "",
    usefulPhrases: "",
    sampleAnswer: "",
  });

  // Test Form states
  const [testForm, setTestForm] = useState({
    title: "",
    description: "",
    level: "b1",
    part1PromptIds: [] as string[],
    part2PromptId: "",
    part3PromptIds: [] as string[],
    totalTimeMinutes: 15,
    isActive: true,
    isPublic: true,
  });

  // Fetch prompts (only in manage mode)
  const fetchPrompts = async () => {
    if (mode !== 'manage') return;
    
    try {
      setLoading(true);
      const filters: any = {};
      if (promptPartFilter !== "all") filters.partNumber = parseInt(promptPartFilter);
      if (promptLevelFilter !== "all") filters.level = promptLevelFilter;
      
      const data = await vtepSpeaking.listSpeakingPrompts(filters);
      setPrompts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Error loading prompts",
        description: error.message || "Failed to load speaking prompts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'manage') {
      fetchPrompts();
    }
  }, [promptPartFilter, promptLevelFilter, mode]);

  // Create prompt
  const handleCreatePrompt = async () => {
    if (!promptForm.title.trim() || !promptForm.promptText.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and prompt text are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const input: any = {
        partNumber: promptForm.partNumber,
        level: promptForm.level,
        title: promptForm.title,
        promptText: promptForm.promptText,
        speakingTime: promptForm.speakingTime,
        preparationTime: 0,
        sampleAnswer: promptForm.sampleAnswer || null,
        keyVocabulary: promptForm.keyVocabulary ? promptForm.keyVocabulary.split(",").map(v => v.trim()).filter(Boolean) : null,
        usefulPhrases: promptForm.usefulPhrases ? promptForm.usefulPhrases.split("\n").map(p => p.trim()).filter(Boolean) : null,
      };

      if (promptForm.partNumber === 3 && promptForm.followUpQuestions) {
        input.promptText += `\n\nFollow-up questions:\n${promptForm.followUpQuestions}`;
      }

      await vtepSpeaking.createSpeakingPrompt(input);
      
      toast({
        title: "Success",
        description: "Speaking prompt created successfully",
      });
      
      // Reset form
      setPromptForm({
        partNumber: 1,
        level: "b1",
        title: "",
        promptText: "",
        followUpQuestions: "",
        speakingTime: 180,
        keyVocabulary: "",
        usefulPhrases: "",
        sampleAnswer: "",
      });
      
      if (mode === 'manage') {
        setShowCreateForm(false);
        fetchPrompts();
      }
      
      if (onPromptChange) onPromptChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create prompt",
        variant: "destructive",
      });
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      await vtepSpeaking.deleteSpeakingPrompt(id);
      
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
      
      fetchPrompts();
      if (onPromptChange) onPromptChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  // ========================================
  // Test Functions
  // ========================================

  const fetchTests = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching speaking tests...');
      const data = await vtepSpeaking.listSpeakingTests();
      console.log('🔍 Speaking tests response:', data);
      console.log('🔍 Is array?', Array.isArray(data));
      setTests(Array.isArray(data) ? data : []);
      console.log('🔍 Tests set to state:', Array.isArray(data) ? data.length : 0, 'tests');
    } catch (error: any) {
      console.error('❌ Error fetching tests:', error);
      toast({
        title: "Error loading tests",
        description: error.message || "Failed to load speaking tests",
        variant: "destructive",
      });
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testForm.title.trim()) {
      toast({
        title: "Missing title",
        description: "Test title is required",
        variant: "destructive",
      });
      return;
    }

    if (testForm.part1PromptIds.length !== 2) {
      toast({
        title: "Invalid Part 1",
        description: "Part 1 must have exactly 2 topics (each with 3 questions)",
        variant: "destructive",
      });
      return;
    }

    if (!testForm.part2PromptId) {
      toast({
        title: "Missing Part 2",
        description: "Part 2 must have 1 prompt selected",
        variant: "destructive",
      });
      return;
    }

    if (testForm.part3PromptIds.length !== 1) {
      toast({
        title: "Invalid Part 3",
        description: "Part 3 must have exactly 1 topic (with bullets and follow-up questions)",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await vtepSpeaking.createSpeakingTest({
        ...testForm,
        documentId: documentId || null,
      });

      toast({
        title: "Success",
        description: "Test created successfully",
      });

      // Reset form
      setTestForm({
        title: "",
        description: "",
        level: "b1",
        part1PromptIds: [],
        part2PromptId: "",
        part3PromptIds: [],
        totalTimeMinutes: 15,
        isActive: true,
        isPublic: true,
      });
      
      fetchTests();
      if (onPromptChange) onPromptChange();
    } catch (error: any) {
      toast({
        title: "Error creating test",
        description: error.message || "Failed to create test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRandomTest = async () => {
    try {
      setLoading(true);
      const result = await vtepSpeaking.createRandomSpeakingTest({
        level: testForm.level,
        documentId: documentId || null,
      });

      console.log("✅ Random test created:", result);

      toast({
        title: "Success",
        description: "Random test created successfully",
      });

      await fetchTests();
      if (onPromptChange) onPromptChange();
    } catch (error: any) {
      console.error("❌ Error creating random test:", error);
      toast({
        title: "Error creating random test",
        description: error.message || "Failed to create random test. Make sure you have enough prompts for each part.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;

    try {
      await vtepSpeaking.deleteSpeakingTest(id);
      
      toast({
        title: "Success",
        description: "Test deleted successfully",
      });
      
      fetchTests();
      if (onPromptChange) onPromptChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test",
        variant: "destructive",
      });
    }
  };

  const togglePromptInTest = (promptId: string, part: 1 | 2 | 3) => {
    if (part === 1) {
      const isSelected = testForm.part1PromptIds.includes(promptId);
      setTestForm({
        ...testForm,
        part1PromptIds: isSelected
          ? testForm.part1PromptIds.filter(id => id !== promptId)
          : [...testForm.part1PromptIds, promptId]
      });
    } else if (part === 2) {
      setTestForm({
        ...testForm,
        part2PromptId: testForm.part2PromptId === promptId ? "" : promptId
      });
    } else if (part === 3) {
      const isSelected = testForm.part3PromptIds.includes(promptId);
      setTestForm({
        ...testForm,
        part3PromptIds: isSelected
          ? testForm.part3PromptIds.filter(id => id !== promptId)
          : [...testForm.part3PromptIds, promptId]
      });
    }
  };

  useEffect(() => {
    if (mode === 'manage' && activeTab === 'tests') {
      fetchTests();
    }
  }, [activeTab, mode]);

  // Get part label
  const getPartLabel = (part: 1 | 2 | 3) => {
    switch(part) {
      case 1: return "Part 1: Social Interaction";
      case 2: return "Part 2: Solution Discussion";
      case 3: return "Part 3: Topic Development";
      default: return `Part ${part}`;
    }
  };

  // Filtered prompts
  const filteredPrompts = prompts.filter(p => {
    if (promptPartFilter !== "all" && p.partNumber !== parseInt(promptPartFilter)) return false;
    if (promptLevelFilter !== "all" && p.level !== promptLevelFilter) return false;
    return true;
  });

  // Render create form
  const renderCreateForm = () => (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Create VSTEP Speaking Prompt</h4>
      </div>
        
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Part *</Label>
          <Select 
            value={promptForm.partNumber.toString()} 
            onValueChange={(v) => setPromptForm({...promptForm, partNumber: parseInt(v) as 1 | 2 | 3})}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Part 1: Social Interaction</SelectItem>
              <SelectItem value="2">Part 2: Solution Discussion</SelectItem>
              <SelectItem value="3">Part 3: Topic Development</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Level</Label>
          <Select value={promptForm.level} onValueChange={(v) => setPromptForm({...promptForm, level: v})}>
            <SelectTrigger className="h-9">
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
        <Label className="text-xs">Title *</Label>
        <Input
          value={promptForm.title}
          onChange={(e) => setPromptForm({...promptForm, title: e.target.value})}
          placeholder="Part 1: School & Time Management"
          className="h-9"
        />
      </div>

      <div>
        <Label className="text-xs">Prompt Text *</Label>
        <Textarea
          value={promptForm.promptText}
          onChange={(e) => setPromptForm({...promptForm, promptText: e.target.value})}
          placeholder={
            promptForm.partNumber === 1 
              ? "Let's talk about your school.\n- What is your favorite subject at school?\n- What do you like about your school?"
              : promptForm.partNumber === 2
              ? "You are considering buying a gift for your mother. There are three options:\n- a tree\n- a perfume bottle\n- a kitchen appliance"
              : "Raising pets brings a lot of advantages.\n\nRaising pets helps us:\n- reduce stress\n- be more responsible\n- make more friends"
          }
          rows={6}
        />
      </div>

      {promptForm.partNumber === 3 && (
        <div>
          <Label className="text-xs">Follow-up Questions</Label>
          <Textarea
            value={promptForm.followUpQuestions}
            onChange={(e) => setPromptForm({...promptForm, followUpQuestions: e.target.value})}
            placeholder="Do you like raising pets?\nAmong a fish, a dog and a cat, which would you like to raise?"
            rows={3}
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Speaking Time</Label>
        <Select 
          value={promptForm.speakingTime.toString()} 
          onValueChange={(v) => setPromptForm({...promptForm, speakingTime: parseInt(v)})}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="180">3 minutes</SelectItem>
            <SelectItem value="240">4 minutes</SelectItem>
            <SelectItem value="300">5 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Key Vocabulary (comma-separated)</Label>
        <Textarea
          value={promptForm.keyVocabulary}
          onChange={(e) => setPromptForm({...promptForm, keyVocabulary: e.target.value})}
          placeholder="favorite, subject, manage, schedule"
          rows={2}
        />
      </div>

      <div>
        <Label className="text-xs">Useful Phrases (one per line)</Label>
        <Textarea
          value={promptForm.usefulPhrases}
          onChange={(e) => setPromptForm({...promptForm, usefulPhrases: e.target.value})}
          placeholder="I'd like to talk about...\nWhat I find most impressive is..."
          rows={3}
        />
      </div>

      <div>
        <Label className="text-xs">Sample Answer (optional)</Label>
        <Textarea
          value={promptForm.sampleAnswer}
          onChange={(e) => setPromptForm({...promptForm, sampleAnswer: e.target.value})}
          placeholder="Example answer..."
          rows={4}
        />
      </div>

      <Button onClick={handleCreatePrompt} size="sm" className="w-full">
        Create Prompt
      </Button>
    </div>
  );

  // Mode: Create - Only show form
  if (mode === 'create') {
    return <div className="space-y-6">{renderCreateForm()}</div>;
  }

  // Mode: Manage - Show tabs with prompts and tests
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'prompts'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="inline h-4 w-4 mr-1" />
          Prompts
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tests'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Tests
        </button>
      </div>

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <>
          {showCreateForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create New Prompt</h3>
                <Button 
                  onClick={() => setShowCreateForm(false)} 
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
              {renderCreateForm()}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs">Part</Label>
                  <Select value={promptPartFilter} onValueChange={(v: any) => setPromptPartFilter(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parts</SelectItem>
                      <SelectItem value="1">Part 1</SelectItem>
                      <SelectItem value="2">Part 2</SelectItem>
                      <SelectItem value="3">Part 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs">Level</Label>
                  <Select value={promptLevelFilter} onValueChange={(v: any) => setPromptLevelFilter(v)}>
                    <SelectTrigger className="h-9">
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
                <div className="flex items-end">
                  <Button 
                    onClick={() => setShowCreateForm(true)} 
                    size="sm"
                  >
                    Create New Prompt
                  </Button>
                </div>
              </div>

              {/* List of prompts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {filteredPrompts.length} prompt(s) found
                  </div>
                </div>
              
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredPrompts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No prompts found. Click 'Create New Prompt' to add one.
                  </div>
                ) : (
                  filteredPrompts.map((prompt) => (
                    <div key={prompt.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10">
                              {getPartLabel(prompt.partNumber)}
                            </span>
                            {prompt.level && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                {prompt.level.toUpperCase()}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {prompt.speakingTime}s
                            </span>
                          </div>
                          <h4 className="font-medium mt-1">{prompt.title}</h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedPromptId(expandedPromptId === prompt.id ? null : prompt.id)}
                          >
                            {expandedPromptId === prompt.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedPromptId === prompt.id && (
                        <div className="space-y-2 pt-2 border-t text-sm">
                          <div>
                            <span className="font-medium">Prompt:</span>
                            <p className="whitespace-pre-wrap text-muted-foreground mt-1">
                              {prompt.promptText}
                            </p>
                          </div>
                          {prompt.sampleAnswer && (
                            <div>
                              <span className="font-medium">Sample Answer:</span>
                              <p className="whitespace-pre-wrap text-muted-foreground mt-1">
                                {prompt.sampleAnswer}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          {/* Create Test Form */}
          <form onSubmit={handleCreateTest} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="font-semibold">Create Speaking Test</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input
                  value={testForm.title}
                  onChange={(e) => setTestForm({...testForm, title: e.target.value})}
                  placeholder="e.g. Speaking Test - January 2026"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Level</Label>
                <Select value={testForm.level} onValueChange={(v) => setTestForm({...testForm, level: v})}>
                  <SelectTrigger className="h-9">
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
              <Label className="text-xs">Description</Label>
              <Textarea
                value={testForm.description}
                onChange={(e) => setTestForm({...testForm, description: e.target.value})}
                placeholder="Test description..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Part Selection */}
            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium">Select Prompts for Each Part:</div>
              
              {/* Part 1 */}
              <div className="border rounded p-3 space-y-2">
                <div className="font-medium text-sm">
                  Part 1: Social Interaction (Select 2 topics)
                  <span className="ml-2 text-xs text-muted-foreground">
                    Selected: {testForm.part1PromptIds.length}/2 (each topic has 3 questions)
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {prompts.filter(p => p.partNumber === 1).map(prompt => (
                    <div
                      key={prompt.id}
                      onClick={() => togglePromptInTest(prompt.id, 1)}
                      className={`p-2 rounded cursor-pointer text-sm flex items-center gap-2 ${
                        testForm.part1PromptIds.includes(prompt.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {testForm.part1PromptIds.includes(prompt.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="flex-1">{prompt.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part 2 */}
              <div className="border rounded p-3 space-y-2">
                <div className="font-medium text-sm">
                  Part 2: Solution Discussion (Select 1 situation)
                  <span className="ml-2 text-xs text-muted-foreground">
                    Selected: {testForm.part2PromptId ? '1/1' : '0/1'}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {prompts.filter(p => p.partNumber === 2).map(prompt => (
                    <div
                      key={prompt.id}
                      onClick={() => togglePromptInTest(prompt.id, 2)}
                      className={`p-2 rounded cursor-pointer text-sm flex items-center gap-2 ${
                        testForm.part2PromptId === prompt.id
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {testForm.part2PromptId === prompt.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="flex-1">{prompt.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part 3 */}
              <div className="border rounded p-3 space-y-2">
                <div className="font-medium text-sm">
                  Part 3: Topic Development (Select 1 topic)
                  <span className="ml-2 text-xs text-muted-foreground">
                    Selected: {testForm.part3PromptIds.length}/1 (topic + bullets + follow-up questions)
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {prompts.filter(p => p.partNumber === 3).map(prompt => (
                    <div
                      key={prompt.id}
                      onClick={() => togglePromptInTest(prompt.id, 3)}
                      className={`p-2 rounded cursor-pointer text-sm flex items-center gap-2 ${
                        testForm.part3PromptIds.includes(prompt.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {testForm.part3PromptIds.includes(prompt.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="flex-1">{prompt.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={loading}>
                Create Test
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={handleCreateRandomTest}
                disabled={loading}
              >
                Generate Random Test
              </Button>
            </div>
          </form>

          {/* List Tests */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {tests.length} test(s) found
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tests found. Create your first test above.
              </div>
            ) : (
              tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {test.level && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {test.level.toUpperCase()}
                          </span>
                        )}
                        {test.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {test.totalTimeMinutes} mins
                        </span>
                      </div>
                      <h4 className="font-medium mt-1">{test.title}</h4>
                      {test.description && (
                        <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                      >
                        {expandedTestId === test.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedTestId === test.id && (
                    <div className="space-y-2 pt-2 border-t text-sm">
                      <div>
                        <span className="font-medium">Part 1:</span>{" "}
                        {parseJsonArray(test.part1PromptIds).length} prompts
                      </div>
                      <div>
                        <span className="font-medium">Part 2:</span>{" "}
                        {test.part2PromptId ? '1 prompt' : 'No prompt'}
                      </div>
                      <div>
                        <span className="font-medium">Part 3:</span>{" "}
                        {parseJsonArray(test.part3PromptIds).length} prompts
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
