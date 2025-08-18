
"use client";

import * as React from "react";
import { useState } from "react";
import type { FC } from "react";
import {
  ArrowLeft,
  BookOpen,
  FilePenLine,
  Headphones,
  Mic,
  Sparkles,
  Loader2,
  MessageSquareQuote,
  FileText,
  GraduationCap,
  PlayCircle,
  Lightbulb,
  Check,
  X,
  Clipboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Lesson, LessonContent } from "@/services/lessons";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { updateLessonContent } from "@/services/lessons";
import { generateReadingExercise } from "@/ai/flows/generate-reading-exercise-flow";
import { generateWritingExercise } from "@/ai/flows/generate-writing-exercise-flow";
import { generateListeningExercise } from "@/ai/flows/generate-listening-exercise-flow";
import { generateSpeakingExercise } from "@/ai/flows/generate-speaking-exercise-flow";
import {
  type ReadingComprehensionQuestion,
  type WritingPrompt,
  type GenerateListeningExerciseOutput,
  type GenerateSpeakingExerciseOutput,
} from "@/ai/flows/schemas";
import { useAuth } from "@/context/auth-context";
import { Label } from "../ui/label";

interface LessonDetailViewProps {
  lesson: Lesson;
  onBack: () => void;
}

type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
  Listening: Headphones,
  Speaking: Mic,
  Reading: BookOpen,
  Writing: FilePenLine,
};

type ToolType = "conversation" | "reading-passage" | "grammar-explanation";

interface AiTool {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ElementType;
  supportedSkills: Skill[];
}

const aiTools: AiTool[] = [
  {
    id: "conversation",
    title: "Generate Dialogue",
    description: "Create a sample conversation about the lesson topic.",
    icon: MessageSquareQuote,
    supportedSkills: ["Listening", "Speaking"],
  },
  {
    id: "reading-passage",
    title: "Generate Reading Passage",
    description: "Create a short article or story related to the topic.",
    icon: FileText,
    supportedSkills: ["Reading"],
  },
  {
    id: "grammar-explanation",
    title: "Explain Grammar Point",
    description: "Generate a clear explanation for a related grammar rule.",
    icon: GraduationCap,
    supportedSkills: ["Reading", "Writing"],
  },
];

