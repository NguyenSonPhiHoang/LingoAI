"use client";

import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import { AlertTriangle, Lightbulb, Repeat } from "lucide-react";
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

interface ReviewViewProps {
  words: Word[];
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

const MatchingGame: FC<{ words: Word[] }> = ({ words }) => {
  const [questions, setQuestions] = useState<
    { word: Word; options: string[]; selected: string | null }[]
  >([]);
  const [showResults, setShowResults] = useState(false);

  const generateQuestions = () => {
    setShowResults(false);
    const gameWords = shuffleArray(words).slice(0, 5);
    const newQuestions = gameWords.map((word) => {
      const otherDefs = shuffleArray(
        words.filter((w) => w.id !== word.id)
      )
        .slice(0, 3)
        .map((w) => w.definition);
      const options = shuffleArray([word.definition, ...otherDefs]);
      return { word, options, selected: null };
    });
    setQuestions(newQuestions);
  };

  useEffect(() => {
    if (words.length >= 4) {
      generateQuestions();
    }
  }, [words]);

  const handleSelect = (qIndex: number, option: string) => {
    if (showResults) return;
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, selected: option } : q))
    );
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  if (words.length < 4) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Bạn cần ít nhất 4 từ yêu thích để bắt đầu bài tập nối từ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => (
        <div key={q.word.id} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="flex items-center justify-center p-6">
            <h3 className="text-2xl font-bold">{q.word.term}</h3>
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {q.options.map((opt, oIndex) => {
              const isCorrect = q.word.definition === opt;
              const isSelected = q.selected === opt;
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
        <Button onClick={generateQuestions} variant="outline" size="lg">
          <Repeat className="mr-2" /> Chơi lại
        </Button>
        <Button onClick={checkAnswers} size="lg" disabled={showResults}>
          Kiểm tra
        </Button>
      </div>
    </div>
  );
};

const FillInBlankGame: FC<{ words: Word[] }> = ({ words }) => {
    const [question, setQuestion] = useState<{ word: Word; sentenceParts: string[] } | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const generateQuestion = () => {
        setIsCorrect(null);
        setInputValue("");
        const availableWords = words.filter(w => w.sentence && w.sentence.toLowerCase().includes(w.term.toLowerCase()));
        if (availableWords.length === 0) {
            setQuestion(null);
            return;
        }
        const word = shuffleArray(availableWords)[0];
        const sentenceParts = word.sentence.split(new RegExp(`\\b${word.term}\\b`, 'i'));
        setQuestion({ word, sentenceParts });
    }

    useEffect(() => {
        generateQuestion();
    }, [words]);

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question) return;
        const correct = inputValue.trim().toLowerCase() === question.word.term.toLowerCase();
        setIsCorrect(correct);
    }
    
    if (words.filter(w => w.sentence && w.sentence.toLowerCase().includes(w.term.toLowerCase())).length === 0) {
        return (
            <div className="text-center text-muted-foreground">
                <p>Bạn không có từ yêu thích nào có câu ví dụ phù hợp để chơi trò này.</p>
            </div>
        );
    }

    if (!question) {
        return null; // Should be handled by the check above
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Điền vào chỗ trống</CardTitle>
                <CardDescription>Hoàn thành câu bằng cách điền từ đúng.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCheck} className="space-y-6">
                    <div className="flex items-center justify-center text-center text-lg md:text-xl p-4 bg-muted rounded-lg min-h-[6rem]">
                        <span>{question.sentenceParts[0]}</span>
                        <Input 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className={cn(
                                "w-36 text-center text-lg md:text-xl font-bold mx-2",
                                isCorrect === true && "border-green-500 ring-green-500",
                                isCorrect === false && "border-destructive ring-destructive",
                            )}
                            style={{ width: `${question.word.term.length + 4}ch`}}
                            disabled={isCorrect !== null}
                        />
                        <span>{question.sentenceParts.slice(1).join(question.word.term)}</span>
                    </div>

                    {isCorrect !== null && (
                         <div className={`p-3 rounded-md text-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                           {isCorrect ? "Chính xác!" : `Sai rồi! Đáp án đúng là "${question.word.term}".`}
                         </div>
                    )}

                    <div className="flex justify-center gap-4">
                        <Button type="submit" disabled={isCorrect !== null}>Kiểm tra</Button>
                        <Button type="button" onClick={generateQuestion} variant="secondary">
                            <Repeat className="mr-2" /> Câu tiếp theo
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};


const ReviewView: FC<ReviewViewProps> = ({ words }) => {
  if (words.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ôn tập từ vựng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">Chưa có từ để ôn tập</h3>
            <p className="text-muted-foreground">
              Vui lòng vào trang "Từ vựng của tôi" và đánh dấu một vài từ là "yêu thích" để bắt đầu.
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
              <TabsTrigger value="matching">Nối từ</TabsTrigger>
              <TabsTrigger value="fill-in-the-blank">Điền từ</TabsTrigger>
          </TabsList>
          <div className="flex items-center text-sm mt-4 sm:mt-0 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
              <Lightbulb className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Chỉ những từ được yêu thích mới được sử dụng trong các bài ôn tập này.</span>
          </div>
      </div>

      <TabsContent value="matching" className="pt-6">
        <MatchingGame words={words} />
      </TabsContent>
      <TabsContent value="fill-in-the-blank" className="pt-6">
        <FillInBlankGame words={words} />
      </TabsContent>
    </Tabs>
  );
};

export default ReviewView;
