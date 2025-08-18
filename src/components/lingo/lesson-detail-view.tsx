
"use client";

import * as React from "react";
import { useState, useRef, useMemo, useCallback } from "react";
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
  CheckCircle,
  Languages,
  Circle,
  CircleDashed,
  ChevronDown,
  Bot,
  Volume2,
  PlusCircle,
  BrainCircuit,
  List,
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
import type { Lesson, LessonContent, LessonStatus } from "@/services/lessons";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { updateLessonContent, updateLesson } from "@/services/lessons";
import { updateUserVocabulary, updateWord, type CombinedVocabulary } from "@/services/vocabulary";
import { generateReadingExercise } from "@/ai/flows/generate-reading-exercise-flow";
import { generateWritingExercise } from "@/ai/flows/generate-writing-exercise-flow";
import { generateListeningExercise } from "@/ai/flows/generate-listening-exercise-flow";
import { generateSpeakingExercise } from "@/ai/flows/generate-speaking-exercise-flow";
import { generateLessonContent } from "@/ai/flows/generate-lesson-content";
import { translateText } from "@/ai/flows/translate-text-flow";
import { generateFeedbackForIncorrectAnswer } from "@/ai/flows/generate-feedback-flow";
import { generateWritingFeedback } from "@/ai/flows/generate-writing-feedback-flow";
import { generateAudio } from "@/ai/flows/generate-audio";
import {
  type ReadingComprehensionQuestion,
  type WritingPrompt,
  type GenerateListeningExerciseOutput,
  type GenerateSpeakingExerciseOutput,
  type GenerateWritingFeedbackOutput,
} from "@/ai/flows/schemas";
import { useAuth } from "@/context/auth-context";
import { Label } from "../ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import AddWordDialog from "./add-word-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";


interface LessonDetailViewProps {
  lesson: Lesson;
  vocabulary: CombinedVocabulary[];
  onBack: () => void;
  setWords: React.Dispatch<React.SetStateAction<CombinedVocabulary[]>>;
}

type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
  Listening: Headphones,
  Speaking: Mic,
  Reading: BookOpen,
  Writing: FilePenLine,
};

const statusOptions: { value: LessonStatus; label: string; icon: React.ElementType }[] = [
    { value: 'not-started', label: 'Not Started', icon: Circle },
    { value: 'in-progress', label: 'In Progress', icon: CircleDashed },
    { value: 'completed', label: 'Completed', icon: CheckCircle },
];