const LessonDetailView: FC<LessonDetailViewProps> = ({ lesson, onBack }) => {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [isLoading, setIsLoading] = useState<ToolType | Skill | null>(null);
  const [focusPoints, setFocusPoints] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [activePracticeTab, setActivePracticeTab] = useState<"reading" | "writing" | "listening" | "speaking" | null>(() => {
      // If there are existing exercises for this skill, open that tab by default
      const skillKey = lesson.skill.toLowerCase() as keyof Lesson['exercises'];
      if (lesson.exercises && lesson.exercises[skillKey]) {
          return skillKey as any;
      }
      return null;
  });

  const Icon = skillIcons[lesson.skill as Skill] || Sparkles;

  const handleToolClick = async (toolId: ToolType) => {
    setIsLoading(toolId);
    // This is a mock implementation. In a real app, you'd call different flows.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let contentText = "";
    switch(toolId) {
        case "conversation":
            contentText = `Alex: Hey, have you ever thought about ${lesson.topic.toLowerCase()}?\n\nChris: All the time! It's such a fascinating subject.`;
            break;
        case "reading-passage":
            contentText = `The concept of ${lesson.topic.toLowerCase()} has intrigued humanity for centuries. Early philosophers discussed it, and new discoveries are made every year which challenge our previous assumptions. The field is constantly evolving.`;
            break;
        case "grammar-explanation":
            contentText = `When discussing ${lesson.topic.toLowerCase()}, it's common to use the present perfect tense (e.g., "has intrigued") to connect past events to the present. This tense is formed with 'has/have' + past participle.`;
            break;
    }

    const newContentItem: LessonContent = {
      type: toolId,
      value: contentText,
      id: `${toolId}-${Date.now()}`
    };

    const updatedContent = [...(currentLesson.content || []), newContentItem];
    
    try {
        await updateLessonContent(currentLesson.docId, updatedContent);
        setCurrentLesson(prev => ({...prev, content: updatedContent}));
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not save the generated content." });
    }
    
    setIsLoading(null);
  };
  
  const handleStartPractice = async () => {
    setIsLoading(lesson.skill);
    try {
        let newExercise: any;
        const basePayload = { focusPoints: focusPoints || undefined };

        switch(lesson.skill) {
            case "Reading":
                const readingPassage = currentLesson.content?.find(c => c.type === 'reading-passage')?.value;
                if (!readingPassage) {
                    toast({ variant: "destructive", title: "No Reading Passage", description: "Please generate a reading passage first." });
                    setIsLoading(null);
                    return;
                }
                newExercise = await generateReadingExercise({ ...basePayload, passage: readingPassage });
                break;
            case "Writing":
                newExercise = await generateWritingExercise({ ...basePayload, topic: lesson.topic, userLevel: lesson.level });
                break;
            case "Listening":
                newExercise = await generateListeningExercise({ ...basePayload, topic: lesson.topic });
                break;
            case "Speaking":
                newExercise = await generateSpeakingExercise({ ...basePayload, topic: lesson.topic });
                break;
        }
        
        // Ensure newExercise is a plain JavaScript object before saving to Firestore
        const cleanExercise = JSON.parse(JSON.stringify(newExercise));

        const updatedExercises = { ...currentLesson.exercises, [lesson.skill.toLowerCase()]: cleanExercise };
        await updateLessonContent(currentLesson.docId, currentLesson.content || [], updatedExercises);
        setCurrentLesson(prev => ({...prev, exercises: updatedExercises }));
        setActivePracticeTab(lesson.skill.toLowerCase() as any);
    } catch (error: any) {
        console.error("Error generating practice:", error);
        toast({ variant: "destructive", title: "Practice Generation Failed", description: error.message || "Could not generate practice exercise." });
    } finally {
        setIsLoading(null);
    }
  }
  
  const availableTools = aiTools.filter(tool => tool.supportedSkills.includes(lesson.skill as Skill));
  const hasContentForPractice = lesson.skill === 'Reading' ? currentLesson.content?.some(c => c.type === 'reading-passage') : true;

  const renderPracticeZone = () => {
    const practiceType = lesson.skill.toLowerCase();

    if (!activePracticeTab) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <Sparkles className="h-12 w-12 mb-4" />
                <h3 className="font-semibold">Ready to practice?</h3>
                <p>Optionally add focus points, then click "Start Practice" to generate an exercise.</p>
            </div>
        );
    }

    if (isLoading === lesson.skill) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">AI is building your exercise...</p>
            </div>
        );
    }

    const exercises = currentLesson.exercises || {};
    const currentExercise = exercises[practiceType as keyof typeof exercises];

    if (!currentExercise) {
         return (
             <div className="text-center p-4">No exercise available. Click "Start Practice" to generate one.</div>
         );
    }

    switch(practiceType) {
        case 'reading': return <ReadingPractice questions={currentExercise.questions} />;
        case 'writing': return <WritingPractice prompts={currentExercise.prompts} />;
        case 'listening': return <ListeningPractice exercise={currentExercise} />;
        case 'speaking': return <SpeakingPractice exercise={currentExercise} />;
        default: return null;
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2" /> Back to My Lessons
        </Button>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{lesson.skill}</Badge>
                <Badge variant="outline" className="capitalize">{lesson.level}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{lesson.topic}</h1>
            <p className="text-muted-foreground">
              First, generate learning content. Then, start an interactive practice session.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Content Generation */}
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>1. Learning Content</CardTitle>
                    <CardDescription>Generate content with these AI tools.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {availableTools.map(tool => (
                         <Button 
                            key={tool.id} 
                            className="w-full justify-start h-auto py-3" 
                            variant="outline"
                            onClick={() => handleToolClick(tool.id)}
                            disabled={!!isLoading}
                        >
                            {isLoading === tool.id ? <Loader2 className="mr-2 animate-spin flex-shrink-0"/> : <tool.icon className="mr-2 flex-shrink-0"/>}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-left">{tool.title}</p>
                                <p className="text-xs text-muted-foreground text-left font-normal whitespace-normal">{tool.description}</p>
                            </div>
                         </Button>
                    ))}
                </CardContent>
            </Card>

            <ScrollArea className="h-[400px] p-4 rounded-lg border bg-muted/20">
                <h3 className="font-semibold text-lg mb-3">Generated Content</h3>
                {currentLesson.content?.map((item) => (
                    <Card key={item.id} className="mb-4 bg-background">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                {React.createElement(aiTools.find(t => t.id === item.type)?.icon || Sparkles, { className: "h-5 w-5 text-primary"})}
                                {aiTools.find(t => t.id === item.type)?.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{item.value}</p>
                        </CardContent>
                    </Card>
                ))}
                {!isLoading && (!currentLesson.content || currentLesson.content.length === 0) && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        Content you generate will appear here.
                    </div>
                )}
                 {isLoading && !Object.values(skillIcons).includes(isLoading as any) && (
                    <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
                 )}
            </ScrollArea>
        </div>

        {/* Right Column: Practice Zone */}
        <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>2. Practice Zone</CardTitle>
                    <CardDescription>Test your knowledge with an AI-powered exercise.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="focus-points">Focus Points (Optional)</Label>
                     <Textarea
                       id="focus-points"
                       placeholder="e.g., 'use past perfect tense', 'vocabulary about technology'"
                       value={focusPoints}
                       onChange={(e) => setFocusPoints(e.target.value)}
                       disabled={!!isLoading}
                     />
                     <p className="text-xs text-muted-foreground">
                       Guide the AI on what to include in the exercise.
                     </p>
                   </div>
                   <div className="rounded-lg border bg-muted/50 flex-grow relative">
                       <div className="absolute inset-0">
                         <ScrollArea className="h-full w-full">
                           {renderPracticeZone()}
                         </ScrollArea>
                       </div>
                   </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleStartPractice} 
                        disabled={!!isLoading || !hasContentForPractice}
                    >
                        {isLoading === lesson.skill ? <Loader2 className="mr-2 animate-spin"/> : <PlayCircle className="mr-2"/>}
                        {currentLesson.exercises?.[lesson.skill.toLowerCase() as keyof typeof currentLesson.exercises] ? 'Regenerate Practice' : 'Start Practice'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
};

