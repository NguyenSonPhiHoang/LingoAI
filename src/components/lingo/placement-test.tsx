
"use client";

import { useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
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
import { generatePlacementTest } from "@/ai/flows/generate-placement-test";
import type { PlacementTestQuestion, UserLevel } from "@/ai/flows/schemas";
import type { ViewState } from "@/app/page";
import { cn } from "@/lib/utils";


const levelMapping: Record<string, { label: string, value: UserLevel }> = {
    'a1': { label: 'Level 1 (A1 – Beginner)', value: 'beginner' },
    'a2': { label: 'Level 2 (A2 – Elementary)', value: 'beginner' },
    'b1': { label: 'Level 3 (B1 – Intermediate)', value: 'intermediate' },
    'b2': { label: 'Level 4 (B2 – Upper Intermediate)', value: 'intermediate' },
    'c1': { label: 'Level 5 (C1 – Advanced)', value: 'advanced' },
    'c2': { label: 'Level 6 (C2 – Proficiency)', value: 'advanced' },
};

const getLevelScore = (level: UserLevel) => {
    switch (level) {
        case 'beginner': return 1;
        case 'intermediate': return 2;
        case 'advanced': return 3;
        default: return 0;
    }
}

interface PlacementTestProps {
    setActiveViewState: Dispatch<SetStateAction<ViewState>>;
}

const PlacementTest: FC<PlacementTestProps> = ({ setActiveViewState }) => {
    const [questions, setQuestions] = useState<PlacementTestQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    
    useEffect(() => {
        const fetchTest = async () => {
            setIsLoading(true);
            try {
                const result = await generatePlacementTest();
                // Shuffle options for each question
                const shuffledQuestions = result.questions.map(q => ({
                    ...q,
                    options: [...q.options].sort(() => Math.random() - 0.5)
                }));
                setQuestions(shuffledQuestions);
            } catch (error) {
                console.error("Failed to generate placement test:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTest();
    }, []);

    const handleAnswerSelect = (option: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Finish the test
            setIsFinished(true);
        }
    };

    const renderTestContent = () => {
        const currentQuestion = questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

        return (
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>English Placement Test</CardTitle>
                    <CardDescription>Answer the questions to the best of your ability to determine your level.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</div>
                        <Progress value={progress} />
                    </div>
                    <div className="font-semibold text-lg">{currentQuestion.question}</div>
                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((option, index) => (
                             <Button
                                key={index}
                                variant={answers[currentQuestionIndex] === option ? "default" : "outline"}
                                className="h-auto justify-start text-left py-2.5"
                                onClick={() => handleAnswerSelect(option)}
                            >
                                {option}
                            </Button>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleNext} disabled={!answers[currentQuestionIndex]}>
                        {currentQuestionIndex < questions.length - 1 ? "Next" : "Finish Test"}
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderResults = () => {
        let beginnerCorrect = 0;
        let intermediateCorrect = 0;
        let advancedCorrect = 0;

        questions.forEach((q, index) => {
            if (answers[index] === q.correctOption) {
                if (q.level === 'beginner') beginnerCorrect++;
                if (q.level === 'intermediate') intermediateCorrect++;
                if (q.level === 'advanced') advancedCorrect++;
            }
        });

        let recommendedLevel: UserLevel = 'beginner';
        let recommendedCefr: keyof typeof levelMapping = 'a1';
        
        // C-level determination
        if (advancedCorrect >= 8) {
            recommendedCefr = 'c2';
            recommendedLevel = 'advanced';
        } else if (advancedCorrect >= 5) {
            recommendedCefr = 'c1';
            recommendedLevel = 'advanced';
        } 
        // B-level determination
        else if (intermediateCorrect >= 8) {
            recommendedCefr = 'b2';
            recommendedLevel = 'intermediate';
        } else if (intermediateCorrect >= 5) {
            recommendedCefr = 'b1';
            recommendedLevel = 'intermediate';
        }
        // A-level determination
        else if (beginnerCorrect >= 7) {
            recommendedCefr = 'a2';
            recommendedLevel = 'beginner';
        } else {
            recommendedCefr = 'a1';
            recommendedLevel = 'beginner';
        }
        
        const resultLabel = levelMapping[recommendedCefr].label;

        return (
            <Card className="w-full max-w-2xl text-center">
                 <CardHeader>
                    <CardTitle>Test Complete!</CardTitle>
                    <CardDescription>Here are your results.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-6 bg-primary/10 rounded-lg">
                        <div className="text-muted-foreground">Your Recommended Level</div>
                        <div className="text-4xl font-bold text-primary capitalize">{resultLabel}</div>
                     </div>
                     <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-muted/50 rounded-md">
                            <div className="font-semibold">Beginner</div>
                            <div>{beginnerCorrect} / 10</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                            <div className="font-semibold">Intermediate</div>
                            <div>{intermediateCorrect} / 10</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                            <div className="font-semibold">Advanced</div>
                            <div>{advancedCorrect} / 10</div>
                        </div>
                     </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                    <Button 
                        className="w-full"
                        onClick={() => setActiveViewState({ view: 'ai-suggester', recommendedLevel })}
                    >
                        Go to AI Suggester
                        <ArrowRight className="ml-2" />
                    </Button>
                     <Button 
                        className="w-full"
                        variant="outline"
                        onClick={() => setActiveViewState({ view: 'ai-suggester' })}
                    >
                        Go Back
                    </Button>
                </CardFooter>
            </Card>
        )
    };


    return (
        <div className="flex flex-col items-center justify-center h-full">
            {isLoading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {!isLoading && !isFinished && questions.length > 0 && renderTestContent()}
            {!isLoading && isFinished && renderResults()}
        </div>
    );
};

export default PlacementTest;
