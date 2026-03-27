"use client";

import { useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { Loader2, ArrowRight, BookCheck, Timer } from "lucide-react";
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
import { generatePlacementTest } from "@/ai/flows/generate-placement-test";
import type { PlacementTestQuestion, UserLevel } from "@/ai/flows/schemas";
import type { ViewState } from "@/app/page";
import { useAuth } from "@/context/auth-context";
import { addTestResult } from "@/services/test-results";
import { useToast } from "@/hooks/use-toast";

const levelMapping: Record<string, { label: string; value: UserLevel }> = {
  a1: { label: "Level 1 (A1 – Beginner)", value: "beginner" },
  a2: { label: "Level 2 (A2 – Elementary)", value: "beginner" },
  b1: { label: "Level 3 (B1 – Intermediate)", value: "intermediate" },
  b2: { label: "Level 4 (B2 – Upper Intermediate)", value: "intermediate" },
  c1: { label: "Level 5 (C1 – Advanced)", value: "advanced" },
  c2: { label: "Level 6 (C2 – Proficiency)", value: "advanced" },
};

interface PlacementTestProps {
  setActiveViewState: Dispatch<SetStateAction<ViewState>>;
}

type TestState = "selection" | "running" | "finished";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const PlacementTest: FC<PlacementTestProps> = ({ setActiveViewState }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testState, setTestState] = useState<TestState>("selection");
  const [questions, setQuestions] = useState<PlacementTestQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0 });
  const [recommendedLevel, setRecommendedLevel] =
    useState<UserLevel>("beginner");
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);

  useEffect(() => {
    if (testState !== "running" || timeLeft <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [testState, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && testState === "running") {
      toast({
        title: "Time's up!",
        description: "Your test has been automatically submitted.",
      });
      finishTest();
    }
  }, [timeLeft, testState]);

  const startTest = async (numberOfQuestions: number) => {
    setIsLoading(true);
    setTestState("running");
    const duration = numberOfQuestions * 45; // 45 seconds per question
    setInitialDuration(duration);
    setTimeLeft(duration);
    try {
      const result = await generatePlacementTest({ numberOfQuestions });
      const shuffledQuestions = result.questions.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
      setQuestions(shuffledQuestions);
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error) {
      console.error("Failed to generate placement test:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start the test. Please try again.",
      });
      setTestState("selection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    if (!user) return;

    let beginnerCorrect = 0,
      intermediateCorrect = 0,
      advancedCorrect = 0;
    let beginnerTotal = 0,
      intermediateTotal = 0,
      advancedTotal = 0;

    questions.forEach((q, index) => {
      if (q.level === "beginner") beginnerTotal++;
      if (q.level === "intermediate") intermediateTotal++;
      if (q.level === "advanced") advancedTotal++;

      if (answers[index] === q.correctOption) {
        if (q.level === "beginner") beginnerCorrect++;
        if (q.level === "intermediate") intermediateCorrect++;
        if (q.level === "advanced") advancedCorrect++;
      }
    });

    const totalCorrect =
      beginnerCorrect + intermediateCorrect + advancedCorrect;
    setFinalScore({ correct: totalCorrect, total: questions.length });

    let recLevel: UserLevel = "beginner";

    if (advancedTotal > 0 && advancedCorrect / advancedTotal >= 0.8) {
      recLevel = "advanced";
    } else if (advancedTotal > 0 && advancedCorrect / advancedTotal >= 0.5) {
      recLevel = "advanced";
    } else if (
      intermediateTotal > 0 &&
      intermediateCorrect / intermediateTotal >= 0.8
    ) {
      recLevel = "intermediate";
    } else if (
      intermediateTotal > 0 &&
      intermediateCorrect / intermediateTotal >= 0.5
    ) {
      recLevel = "intermediate";
    } else if (beginnerTotal > 0 && beginnerCorrect / beginnerTotal >= 0.7) {
      recLevel = "beginner";
    }
    setRecommendedLevel(recLevel);
    const durationTaken = initialDuration - timeLeft;

    const items = questions.map((q, index) => {
      const selectedOption = answers[index] ?? null;
      const isCorrect = selectedOption === q.correctOption;
      return {
        kind: "placement-question",
        itemKey: `q-${index}`,
        skill: "reading",
        isCorrect,
        score: isCorrect ? 1 : 0,
        data: {
          question: q.question,
          options: q.options,
          correctOption: q.correctOption,
          selectedOption,
          level: q.level,
        },
      };
    });

    try {
      await addTestResult(user.uid, {
        correctAnswers: totalCorrect,
        totalQuestions: questions.length,
        percentage: (totalCorrect / questions.length) * 100,
        recommendedLevel: recLevel,
        testType: "Placement Test",
        durationSeconds: durationTaken,
        data: {
          kind: "placement-test",
          items,
          breakdown: {
            beginner: { correct: beginnerCorrect, total: beginnerTotal },
            intermediate: {
              correct: intermediateCorrect,
              total: intermediateTotal,
            },
            advanced: { correct: advancedCorrect, total: advancedTotal },
          },
        },
      });
      toast({
        title: "Success",
        description: "Your test result has been saved.",
      });
    } catch (error) {
      console.error("Failed to save test result:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Could not save your test result.",
      });
    }

    setTestState("finished");
  };

  const renderSelectionScreen = () => (
    <Card className="w-full max-w-2xl text-center">
      <CardHeader>
        <CardTitle>Placement Test</CardTitle>
        <CardDescription>
          Choose the number of questions to start the test and determine your
          English level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[10, 20, 30, 40, 50, 60].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              onClick={() => startTest(num)}
            >
              {num} Questions
            </Button>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          onClick={() => setActiveViewState({ view: "overview" })}
        >
          Go Back
        </Button>
      </CardFooter>
    </Card>
  );

  const renderTestScreen = () => {
    if (isLoading) {
      return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    }
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>English Placement Test</CardTitle>
              <CardDescription>
                Answer the questions to the best of your ability.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 font-mono text-lg font-semibold text-primary p-2 bg-primary/10 rounded-md">
              <Timer className="h-6 w-6" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <Progress value={progress} />
          </div>
          <div className="font-semibold text-lg">
            {currentQuestion.question}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                variant={
                  answers[currentQuestionIndex] === option
                    ? "default"
                    : "outline"
                }
                className="h-auto justify-start text-left py-2.5"
                onClick={() => handleAnswerSelect(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestionIndex]}
          >
            {currentQuestionIndex < questions.length - 1
              ? "Next"
              : "Finish Test"}
            <ArrowRight className="ml-2" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderResultsScreen = () => {
    const scorePercentage = (finalScore.correct / finalScore.total) * 100;
    const levelLabel =
      Object.values(levelMapping).find((l) => l.value === recommendedLevel)
        ?.label || "Beginner";

    return (
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle>Test Complete!</CardTitle>
          <CardDescription>Here are your results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 bg-primary/10 rounded-lg">
            <div className="text-muted-foreground">Your Recommended Level</div>
            <div className="text-4xl font-bold text-primary capitalize">
              {levelLabel}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="font-semibold">Score</div>
              <div>
                {finalScore.correct} / {finalScore.total}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="font-semibold">Percentage</div>
              <div>{scorePercentage.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full"
            onClick={() =>
              setActiveViewState({ view: "ai-suggester", recommendedLevel })
            }
          >
            Go to AI Suggester
            <ArrowRight className="ml-2" />
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setTestState("selection")}
          >
            Take Another Test
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {testState === "selection" && renderSelectionScreen()}
      {testState === "running" && renderTestScreen()}
      {testState === "finished" && renderResultsScreen()}
    </div>
  );
};

export default PlacementTest;