const LessonDetailView: FC<LessonDetailViewProps> = ({ lesson, vocabulary, onBack, setWords }) => {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(lesson);
  const [isLoading, setIsLoading] = useState<Skill | 'content' | null>(null);
  const [focusPoints, setFocusPoints] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { translations, isTranslating, toggleTranslation } = useTranslation();
  const { audioRef, isPlaying, playAudio, playAudioUrl, audioUrls, playTermAudio } = useAudioPlayback({ setWords });

  const [activePracticeTab, setActivePracticeTab] = useState<"reading" | "writing" | "listening" | "speaking" | null>(() => {
      // If there are existing exercises for this skill, open that tab by default
      const skillKey = lesson.skill.toLowerCase() as keyof Lesson['exercises'];
      if (lesson.exercises && lesson.exercises[skillKey]) {
          return skillKey as any;
      }
      return null;
  });

  const Icon = skillIcons[lesson.skill as Skill] || Sparkles;

  const handleStatusChange = async (newStatus: LessonStatus) => {
    if (currentLesson.status === newStatus) return;
    
    // Optimistically update UI
    const previousStatus = currentLesson.status;
    setCurrentLesson(prev => ({ ...prev, status: newStatus }));

    try {
        await updateLesson(currentLesson.docId, { status: newStatus });
        toast({
            title: "Status Updated",
            description: `Lesson marked as ${newStatus.replace('-', ' ')}.`,
        });
    } catch (error) {
        // Revert UI on error
        setCurrentLesson(prev => ({ ...prev, status: previousStatus }));
        console.error("Failed to update lesson status:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not update lesson status.',
        });
    }
  };


  const handleGenerateContent = async () => {
    setIsLoading('content');
    
    try {
        const result = await generateLessonContent({
            topic: currentLesson.topic,
            skill: currentLesson.skill as Skill,
            level: currentLesson.level,
        });

        const newContent: LessonContent[] = [
            { id: `vocab-${Date.now()}`, type: 'vocabulary', value: JSON.stringify(result.vocabularySuggestions) },
            { id: `grammar-${Date.now()}`, type: 'grammar', value: JSON.stringify(result.grammarFocus) },
            { id: `passage-${Date.now()}`, type: 'passage', value: JSON.stringify(result.passage) },
        ];
        
        await updateLessonContent(currentLesson.docId, newContent);
        setCurrentLesson(prev => ({ ...prev, content: newContent }));

    } catch (error) {
        console.error("Error generating lesson content:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not generate lesson content." });
    }
    
    setIsLoading(null);
  };
  
  const handleStartPractice = async () => {
    setIsLoading(lesson.skill);
    try {
        let newExercise: any;
        const basePayload = { focusPoints: focusPoints || undefined };
        
        const passageContent = currentLesson.content?.find(c => c.type === 'passage')?.value;
        const passageObject = passageContent ? JSON.parse(passageContent) : null;
        const passageText = passageObject?.body || '';


        switch(lesson.skill) {
            case "Reading":
                if (!passageText) {
                    toast({ variant: "destructive", title: "No Reading Passage", description: "Please generate learning content first." });
                    setIsLoading(null);
                    return;
                }
                newExercise = await generateReadingExercise({ ...basePayload, passage: passageText });
                break;
            case "Writing":
                newExercise = await generateWritingExercise({ ...basePayload, topic: lesson.topic, userLevel: lesson.level });
                break;
            case "Listening":
                 if (!passageText) {
                    toast({ variant: "destructive", title: "No Dialogue", description: "Please generate learning content first." });
                    setIsLoading(null);
                    return;
                }
                newExercise = await generateListeningExercise({ ...basePayload, topic: lesson.topic });
                // We'll reuse the generated dialogue for the text part of the exercise, but generate new audio and questions.
                const listeningPassage = newExercise.dialogue.map((d: any) => `${d.speaker}: ${d.line}`).join('\n');
                setCurrentLesson(prev => {
                    const existingPassageIndex = prev.content?.findIndex(c => c.type === 'passage') ?? -1;
                    if (existingPassageIndex !== -1 && prev.content) {
                       const newContent = [...prev.content];
                       newContent[existingPassageIndex] = { ...newContent[existingPassageIndex], value: JSON.stringify({title: 'Dialogue', body: listeningPassage})};
                       return { ...prev, content: newContent, exercises: { ...prev.exercises, listening: newExercise } };
                    }
                    return { ...prev, exercises: { ...prev.exercises, listening: newExercise } };
                });
                break;
            case "Speaking":
                newExercise = await generateSpeakingExercise({ ...basePayload, topic: lesson.topic });
                break;
        }
        
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

  const handleMarkAsComplete = async () => {
    await handleStatusChange('completed');
  }
  
  const hasContentForPractice = currentLesson.content && currentLesson.content.length > 0;
  const currentStatusInfo = statusOptions.find(s => s.value === currentLesson.status) || statusOptions[0];

  const renderContentItem = (item: LessonContent) => {
    try {
        const data = JSON.parse(item.value);
        const translationKey = `content-${item.id}`;
        const isBeingTranslated = isTranslating[translationKey];
        const isBeingSpoken = isPlaying[translationKey];

        const renderToolbar = (textToProcess: string) => (
             <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playAudio(translationKey, textToProcess)} disabled={isBeingSpoken}>
                    {isBeingSpoken ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleTranslation(translationKey, textToProcess)} disabled={isBeingTranslated}>
                    {isBeingTranslated ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                </Button>
            </div>
        );

        return (
            <Card key={item.id} className="mb-4 bg-background">
                <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <div className="text-base flex items-center gap-2 flex-1">
                           {item.type === 'vocabulary' && <><List className="h-5 w-5 text-primary" />Vocabulary Suggestions</>}
                           {item.type === 'grammar' && <><BrainCircuit className="h-5 w-5 text-primary" />Grammar Focus</>}
                           {item.type === 'passage' && <><FileText className="h-5 w-5 text-primary" />{data.title || 'Reading'}</>}
                        </div>
                        {item.type === 'passage' && renderToolbar(data.body)}
                        {item.type === 'grammar' && renderToolbar(data.explanation + ' ' + data.example)}
                     </div>
                </CardHeader>
                <CardContent>
                    {item.type === 'vocabulary' && Array.isArray(data) && (
                        <ul className="space-y-2 text-sm list-disc pl-5">
                            {data.map((v: {word: string, definition: string}, index: number) => (
                                <li key={index}>
                                    <strong>{v.word}:</strong> <InteractiveText text={v.definition} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />
                                </li>
                            ))}
                        </ul>
                    )}
                    {item.type === 'grammar' && (
                        <div className="space-y-2 text-sm">
                            <p className="font-semibold">{data.title}</p>
                            <p><InteractiveText text={data.explanation} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} /></p>
                            <p className="italic bg-muted/50 p-2 rounded">e.g., "<InteractiveText text={data.example} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />"</p>
                        </div>
                    )}
                    {item.type === 'passage' && (
                        <div className="text-sm whitespace-pre-wrap">
                            <InteractiveText text={data.body} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />
                        </div>
                    )}
                    {translations[translationKey] && (
                        <div className="text-sm text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 mt-3 rounded-r-md">
                            <strong>Dịch:</strong> {translations[translationKey]}
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    } catch (e) {
        console.error("Failed to parse content item:", item.value, e);
        return null;
    }
  }

  const renderPracticeZone = () => {
    const practiceType = lesson.skill.toLowerCase();

    if (!activePracticeTab) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <Sparkles className="h-12 w-12 mb-4" />
                <h3 className="font-semibold">Ready to practice?</h3>
                <div>Optionally add focus points, then click "Start Practice" to generate an exercise.</div>
            </div>
        );
    }

    if (isLoading === lesson.skill) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <div className="text-muted-foreground">AI is building your exercise...</div>
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
    
    const passageContent = currentLesson.content?.find(c => c.type === 'passage')?.value;
    const passageObject = passageContent ? JSON.parse(passageContent) : { body: '' };
    const passageText = passageObject.body;

    switch(practiceType) {
        case 'reading': return <ReadingPractice questions={currentExercise.questions} passage={passageText} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />;
        case 'writing': return <WritingPractice prompts={currentExercise.prompts} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />;
        case 'listening': return <ListeningPractice exercise={currentExercise} passage={passageText} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />;
        case 'speaking': return <SpeakingPractice exercise={currentExercise} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isPlaying} />;
        default: return null;
    }
  }


  return (
    <div className="space-y-6">
       <audio ref={audioRef} className="hidden" />
      <div className="flex justify-between items-start">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-4">
          <ArrowLeft className="mr-2" /> Back to My Lessons
        </Button>
        <div className="flex items-center gap-2">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <currentStatusInfo.icon className="mr-2 h-4 w-4" />
                    {currentStatusInfo.label}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map(option => (
                     <DropdownMenuItem 
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        disabled={currentLesson.status === option.value}
                    >
                        <option.icon className="mr-2 h-4 w-4" />
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
         </DropdownMenu>
         <AddWordDialog
            setWords={setWords}
            trigger={
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Word
                </Button>
            }
        />
         </div>
      </div>

      <div>
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
            <div className="text-muted-foreground">
              First, generate learning content. Then, start an interactive practice session.
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Learning Content */}
      <Card>
        <CardHeader>
           <div className="flex justify-between items-center">
                <div>
                    <CardTitle>1. Learning Content</CardTitle>
                    <CardDescription>Generate supporting content with AI, then practice below.</CardDescription>
                </div>
                <Button onClick={handleGenerateContent} disabled={!!isLoading} size="sm">
                    {isLoading === 'content' ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2"/>}
                    {hasContentForPractice ? 'Regenerate Content' : 'Generate Content'}
                </Button>
           </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="learning-content" className="w-full">
            <AccordionItem value="learning-content" className="border-b-0">
               <AccordionTrigger className="justify-center py-2 text-sm">
                  {hasContentForPractice ? 'Show/Hide Learning Content' : ''}
               </AccordionTrigger>
              <AccordionContent className="pt-4">
                <ScrollArea className="h-80 p-4 rounded-lg border bg-muted/20">
                  {isLoading === 'content' ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : hasContentForPractice ? (
                    currentLesson.content?.map(renderContentItem)
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Content you generate will appear here.
                    </div>
                  )}
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>


      {/* Section 2: Practice Zone */}
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>2. Practice Zone</CardTitle>
                        <CardDescription>Test your knowledge with an AI-powered exercise.</CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        onClick={handleStartPractice} 
                        disabled={!!isLoading || !hasContentForPractice}
                    >
                        {isLoading === lesson.skill ? <Loader2 className="mr-2 animate-spin"/> : <PlayCircle className="mr-2"/>}
                        {currentLesson.exercises?.[lesson.skill.toLowerCase() as keyof typeof currentLesson.exercises] ? 'Regenerate Practice' : 'Start Practice'}
                    </Button>
                </div>
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
                 <div className="text-xs text-muted-foreground">
                   Guide the AI on what to include in the exercise.
                 </div>
               </div>
               <div className="rounded-lg border bg-muted/50 flex-grow relative min-h-[400px]">
                   <div className="absolute inset-0">
                     <ScrollArea className="h-full w-full">
                       {renderPracticeZone()}
                     </ScrollArea>
                   </div>
               </div>
            </CardContent>
        </Card>
    </div>
  );
};

// --- Interactive Text Component ---

const InteractiveText: FC<{
    text: string;
    vocabulary: CombinedVocabulary[];
    playTermAudio: (word: CombinedVocabulary) => void;
    isTermPlaying: Record<string, boolean>;
}> = React.memo(({ text, vocabulary, playTermAudio, isTermPlaying }) => {
    const vocabMap = useMemo(() => {
        const map = new Map<string, CombinedVocabulary>();
        // Sort by length descending to match longer phrases first
        const sortedVocab = [...vocabulary].sort((a, b) => b.term.length - a.term.length);
        sortedVocab.forEach(word => {
            // Use lowercase for case-insensitive matching
            map.set(word.term.toLowerCase(), word);
        });
        return map;
    }, [vocabulary]);

    const parts = useMemo(() => {
        const processedParts: (string | React.ReactNode)[] = [];
        
        // Create a regex to find all potential words/phrases from the vocab list
        const vocabTerms = Array.from(vocabMap.keys());
        if (vocabTerms.length === 0) {
            return [text];
        }
        
        // Escape special regex characters in terms
        const escapedTerms = vocabTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const matchedTerm = match[0];
            const termLower = matchedTerm.toLowerCase();

            // Add the text before the match
            if (match.index > lastIndex) {
                processedParts.push(text.substring(lastIndex, match.index));
            }
            
            const vocabWord = vocabMap.get(termLower);
            if (vocabWord) {
                const isPlaying = isTermPlaying[vocabWord.id];
                processedParts.push(
                    <TooltipProvider key={match.index}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="bg-primary/10 text-primary font-semibold rounded-sm px-1 py-0.5 cursor-pointer">
                                    {matchedTerm}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold font-sans">{vocabWord.pronunciation}</div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => playTermAudio(vocabWord)} disabled={isPlaying}>
                                        {isPlaying ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            } else {
                // This case should theoretically not happen with the current regex, but as a fallback
                processedParts.push(matchedTerm);
            }
            lastIndex = match.index + matchedTerm.length;
        }

        // Add any remaining text after the last match
        if (lastIndex < text.length) {
            processedParts.push(text.substring(lastIndex));
        }

        return processedParts;
    }, [text, vocabMap, playTermAudio, isTermPlaying]);

    return <>{parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>)}</>;
});
InteractiveText.displayName = 'InteractiveText';


// --- Translation Helper ---

const useTranslation = () => {
    const [translations, setTranslations] = useState<Record<string, string | null>>({});
    const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const toggleTranslation = async (key: string, text: string) => {
        if (translations[key]) {
            setTranslations(prev => ({ ...prev, [key]: null }));
            return;
        }

        setIsTranslating(prev => ({ ...prev, [key]: true }));
        try {
            const result = await translateText({ text });
            setTranslations(prev => ({ ...prev, [key]: result.translation }));
        } catch (error) {
            console.error("Translation failed:", error);
            toast({ variant: "destructive", title: "Translation Failed" });
        } finally {
            setIsTranslating(prev => ({ ...prev, [key]: false }));
        }
    };

    return { translations, isTranslating, toggleTranslation };
};

// --- Audio Playback Helper ---
const useAudioPlayback = ({ setWords }: { setWords: React.Dispatch<React.SetStateAction<CombinedVocabulary[]>> }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
    const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
    const { toast } = useToast();
    
    const playAudioUrl = (url: string) => {
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
        }
    };

    const playWithBrowserTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            toast({
                variant: "destructive",
                title: "Browser Not Supported",
                description: "Your browser does not support text-to-speech.",
            });
        }
    };

    const playAudio = async (key: string, text: string) => {
        if (audioUrls[key]) {
            playAudioUrl(audioUrls[key]);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [key]: true }));
        try {
            const result = await generateAudio({ text });
            setAudioUrls(prev => ({ ...prev, [key]: result.audioUrl }));
            playAudioUrl(result.audioUrl);
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "AI Audio Failed",
                description: "Using standard browser voice as a fallback.",
            });
            playWithBrowserTTS(text);
        } finally {
            setIsPlaying(prev => ({ ...prev, [key]: false }));
        }
    };
    
    const playTermAudio = useCallback(async (word: CombinedVocabulary) => {
        if (word.audioUrl) {
            playAudioUrl(word.audioUrl);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [word.id]: true }));
        try {
            const result = await generateAudio({ text: word.term });
            const newAudioUrl = result.audioUrl;
            playAudioUrl(newAudioUrl);
            
            await updateWord(word.id, { audioUrl: newAudioUrl });

            setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "AI Audio Failed",
                description: "Using standard browser voice as a fallback.",
            });
            playWithBrowserTTS(word.term);
        } finally {
             setIsPlaying(prev => ({ ...prev, [word.id]: false }));
        }
    }, [setWords, toast]);

    return { audioRef, isPlaying, playAudio, playAudioUrl, audioUrls, playTermAudio };
};



