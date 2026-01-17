"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMyInsights, type MyInsights } from "@/services/insights";
import { useAuth } from "@/context/auth-context";

type Props = {
  days?: number;
  onNavigate?: (
    target:
      | {
          view: "my-lessons" | "ai-suggester" | "placement-test" | "vocabulary";
        }
      | {
          view: "review";
          reviewTab?: "matching" | "fill-in-the-blank" | "part-of-speech";
        }
  ) => void;
};

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  // Score stored as percentage (0..100)
  return `${Math.round(value)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function InsightsCard({ days = 30, onNavigate }: Props) {
  const { token, user } = useAuth();
  const [data, setData] = useState<MyInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowDays = data?.windowDays ?? days;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyInsights(days, token);
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) {
          setData(null);
          setError(e?.message || "Failed to load insights");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [days, token, user]);

  const topWeakKinds = useMemo(() => {
    const arr = data?.weakKinds || [];
    return arr.slice(0, 3);
  }, [data]);

  const weakestSkill = useMemo(() => {
    const list = data?.bySkill || [];
    if (!list.length) return null;

    const scored = list
      .map((s) => {
        const accuracy =
          typeof s.accuracy === "number" && !Number.isNaN(s.accuracy)
            ? s.accuracy
            : null;
        const avgScore =
          typeof s.avgScore === "number" && !Number.isNaN(s.avgScore)
            ? s.avgScore
            : null;
        return {
          ...s,
          accuracy,
          avgScore,
          // Lower is worse. Prefer accuracy when available; fall back to avgScore.
          worstMetric:
            accuracy !== null
              ? accuracy
              : avgScore !== null
              ? avgScore / 100
              : 1,
        };
      })
      .sort((a, b) => {
        if (a.worstMetric !== b.worstMetric)
          return a.worstMetric - b.worstMetric;
        return (b.attempts || 0) - (a.attempts || 0);
      });

    return scored[0] || null;
  }, [data]);

  const recommendedReviewTab = useMemo(() => {
    const k = String(data?.weakKinds?.[0]?.kind || "").toLowerCase();
    if (!k) return null;

    if (k.includes("part-of-speech") || k.includes("pos"))
      return "part-of-speech";
    if (k.includes("fill")) return "fill-in-the-blank";

    // For anything vocab/review related, default to matching.
    if (k.includes("review") || k.includes("vocab") || k.includes("match"))
      return "matching";

    return null;
  }, [data]);

  const recommendedFocusView = useMemo(() => {
    const k = String(data?.weakKinds?.[0]?.kind || "").toLowerCase();
    if (recommendedReviewTab)
      return { view: "review" as const, reviewTab: recommendedReviewTab };

    if (
      k.includes("reading") ||
      k.includes("listening") ||
      k.includes("writing") ||
      k.includes("speaking") ||
      k.includes("pronunciation") ||
      k.includes("intonation")
    ) {
      return { view: "my-lessons" as const };
    }

    return { view: "ai-suggester" as const };
  }, [data, recommendedReviewTab]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Insights</CardTitle>
        <CardDescription>
          Your learning summary (last {windowDays} days)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-14 animate-pulse rounded border bg-muted/50" />
              <div className="h-14 animate-pulse rounded border bg-muted/50" />
              <div className="h-14 animate-pulse rounded border bg-muted/50" />
            </div>
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded border bg-muted/50" />
              <div className="h-8 animate-pulse rounded border bg-muted/50" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !data || data.summary.attempts === 0 ? (
          <p className="text-sm text-muted-foreground">
            No insights yet. Complete a few tests/practices to see stats here.
          </p>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Attempts</div>
                  <div className="mt-1 text-lg font-semibold">
                    {data.summary.attempts}
                  </div>
                </div>
                <div className="rounded-md border bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Avg score</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatScore(data.summary.avgScore)}
                  </div>
                </div>
                <div className="rounded-md border bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">
                    Last activity
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatDate(data.summary.lastCompletedAt)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Weakest areas</div>
                {topWeakKinds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not enough item-level data yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topWeakKinds.map((k) => (
                      <div
                        key={k.kind}
                        className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{k.kind}</div>
                          <div className="text-xs text-muted-foreground">
                            {k.attempts} attempts
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {formatPercent(k.accuracy)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 space-y-2">
              <div className="text-sm font-medium">Next steps (timeline)</div>
              <ScrollArea className="h-56 pr-2" type="always">
                <ol className="relative ml-2 border-l pl-4">
                  <li className="pb-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">
                        {data.summary.placementAttempts === 0
                          ? "Take placement test"
                          : weakestSkill?.skill
                          ? `Focus on ${weakestSkill.skill}`
                          : "Continue learning"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.summary.placementAttempts === 0
                          ? "Get an initial level recommendation so the roadmap is more accurate."
                          : weakestSkill?.skill
                          ? `This is currently your weakest skill in the last ${windowDays} days.`
                          : "Keep practicing to generate stronger insights."}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!onNavigate}
                        onClick={() =>
                          onNavigate?.(
                            data.summary.placementAttempts === 0
                              ? { view: "placement-test" }
                              : { view: "my-lessons" }
                          )
                        }
                      >
                        {data.summary.placementAttempts === 0
                          ? "Start placement test"
                          : "Go to My Lessons"}
                      </Button>
                    </div>
                  </li>

                  <li className="pb-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">
                        {data.weakKinds?.[0]?.kind
                          ? `Fix weakest area: ${data.weakKinds[0].kind}`
                          : "Practice your weakest area"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.weakKinds?.[0]?.accuracy !== null &&
                        data.weakKinds?.[0]?.accuracy !== undefined
                          ? `Recent accuracy: ${formatPercent(
                              data.weakKinds[0].accuracy
                            )}`
                          : "Practice targeted exercises to improve."}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!onNavigate}
                        onClick={() =>
                          onNavigate?.(recommendedFocusView as any)
                        }
                      >
                        {recommendedFocusView.view === "review"
                          ? "Start Review"
                          : recommendedFocusView.view === "my-lessons"
                          ? "Go to My Lessons"
                          : "Open AI Suggestions"}
                      </Button>
                    </div>
                  </li>

                  <li>
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">Generate a roadmap</div>
                      <div className="text-xs text-muted-foreground">
                        Use AI Suggestions to get a structured next-step plan.
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!onNavigate}
                        onClick={() => onNavigate?.({ view: "ai-suggester" })}
                      >
                        Open AI Suggestions
                      </Button>
                    </div>
                  </li>
                </ol>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
