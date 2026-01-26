"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FC,
  type SetStateAction,
} from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  FilePenLine,
  Headphones,
  Mic,
  ClipboardCheck,
  Voicemail,
  Volume2,
} from "lucide-react";
import type { View, ViewState } from "@/app/page";
import type { CombinedVocabulary } from "@/services/vocabulary";
import type { Lesson } from "@/services/lessons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useSettings } from "@/context/settings-context";
import { incrementUserVocabularyLearnCount } from "@/services/vocabulary";
import InsightsCard from "@/components/lingo/insights-card";
import { useAuth } from "@/context/auth-context";
import { getTotalUserSessionSeconds } from "@/services/activity";
import { getMyTotalSecondsFromServer } from "@/services/sessions";
import { getTestResults } from "@/services/test-results";
import { getMyInsights, type MyInsights } from "@/services/insights";

type LevelKey = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

const estimateLevelKeyFromPlacement = (percentage: number): LevelKey => {
  if (!Number.isFinite(percentage)) return "a1";
  if (percentage < 35) return "a1";
  if (percentage < 55) return "a2";
  if (percentage < 70) return "b1";
  if (percentage < 82) return "b2";
  if (percentage < 92) return "c1";
  return "c2";
};

const formatDurationShort = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

interface DashboardOverviewProps {
  setActiveView: (view: View) => void;
  setActiveViewState?: Dispatch<SetStateAction<ViewState>>;
  favoriteWords: CombinedVocabulary[];
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
  lessons: Lesson[];
}

type SkillKey =
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "pronunciation";

const SKILL_PROGRESS_WINDOW_DAYS = 30;

const toSkillKey = (raw: string | null | undefined): SkillKey | null => {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return null;

  if (s.includes("listen")) return "listening";
  if (s.includes("speak")) return "speaking";
  if (s.includes("read")) return "reading";
  if (s.includes("write")) return "writing";
  if (s.includes("pronun") || s.includes("intonation")) return "pronunciation";

  return null;
};

const toProgressPercent = (entry: {
  accuracy: number | null;
  avgScore: number | null;
}): number => {
  if (typeof entry.accuracy === "number" && !Number.isNaN(entry.accuracy)) {
    return Math.max(0, Math.min(100, Math.round(entry.accuracy * 100)));
  }
  if (typeof entry.avgScore === "number" && !Number.isNaN(entry.avgScore)) {
    return Math.max(0, Math.min(100, Math.round(entry.avgScore)));
  }
  return 0;
};

const skillMeta: Array<{
  key: SkillKey;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
}> = [
  {
    key: "listening",
    name: "Listening",
    icon: Headphones,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
  },
  {
    key: "speaking",
    name: "Speaking",
    icon: Mic,
    color: "text-green-500",
    bgColor: "bg-green-100",
  },
  {
    key: "reading",
    name: "Reading",
    icon: BookOpen,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
  },
  {
    key: "writing",
    name: "Writing",
    icon: FilePenLine,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
  },
  {
    key: "pronunciation",
    name: "Pronunciation",
    icon: Voicemail,
    color: "text-red-500",
    bgColor: "bg-red-100",
  },
];