// --- Practice Components ---

const ReadingPractice: FC<{ questions: ReadingComprehensionQuestion[], passage: string, vocabulary: CombinedVocabulary[], playTermAudio: (word: CombinedVocabulary) => void, isTermPlaying: Record<string, boolean> }> = ({ questions, passage, vocabulary, playTermAudio, isTermPlaying }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [feedback, setFeedback] = useState<Record<number, string>>({});
    const [isChecking, setIsChecking] = useState(false);
    const { toast } = useToast();
    const { translations, isTranslating, toggleTranslation } = useTranslation();
    const { audioRef, isPlaying, playAudio } = useAudioPlayback({ setWords: () => {} });


    if (!questions || questions.length === 0) return <div className="p-4 text-center">No questions available.</div>;

    const handleSelect = (qIndex: number, option: string) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    const handleCheckAnswers = async () => {
        setIsChecking(true);
        setShowResults(true);

        const feedbackPromises = questions.map(async (q, qIndex) => {
            const userAnswer = answers[qIndex];
            if (userAnswer && userAnswer !== q.correctOption) {
                try {
                    const result = await generateFeedbackForIncorrectAnswer({
                        passage,
                        question: q.question,
                        userAnswer,
                        correctAnswer: q.correctOption
                    });
                    return { index: qIndex, feedback: result.explanation };
                } catch (error) {
                    console.error(`Error getting feedback for Q${qIndex + 1}:`, error);
                    toast({ variant: "destructive", title: `Feedback Error Q${qIndex + 1}`, description: "Could not get feedback for this question." });
                    return { index: qIndex, feedback: "Could not retrieve feedback." };
                }
            }
            return null;
        });

        const results = await Promise.all(feedbackPromises);
        const newFeedback = results.reduce((acc, result) => {
            if (result) {
                acc[result.index] = result.feedback;
            }
            return acc;
        }, {} as Record<number, string>);

        setFeedback(newFeedback);
        setIsChecking(false);
    };

    return (
        <div className="p-4 space-y-6">
            <audio ref={audioRef} className="hidden" />
            {questions.map((q, qIndex) => {
                const selectedAnswer = answers[qIndex];
                const isCorrectSelection = selectedAnswer === q.correctOption;
                const translationKey = `q-${qIndex}`;
                return (
                    <div key={qIndex} className="bg-background p-4 rounded-lg border">
                        <div className="flex justify-between items-start">
                            <div className="font-semibold mb-3 flex-1">{qIndex + 1}. <InteractiveText text={q.question} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playAudio(translationKey, q.question)} disabled={isPlaying[translationKey]}>
                                    {isPlaying[translationKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleTranslation(translationKey, q.question)} disabled={isTranslating[translationKey]}>
                                    {isTranslating[translationKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        {translations[translationKey] && (
                            <div className="text-sm text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 mb-3 rounded-r-md">
                                <strong>Dịch:</strong> {translations[translationKey]}
                            </div>
                        )}
                        <div className="space-y-2">
                            {q.options.map((opt, oIndex) => {
                                const isCorrectOption = q.correctOption === opt;
                                const isSelectedOption = selectedAnswer === opt;
                                
                                const getVariant = () => {
                                    if (!showResults) return isSelectedOption ? "default" : "outline";
                                    if (isCorrectOption) return "default";
                                    if (isSelectedOption) return "destructive";
                                    return "outline";
                                };

                                return (
                                    <Button
                                        key={oIndex}
                                        variant={getVariant()}
                                        className="w-full justify-start text-left h-auto py-2"
                                        onClick={() => handleSelect(qIndex, opt)}
                                    >
                                       {showResults && isCorrectOption && <Check className="mr-2 flex-shrink-0" />}
                                       {showResults && isSelectedOption && !isCorrectOption && <X className="mr-2 flex-shrink-0" />}
                                       <InteractiveText text={opt} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} />
                                    </Button>
                                );
                            })}
                        </div>
                        {showResults && selectedAnswer && !isCorrectSelection && (
                             <div className="mt-4 p-3 rounded-md bg-red-50 border-l-4 border-red-400 text-red-900">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold mb-1 flex-1">Explanation</div>
                                     <div className="flex items-center">
                                         {feedback[qIndex] && (
                                            <>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-900 hover:bg-red-100" onClick={() => playAudio(`feedback-${qIndex}`, feedback[qIndex]!)} disabled={isPlaying[`feedback-${qIndex}`]}>
                                                {isPlaying[`feedback-${qIndex}`] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-900 hover:bg-red-100" onClick={() => toggleTranslation(`feedback-${qIndex}`, feedback[qIndex]!)} disabled={isTranslating[`feedback-${qIndex}`]}>
                                                {isTranslating[`feedback-${qIndex}`] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                                            </Button>
                                            </>
                                        )}
                                     </div>
                                </div>
                                {isChecking && !feedback[qIndex] && <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /><span>Getting feedback from AI...</span></div>}
                                <div className="text-sm"><InteractiveText text={feedback[qIndex] || ''} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                                {translations[`feedback-${qIndex}`] && (
                                    <div className="text-sm text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 mt-3 rounded-r-md">
                                        <strong>Dịch:</strong> {translations[`feedback-${qIndex}`]}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="text-center pt-4">
                <Button onClick={handleCheckAnswers} disabled={showResults || isChecking}>
                   {isChecking ? <><Loader2 className="mr-2 animate-spin" /> Checking...</> : "Check Answers"}
                </Button>
            </div>
        </div>
    );
};


const WritingPracticePrompt: FC<{ prompt: WritingPrompt, vocabulary: CombinedVocabulary[], playTermAudio: (word: CombinedVocabulary) => void, isTermPlaying: Record<string, boolean> }> = ({ prompt, vocabulary, playTermAudio, isTermPlaying }) => {
    const [userText, setUserText] = useState("");
    const [feedback, setFeedback] = useState<GenerateWritingFeedbackOutput | null>(null);
    const [isGettingFeedback, setIsGettingFeedback] = useState(false);
    const { toast } = useToast();
    const { translations, isTranslating, toggleTranslation } = useTranslation();
    const { audioRef, isPlaying, playAudio } = useAudioPlayback({ setWords: () => {} });


    const handleGetFeedback = async () => {
        if (!userText) {
            toast({ variant: 'destructive', title: 'Please enter your answer first.' });
            return;
        }
        setIsGettingFeedback(true);
        setFeedback(null);
        try {
            const result = await generateWritingFeedback({
                vietnamesePrompt: prompt.vietnamesePrompt,
                englishHint: prompt.englishHint,
                userWrittenText: userText
            });
            setFeedback(result);
        } catch (error) {
            console.error("Error getting writing feedback:", error);
            toast({ variant: "destructive", title: "Feedback Error", description: "Could not get feedback for your writing." });
        } finally {
            setIsGettingFeedback(false);
        }
    };

    const promptKey = `prompt-${prompt.vietnamesePrompt}`;
    const hintKey = `hint-${prompt.vietnamesePrompt}`;
    const answerKey = `answer-${prompt.vietnamesePrompt}`;
    const feedbackKey = `feedback-${prompt.vietnamesePrompt}`;
    const correctedKey = `corrected-${prompt.vietnamesePrompt}`;

    return (
        <Card className="bg-background">
            <audio ref={audioRef} className="hidden" />
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="text-muted-foreground">Prompt:</div>
                        <div className="font-semibold"><InteractiveText text={prompt.vietnamesePrompt} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                    </div>
                     <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playAudio(promptKey, prompt.vietnamesePrompt)} disabled={isPlaying[promptKey]}>
                           {isPlaying[promptKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                     </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-2 text-sm p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-md">
                   <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                   <div className="flex-1"><strong>Hint:</strong> <InteractiveText text={prompt.englishHint} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                   <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 -mt-1 text-yellow-800 hover:bg-yellow-100" onClick={() => playAudio(hintKey, prompt.englishHint)} disabled={isPlaying[hintKey]}>
                      {isPlaying[hintKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                   </Button>
                </div>
                 <Textarea 
                    placeholder="Write your English sentence here..." 
                    rows={3} 
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                />
                 <Button onClick={handleGetFeedback} disabled={isGettingFeedback || !userText}>
                    {isGettingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Get AI Feedback
                </Button>
                
                {isGettingFeedback && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /><span>AI is analyzing your text...</span></div>}

                {feedback && (
                    <div className="space-y-4 pt-4">
                        <div className="p-3 rounded-md bg-blue-50 border-l-4 border-blue-400 text-blue-900">
                             <div className="flex justify-between items-start">
                                <div className="font-bold mb-1 flex-1">AI Feedback</div>
                                 <div className="flex items-center">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-900 hover:bg-blue-100" onClick={() => playAudio(feedbackKey, feedback.feedback)} disabled={isPlaying[feedbackKey]}>
                                        {isPlaying[feedbackKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-900 hover:bg-blue-100" onClick={() => toggleTranslation(feedbackKey, feedback.feedback)} disabled={isTranslating[feedbackKey]}>
                                        {isTranslating[feedbackKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                                    </Button>
                                 </div>
                             </div>
                             <div className="text-sm"><InteractiveText text={feedback.feedback} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                             {translations[feedbackKey] && (
                                <div className="text-sm text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 mt-3 rounded-r-md">
                                    <strong>Dịch:</strong> {translations[feedbackKey]}
                                </div>
                            )}
                        </div>
                        <div className="p-3 rounded-md bg-green-50 border-l-4 border-green-400 text-green-900">
                            <div className="flex justify-between items-start">
                                <div className="font-bold mb-1 flex-1">Suggested Answer</div>
                                <div className="flex items-center">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-900 hover:bg-green-100" onClick={() => playAudio(correctedKey, feedback.correctedText)} disabled={isPlaying[correctedKey]}>
                                        {isPlaying[correctedKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-900 hover:bg-green-100" onClick={() => toggleTranslation(correctedKey, feedback.correctedText)} disabled={isTranslating[correctedKey]}>
                                        {isTranslating[correctedKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="text-sm font-semibold">"<InteractiveText text={feedback.correctedText} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} />"</div>
                            {translations[correctedKey] && (
                                <div className="text-sm text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 mt-3 rounded-r-md">
                                    <strong>Dịch:</strong> {translations[correctedKey]}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2">
                <div className="flex justify-between w-full">
                    <div className="text-xs text-muted-foreground flex-1">Example answer: "<InteractiveText text={prompt.exampleAnswer} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} />"</div>
                     <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => playAudio(answerKey, prompt.exampleAnswer)} disabled={isPlaying[answerKey]}>
                            {isPlaying[answerKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleTranslation(answerKey, prompt.exampleAnswer)} disabled={isTranslating[answerKey]}>
                            {isTranslating[answerKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                        </Button>
                     </div>
                </div>
                {translations[answerKey] && (
                    <div className="text-xs w-full text-blue-600 bg-blue-50 border-l-4 border-blue-300 p-2 rounded-r-md">
                        <strong>Dịch:</strong> {translations[answerKey]}
                    </div>
                )}
            </CardFooter>
        </Card>
    )
};

const WritingPractice: FC<{ prompts: WritingPrompt[], vocabulary: CombinedVocabulary[], playTermAudio: (word: CombinedVocabulary) => void, isTermPlaying: Record<string, boolean> }> = ({ prompts, vocabulary, playTermAudio, isTermPlaying }) => {
    if (!prompts || prompts.length === 0) return <div className="p-4 text-center">No prompts available.</div>;
    return (
       <div className="p-4 space-y-6">
            {prompts.map((p, pIndex) => (
                <WritingPracticePrompt key={pIndex} prompt={p} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} />
            ))}
       </div>
    );
};


const ListeningPractice: FC<{ exercise: GenerateListeningExerciseOutput, passage: string, vocabulary: CombinedVocabulary[], playTermAudio: (word: CombinedVocabulary) => void, isTermPlaying: Record<string, boolean> }> = ({ exercise, passage, vocabulary, playTermAudio, isTermPlaying }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    return (
        <div className="p-4 h-full flex flex-col">
            <Card className="bg-background mb-4">
                <CardContent className="p-4 text-center">
                    <div className="text-muted-foreground mb-2">Press play to hear the dialogue.</div>
                    <audio ref={audioRef} controls src={exercise.audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </CardContent>
            </Card>
            <div className="flex-grow relative">
                <div className="absolute inset-0">
                    <ScrollArea className="h-full w-full">
                      <ReadingPractice questions={exercise.questions} passage={passage} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};


const SpeakingPractice: FC<{ exercise: GenerateSpeakingExerciseOutput, vocabulary: CombinedVocabulary[], playTermAudio: (word: CombinedVocabulary) => void, isTermPlaying: Record<string, boolean> }> = ({ exercise, vocabulary, playTermAudio, isTermPlaying }) => {
    const { toast } = useToast();
    const { translations, isTranslating, toggleTranslation } = useTranslation();
    const { audioRef, isPlaying, playAudio } = useAudioPlayback({ setWords: () => {} });


    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Line copied to clipboard." });
    }
    
    return (
        <div className="p-4 space-y-6">
            <audio ref={audioRef} className="hidden" />
            <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-semibold">Role-Play Scenario</h4>
                <div className="text-sm text-blue-800"><InteractiveText text={exercise.scenario} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
            </div>
            <div className="space-y-4">
            {exercise.dialogue.map((line, index) => {
                const translationKey = `line-${index}`;
                return (
                    <div key={index}>
                        <div className={`flex gap-3 ${line.role === 'You' ? 'justify-end' : ''}`}>
                            {line.role !== 'You' && <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">AI</div>}
                            <div className={`relative max-w-sm p-3 rounded-lg ${line.role === 'You' ? 'bg-muted' : 'bg-primary/10'}`}>
                               <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1"><strong className="font-semibold">{line.role}:</strong> <InteractiveText text={line.line} vocabulary={vocabulary} playTermAudio={playTermAudio} isTermPlaying={isTermPlaying} /></div>
                                  <div className="flex">
                                      {line.role === 'You' && (
                                           <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(line.line)}>
                                               <Clipboard className="h-4 w-4" />
                                           </Button>
                                       )}
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => playAudio(translationKey, line.line)} disabled={isPlaying[translationKey]}>
                                            {isPlaying[translationKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                        </Button>
                                       <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleTranslation(translationKey, line.line)} disabled={isTranslating[translationKey]}>
                                            {isTranslating[translationKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Languages className="h-4 w-4" />}
                                       </Button>
                                  </div>
                               </div>
                            </div>
                        </div>
                        {translations[translationKey] && (
                            <div className={`text-sm text-blue-600 p-2 mt-1 max-w-sm ${line.role === 'You' ? 'ml-auto' : 'ml-11'}`}>
                                <strong>Dịch:</strong> {translations[translationKey]}
                            </div>
                        )}
                    </div>
                )
            })}
            </div>
        </div>
    );
};


export default LessonDetailView;
