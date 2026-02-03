"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import SavedTestsList from "@/components/lingo/SavedTestsList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, TrendingUp, MessageSquare, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

export default function VtepStudentPage() {
  const { user, loading: authLoading } = useAuth();
  const [tests, setTests] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[] | null>(null);
  const [myTests, setMyTests] = useState<any[] | null>(null);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);
  const [savedScoreVisible, setSavedScoreVisible] = useState(false);
  const [savedPoints, setSavedPoints] = useState<null | {
    earned: number;
    total: number;
    scaled: number;
  }>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentTestSourceId, setCurrentTestSourceId] = useState<string | null>(
    null,
  );
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [activeVtepTest, setActiveVtepTest] = useState<any | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [documentsMetadata, setDocumentsMetadata] = useState<{ [docId: string]: any }>({});
  const [writingGrades, setWritingGrades] = useState<any[]>([]);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [showSubmissionDetail, setShowSubmissionDetail] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      loadTests();
      loadMySubmissions();
    }
  }, [authLoading]);

  async function loadMySubmissions() {
    try {
      const { apiGet } = await import("@/services/api");
      const submissions = await apiGet("/api/vtep-writing/submissions/me");
      console.log("📝 Loaded Writing submissions:", submissions);
      setMySubmissions(submissions || []);
    } catch (err) {
      console.error("Failed to load Writing submissions:", err);
    }
  }

  function openSubmissionDetail(sub: any) {
    setSelectedSubmission(sub);
    setShowSubmissionDetail(true);
  }

  function resetRunnerState() {
    setItems(null);
    setIndex(0);
    setScore(0);
    setShowAnswer(false);
    setFinished(false);
    setResponses({});
    setCurrentTestSourceId(null);
    setActiveVtepTest(null);
    setAttemptStartedAt(null);
    setDocumentsMetadata({});
    setWritingGrades([]);
    setShowGradeDialog(false);
  }

  async function loadDocumentMetadata(docId: string) {
    if (!docId || documentsMetadata[docId]) return;
    try {
      console.debug("📚 Loading document metadata for ID:", docId);
      const vtepService = (await import("@/services/vtep")).default;
      const res = await vtepService.getVtepDocument(docId);
      console.debug("📚 Document loaded:", res?.document?.name, "tocJson:", typeof res?.document?.tocJson);
      if (res?.document) {
        setDocumentsMetadata(prev => ({ ...prev, [docId]: res.document }));
      }
    } catch (err) {
      console.error("Failed to load document metadata", err);
    }
  }

  async function loadTests() {
    try {
      setTests(null);
      const rows = await apiGet<any[]>("/api/vteptests/active");
      setTests(rows || []);
    } catch (err) {
      console.error("Failed to load vtep tests", err);
      setTests([]);
    }
  }

  async function instantiateAndOpen(t: any) {
    try {
      setLoading(true);
      
      // Check if this is a Speaking test
      if (t.skill === 'Speaking') {
        setActiveVtepTest(t);
        setRunnerOpen(true);
        
        // Call Speaking-specific instantiate endpoint
        const res = await apiPost(`/api/vtep-speaking/tests/${t.id}/instantiate`, {});
        
        if (!res || !res.testId) {
          toast({ variant: "destructive", title: "Failed to start Speaking test" });
          setRunnerOpen(false);
          return;
        }
        
        // Set up Speaking test items
        const speakingItems = [];
        
        // Part 1: Combine all 2 topics with 3 questions each into ONE page
        if (res.part1Prompts && res.part1Prompts.length > 0) {
          speakingItems.push({
            id: 'part1-all',
            part: 1,
            skill: 'Speaking',
            title: 'Part 1 - Introduction and Interview',
            allPrompts: res.part1Prompts, // Pass all prompts for Part 1
            preparationTime: 15,
            speakingTime: res.part1Prompts.length * 30, // Total time for all prompts
          });
        }
        
        // Part 2: 1 situation with cue card
        if (res.part2Prompt) {
          speakingItems.push({
            id: 'part2-0',
            promptId: res.part2Prompt.id,
            part: 2,
            skill: 'Speaking',
            title: res.part2Prompt.title,
            promptText: res.part2Prompt.promptText,
            cueCardBullets: res.part2Prompt.cueCardBullets,
            preparationTime: res.part2Prompt.preparationTime || 60,
            speakingTime: res.part2Prompt.speakingTime || 120,
          });
        }
        
        // Part 3: 1 topic with follow-up questions
        if (res.part3Prompts && res.part3Prompts.length > 0) {
          res.part3Prompts.forEach((prompt: any, idx: number) => {
            speakingItems.push({
              id: `part3-${idx}`,
              promptId: prompt.id,
              part: 3,
              skill: 'Speaking',
              title: prompt.title,
              promptText: prompt.promptText,
              preparationTime: prompt.preparationTime || 0,
              speakingTime: prompt.speakingTime || 240,
            });
          });
        }
        
        setItems(speakingItems);
        setCurrentTestSourceId(res.testId);
        setAttemptStartedAt(new Date().toISOString());
        setShowAnswer(false);
        setFinished(false);
        setIndex(0);
        setScore(0);
        setResponses({});
        
        return;
      }
      
      setActiveVtepTest(t);
      setRunnerOpen(true);
      const res = await apiPost(`/api/vteptests/${t.id}/instantiate`, {});
      const tid = res?.testId || res?.testId || null;
      if (!tid) {
        toast({ variant: "destructive", title: "Failed to start test" });
        return;
      }
      await openSavedTest(tid, true); // skipRetake = true to prevent infinite loop
    } catch (err) {
      console.error("Failed to instantiate test", err);
      toast({ variant: "destructive", title: "Failed to start test" });
      setRunnerOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyTests() {
    try {
      // Get raw SQL rows so we can detect VTEP-origin tests (data.source === 'vtep' or type === 'vtep')
      const rows = await apiGet<any[]>("/api/tests/me").catch(() => []);
      const vtepTests = (rows || [])
        .map((r) => {
          let parsed = null;
          try {
            parsed = r.data ? JSON.parse(r.data) : null;
          } catch {
            parsed = null;
          }
          return { raw: r, parsed };
        })
        .filter((t) => {
          if (!t) return false;
          const type = String(t.raw.type || "").toLowerCase();
          if (type === "vtep") return true;
          if (t.parsed && t.parsed.source === "vtep") return true;
          return false;
        })
        .map((t) => ({
          id: t.raw.id,
          type: t.raw.type,
          data: t.parsed,
          createdAt: t.raw.createdAt,
          isPublic: t.raw.userId == null,
          // expose some normalized fields for display
          // prefer parsed title, fallback to raw title
          title:
            t.parsed?.title ??
            t.raw.title ??
            t.parsed?.data?.title ??
            `Test ${t.raw.id}`,
          // keep vtepTestId if available so we can fetch authoritative title from VtepTests
          vtepTestId:
            t.parsed?.vtepTestId ?? t.parsed?.data?.vtepTestId ?? null,
          // Extract skill from data to display correct badge
          skill: t.parsed?.skill ?? t.parsed?.data?.skill ?? null,
          testType: (t.raw.type || "practice").toString(),
          percentage:
            typeof t.raw.score === "number"
              ? t.raw.score
              : (t.parsed?.percentage ?? 0),
          takenAt:
            t.raw.completedAt || t.raw.clientCreatedAt || t.raw.createdAt,
        }));

      setMyTests(vtepTests || []);

      // If any tests reference a VTEP test id, fetch authoritative titles from VtepTests
      try {
        const ids = Array.from(
          new Set(vtepTests.map((x: any) => x.vtepTestId).filter(Boolean)),
        );
        if (ids.length) {
          await Promise.all(
            ids.map(async (vtId: string) => {
              try {
                const res = await apiGet<any>(`/api/vteptests/${vtId}`).catch(
                  () => null,
                );
                if (res && res.title) {
                  setMyTests((prev) =>
                    (prev || []).map((p: any) =>
                      p.vtepTestId === vtId ? { ...p, title: res.title } : p,
                    ),
                  );
                }
              } catch (e) {
                // ignore individual failures
              }
            }),
          );
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("Failed to load my tests", err);
      setMyTests([]);
    }
  }

  async function deleteTest(testId: string) {
    try {
      await apiDelete(`/api/tests/${testId}`);
      toast({ title: "Test deleted", duration: 2000 });
      await loadMyTests();
    } catch (err) {
      console.error("Failed to delete test", err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Unable to delete the test. Please try again.",
        duration: 3000,
      });
      throw err;
    }
  }

  useEffect(() => {
    // load user's saved tests
    if (!authLoading && user) loadMyTests();
  }, [authLoading, user]);

  async function openSavedTest(testId: string, skipRetake = false) {
    try {
      setLoading(true);
      
      // First, check if this test has a vtepTestId - if so, retake it from template
      const testInfo = await apiGet<any>(`/api/tests/${testId}`);
      
      let vtepTestId = null;
      let testSkill = null;
      
      // Parse the data field to get vtepTestId and skill
      try {
        const parsed = testInfo?.data ? JSON.parse(testInfo.data) : null;
        vtepTestId = parsed?.vtepTestId || parsed?.data?.vtepTestId || null;
        testSkill = parsed?.skill || parsed?.data?.skill || null;
        console.log("🔄 Retake test - vtepTestId:", vtepTestId, "skill:", testSkill, "skipRetake:", skipRetake);
      } catch (e) {
        console.log("⚠️ Could not parse test data for retake");
      }
      
      // If we have a vtepTestId and not skipping retake, fetch the template and instantiate a fresh test
      if (vtepTestId && !skipRetake) {
        try {
          // Check if it's a Speaking test
          if (testSkill === 'Speaking') {
            const speakingTest = await apiGet<any>(`/api/vtep-speaking/tests/${vtepTestId}`);
            if (speakingTest) {
              // Add skill field for instantiateAndOpen to recognize it as Speaking
              speakingTest.skill = 'Speaking';
              setLoading(false);
              await instantiateAndOpen(speakingTest);
              return;
            }
          } else if (testSkill === 'Writing') {
            // Writing tests don't have templates - skip retake, load saved version
            console.log("📝 Writing test detected - loading saved version");
          } else {
            // Regular Listening/Reading test
            const vtepTest = await apiGet<any>(`/api/vteptests/${vtepTestId}`);
            if (vtepTest) {
              setLoading(false);
              await instantiateAndOpen(vtepTest);
              return;
            }
          }
        } catch (err) {
          console.warn("Could not retake from template, will load saved version:", err);
          // Don't return - fall through to load saved test instead
        }
      }
      
      // Fallback: Open the saved test as-is (view only mode)
      setRunnerOpen(true);
      setAttemptStartedAt(new Date().toISOString());
      setShowAnswer(false);
      setFinished(false);
      setIndex(0);
      setScore(0);
      setResponses({});
      
      const itemsRes = await apiGet<any>(`/api/tests/${testId}/items`);
      // API may return different shapes depending on backend / middleware.
      // Normalize common shapes to an array of items.
      let resolvedItems: any[] = [];
      if (Array.isArray(itemsRes)) resolvedItems = itemsRes;
      else if (Array.isArray(itemsRes.items)) resolvedItems = itemsRes.items;
      else if (Array.isArray(itemsRes.recordset))
        resolvedItems = itemsRes.recordset;
      else if (Array.isArray(itemsRes.data)) resolvedItems = itemsRes.data;
      else resolvedItems = itemsRes ? [itemsRes] : [];
      console.debug(
        "openSavedTest: items response:",
        itemsRes,
        "->",
        resolvedItems,
      );
      // Normalize items: some backends return TestItems with JSON in `data` (string).
      const normalized = (resolvedItems || []).map((it: any) => {
        const out: any = { ...it };
        try {
          const raw =
            typeof out.data === "string" ? JSON.parse(out.data) : out.data;
          console.debug("🔍 Item data:", { original: it, parsed: raw, out });
          if (raw && typeof raw === "object") {
            // map common keys from test item data into the item shape the UI expects
            if (!out.prompt && (raw.prompt || raw.question))
              out.prompt = raw.prompt || raw.question;
            if (!out.optionsJson && (raw.options || raw.optionsJson))
              out.optionsJson = raw.options || raw.optionsJson;
            if (!out.answerJson && (raw.answer || raw.answerJson))
              out.answerJson = raw.answer || raw.answerJson;
            if (!out.sourceDocumentId && raw.sourceDocumentId)
              out.sourceDocumentId = raw.sourceDocumentId;
            if (!out.part && raw.part) {
              out.part = raw.part;
              console.log("✅ Parsed part from data:", raw.part);
            }
            if (!out.skill && raw.skill) {
              out.skill = raw.skill;
              console.log("✅ Parsed skill from data:", raw.skill);
            }
            if (!out.mediaUrl && raw.mediaUrl) {
              out.mediaUrl = raw.mediaUrl;
              console.log("✅ Parsed mediaUrl from data:", raw.mediaUrl);
            }
          }
        } catch (e) {
          console.error("Failed to parse item data:", e);
          // ignore parse errors
        }
        console.debug("🔍 Normalized item:", out);
        return out;
      });

      setItems(normalized || []);
      setCurrentTestSourceId(testId);
      
      // Load document metadata for reading passages
      const uniqueDocIds = Array.from(
        new Set(
          (normalized || [])
            .map((it: any) => it.sourceDocumentId)
            .filter(Boolean)
        )
      );
      console.debug("🔍 DEBUG: Unique document IDs found:", uniqueDocIds);
      console.debug("🔍 DEBUG: First item:", normalized[0]);
      for (const docId of uniqueDocIds) {
        await loadDocumentMetadata(docId);
      }
      console.debug("🔍 DEBUG: Documents metadata after loading:", documentsMetadata);
    } catch (err: any) {
      console.error("Failed to open saved test", err);
      
      // Check if it's an authentication error
      if (err?.message?.toLowerCase().includes('unauthorized') || 
          err?.message?.toLowerCase().includes('401')) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please refresh the page and log in again.",
          duration: 5000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to open test",
          description: err?.message || "An error occurred",
          duration: 4000,
        });
      }
      setRunnerOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function current() {
    if (!items || items.length === 0) return null;
    return items[index];
  }

  function getCurrentPassage() {
    const item = current();
    
    // Speaking items don't have passages - they have prompts
    const isSpeaking = item?.skill?.toLowerCase() === 'speaking' || 
                       (typeof item?.part === 'number' && [1, 2, 3].includes(item.part) && item.skill);
    
    if (isSpeaking) {
      return null;
    }
    
    // Writing items don't have passages - they only have prompts
    // Check both skill and part to be safe
    const partStr = typeof item?.part === 'string' ? item.part : String(item?.part || '');
    const isWriting = item?.skill?.toLowerCase() === 'writing' || 
                      partStr.toLowerCase() === 'writing';
    
    if (isWriting) {
      return null;
    }
    
    if (!item || !item.sourceDocumentId) {
      console.warn('⚠️ No item or sourceDocumentId for Reading item:', item);
      return null;
    }
    
    const doc = documentsMetadata[item.sourceDocumentId];
    if (!doc) {
      console.warn('⚠️ Document not found for ID:', item.sourceDocumentId);
      return null;
    }
    
    // Parse tocJson if it's a string
    let tocJson = doc.tocJson;
    if (typeof tocJson === 'string') {
      try {
        tocJson = JSON.parse(tocJson);
      } catch (err) {
        console.error('Failed to parse tocJson:', err);
        return null;
      }
    }
    
    if (!tocJson?.reading?.passages) {
      console.debug('No reading passages in tocJson:', { tocJson, docId: item.sourceDocumentId });
      return null;
    }
    
    // Parse passage index from item.part (e.g., "passage 1", "passage 2")
    const partStrLower = partStr.toLowerCase();
    const match = partStrLower.match(/passage\s*(\d+)/);
    if (!match) {
      console.debug('Could not parse passage index from part:', item.part);
      return null;
    }
    
    const passageNumber = parseInt(match[1], 10);
    console.log('🔍 Looking for passage:', { 
      partStr: item.part,
      passageNumber, 
      allPassages: tocJson.reading.passages.map((p: any) => ({ index: p.index, title: doc.title }))
    });
    
    // Try to find passage by index first
    let passage = tocJson.reading.passages.find(
      (p: any) => p.index === passageNumber
    );
    
    // If not found and there's only one passage, use it (single passage per document)
    if (!passage && tocJson.reading.passages.length === 1) {
      console.log('✅ Using single passage from document:', doc.title);
      passage = tocJson.reading.passages[0];
    }
    
    if (!passage) {
      console.warn('⚠️ Passage not found:', { 
        passageNumber, 
        documentTitle: doc.title,
        availablePassages: tocJson.reading.passages 
      });
    }
    
    return passage || null;
  }

  // Record a single-choice selection (no auto-grading here)
  function selectSingleOption(optId: string) {
    if (!current()) return;
    const key = current().itemKey || current().id || `q-${index}`;
    setResponses((r) => ({
      ...r,
      [key]: { ...(r[key] || {}), selected: optId, correct: null },
    }));
  }

  // Toggle a multi-choice option (no auto-grading here)
  function toggleMultiOption(optId: string) {
    if (!current()) return;
    const key = current().itemKey || current().id || `q-${index}`;
    setResponses((r) => {
      const prev = r[key] || {};
      const arr: string[] = Array.isArray(prev.selected)
        ? [...prev.selected]
        : prev.selected
          ? [String(prev.selected)]
          : [];
      const idx = arr.map(String).indexOf(String(optId));
      if (idx === -1) arr.push(String(optId));
      else arr.splice(idx, 1);
      return {
        ...r,
        [key]: { ...prev, selected: arr, correct: null },
      };
    });
  }

  function nextQ() {
    setShowAnswer(false);
    if (!items) return;
    if (index + 1 < items.length) {
      setIndex((i) => i + 1);
      return;
    }
    setFinished(true);
  }

  function prevQ() {
    setShowAnswer(false);
    if (!items) return;
    if (index - 1 >= 0) setIndex((i) => i - 1);
  }

  async function saveAttempt() {
    if (!items || items.length === 0) return;
    try {
      setLoading(true);
      
      // Check if this is a Writing or Speaking test
      const hasWritingItems = items.some((it: any) => 
        it.skill?.toLowerCase() === 'writing'
      );
      
      const hasSpeakingItems = items.some((it: any) => 
        it.skill?.toLowerCase() === 'speaking'
      );
      
      // For Speaking tests, update existing test record (created during instantiate)
      if (hasSpeakingItems) {
        const nowIso = new Date().toISOString();
        const startedIso = attemptStartedAt || nowIso;
        const durationSeconds = Math.max(
          0,
          Math.round((Date.now() - new Date(startedIso).getTime()) / 1000),
        );
        
        if (!currentTestSourceId) {
          toast({ 
            variant: "destructive",
            title: "Error", 
            description: "Test ID not found. Please restart the test.",
            duration: 5000 
          });
          setLoading(false);
          return;
        }
        
        // Update the test record that was created during instantiate
        const { apiPut } = await import("@/services/api");
        
        const updatePayload: any = {
          skill: "Speaking",
          score: 0, // Will be graded manually
          totalQuestions: items.length,
          correctAnswers: 0,
          durationSeconds,
          clientCreatedAt: startedIso,
          completedAt: nowIso,
          items: items.map((it: any, idx: number) => ({
            itemKey: it.id || `q-${idx}`,
            kind: "speaking",
            skill: "Speaking",
            isCorrect: null,
            score: null,
            data: {
              ...it,
              userAnswer: responses[it.id || `q-${idx}`]?.recorded ? "Recorded" : "Not recorded",
            },
          })),
        };
        
        await apiPut(`/api/tests/${currentTestSourceId}`, updatePayload);
        
        toast({ 
          title: "Speaking test submitted!", 
          description: "Your responses have been recorded. Teacher will review and grade your audio submissions.",
          duration: 5000 
        });
        
        setFinished(true);
        setShowAnswer(true);
        setScore(0);
        await loadMyTests();
        setLoading(false);
        return;
      }
      
      // Grade items now (only on save) using per-item points when available
      const itemsForTest = (items || []).map((it: any, idx: number) => {
        const key = it.itemKey || it.id || `q-${idx}`;
        const resp = responses[key] || {};
        const ans = it.answerJson || {};
        let isCorrect: boolean | null = null;
        // single-choice
        if (ans && ans.correctOptionId) {
          isCorrect = String(resp.selected) === String(ans.correctOptionId);
        } else if (ans && Array.isArray(ans.correctOptionIds)) {
          // multi-choice: require exact match of selected set
          const expected = (ans.correctOptionIds || []).map(String).sort();
          const got = (Array.isArray(resp.selected) ? resp.selected : [])
            .map(String)
            .sort();
          isCorrect =
            expected.length === got.length &&
            expected.every((v: string, i: number) => v === got[i]);
        } else {
          // free-text: do not auto-grade
          isCorrect = null;
        }
        // determine per-item points (try several common fields)
        const weight =
          Number(it.points ?? it.data?.points ?? it.pointsPerItem ?? 1) || 1;
        return {
          itemKey: key,
          kind: "vtep",
          skill: it.skill || null,
          isCorrect,
          // store numeric points earned for this item (or null if not graded)
          score: isCorrect === true ? weight : isCorrect === false ? 0 : null,
          data: {
            ...it,
            userAnswer: resp.text || resp.selected || null, // Store user's answer
            answerJson: ans, // Store the answer schema
            points: weight,
          },
        };
      });

      // compute totals using item weights
      const totalPoints = itemsForTest.reduce(
        (s, it) =>
          s +
          (Number(
            (it.data?.points ?? it.data?.Points ?? it.score === null)
              ? (it.data?.points ?? 1)
              : (it.data?.points ?? it.score),
          ) || 0),
        0,
      );
      // better: sum the configured points per item (from data.points) or fallback to 1
      const configuredTotal = itemsForTest.reduce(
        (s, it) => s + (Number(it.data?.points ?? 1) || 0),
        0,
      );
      const earnedRaw = itemsForTest.reduce(
        (s, it) => s + (Number(it.score === null ? 0 : it.score) || 0),
        0,
      );
      const scaled =
        configuredTotal > 0
          ? Math.round((earnedRaw / configuredTotal) * 100)
          : 0;
      const correctCount = itemsForTest.filter(
        (i) => i.isCorrect === true,
      ).length;
      const percentage = scaled;
      const nowIso = new Date().toISOString();
      const startedIso = attemptStartedAt || nowIso;
      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(startedIso).getTime()) / 1000),
      );

      // Collect Writing grades to display after submission
      let collectedGrades: any[] = [];

      // Determine skill from items
      const skillSet = new Set(
        itemsForTest
          .map((it) => it.skill)
          .filter((s): s is string => !!s)
      );
      let testSkill: string | null = null;
      if (skillSet.size === 1) {
        testSkill = Array.from(skillSet)[0];
      } else if (skillSet.has('Writing')) {
        testSkill = 'Writing';
      } else if (skillSet.has('Listening') && skillSet.has('Reading')) {
        testSkill = 'Listening/Reading';
      } else if (skillSet.size > 0) {
        testSkill = Array.from(skillSet).join('/');
      }

      const payload: any = {
        // Update the instantiated test (type 'vtep') so its Tests/TestItems rows carry scoring fields.
        skill: testSkill,
        score: percentage,
        totalQuestions: itemsForTest.length,
        correctAnswers: correctCount,
        totalPoints: configuredTotal,
        earnedPoints: earnedRaw,
        durationSeconds,
        clientCreatedAt: startedIso,
        completedAt: nowIso,
        items: itemsForTest,
      };
      let hasWritingGrades = false;
      let writingScoreOverride: number | null = null;
      
      // If this is a Writing test, create submissions and get AI grading
      if (hasWritingItems) {
        console.log("🤖 Writing test detected - creating submissions...");
        console.log("📊 Items for test:", itemsForTest.map(it => ({ 
          skill: it.skill, 
          hasUserAnswer: !!it.data?.userAnswer,
          userAnswerLength: it.data?.userAnswer?.length 
        })));
        
        for (const item of itemsForTest) {
          console.log("🔍 Processing item:", { 
            skill: item.skill, 
            skillLower: item.skill?.toLowerCase(),
            isWriting: item.skill?.toLowerCase() === 'writing',
            hasData: !!item.data,
            hasUserAnswer: !!item.data?.userAnswer
          });
          
          if (item.skill?.toLowerCase() === 'writing') {
            const key = item.itemKey || item.data?.id;
            const userAnswer = item.data?.userAnswer || "";
            const answerJson = item.data?.answerJson || {};
            
            console.log("📝 Writing item found:", { 
              key, 
              userAnswerLength: userAnswer.length,
              answerJson 
            });
            
            if (!userAnswer || userAnswer.trim().length === 0) {
              console.warn("⚠️ Skipping empty writing submission for item:", key);
              continue;
            }
            
            try {
              // Create submission (backend will auto-grade with AI)
              console.log("📝 Creating and grading writing submission...");
              const result = await apiPost("/api/vtep-writing/submissions", {
                testId: currentTestSourceId,
                promptId: answerJson.promptId,
                taskType: answerJson.taskType || "task1",
                submittedText: userAnswer,
                wordCount: userAnswer.split(/\s+/).filter(Boolean).length,
                timeSpentSeconds: durationSeconds,
              });
              
              console.log("✅ Submission created and graded:", result);
              console.log("🎯 Grade object:", result.grade);
              console.log("📊 Has grade?", !!result.grade);
              
              // Collect grade for display in dialog
              if (result.grade) {
                console.log("✅ Adding grade to collectedGrades array");
                collectedGrades.push({
                  taskType: answerJson.taskType || "task1",
                  taskName: answerJson.taskType === "task2" ? "Task 2" : "Task 1",
                  submittedText: userAnswer,
                  ...result.grade
                });
                hasWritingGrades = true;
              } else if (result.gradingFailed) {
                toast({
                  variant: "destructive",
                  title: "Submission saved",
                  description: result.message || "Grading failed - teacher will review manually",
                  duration: 5000,
                });
              }
            } catch (err) {
              console.error("Failed to submit writing:", err);
              toast({
                variant: "destructive",
                title: "Writing submission failed",
                description: "Please try again or contact teacher",
                duration: 5000,
              });
            }
          }
        }
        
        // After all submissions, update state with collected grades
        if (collectedGrades.length > 0) {
          console.log("📋 Total grades collected:", collectedGrades.length, collectedGrades);
          setWritingGrades(collectedGrades);
        }
      }

      if (hasWritingGrades && collectedGrades.length > 0) {
        const weights: Record<string, number> = { task1: 0.33, task2: 0.67 };
        let weightedScore = 0;
        let totalWeight = 0;
        collectedGrades.forEach((grade) => {
          const task = (grade.taskType || "task1").toLowerCase();
          const weight = weights[task] ?? 0.5;
          const aiScore = grade.aiScore ?? grade.criteriaAverage ?? 0;
          const normalized = aiScore / 10;
          weightedScore += normalized * weight;
          totalWeight += weight;
        });
        if (totalWeight > 0) {
          const percentageScore = Math.round((weightedScore / totalWeight) * 100);
          writingScoreOverride = percentageScore;
          payload.score = percentageScore;
          payload.writingGrades = collectedGrades;
          if (payload.totalPoints && payload.totalPoints > 0) {
            payload.earnedPoints = Math.round((percentageScore / 100) * payload.totalPoints);
          } else {
            payload.totalPoints = 100;
            payload.earnedPoints = percentageScore;
          }
          payload.correctAnswers = null;
        }
      }

      if (currentTestSourceId) {
        await apiPut(`/api/tests/${currentTestSourceId}`, payload);
      } else {
        // Fallback (should be rare): create a new test result.
        await apiPost("/api/tests", {
          type: "vtep",
          data: { source: "vtep" },
          ...payload,
        });
      }
      
      // reveal score and answers after successful save
      const finalPercentage = writingScoreOverride ?? percentage;
      const finalEarned = payload.earnedPoints ?? earnedRaw;
      const finalTotal = payload.totalPoints ?? configuredTotal;
      setScore(finalPercentage);
      setSavedPoints({ earned: finalEarned, total: finalTotal, scaled: finalPercentage });
      setSavedScoreVisible(true);
      setShowAnswer(true);
      setFinished(true); // Mark test as finished to show score summary
      
      console.log("🎯 Checking dialog conditions:", { hasWritingItems, collectedGradesLength: collectedGrades.length });
      
      if (hasWritingItems && collectedGrades.length > 0) {
        // Show detailed grading dialog for writing
        console.log("🎉 Showing grade dialog with grades:", collectedGrades);
        setShowGradeDialog(true);
      } else {
        toast({ 
          title: "Test completed!", 
          description: `Score: ${scaled}% (${correctCount}/${itemsForTest.length} correct)`,
          duration: 5000 
        });
      }
      
      await loadMyTests();
    } catch (err) {
      console.error("Failed to save attempt", err);
      toast({ variant: "destructive", title: "Save failed", duration: 3000 });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div>Loading...</div>;
  if (!user) return <div>Please login to access practice materials.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">VTEP Practice (Student)</h1>
      <div className="border rounded p-4">
        <h2 className="font-medium">Available Tests</h2>
        {tests === null ? (
          <div>Loading...</div>
        ) : tests.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No tests available.
          </div>
        ) : (
          <ul className="space-y-2 mt-2">
            {tests.map((t) => (
              <li
                key={t.id}
                className="p-2 border rounded flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.description || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => instantiateAndOpen(t)}
                    disabled={loading}
                  >
                    Start
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available Documents removed for student view */}

      {/* Writing Submissions Section */}
      <div className="border rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Writing Submissions</h2>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowSubmissionsDialog(true)}
            disabled={mySubmissions.length === 0}
          >
            View All ({mySubmissions.length})
          </Button>
        </div>
        {mySubmissions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No Writing submissions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {mySubmissions.slice(0, 3).map((sub: any) => (
              <div key={sub.id} className="p-3 border rounded bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {sub.taskType === "task2" ? "Task 2" : "Task 1"} - {sub.promptTitle || "Writing Task"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Submitted: {new Date(sub.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex flex-col items-end gap-2">
                    {sub.aiScore ? (
                      <>
                        <div className="text-2xl font-bold text-blue-600">
                          {sub.aiScore}/10
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round((sub.aiScore / 10) * 100)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Not graded</div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openSubmissionDetail(sub)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {mySubmissions.length > 3 && (
              <div className="text-sm text-center text-gray-500 mt-2">
                +{mySubmissions.length - 3} more submissions
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border rounded p-4">
        <SavedTestsList
          items={myTests}
          loading={myTests === null}
          onOpen={(id: string) => {
            setActiveVtepTest(null);
            void openSavedTest(id);
          }}
          onDelete={deleteTest}
          renderActions={(t: any) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setActiveVtepTest(null);
                  void openSavedTest(t.id);
                }}
              >
                Retake
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteTest(t.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </div>

      <Dialog
        open={runnerOpen}
        onOpenChange={(open) => {
          if (!open) {
            // User wants to close - always allow
            setRunnerOpen(false);
            resetRunnerState();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {activeVtepTest?.title
                ? `VTEP Test: ${activeVtepTest.title}`
                : "VTEP Test"}
            </DialogTitle>
            <DialogDescription>
              {activeVtepTest?.description ||
                (currentTestSourceId ? `Test ID: ${currentTestSourceId}` : "")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {items
                  ? `Progress: ${Math.min(index + 1, items.length)}/${items.length}`
                  : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                Score:{" "}
                {savedPoints
                  ? `${savedPoints.earned}/${savedPoints.total} (${savedPoints.scaled}%)`
                  : "-"}
              </div>
            </div>

            {items === null ? (
              <div className="text-sm text-muted-foreground">
                Loading test...
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No items for this test.
              </div>
            ) : finished ? (
              <div className="border rounded p-4">
                <div className="font-medium">Finished</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {savedPoints ? (
                    <span>
                      Score:{" "}
                      {`${savedPoints.earned}/${savedPoints.total} (${savedPoints.scaled}%)`}
                    </span>
                  ) : (
                    <span>Score: {`${score}/${items.length}`}</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Display Reading Passage if available */}
                {(() => {
                  const passage = getCurrentPassage();
                  const item = current();
                  const isReadingQuestion = 
                    item?.skill?.toLowerCase() === 'reading' || 
                    String(item?.part || '').toLowerCase().includes('passage');
                  
                  // Extract passage number from item.part for display
                  const getPassageTitle = () => {
                    if (!item?.part) return 'Reading Passage';
                    const partStr = String(item.part);
                    const match = partStr.match(/passage\s*(\d+)/i);
                    return match ? `Passage ${match[1]}` : 'Reading Passage';
                  };
                  
                  if (passage) {
                    return (
                      <div className="mb-6 border-2 border-blue-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <div className="font-semibold text-blue-900">{getPassageTitle()}</div>
                        </div>
                        <div 
                          className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                          style={{ fontSize: '15px', lineHeight: '1.7' }}
                          dangerouslySetInnerHTML={{ __html: passage.html || passage.raw || '' }}
                        />
                      </div>
                    );
                  } else if (isReadingQuestion) {
                    return (
                      <div className="mb-4 border border-amber-200 rounded-lg p-4 bg-amber-50 text-amber-900">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="text-sm font-medium">Reading passage not available for this question</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="font-semibold text-lg mb-2">Question {index + 1}</div>
                
                {/* Audio player for listening questions */}
                {(() => {
                  console.log('🔍 DEBUG Audio:', { 
                    hasMediaUrl: !!current()?.mediaUrl,
                    mediaUrl: current()?.mediaUrl,
                    currentItem: current()
                  });
                  return current()?.mediaUrl ? (
                    <div className="mb-4 p-3 border rounded bg-blue-50">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                        <div className="flex-1">
                          <audio 
                            controls 
                            className="w-full"
                            src={current().mediaUrl.startsWith('http') 
                              ? current().mediaUrl 
                              : `${window.location.protocol}//${window.location.hostname}:4000${current().mediaUrl}`}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2">🎧 Listen to the audio before answering</div>
                    </div>
                  ) : null;
                })()}
                
                <div className="mt-2 p-3 border rounded bg-white">
                  {current()?.prompt}
                </div>

                {current()?.optionsJson ? (
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const ans = current().answerJson || {};
                      const isMulti = Array.isArray(ans.correctOptionIds);
                      const key =
                        current().itemKey || current().id || `q-${index}`;
                      const resp = responses[key] || {};
                      return (current().optionsJson || []).map((o: any) => {
                        const isCorrect =
                          (ans &&
                            (String(ans.correctOptionId) === String(o.id) ||
                              (Array.isArray(ans.correctOptionIds) &&
                                ans.correctOptionIds
                                  .map(String)
                                  .includes(String(o.id))))) ||
                          false;
                        if (isMulti) {
                          const checked = Array.isArray(resp.selected)
                            ? resp.selected.map(String).includes(String(o.id))
                            : false;
                          return (
                            <label
                              key={o.id}
                              className={`flex items-center gap-2 p-2 border rounded w-full ${showAnswer ? (isCorrect ? "bg-green-100" : "bg-red-50") : "bg-background"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMultiOption(o.id)}
                                disabled={showAnswer}
                              />
                              <span>{o.label}</span>
                            </label>
                          );
                        }
                        // single choice
                        const checked = String(resp.selected) === String(o.id);
                        return (
                          <label
                            key={o.id}
                            className={`flex items-center gap-2 p-2 border rounded w-full ${showAnswer ? (isCorrect ? "bg-green-100" : "bg-red-50") : "bg-background"}`}
                          >
                            <input
                              type="radio"
                              name={key}
                              checked={checked}
                              onChange={() => selectSingleOption(o.id)}
                              disabled={showAnswer}
                            />
                            <span>{o.label}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="mt-3">
                    {/* Check if this is a Speaking question */}
                    {current()?.skill?.toLowerCase() === 'speaking' ? (
                      <div className="space-y-4">
                        {/* Part 1: Display all prompts together */}
                        {current()?.part === 1 && current()?.allPrompts ? (
                          <div className="space-y-4">
                            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                              <div className="flex items-center gap-2 mb-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <div>
                                  <div className="font-bold text-purple-900">Part 1 - Introduction and Interview</div>
                                  <div className="text-sm text-purple-700">Answer all questions below</div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                {current().allPrompts.map((prompt: any, idx: number) => (
                                  <div key={prompt.id} className="bg-white rounded-lg p-4 border-l-4 border-purple-400">
                                    <div className="font-semibold text-purple-800 mb-2">
                                      Topic {idx + 1}: {prompt.title}
                                    </div>
                                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                      {prompt.promptText}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex gap-3 text-sm mt-4">
                                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                  ⏱️ Preparation: {current()?.preparationTime || 15}s
                                </div>
                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded">
                                  🎤 Total speaking time: ~{current()?.speakingTime || 60}s
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 border rounded-lg p-4">
                              <div className="text-sm font-medium mb-2">📝 Audio Recording</div>
                              <div className="text-xs text-muted-foreground mb-3">
                                Record your responses to all questions above using a voice recorder or external app.
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`recorded-${index}`}
                                  checked={!!responses[current()?.id || `q-${index}`]?.recorded}
                                  onChange={(e) => {
                                    const key = current()?.id || `q-${index}`;
                                    setResponses((r) => ({
                                      ...r,
                                      [key]: {
                                        ...r[key],
                                        recorded: e.target.checked,
                                      },
                                    }));
                                  }}
                                />
                                <label htmlFor={`recorded-${index}`} className="text-sm cursor-pointer">
                                  I have recorded my responses for all Part 1 questions
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Part 2 and Part 3: Display single prompt */
                          <>
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <div>
                              <div className="font-bold text-purple-900">Part {current()?.part} - Speaking Task</div>
                              <div className="text-sm text-purple-700">{current()?.title}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded p-4 mb-3">
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {current()?.promptText}
                            </div>
                            
                            {current()?.cueCardBullets && (
                              <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3">
                                <div className="font-medium text-amber-900 mb-2">Cue Card Points:</div>
                                <div className="text-sm text-amber-800 whitespace-pre-wrap">
                                  {(() => {
                                    try {
                                      const bullets = typeof current().cueCardBullets === 'string' 
                                        ? JSON.parse(current().cueCardBullets)
                                        : current().cueCardBullets;
                                      return Array.isArray(bullets) ? bullets.join('\n') : current().cueCardBullets;
                                    } catch (e) {
                                      return current().cueCardBullets;
                                    }
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-3 text-sm">
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                              ⏱️ Preparation: {current()?.preparationTime || 0}s
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded">
                              🎤 Speaking time: {current()?.speakingTime || 0}s
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 border rounded-lg p-4">
                          <div className="text-sm font-medium mb-2">📝 Audio Recording</div>
                          <div className="text-xs text-muted-foreground mb-3">
                            Record your response using a voice recorder or external app, then upload the audio file when you finish the test.
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`recorded-${index}`}
                              checked={!!responses[current()?.id || `q-${index}`]?.recorded}
                              onChange={(e) => {
                                const key = current()?.id || `q-${index}`;
                                setResponses((r) => ({
                                  ...r,
                                  [key]: {
                                    ...r[key],
                                    recorded: e.target.checked,
                                  },
                                }));
                              }}
                            />
                            <label htmlFor={`recorded-${index}`} className="text-sm cursor-pointer">
                              I have recorded my response
                            </label>
                          </div>
                        </div>
                        </>
                        )}
                      </div>
                    ) : 
                    /* Check if this is a Writing question */
                    current()?.skill?.toLowerCase() === 'writing' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Your Essay/Letter</label>
                          <div className="text-xs text-muted-foreground">
                            Word count: {(responses[current()?.itemKey || current()?.id || `q-${index}`]?.text || "").split(/\s+/).filter(Boolean).length}
                            {(() => {
                              const answerJson = current()?.answerJson;
                              const minWords = answerJson?.minWords;
                              return minWords ? ` / ${minWords} words minimum` : '';
                            })()}
                          </div>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-lg font-mono text-sm min-h-[400px] resize-y"
                          placeholder="Write your essay or letter here..."
                          value={
                            responses[
                              current()?.itemKey || current()?.id || `q-${index}`
                            ]?.text ?? ""
                          }
                          onChange={(e) => {
                            const key =
                              current()?.itemKey || current()?.id || `q-${index}`;
                            const text = e.target.value;
                            setResponses((r) => ({
                              ...r,
                              [key]: {
                                ...r[key],
                                text,
                                correct: null,
                              },
                            }));
                          }}
                        />
                        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
                          <div className="font-medium mb-1">💡 Writing Tips:</div>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Meet the minimum word count requirement</li>
                            <li>Organize your ideas into clear paragraphs</li>
                            <li>Use appropriate vocabulary and grammar</li>
                            <li>Check your spelling and punctuation</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm">Your answer</label>
                        <input
                          className="w-full p-2 border rounded mt-1"
                          type="text"
                          placeholder="Type your answer"
                          value={
                            responses[
                              current()?.itemKey || current()?.id || `q-${index}`
                            ]?.text ?? ""
                          }
                          onChange={(e) => {
                            const key =
                              current()?.itemKey || current()?.id || `q-${index}`;
                            const text = e.target.value;
                            setResponses((r) => ({
                              ...r,
                              [key]: {
                                ...r[key],
                                text,
                                correct: null,
                              },
                            }));
                          }}
                        />
                        <div className="text-xs text-muted-foreground mt-2">
                          For free-text questions the system does not auto-grade
                          right now.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setRunnerOpen(false)}
              disabled={loading}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => void saveAttempt()}
              disabled={loading || !items || items.length === 0}
            >
              Save attempt
            </Button>
            <Button
              variant="ghost"
              onClick={prevQ}
              disabled={loading || !items || items.length === 0 || index === 0}
            >
              Previous
            </Button>
            <Button
              onClick={nextQ}
              disabled={
                loading ||
                !items ||
                items.length === 0 ||
                finished ||
                ((): boolean => {
                  const c = current();
                  if (!c) return true;
                  const key = c.itemKey || c.id || `q-${index}`;
                  const resp = responses[key] || {};
                  if (c.optionsJson) {
                    // require at least one selection
                    if (Array.isArray(resp.selected))
                      return resp.selected.length === 0;
                    return !resp.selected;
                  }
                  // for text allow next even if empty
                  return false;
                })()
              }
            >
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Writing Grade Results Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              AI Grading Results
            </DialogTitle>
            <DialogDescription>
              Your writing has been evaluated by AI based on VSTEP criteria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {writingGrades.map((grade, idx) => (
              <div key={idx} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{grade.taskName}</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {grade.aiScore}/10
                    </div>
                    <div className="text-sm text-gray-500">
                      {grade.percentage}% · {grade.vstepBand} Band
                    </div>
                  </div>
                </div>

                {/* Criteria Scores */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Task Achievement</div>
                    <div className="text-lg font-semibold">{grade.taskAchievementScore}/10</div>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Coherence & Cohesion</div>
                    <div className="text-lg font-semibold">{grade.coherenceCohesionScore}/10</div>
                  </div>
                  <div className="bg-purple-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Lexical Resource</div>
                    <div className="text-lg font-semibold">{grade.lexicalResourceScore}/10</div>
                  </div>
                  <div className="bg-orange-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Grammar</div>
                    <div className="text-lg font-semibold">{grade.grammaticalRangeScore}/10</div>
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-3">
                  {/* Strengths */}
                  {grade.aiFeedback?.generalStrengths && grade.aiFeedback.generalStrengths.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-green-900 mb-1">Strengths</div>
                          <ul className="text-sm text-green-800 space-y-1">
                            {grade.aiFeedback.generalStrengths.map((strength: string, i: number) => (
                              <li key={i}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {grade.aiFeedback?.generalWeaknesses && grade.aiFeedback.generalWeaknesses.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-orange-900 mb-1">Areas for Improvement</div>
                          <ul className="text-sm text-orange-800 space-y-1">
                            {grade.aiFeedback.generalWeaknesses.map((weakness: string, i: number) => (
                              <li key={i}>• {weakness}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {grade.aiFeedback?.suggestions && grade.aiFeedback.suggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-blue-900 mb-1">Suggestions</div>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {grade.aiFeedback.suggestions.map((suggestion: string, i: number) => (
                              <li key={i}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Criteria Feedback */}
                <details className="border rounded p-3">
                  <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    View Detailed Criteria Feedback
                  </summary>
                  <div className="mt-3 space-y-3 text-sm">
                    {grade.aiFeedback?.taskAchievement && (
                      <div>
                        <div className="font-semibold text-blue-900">Task Achievement ({grade.taskAchievementScore}/10)</div>
                        <p className="text-gray-700 mt-1">{grade.aiFeedback.taskAchievement.feedback}</p>
                      </div>
                    )}
                    {grade.aiFeedback?.coherenceCohesion && (
                      <div>
                        <div className="font-semibold text-green-900">Coherence & Cohesion ({grade.coherenceCohesionScore}/10)</div>
                        <p className="text-gray-700 mt-1">{grade.aiFeedback.coherenceCohesion.feedback}</p>
                      </div>
                    )}
                    {grade.aiFeedback?.lexicalResource && (
                      <div>
                        <div className="font-semibold text-purple-900">Lexical Resource ({grade.lexicalResourceScore}/10)</div>
                        <p className="text-gray-700 mt-1">{grade.aiFeedback.lexicalResource.feedback}</p>
                      </div>
                    )}
                    {grade.aiFeedback?.grammaticalRange && (
                      <div>
                        <div className="font-semibold text-orange-900">Grammatical Range ({grade.grammaticalRangeScore}/10)</div>
                        <p className="text-gray-700 mt-1">{grade.aiFeedback.grammaticalRange.feedback}</p>
                      </div>
                    )}
                  </div>
                </details>

                {/* Word Count Info */}
                <div className="text-xs text-gray-500 flex items-center gap-4">
                  <span>Word Count: {grade.aiFeedback?.wordCount || 0}</span>
                  {grade.aiFeedback?.meetsMinimumWords ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Meets minimum requirement
                    </span>
                  ) : (
                    <span className="text-orange-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Below minimum word count
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Overall Summary */}
            {writingGrades.length > 1 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">Overall Writing Score</h4>
                <div className="text-3xl font-bold text-blue-600">
                  {(writingGrades.reduce((sum, g) => sum + (parseFloat(g.aiScore) || 0), 0) / writingGrades.length).toFixed(1)}/10
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Average across {writingGrades.length} tasks
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={() => {
                setShowGradeDialog(false);
                setWritingGrades([]);
              }}
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Writing Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">My Writing Submissions</DialogTitle>
            <DialogDescription>
              Select a submission to view detailed feedback
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {mySubmissions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No Writing submissions yet
              </div>
            ) : (
              mySubmissions.map((sub: any) => (
                <div key={sub.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {sub.taskType === "task2" ? "Task 2" : "Task 1"} - {sub.promptTitle || "Writing Task"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Submitted: {new Date(sub.createdAt).toLocaleString("vi-VN")}
                    </div>
                    {sub.wordCount && (
                      <div className="text-sm text-gray-600">
                        Word count: {sub.wordCount} words
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {sub.aiScore ? (
                        <>
                          <div className="text-xl font-bold text-blue-600">
                            {sub.aiScore}/10
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((sub.aiScore / 10) * 100)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Not graded yet</div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openSubmissionDetail(sub)}>
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSubmissionsDialog(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Writing Submission Detail Dialog */}
      <Dialog open={showSubmissionDetail} onOpenChange={setShowSubmissionDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Writing Submission Detail</DialogTitle>
            <DialogDescription>
              Detailed feedback for the selected submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission ? (() => {
            const feedback = selectedSubmission.aiFeedback
              ? (typeof selectedSubmission.aiFeedback === "string"
                  ? JSON.parse(selectedSubmission.aiFeedback)
                  : selectedSubmission.aiFeedback)
              : null;

            return (
              <div className="space-y-4 mt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {selectedSubmission.taskType === "task2" ? "Task 2" : "Task 1"} - {selectedSubmission.promptTitle || "Writing Task"}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      Submitted: {new Date(selectedSubmission.createdAt).toLocaleString("vi-VN")}
                    </div>
                    {selectedSubmission.wordCount && (
                      <div className="text-sm text-gray-600">
                        Word count: {selectedSubmission.wordCount} words
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {selectedSubmission.aiScore ? (
                      <>
                        <div className="text-3xl font-bold text-blue-600">
                          {selectedSubmission.aiScore}/10
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.round((selectedSubmission.aiScore / 10) * 100)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Not graded yet</div>
                    )}
                  </div>
                </div>

                {(selectedSubmission.scoreTaskAchievement || selectedSubmission.scoreCoherence || selectedSubmission.scoreLexical || selectedSubmission.scoreGrammar) && (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedSubmission.scoreTaskAchievement && (
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-600">Task</div>
                        <div className="text-lg font-semibold">{selectedSubmission.scoreTaskAchievement}</div>
                      </div>
                    )}
                    {selectedSubmission.scoreCoherence && (
                      <div className="bg-green-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-600">Coherence</div>
                        <div className="text-lg font-semibold">{selectedSubmission.scoreCoherence}</div>
                      </div>
                    )}
                    {selectedSubmission.scoreLexical && (
                      <div className="bg-purple-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-600">Lexical</div>
                        <div className="text-lg font-semibold">{selectedSubmission.scoreLexical}</div>
                      </div>
                    )}
                    {selectedSubmission.scoreGrammar && (
                      <div className="bg-orange-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-600">Grammar</div>
                        <div className="text-lg font-semibold">{selectedSubmission.scoreGrammar}</div>
                      </div>
                    )}
                  </div>
                )}

                {feedback && (
                  <div className="space-y-2">
                    {feedback.strengths && feedback.strengths.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-green-900 text-sm">Strengths</div>
                            <ul className="text-sm text-green-800 mt-1 space-y-1">
                              {feedback.strengths.map((s: string, i: number) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-orange-900 text-sm">Areas for Improvement</div>
                            <ul className="text-sm text-orange-800 mt-1 space-y-1">
                              {feedback.weaknesses.map((w: string, i: number) => (
                                <li key={i}>• {w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {feedback.suggestions && feedback.suggestions.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-blue-900 text-sm">Suggestions</div>
                            <ul className="text-sm text-blue-800 mt-1 space-y-1">
                              {feedback.suggestions.map((s: string, i: number) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <details className="border rounded p-3">
                  <summary className="cursor-pointer font-semibold text-sm">
                    View Submitted Text
                  </summary>
                  <div className="mt-3 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {selectedSubmission.submittedText || "No text available"}
                  </div>
                </details>
              </div>
            );
          })() : (
            <div className="text-center text-gray-500 py-8">
              No submission selected
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setShowSubmissionDetail(false);
                setSelectedSubmission(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
