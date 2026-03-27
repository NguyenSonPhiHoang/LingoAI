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

  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) loadTests();
  }, [authLoading]);

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
  }

  async function loadTests() {
    try {
      setTests(null);
      const { apiGet } = await import("@/services/api");
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
      const { apiPost } = await import("@/services/api");
      setActiveVtepTest(t);
      setRunnerOpen(true);
      const res = await apiPost(`/api/vteptests/${t.id}/instantiate`, {});
      const tid = res?.testId || res?.testId || null;
      if (!tid) {
        toast({ variant: "destructive", title: "Failed to start test" });
        return;
      }
      await openSavedTest(tid);
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
      const { apiGet } = await import("@/services/api");
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
        const { apiGet } = await import("@/services/api");
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

  useEffect(() => {
    // load user's saved tests
    if (!authLoading && user) loadMyTests();
  }, [authLoading, user]);

  async function openSavedTest(testId: string) {
    try {
      setLoading(true);
      setRunnerOpen(true);
      setAttemptStartedAt(new Date().toISOString());
      setShowAnswer(false);
      setFinished(false);
      setIndex(0);
      setScore(0);
      setResponses({});
      const { apiGet } = await import("@/services/api");
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
          }
        } catch (e) {
          // ignore parse errors
        }
        return out;
      });

      setItems(normalized || []);
      setCurrentTestSourceId(testId);
    } catch (err) {
      console.error("Failed to open saved test", err);
      toast({
        variant: "destructive",
        title: "Failed to open test",
        duration: 4000,
      });
      setRunnerOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function current() {
    if (!items || items.length === 0) return null;
    return items[index];
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
            userAnswer: resp.selected ?? resp.text ?? null,
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

      const { apiPut, apiPost } = await import("@/services/api");
      const payload: any = {
        // Update the instantiated test (type 'vtep') so its Tests/TestItems rows carry scoring fields.
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
      setScore(percentage);
      setSavedPoints({ earned: earnedRaw, total: configuredTotal, scaled });
      setSavedScoreVisible(true);
      setShowAnswer(true);
      toast({ title: "Attempt saved", duration: 3000 });
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

      <div className="border rounded p-4">
        <SavedTestsList
          items={myTests}
          loading={myTests === null}
          onOpen={(id: string) => {
            setActiveVtepTest(null);
            void openSavedTest(id);
          }}
        />
      </div>

      <Dialog
        open={runnerOpen}
        onOpenChange={(open) => {
          setRunnerOpen(open);
          if (!open) resetRunnerState();
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
                <div className="font-medium">Question</div>
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
    </div>
  );
}
