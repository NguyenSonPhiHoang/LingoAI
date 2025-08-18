
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
                      ? "default"
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
  onRegenerate: () => void;
}> = ({ questions, onRegenerate }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const sentenceParts = useMemo(() => {
    if (!currentQuestion) return ["", ""];
    const parts = currentQuestion.sentence.split(/_{3,}/);
    return [parts[0] || "", parts.slice(1).join("___") || ""];
  }, [currentQuestion]);
  
  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
  }, [currentQuestionIndex, questions]);

  const handleSelectOption = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
  };
  
  const goToNextQuestion = () => {
    setSelectedOption(null);
    setShowResult(false);
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
                )
            })}
        </div>

        {showResult && (
          <div
            className={`p-3 rounded-md text-center ${
              isCorrect
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isCorrect ? "Correct!" : "Not quite! Try the next one."}
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
      const plainWords = words.map(word => ({
        term: word.term,
        definition: word.definition,
        sentence: word.sentence,
      }));
      const result = await generateReviewExercises({ words: plainWords });
      // Shuffle options for matching questions
      const shuffledMatching = result.matchingQuestions.map(q => ({
        ...q,
        options: shuffleArray(q.options)
      }));
      setMatchingQuestions(shuffledMatching);
      
      const shuffledFillIn = result.fillInTheBlankQuestions.map(q => ({
        ...q,
        options: shuffleArray(q.options)
      }));
      setFillInTheBlankQuestions(shuffleArray(shuffledFillIn));

    } catch (error) {
      console.error("Failed to generate exercises:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate review exercises. Please try again.",
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
          <CardTitle>Vocabulary Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">Not Enough Words to Review</h3>
            <p className="text-muted-foreground">
              Please go to "My Vocabulary" and mark at least 4 words as "favorite" to start.
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
          <TabsTrigger value="matching" disabled={matchingQuestions.length === 0}>Matching</TabsTrigger>
          <TabsTrigger value="fill-in-the-blank" disabled={fillInTheBlankQuestions.length === 0}>Fill-in-the-blank</TabsTrigger>
        </TabsList>
        <div className="flex items-center text-sm mt-4 sm:mt-0 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
          <Lightbulb className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>Only your favorited words are used in these review exercises.</span>
        </div>
      </div>

      <TabsContent value="matching" className="pt-6">
        {matchingQuestions.length > 0 ? (
            <MatchingGame questions={matchingQuestions} onRegenerate={fetchExercises} />
        ) : (
             <div className="text-center text-muted-foreground p-8">
                <p>Could not generate matching exercises with the selected words.</p>
             </div>
        )}
      </TabsContent>
      <TabsContent value="fill-in-the-blank" className="pt-6">
         {fillInTheBlankQuestions.length > 0 ? (
            <FillInBlankGame questions={fillInTheBlankQuestions} onRegenerate={fetchExercises} />
         ) : (
            <div className="text-center text-muted-foreground p-8">
                <p>Could not generate fill-in-the-blank exercises with the selected words.</p>
             </div>
         )}
      </TabsContent>
    </Tabs>
  );
};

export default ReviewView;

    