// --- Practice Components ---

const ReadingPractice: FC<{ questions: ReadingComprehensionQuestion[] }> = ({ questions }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);

    if (!questions || questions.length === 0) return <div className="p-4 text-center">No questions available.</div>;

    const handleSelect = (qIndex: number, option: string) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    return (
        <div className="p-4 space-y-6">
            {questions.map((q, qIndex) => {
                const selectedAnswer = answers[qIndex];
                return (
                    <div key={qIndex} className="bg-background p-4 rounded-lg border">
                        <p className="font-semibold mb-3">{qIndex + 1}. {q.question}</p>
                        <div className="space-y-2">
                            {q.options.map((opt, oIndex) => {
                                const isCorrect = q.correctOption === opt;
                                const isSelected = selectedAnswer === opt;
                                
                                const getVariant = () => {
                                    if (!showResults) return isSelected ? "default" : "outline";
                                    if (isCorrect) return "default";
                                    if (isSelected) return "destructive";
                                    return "outline";
                                };

                                return (
                                    <Button
                                        key={oIndex}
                                        variant={getVariant()}
                                        className="w-full justify-start text-left h-auto py-2"
                                        onClick={() => handleSelect(qIndex, opt)}
                                    >
                                       {showResults && isCorrect && <Check className="mr-2 flex-shrink-0" />}
                                       {showResults && isSelected && !isCorrect && <X className="mr-2 flex-shrink-0" />}
                                       {opt}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <div className="text-center pt-4">
                <Button onClick={() => setShowResults(true)} disabled={showResults}>Check Answers</Button>
            </div>
        </div>
    );
};


const WritingPractice: FC<{ prompts: WritingPrompt[] }> = ({ prompts }) => {
    if (!prompts || prompts.length === 0) return <div className="p-4 text-center">No prompts available.</div>;
    return (
       <div className="p-4 space-y-6">
            {prompts.map((p, pIndex) => (
                <Card key={pIndex} className="bg-background">
                    <CardHeader>
                        <p className="text-muted-foreground">Prompt {pIndex + 1}:</p>
                        <p className="font-semibold">"{p.vietnamesePrompt}"</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-2 text-sm p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-md">
                           <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                           <span><strong>Hint:</strong> Try to use the word/phrase: <strong className="italic">"{p.englishHint}"</strong></span>
                        </div>
                        <Textarea placeholder="Write your English sentence here..." rows={3} />
                    </CardContent>
                    <CardFooter>
                         <p className="text-xs text-muted-foreground">Example answer: "{p.exampleAnswer}"</p>
                    </CardFooter>
                </Card>
            ))}
       </div>
    );
};


const ListeningPractice: FC<{ exercise: GenerateListeningExerciseOutput }> = ({ exercise }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    return (
        <div className="p-4 h-full flex flex-col">
            <Card className="bg-background mb-4">
                <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground mb-2">Press play to hear the dialogue.</p>
                    <audio ref={audioRef} controls src={exercise.audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </CardContent>
            </Card>
            <div className="flex-grow relative">
                <div className="absolute inset-0">
                    <ScrollArea className="h-full w-full">
                      <ReadingPractice questions={exercise.questions} />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};


const SpeakingPractice: FC<{ exercise: GenerateSpeakingExerciseOutput }> = ({ exercise }) => {
    const { toast } = useToast();
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Line copied to clipboard." });
    }
    
    return (
        <div className="p-4 space-y-6">
            <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-semibold">Role-Play Scenario</h4>
                <p className="text-sm text-blue-800">{exercise.scenario}</p>
            </div>
            <div className="space-y-4">
            {exercise.dialogue.map((line, index) => (
                <div key={index} className={`flex gap-3 ${line.role === 'You' ? 'justify-end' : ''}`}>
                    {line.role !== 'You' && <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">AI</div>}
                    <div className={`relative max-w-sm p-3 rounded-lg ${line.role === 'You' ? 'bg-muted' : 'bg-primary/10'}`}>
                       <p><strong className="font-semibold">{line.role}:</strong> {line.line}</p>
                       {line.role === 'You' && (
                           <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7" onClick={() => copyToClipboard(line.line)}>
                               <Clipboard className="h-4 w-4" />
                           </Button>
                       )}
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};


export default LessonDetailView;
