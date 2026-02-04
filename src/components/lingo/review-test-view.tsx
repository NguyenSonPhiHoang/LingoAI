"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import { Loader2, ArrowLeft, Check, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  type GenerateReviewTestOutput,
  type ReadingComprehensionQuestion,
  type FillInTheBlankQuestion,
} from "@/ai/flows/schemas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { addTestResult } from "@/services/test-results";
import { useToast } from "@/hooks/use-toast";

interface ReviewTestViewProps {
  test: GenerateReviewTestOutput;
  onBack: () => void;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const ReviewTestView: FC<ReviewTestViewProps> = ({ test, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const allQuestions = [
    ...test.vocabularyQuestions.map((q) => ({ ...q, type: "vocab" })),
    ...test.readingQuestions.map((q) => ({ ...q, type: "reading" })),
  ];

  const [timeLeft, setTimeLeft] = useState(allQuestions.length * 45); // 45 seconds per question
  const [initialDuration, setInitialDuration] = useState(
    allQuestions.length * 45
  );

  useEffect(() => {
    if (showResults || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [showResults, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !showResults) {
      toast({
        title: "Time's up!",
        description: "Your review test has been automatically submitted.",
      });
      handleFinishTest();
    }
  }, [timeLeft, showResults]);

  const handleSelectAnswer = (qKey: string, option: string) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qKey]: option }));
  };

  const totalCorrect = allQuestions.reduce((acc, q, index) => {
    const qKey = `q-${index}`;
    const correctOption = "correctTerm" in q ? q.correctTerm : q.correctOption;
    if (answers[qKey] === correctOption) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const scorePercentage =
    allQuestions.length > 0 ? (totalCorrect / allQuestions.length) * 100 : 0;

  const handleFinishTest = async () => {
    setShowResults(true);
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save results.",
      });
      return;
    }

    const durationTaken = initialDuration - timeLeft;

    const items = allQuestions.map((q, index) => {
      const qKey = `q-${index}`;
      const correctOption =
        "correctTerm" in q ? q.correctTerm : q.correctOption;
      const selectedOption = answers[qKey] ?? null;
      const isCorrect = selectedOption === correctOption;
      const questionText = "sentence" in q ? q.sentence : q.question;
      return {
        kind:
          q.type === "vocab"
            ? "review-vocab-question"
            : "review-reading-question",
        itemKey: qKey,
        skill: q.type === "reading" ? "reading" : "vocabulary",
        isCorrect,
        score: isCorrect ? 1 : 0,
        data: {
          questionText,
          options: q.options,
          correctOption,
          selectedOption,
          type: q.type,
        },
      };
    });

    try {
      await addTestResult(user.uid, {
        correctAnswers: totalCorrect,
        totalQuestions: allQuestions.length,
        percentage: scorePercentage,
        testType: "Review Test",
        skill: "reading",
        durationSeconds: durationTaken,
        data: {
          kind: "review-test",
          items,
        },
      });
      toast({
        title: "Success",
        description: "Your review test result has been saved.",
      });
    } catch (error) {
      console.error("Failed to save review test result:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Could not save your test result.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="-ml-4">
        <ArrowLeft className="mr-2" /> Back to My Lessons
      </Button>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Review Test</CardTitle>
              <CardDescription>
                Check your understanding of the material from your completed
                lessons.
              </CardDescription>
            </div>
            {!showResults && (
              <div className="flex items-center gap-2 font-mono text-lg font-semibold text-primary p-2 bg-primary/10 rounded-md">
                <Timer className="h-6 w-6" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {allQuestions.map((q, index) => {
            const qKey = `q-${index}`;
            const questionText =
              "sentence" in q ? q.sentence.replace("___", "_____") : q.question;
            const options = q.options;
            const correctOption =
              "correctTerm" in q ? q.correctTerm : q.correctOption;
            const selectedAnswer = answers[qKey];

            return (
              <div
                key={qKey}
                className={cn(
                  "p-4 border rounded-lg",
                  showResults &&
                    (selectedAnswer !== correctOption
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200")
                )}
              >
                <p className="font-semibold mb-3">
                  {index + 1}. {questionText}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {options.map((opt, optIndex) => {
                    const isCorrect = opt === correctOption;
                    const isSelected = opt === selectedAnswer;

                    const getVariant = () => {
                      if (!showResults)
                        return isSelected ? "default" : "outline";
                      if (isCorrect) return "default";
                      if (isSelected) return "destructive";
                      return "outline";
                    };

                    return (
                      <Button
                        key={optIndex}
                        variant={getVariant()}
                        className="h-auto justify-start text-left py-2"
                        onClick={() => handleSelectAnswer(qKey, opt)}
                        disabled={showResults}
                      >
                        {showResults && isCorrect && <Check className="mr-2" />}
                        {showResults && isSelected && !isCorrect && (
                          <X className="mr-2" />
                        )}
                        {opt}
                      </Button>
                    );
                  })}
                </div>
                {showResults && selectedAnswer !== correctOption && (
                  <div className="mt-3 text-sm font-medium text-green-800">
                    Correct answer: {correctOption}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex-col gap-4 items-center">
          {!showResults ? (
            <Button
              onClick={handleFinishTest}
              disabled={Object.keys(answers).length !== allQuestions.length}
            >
              Finish & See Results
            </Button>
          ) : (
            <div className="w-full max-w-md text-center space-y-4">
              <h3 className="text-2xl font-bold">Test Complete!</h3>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-lg">Your Score</div>
                <div className="text-4xl font-bold text-primary">
                  {scorePercentage.toFixed(0)}%
                </div>
                <div className="text-muted-foreground">
                  ({totalCorrect} / {allQuestions.length} correct)
                </div>
              </div>
              <Button onClick={onBack}>Return to Lessons</Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReviewTestView;
