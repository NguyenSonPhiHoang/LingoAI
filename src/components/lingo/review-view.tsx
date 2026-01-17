"use client";

import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import {
  AlertTriangle,
  Lightbulb,
  Repeat,
  Loader2,
  Check,
  X,
  Bot,
  Volume2,
  Languages,
  BookCopy,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CombinedVocabulary } from "@/services/vocabulary";
import { Skeleton } from "@/components/ui/skeleton";
import { generateReviewExercises } from "@/ai/flows/generate-review-flow";
import { generateVocabularyFeedback } from "@/ai/flows/generate-vocabulary-feedback-flow";
import { translateText } from "@/ai/flows/translate-text-flow";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import type {
  MatchingQuestion,
  FillInTheBlankQuestion,
  GenerateVocabularyFeedbackOutput,
} from "@/ai/flows/schemas";
import { useToast } from "@/hooks/use-toast";
import InteractiveText from "./interactive-text";
import FormattedFeedbackText from "./formatted-feedback-text";
import { useSettings } from "@/context/settings-context";
import { getUserSettings } from "@/services/settings";
import { useAuth } from "@/context/auth-context";
import { addTestResult } from "@/services/test-results";

interface ReviewViewProps {
  words: CombinedVocabulary[];
  initialTab?: "matching" | "fill-in-the-blank" | "part-of-speech";
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

type PartOfSpeechQuestion = {
  wordId: string;
  term: string;
  correctPartOfSpeech: string;
  options: string[];
  hint?: {
    synonyms?: string[];
    definition?: string;
    sentence?: string;
  };
};

const buildPartOfSpeechQuestions = (
  words: CombinedVocabulary[],
  count = 12
): PartOfSpeechQuestion[] => {
  const withPos = words
    .filter((w) => typeof w.partOfSpeech === "string" && w.partOfSpeech.trim())
    .map((w) => ({ ...w, partOfSpeech: w.partOfSpeech.trim() }));

  if (withPos.length === 0) return [];

  const posPool = Array.from(
    new Set(withPos.map((w) => w.partOfSpeech))
  ).filter(Boolean);
  const fallbackPos = [
    "Noun",
    "Verb",
    "Adjective",
    "Adverb",
    "Phrase",
    "Idiom",
  ];
  const allPos = Array.from(new Set([...posPool, ...fallbackPos]));

  const picked = shuffleArray(withPos).slice(
    0,
    Math.min(count, withPos.length)
  );

  return picked.map((w) => {
    const correct = w.partOfSpeech;
    const distractors = shuffleArray(allPos.filter((p) => p !== correct)).slice(
      0,
      3
    );
    const options = shuffleArray([correct, ...distractors]);

    const synonyms = Array.isArray(w.synonyms)
      ? w.synonyms.filter(Boolean)
      : [];
    const hintSynonyms = synonyms.slice(0, 3);
    const hintDefinition = typeof w.definition === "string" ? w.definition : "";
    const hintSentence = typeof w.sentence === "string" ? w.sentence : "";

    return {
      wordId: w.userVocabularyId || w.id,
      term: w.term,
      correctPartOfSpeech: correct,
      options,
      hint: {
        synonyms: hintSynonyms.length ? hintSynonyms : undefined,
        definition: hintDefinition || undefined,
        sentence: hintSentence || undefined,
      },
    };
  });
};

const MatchingGame: FC<{
  questions: MatchingQuestion[];
  onRegenerate: () => void;
}> = ({ questions, onRegenerate }) => {
  const [selections, setSelections] = useState<Record<number, string | null>>(
    {}
  );
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setSelections({});
    setShowResults(false);
  }, [questions]);

  const handleSelect = (qIndex: number, option: string) => {
    if (showResults) return;
    setSelections((prev) => ({ ...prev, [qIndex]: option }));
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => (
        <div key={qIndex} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="flex items-center justify-center p-6">
            <h3 className="text-2xl font-bold">{q.term}</h3>
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {q.options.map((opt, oIndex) => {
              const isCorrect = q.correctDefinition === opt;
              const isSelected = selections[qIndex] === opt;

              const getVariant = () => {
                if (!showResults) {
                  return isSelected ? "default" : "outline";
                }
                // When showing results
                if (isCorrect) return "default";
                if (isSelected) return "destructive"; // isSelected but not correct
                return "outline";
              };

              return (
                <Button
                  key={oIndex}
                  variant={getVariant()}
                  className="h-auto min-h-[4rem] whitespace-normal text-left justify-start"
                  onClick={() => handleSelect(qIndex, opt)}
                >
                  {showResults && isCorrect && (
                    <Check className="mr-2 flex-shrink-0" />
                  )}
                  {showResults && isSelected && !isCorrect && (
                    <X className="mr-2 flex-shrink-0" />
                  )}
                  {opt}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-center gap-4">
        <Button onClick={onRegenerate} variant="outline" size="lg">
          <Repeat className="mr-2" /> Regenerate
        </Button>
        <Button onClick={checkAnswers} size="lg" disabled={showResults}>
          Check
        </Button>
      </div>
    </div>
  );
};

const FillInBlankGame: FC<{
  questions: FillInTheBlankQuestion[];
  words: CombinedVocabulary[];
  onRegenerate: () => void;
}> = ({ questions, words, onRegenerate }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] =
    useState<GenerateVocabularyFeedbackOutput | null>(null);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [translation, setTranslation] = useState<Record<string, string | null>>(
    {}
  );
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>(
    {}
  );
  const [userGeminiKey, setUserGeminiKey] = useState<string | null>(null);

  const { toast } = useToast();
  const { speechRate } = useSettings();
  const playbackHook = useAudioPlayback({ setWords: () => {}, speechRate });

  useEffect(() => {
    (async () => {
      try {
        const settings = await getUserSettings();
        if (settings?.geminiApiKey) setUserGeminiKey(settings.geminiApiKey);
      } catch (err) {
        console.warn("Failed to load user settings for Gemini key", err);
      }
    })();
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const sentenceParts = useMemo(() => {
    if (!currentQuestion) return ["", ""];
    const parts = currentQuestion.sentence.split(/_{3,}/);
    return [parts[0] || "", parts.slice(1).join("___") || ""];
  }, [currentQuestion]);

  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
    setFeedback(null);
    setTranslation({});
  }, [currentQuestionIndex, questions]);

  const getAIFeedback = async (userAnswer: string) => {
    setIsGettingFeedback(true);
    setFeedback(null);
    setTranslation({});
    const correctWordInfo = words.find(
      (w) => w.term === currentQuestion.correctTerm
    );
    try {
      const result = await generateVocabularyFeedback({
        sentenceWithBlank: currentQuestion.sentence,
        userAnswerTerm: userAnswer,
        correctAnswerTerm: currentQuestion.correctTerm,
        correctAnswerDefinition:
          correctWordInfo?.definition || "No definition available.",
      });
      setFeedback(result);
    } catch (error) {
      console.error("Error getting AI feedback:", error);
      toast({
        variant: "destructive",
        title: "Feedback Error",
        description: "Could not get feedback from AI.",
      });
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleToggleTranslation = async (
    key: "vocab" | "grammar",
    text: string
  ) => {
    if (!text) return;
    if (translation[key]) {
      setTranslation((prev) => ({ ...prev, [key]: null }));
      return;
    }
    setIsTranslating((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await translateText({
        text,
        geminiApiKey: userGeminiKey || undefined,
      });
      setTranslation((prev) => ({ ...prev, [key]: result.translation }));
    } catch (error) {
      toast({ variant: "destructive", title: "Translation Failed" });
    } finally {
      setIsTranslating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSelectOption = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    if (option !== currentQuestion.correctTerm) {
      getAIFeedback(option);
    }
  };

  const goToNextQuestion = () => {
    setSelectedOption(null);
    setShowResult(false);
    setFeedback(null);
    setTranslation({});
    setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
  };

  if (!currentQuestion) {
    return (
      <div className="text-center text-muted-foreground">
        <p>No questions to display.</p>
      </div>
    );
  }

  const isCorrect = selectedOption === currentQuestion.correctTerm;

  return (
    <Card className="max-w-2xl mx-auto">
      <audio ref={playbackHook.audioRef} className="hidden" />
      <CardHeader>
        <CardTitle>Fill in the Blank</CardTitle>
        <CardDescription>
          Complete the sentence by choosing the correct word.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-center text-center text-lg md:text-xl p-4 bg-muted rounded-lg min-h-[6rem]">
          <span>{sentenceParts[0]}</span>
          <div className="inline-block align-middle font-bold text-primary mx-2 px-3 py-1 rounded-md border-2 border-dashed border-primary/50 bg-primary/10">
            {showResult ? currentQuestion.correctTerm : "        "}
          </div>
          <span>{sentenceParts[1]}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => {
            const isTheCorrectOption = option === currentQuestion.correctTerm;
            const isTheSelectedOption = option === selectedOption;

            return (
              <Button
                key={index}
                variant={
                  showResult
                    ? isTheCorrectOption
                      ? "default"
                      : isTheSelectedOption
                      ? "destructive"
                      : "outline"
                    : "outline"
                }
                onClick={() => handleSelectOption(option)}
                disabled={showResult}
                className="h-auto py-3"
              >
                {option}
              </Button>
            );
          })}
        </div>

        {showResult && !isCorrect && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-red-800">
              <Bot /> AI Feedback
            </div>
            {isGettingFeedback ? (
              <div className="flex items-center gap-2 text-red-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your
                answer...
              </div>
            ) : feedback ? (
              <div className="space-y-4">
                {/* Vocabulary Analysis */}
                <div className="p-3 rounded bg-white border border-red-100">
                  <div className="flex justify-between items-start">
                    <h5 className="font-semibold text-red-800 flex items-center gap-2 mb-1">
                      <BookCopy className="h-4 w-4" /> Vocabulary Analysis
                    </h5>
                    <div className="flex items-center -mt-1 -mr-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-800"
                        onClick={() =>
                          playbackHook.playAudio(
                            `feedback-vocab-${currentQuestionIndex}`,
                            feedback.vocabularyAnalysis
                          )
                        }
                        disabled={
                          playbackHook.isLoadingAudio[
                            `feedback-vocab-${currentQuestionIndex}`
                          ]
                        }
                      >
                        {playbackHook.isLoadingAudio[
                          `feedback-vocab-${currentQuestionIndex}`
                        ] ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-800"
                        onClick={() =>
                          handleToggleTranslation(
                            "vocab",
                            feedback.vocabularyAnalysis
                          )
                        }
                        disabled={isTranslating["vocab"]}
                      >
                        {isTranslating["vocab"] ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-red-900">
                    <FormattedFeedbackText
                      text={feedback.vocabularyAnalysis}
                      showChoiceSummary
                    />
                  </div>
                  {translation["vocab"] && (
                    <div className="mt-2 text-sm text-blue-800 bg-blue-50 border-t border-blue-200 pt-2">
                      <strong>Dịch:</strong> {translation["vocab"]}
                    </div>
                  )}
                </div>
                {/* Grammar Analysis */}
                <div className="p-3 rounded bg-white border border-red-100">
                  <div className="flex justify-between items-start">
                    <h5 className="font-semibold text-red-800 flex items-center gap-2 mb-1">
                      <Pilcrow className="h-4 w-4" /> Grammar Analysis
                    </h5>
                    <div className="flex items-center -mt-1 -mr-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-800"
                        onClick={() =>
                          playbackHook.playAudio(
                            `feedback-grammar-${currentQuestionIndex}`,
                            feedback.grammarAnalysis
                          )
                        }
                        disabled={
                          playbackHook.isLoadingAudio[
                            `feedback-grammar-${currentQuestionIndex}`
                          ]
                        }
                      >
                        {playbackHook.isLoadingAudio[
                          `feedback-grammar-${currentQuestionIndex}`
                        ] ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-800"
                        onClick={() =>
                          handleToggleTranslation(
                            "grammar",
                            feedback.grammarAnalysis
                          )
                        }
                        disabled={isTranslating["grammar"]}
                      >
                        {isTranslating["grammar"] ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-red-900">
                    <FormattedFeedbackText text={feedback.grammarAnalysis} />
                  </div>
                  {translation["grammar"] && (
                    <div className="mt-2 text-sm text-blue-800 bg-blue-50 border-t border-blue-200 pt-2">
                      <strong>Dịch:</strong> {translation["grammar"]}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-900 mt-1">
                Could not load feedback.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button
            type="button"
            onClick={goToNextQuestion}
            variant="secondary"
            disabled={!showResult}
          >
            <Repeat className="mr-2" /> Next Question
          </Button>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} / {questions.length}
        </div>
      </CardContent>
    </Card>
  );
};

const PartOfSpeechQuiz: FC<{
  questions: PartOfSpeechQuestion[];
  onRegenerate: () => void;
}> = ({ questions, onRegenerate }) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [roundAnswers, setRoundAnswers] = useState<Record<number, string>>({});

  const q = questions[currentIndex];

  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
  }, [currentIndex, questions]);

  useEffect(() => {
    // reset round tracking when questions change (regenerate)
    setRoundAnswers({});
  }, [questions]);

  if (!q) {
    return (
      <div className="text-center text-muted-foreground">
        <p>No questions to display.</p>
      </div>
    );
  }

  const isCorrect = selectedOption === q.correctPartOfSpeech;

  const handleSelect = (opt: string) => {
    if (showResult) return;
    setSelectedOption(opt);
    setShowResult(true);

    const nextAnswers = { ...roundAnswers, [currentIndex]: opt };
    setRoundAnswers(nextAnswers);

    // Save once per full round (all questions answered).
    if (user?.uid && Object.keys(nextAnswers).length === questions.length) {
      const items = questions.map((qq, idx) => {
        const selected = nextAnswers[idx] ?? null;
        const isCorrectLocal = selected === qq.correctPartOfSpeech;
        return {
          kind: "pos-choice",
          itemKey: `pos-${idx}`,
          skill: "vocabulary",
          isCorrect: isCorrectLocal,
          score: isCorrectLocal ? 1 : 0,
          data: {
            wordId: qq.wordId,
            term: qq.term,
            options: qq.options,
            selected,
            correct: qq.correctPartOfSpeech,
          },
        };
      });

      const correct = items.reduce(
        (acc: number, it: any) => (it.isCorrect ? acc + 1 : acc),
        0
      );
      const total = items.length;
      const percentage = total > 0 ? (correct / total) * 100 : 0;

      addTestResult(user.uid, {
        testType: "Practice",
        correctAnswers: correct,
        totalQuestions: total,
        percentage,
        skill: "vocabulary",
        data: {
          kind: "part-of-speech-quiz",
          items,
        },
      }).catch(() => {
        // ignore persistence failures
      });

      // start a new round of tracking
      setRoundAnswers({});
    }
  };

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Part of Speech Quiz</CardTitle>
        <CardDescription>
          Choose the correct part of speech for the word.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center text-center p-4 bg-muted rounded-lg">
          <div className="text-3xl font-bold text-primary">{q.term}</div>
          {q.hint?.synonyms?.length ? (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Synonyms:</span>{" "}
              {q.hint.synonyms.join(", ")}
            </div>
          ) : null}
          {q.hint?.definition ? (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Definition:</span>{" "}
              {q.hint.definition}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {q.options.map((opt) => {
            const isTheCorrect = opt === q.correctPartOfSpeech;
            const isSelected = opt === selectedOption;

            const variant = showResult
              ? isTheCorrect
                ? "default"
                : isSelected
                ? "destructive"
                : "outline"
              : "outline";

            return (
              <Button
                key={opt}
                variant={variant}
                onClick={() => handleSelect(opt)}
                disabled={showResult}
                className="h-auto py-3"
              >
                {showResult && isTheCorrect && (
                  <Check className="mr-2 flex-shrink-0" />
                )}
                {showResult && isSelected && !isTheCorrect && (
                  <X className="mr-2 flex-shrink-0" />
                )}
                {opt}
              </Button>
            );
          })}
        </div>

        {showResult ? (
          <div
            className={cn(
              "p-3 rounded-md border",
              isCorrect
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            )}
          >
            <div className="font-semibold">
              {isCorrect ? "Correct" : "Incorrect"} — {q.term} is a{" "}
              <span className="font-semibold">{q.correctPartOfSpeech}</span>.
            </div>
            {q.hint?.sentence ? (
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Example:</span> {q.hint.sentence}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-center gap-4">
          <Button onClick={onRegenerate} variant="outline" size="lg">
            <Repeat className="mr-2" /> Regenerate
          </Button>
          <Button
            type="button"
            onClick={next}
            variant="secondary"
            disabled={!showResult}
            size="lg"
          >
            <Repeat className="mr-2" /> Next
          </Button>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Question {currentIndex + 1} / {questions.length}
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingState: FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-1/3 mx-auto" />
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const ReviewView: FC<ReviewViewProps> = ({ words, initialTab }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [matchingQuestions, setMatchingQuestions] = useState<
    MatchingQuestion[]
  >([]);
  const [fillInTheBlankQuestions, setFillInTheBlankQuestions] = useState<
    FillInTheBlankQuestion[]
  >([]);
  const [partOfSpeechQuestions, setPartOfSpeechQuestions] = useState<
    PartOfSpeechQuestion[]
  >([]);
  const { toast } = useToast();

  const fetchExercises = async () => {
    if (words.length < 4) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Local generation (no AI tokens)
    setPartOfSpeechQuestions(buildPartOfSpeechQuestions(words));

    try {
      const plainWords = words.map((word) => ({
        term: word.term,
        definition: word.definition,
        sentence: word.sentence,
      }));
      const result = await generateReviewExercises({ words: plainWords });
      // Shuffle options for matching questions
      const shuffledMatching = result.matchingQuestions.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
      setMatchingQuestions(shuffledMatching);

      const shuffledFillIn = result.fillInTheBlankQuestions.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
      setFillInTheBlankQuestions(shuffleArray(shuffledFillIn));
    } catch (error) {
      console.error("Failed to generate exercises:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate review exercises. Please try again.",
      });
      // Keep part-of-speech questions available even if AI generation fails.
      setMatchingQuestions([]);
      setFillInTheBlankQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (words.length < 4) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">
              Not Enough Words to Review
            </h3>
            <p className="text-muted-foreground">
              Please go to "My Vocabulary" and mark at least 4 words as
              "favorite" to start.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const safeInitialTab: "matching" | "fill-in-the-blank" | "part-of-speech" =
    initialTab === "part-of-speech" && partOfSpeechQuestions.length === 0
      ? "matching"
      : initialTab === "fill-in-the-blank" &&
        fillInTheBlankQuestions.length === 0
      ? "matching"
      : initialTab === "matching" && matchingQuestions.length === 0
      ? "fill-in-the-blank"
      : initialTab || "matching";

  return (
    <Tabs defaultValue={safeInitialTab} className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger
            value="matching"
            disabled={matchingQuestions.length === 0}
          >
            Matching
          </TabsTrigger>
          <TabsTrigger
            value="fill-in-the-blank"
            disabled={fillInTheBlankQuestions.length === 0}
          >
            Fill-in-the-blank
          </TabsTrigger>
          <TabsTrigger
            value="part-of-speech"
            disabled={partOfSpeechQuestions.length === 0}
          >
            Part of speech
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center text-sm mt-4 sm:mt-0 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
          <Lightbulb className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>
            Only your favorited words are used in these review exercises.
          </span>
        </div>
      </div>

      <TabsContent value="matching" className="pt-6">
        {matchingQuestions.length > 0 ? (
          <MatchingGame
            questions={matchingQuestions}
            onRegenerate={fetchExercises}
          />
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <p>
              Could not generate matching exercises with the selected words.
            </p>
          </div>
        )}
      </TabsContent>
      <TabsContent value="fill-in-the-blank" className="pt-6">
        {fillInTheBlankQuestions.length > 0 ? (
          <FillInBlankGame
            questions={fillInTheBlankQuestions}
            words={words}
            onRegenerate={fetchExercises}
          />
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <p>
              Could not generate fill-in-the-blank exercises with the selected
              words.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="part-of-speech" className="pt-6">
        {partOfSpeechQuestions.length > 0 ? (
          <PartOfSpeechQuiz
            questions={partOfSpeechQuestions}
            onRegenerate={fetchExercises}
          />
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <p>Could not generate part-of-speech questions.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default ReviewView;
