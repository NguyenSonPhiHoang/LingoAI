"use client";

import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import { AlertTriangle, Lightbulb, Repeat, Loader2 } from "lucide-react";
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
import type { Word } from "./vocabulary-list";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateReviewExercises,
} from "@/ai/flows/generate-review-flow";
import type {
  MatchingQuestion,
  FillInTheBlankQuestion,
} from "@/ai/flows/schemas";
import { useToast } from "@/hooks/use-toast";

interface ReviewViewProps {
  words: Word[];
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
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
              return (
                <Button
                  key={oIndex}
                  variant={
                    showResults
                      ? isCorrect
                        ? "default"
                        : isSelected
                        ? "destructive"
                        : "outline"
                      : isSelected
                      ? "secondary"
                      : "outline"
                  }
                  className="h-auto min-h-[4rem] whitespace-normal text-left"
                  onClick={() => handleSelect(qIndex, opt)}
                >
                  {opt}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-center gap-4">
        <Button onClick={onRegenerate} variant="outline" size="lg">
          <Repeat className="mr-2" /> Tạo lại
        </Button>
        <Button onClick={checkAnswers} size="lg" disabled={showResults}>
          Kiểm tra
        </Button>
      </div>
    </div>
  );
};

const FillInBlankGame: FC<{
  questions: FillInTheBlankQuestion[];
  onRegenerate: () => void;
}> = ({ questions, onRegenerate }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const sentenceParts = useMemo(() => {
    if (!currentQuestion) return ["", ""];
    // This regex is safer and handles cases with multiple blanks
    const parts = currentQuestion.sentence.split(/_{3,}/);
    return [parts[0] || "", parts.slice(1).join("___") || ""];
  }, [currentQuestion]);
  
  useEffect(() => {
    setInputValue("");
    setIsCorrect(null);
  }, [currentQuestionIndex, questions]);


  const goToNextQuestion = () => {
    setIsCorrect(null);
    setInputValue("");
    setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
  };
  
  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion) return;
    const correct =
      inputValue.trim().toLowerCase() ===
      currentQuestion.correctTerm.toLowerCase();
    setIsCorrect(correct);
  };

  if (!currentQuestion) {
    return (
       <div className="text-center text-muted-foreground">
          <p>Không có câu hỏi nào để hiển thị.</p>
       </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Điền vào chỗ trống</CardTitle>
        <CardDescription>
          Hoàn thành câu bằng cách điền từ đúng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCheck} className="space-y-6">
          <div className="flex flex-wrap items-center justify-center text-center text-lg md:text-xl p-4 bg-muted rounded-lg min-h-[6rem]">
            <span>{sentenceParts[0]}</span>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={cn(
                "w-36 text-center text-lg md:text-xl font-bold mx-2",
                isCorrect === true && "border-green-500 ring-green-500",
                isCorrect === false && "border-destructive ring-destructive"
              )}
              style={{ width: `${currentQuestion.correctTerm.length + 4}ch` }}
              disabled={isCorrect !== null}
            />
            <span>{sentenceParts[1]}</span>
          </div>

          {isCorrect !== null && (
            <div
              className={`p-3 rounded-md text-center ${
                isCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isCorrect
                ? "Chính xác!"
                : `Sai rồi! Đáp án đúng là "${currentQuestion.correctTerm}".`}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button type="submit" disabled={isCorrect !== null}>
              Kiểm tra
            </Button>
            <Button
              type="button"
              onClick={goToNextQuestion}
              variant="secondary"
            >
              <Repeat className="mr-2" /> Câu tiếp theo
            </Button>
          </div>
            <div className="text-center text-sm text-muted-foreground">
                Câu hỏi {currentQuestionIndex + 1} / {questions.length}
            </div>
        </form>
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

const ReviewView: FC<ReviewViewProps> = ({ words }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [matchingQuestions, setMatchingQuestions] = useState<MatchingQuestion[]>([]);
  const [fillInTheBlankQuestions, setFillInTheBlankQuestions] = useState<FillInTheBlankQuestion[]>([]);
  const { toast } = useToast();

  const fetchExercises = async () => {
    if (words.length < 4) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateReviewExercises({ words });
      // Shuffle options for matching questions
      const shuffledMatching = result.matchingQuestions.map(q => ({
        ...q,
        options: shuffleArray(q.options)
      }));
      setMatchingQuestions(shuffledMatching);
      setFillInTheBlankQuestions(shuffleArray(result.fillInTheBlankQuestions));
    } catch (error) {
      console.error("Failed to generate exercises:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tạo bài ôn tập. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [words]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (words.length < 4) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ôn tập từ vựng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">Chưa có đủ từ để ôn tập</h3>
            <p className="text-muted-foreground">
              Vui lòng vào trang "Từ vựng của tôi" và đánh dấu ít nhất 4 từ là "yêu thích" để bắt đầu.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="matching" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="matching" disabled={matchingQuestions.length === 0}>Nối từ</TabsTrigger>
          <TabsTrigger value="fill-in-the-blank" disabled={fillInTheBlankQuestions.length === 0}>Điền từ</TabsTrigger>
        </TabsList>
        <div className="flex items-center text-sm mt-4 sm:mt-0 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
          <Lightbulb className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>Chỉ những từ được yêu thích mới được sử dụng trong các bài ôn tập này.</span>
        </div>
      </div>

      <TabsContent value="matching" className="pt-6">
        {matchingQuestions.length > 0 ? (
            <MatchingGame questions={matchingQuestions} onRegenerate={fetchExercises} />
        ) : (
             <div className="text-center text-muted-foreground p-8">
                <p>Không thể tạo bài tập nối từ với các từ đã chọn.</p>
             </div>
        )}
      </TabsContent>
      <TabsContent value="fill-in-the-blank" className="pt-6">
         {fillInTheBlankQuestions.length > 0 ? (
            <FillInBlankGame questions={fillInTheBlankQuestions} onRegenerate={fetchExercises} />
         ) : (
            <div className="text-center text-muted-foreground p-8">
                <p>Không thể tạo bài tập điền từ với các từ đã chọn.</p>
             </div>
         )}
      </TabsContent>
    </Tabs>
  );
};

export default ReviewView;