const DashboardOverview: FC<DashboardOverviewProps> = ({
  setActiveView,
  setActiveViewState,
  favoriteWords,
  setWords,
  lessons,
}) => {
  const { user, token } = useAuth();
  const { speechRate } = useSettings();
  const { audioRef, isLoadingAudio, activePlaybackKey, playAudio } =
    useAudioPlayback({ setWords: setWords as any, speechRate });

  const handlePlayFavoriteWord = async (word: CombinedVocabulary) => {
    const key = String(word.userVocabularyId || word.id);

    // Clicking the speaker counts as a "learn".
    if (word.userVocabularyId) {
      try {
        const updated = await incrementUserVocabularyLearnCount(
          word.userVocabularyId,
        );
        if (updated) {
          setWords((prev) =>
            prev.map((w) =>
              w.userVocabularyId === word.userVocabularyId
                ? {
                    ...w,
                    learnCount: updated.learnCount,
                    favorite: updated.favorite,
                  }
                : w,
            ),
          );
        }
      } catch {
        // ignore learn tracking failures
      }
    }

    // Play stored audio URL if present; otherwise browser TTS.
    await playAudio(key, word.term, word.audioUrl);
  };

  const totalLessons = lessons.length;
  const lessonsInProgress = lessons.filter(
    (l) => l.status === "in-progress",
  ).length;
  const lessonsCompleted = lessons.filter(
    (l) => l.status === "completed",
  ).length;
  const lessonsNotStarted = lessons.filter(
    (l) => l.status === "not-started",
  ).length;

  const userId = user?.uid || user?.id;

  const [totalUsageSeconds, setTotalUsageSeconds] = useState(0);
  const [levelKey, setLevelKey] = useState<LevelKey | null>(null);
  const [skillInsights, setSkillInsights] = useState<MyInsights | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    const update = async () => {
      // Prefer server-side persisted sessions when available
      try {
        if (token) {
          const secs = await getMyTotalSecondsFromServer(token);
          if (!cancelled) {
            setTotalUsageSeconds(secs);
            return;
          }
        }
      } catch {
        // ignore and fall back to local
      }

      if (!cancelled) setTotalUsageSeconds(getTotalUserSessionSeconds(userId));
    };

    update();
    const id = window.setInterval(update, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userId, token]);

  useEffect(() => {
    if (!userId || !token) {
      setSkillInsights(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const insights = await getMyInsights(SKILL_PROGRESS_WINDOW_DAYS, token);
        if (!cancelled) setSkillInsights(insights);
      } catch {
        if (!cancelled) setSkillInsights(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  const skillProgressByKey = useMemo(() => {
    const map: Record<SkillKey, number> = {
      listening: 0,
      speaking: 0,
      reading: 0,
      writing: 0,
      pronunciation: 0,
    };

    const bySkill = skillInsights?.bySkill || [];
    for (const s of bySkill) {
      const key = toSkillKey(s.skill);
      if (!key) continue;

      const progress = toProgressPercent({
        accuracy: s.accuracy,
        avgScore: s.avgScore,
      });
      // If multiple rows map to the same canonical skill, keep the one with higher attempts.
      // Since we don't keep attempts in the map, prefer the max progress as a stable heuristic.
      map[key] = Math.max(map[key], progress);
    }
    return map;
  }, [skillInsights]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const run = async () => {
      try {
        const results = await getTestResults(userId);
        const latestPlacement = results.find(
          (r) => r.testType === "Placement Test",
        );
        if (cancelled) return;

        if (!latestPlacement) {
          setLevelKey(null);
          return;
        }

        setLevelKey(estimateLevelKeyFromPlacement(latestPlacement.percentage));
      } catch {
        if (!cancelled) setLevelKey(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hasEnoughFavoritesToReview = favoriteWords.length >= 4;
  const hasPartOfSpeechData = favoriteWords.some(
    (w) => typeof w.partOfSpeech === "string" && w.partOfSpeech.trim(),
  );

  const goToReview = (
    tab: "matching" | "fill-in-the-blank" | "part-of-speech",
  ) => {
    if (setActiveViewState) {
      setActiveViewState({ view: "review", reviewTab: tab } as ViewState);
      return;
    }
    setActiveView("review");
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} className="hidden" />
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back!</h2>
        <p className="text-muted-foreground">
          Here's a summary of your learning journey. Keep up the great work!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              Next steps tailored to your current progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">
                    Total time
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {formatDurationShort(totalUsageSeconds)}
                  </div>
                </div>

                <div className="rounded-md border bg-background/50 p-3">
                  <div className="text-center text-xs text-muted-foreground">
                    Lessons
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <div
                      className="flex flex-col items-center justify-center gap-1"
                      title="Completed"
                    >
                      <div className="text-lg font-semibold leading-none">
                        {lessonsCompleted}
                      </div>
                      <CheckCircle2
                        className="h-5 w-5 text-green-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Completed</span>
                    </div>
                    <div
                      className="flex flex-col items-center justify-center gap-1"
                      title="In progress"
                    >
                      <div className="text-lg font-semibold leading-none">
                        {lessonsInProgress}
                      </div>
                      <Clock
                        className="h-5 w-5 text-blue-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">In progress</span>
                    </div>
                    <div
                      className="flex flex-col items-center justify-center gap-1"
                      title="Not started"
                    >
                      <div className="text-lg font-semibold leading-none">
                        {lessonsNotStarted}
                      </div>
                      <Circle
                        className="h-5 w-5 text-orange-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Not started</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Level</div>
                  <div className="mt-2 text-lg font-semibold">
                    {levelKey ? levelKey.toUpperCase() : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 space-y-3">
              <div className="text-sm font-medium">Learning plan</div>

              <ScrollArea className="h-56 pr-2" type="always">
                <ol className="relative ml-2 border-l pl-4">
                  <li className="pb-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">
                        {lessonsInProgress > 0
                          ? "Continue your current lesson"
                          : "Start your next lesson"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lessonsInProgress > 0
                          ? "Pick up where you left off in My Lessons."
                          : "Browse recommended lessons and start learning."}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveView("my-lessons")}
                      >
                        Go to My Lessons
                      </Button>
                    </div>
                  </li>

                  <li className="pb-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">
                        {hasEnoughFavoritesToReview
                          ? hasPartOfSpeechData
                            ? "Review: Part of Speech"
                            : "Review: Vocabulary"
                          : "Build your review set"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hasEnoughFavoritesToReview
                          ? "Use your favorited words to practice and reinforce memory."
                          : "Favorite at least 4 words so Review can generate exercises."}
                      </div>
                      {hasEnoughFavoritesToReview ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            goToReview(
                              hasPartOfSpeechData
                                ? "part-of-speech"
                                : "matching",
                            )
                          }
                        >
                          Start Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveView("vocabulary")}
                        >
                          Go to My Vocabulary
                        </Button>
                      )}
                    </div>
                  </li>

                  <li>
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
                    <div className="space-y-2">
                      <div className="font-medium">Get an AI learning plan</div>
                      <div className="text-xs text-muted-foreground">
                        Generate a personalized roadmap and recommended levels.
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveView("ai-suggester")}
                      >
                        Open AI Suggestions
                      </Button>
                    </div>
                  </li>
                </ol>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <InsightsCard
          onNavigate={(target) => {
            if (target.view === "review") {
              if (setActiveViewState) {
                setActiveViewState({
                  view: "review",
                  reviewTab: target.reviewTab || "matching",
                } as ViewState);
              } else {
                setActiveView("review");
              }
              return;
            }

            setActiveView(target.view);
          }}
        />

        <Card className="flex flex-col justify-between bg-primary/10 transition-transform hover:scale-[1.02] hover:shadow-lg">
          <CardHeader>
            <CardTitle>Explore Lessons</CardTitle>
            <CardDescription>
              Dive into exercises for all skill levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-background/50 p-3 text-center">
                <div className="text-lg font-semibold">{totalLessons}</div>
                <div className="text-xs text-muted-foreground">Lessons</div>
              </div>
              <div className="rounded-md border bg-background/50 p-3 text-center">
                <div className="text-lg font-semibold">{lessonsInProgress}</div>
                <div className="text-xs text-muted-foreground">Learning</div>
              </div>
              <div className="rounded-md border bg-background/50 p-3 text-center">
                <div className="text-lg font-semibold">{lessonsCompleted}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => setActiveView("my-lessons")}
              variant="outline"
            >
              Start Learning <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between bg-accent/10 transition-transform hover:scale-[1.02] hover:shadow-lg">
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Get personalized lesson recommendations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => setActiveView("ai-suggester")}
              variant="outline"
            >
              Get Suggestions <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <h3 className="text-2xl font-bold tracking-tight">
              Skill Progress
            </h3>
            <p className="text-muted-foreground">
              Track your improvement in each core skill.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {skillMeta.map((skill) => {
              const progress = skillProgressByKey[skill.key] ?? 0;
              return (
                <Card
                  key={skill.name}
                  className="transition-transform hover:-translate-y-1 hover:shadow-xl"
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">
                      {skill.name}
                    </CardTitle>
                    <div className={`rounded-lg p-2 ${skill.bgColor}`}>
                      <skill.icon className={`h-6 w-6 ${skill.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{progress}%</div>
                    <p className="text-xs text-muted-foreground">
                      Proficiency Level
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Progress value={progress} className="h-2" />
                  </CardFooter>
                </Card>
              );
            })}
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-between bg-secondary/20 transition-transform hover:scale-[1.02] hover:shadow-lg">
          <CardHeader>
            <CardTitle>Review Vocabulary</CardTitle>
            <CardDescription>
              Shows only the words you marked as favorite.
            </CardDescription>
            <div className="flex justify-center pt-4">
              <ClipboardCheck className="h-16 w-16 text-secondary-foreground/50" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {favoriteWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No favorite words yet.
              </p>
            ) : (
              <ScrollArea className="h-56 pr-2" type="always">
                <div className="space-y-2">
                  {favoriteWords.map((w) => {
                    const key = String(w.userVocabularyId || w.id);
                    const learnCount =
                      typeof w.learnCount === "number" ? w.learnCount : 0;
                    const pronunciation =
                      typeof w.pronunciation === "string"
                        ? w.pronunciation
                        : "";
                    const partOfSpeech =
                      typeof w.partOfSpeech === "string" ? w.partOfSpeech : "";

                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-md border bg-background/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-medium truncate">{w.term}</div>
                            {partOfSpeech ? (
                              <Badge variant="secondary" className="shrink-0">
                                {partOfSpeech}
                              </Badge>
                            ) : null}
                          </div>
                          {pronunciation ? (
                            <div className="text-xs text-muted-foreground truncate">
                              /{pronunciation}/
                            </div>
                          ) : null}
                          <div className="text-xs text-muted-foreground">
                            Learn count: {learnCount}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePlayFavoriteWord(w)}
                            disabled={!!isLoadingAudio[key]}
                            aria-label="Play word audio"
                          >
                            <Volume2
                              className={
                                activePlaybackKey === key
                                  ? "h-4 w-4 text-primary"
                                  : "h-4 w-4"
                              }
                            />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => setActiveView("review")}
              variant="secondary"
            >
              Start Review <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
