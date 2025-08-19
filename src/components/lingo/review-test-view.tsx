
"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import { Loader2, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  type GenerateReviewTestOutput,
  type ReadingComprehensionQuestion,
  type FillInTheBlankQuestion,
} from "@/ai/flows/schemas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";


interface ReviewTestViewProps {
  test: GenerateReviewTestOutput;
  onBack: () => void;
}

const ReviewTestView: FC<ReviewTestViewProps> = ({ test, onBack }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const allQuestions = [
      ...test.vocabularyQuestions.map(q => ({ ...q, type: 'vocab' })),
      ...test.readingQuestions.map(q => ({ ...q, type: 'reading' }))
  ];

  const handleSelectAnswer = (qKey: string, option: string) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qKey]: option }));
  };

  const handleFinishTest = () => {
    setShowResults(true);
  };
  
  const totalCorrect = allQuestions.reduce((acc, q, index) => {
      const qKey = `q-${index}`;
      const correctOption = 'correctTerm' in q ? q.correctTerm : q.correctOption;
      if (answers[qKey] === correctOption) {
          return acc + 1;
      }
      return acc;
  }, 0);

  const scorePercentage = (totalCorrect / allQuestions.length) * 100;


  return (
    <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="-ml-4">
          <ArrowLeft className="mr-2" /> Back to My Lessons
        </Button>
        <Card>
             <CardHeader>
                <CardTitle>Review Test</CardTitle>
                <CardDescription>Check your understanding of the material from your completed lessons.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-8">
                {allQuestions.map((q, index) => {
                    const qKey = `q-${index}`;
                    const questionText = 'sentence' in q ? q.sentence.replace('___', '_____') : q.question;
                    const options = q.options;
                    const correctOption = 'correctTerm' in q ? q.correctTerm : q.correctOption;
                    const selectedAnswer = answers[qKey];
                    
                    return (
                        <div key={qKey} className={cn("p-4 border rounded-lg", showResults && (selectedAnswer !== correctOption ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"))}>
                            <p className="font-semibold mb-3">{index + 1}. {questionText}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {options.map((opt, optIndex) => {
                                    const isCorrect = opt === correctOption;
                                    const isSelected = opt === selectedAnswer;

                                    const getVariant = () => {
                                        if (!showResults) return isSelected ? "default" : "outline";
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
                                            {showResults && isSelected && !isCorrect && <X className="mr-2" />}
                                            {opt}
                                        </Button>
                                    )
                                })}
                            </div>
                            {showResults && selectedAnswer !== correctOption && (
                                <div className="mt-3 text-sm font-medium text-green-800">
                                    Correct answer: {correctOption}
                                </div>
                            )}
                        </div>
                    )
                })}
             </CardContent>
             <CardFooter className="flex-col gap-4 items-center">
                 {!showResults ? (
                    <Button onClick={handleFinishTest} disabled={Object.keys(answers).length !== allQuestions.length}>
                        Finish & See Results
                    </Button>
                 ) : (
                    <div className="w-full max-w-md text-center space-y-4">
                        <h3 className="text-2xl font-bold">Test Complete!</h3>
                        <div className="p-4 bg-muted rounded-lg">
                             <div className="text-lg">Your Score</div>
                             <div className="text-4xl font-bold text-primary">{scorePercentage.toFixed(0)}%</div>
                             <div className="text-muted-foreground">({totalCorrect} / {allQuestions.length} correct)</div>
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
