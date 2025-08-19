
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Wand2, PlusCircle, BookImage, List, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getVocabulary, type CombinedVocabulary, addWordToVocabulary } from '@/services/vocabulary';
import { generateStorybook } from '@/ai/flows/generate-storybook-flow';
import { generateWordDetails } from '@/ai/flows/generate-word-details';
import {
  GenerateStorybookInputSchema,
  type GenerateStorybookOutput,
  type UserLevel,
  type StorybookFormat,
  type VocabularyEntry,
} from '@/ai/flows/schemas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/lingo/dashboard-layout';

const formSchema = GenerateStorybookInputSchema.extend({
    generationMode: z.enum(['topic', 'vocabulary']),
});

type StorybookFormValues = z.infer<typeof formSchema>;

const StorybookPage: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [allWords, setAllWords] = useState<CombinedVocabulary[]>([]);
    const [selectedWords, setSelectedWords] = useState<Record<string, boolean>>({});
    const [isVocabLoading, setIsVocabLoading] = useState(true);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [storybook, setStorybook] = useState<GenerateStorybookOutput | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchWords = async () => {
            setIsVocabLoading(true);
            try {
                const words = await getVocabulary(user.uid);
                setAllWords(words);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your vocabulary.' });
            } finally {
                setIsVocabLoading(false);
            }
        };
        fetchWords();
    }, [user, toast]);
    
    const form = useForm<StorybookFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            level: 'beginner',
            format: 'bilingual',
            topic: '',
            generationMode: 'topic',
        },
    });

    const generationMode = form.watch('generationMode');

    const onSubmit = async (values: StorybookFormValues) => {
        setIsGenerating(true);
        setStorybook(null);
        
        const payload: z.infer<typeof GenerateStorybookInputSchema> = {
            level: values.level,
            format: values.format,
        };

        if (values.generationMode === 'topic') {
            if (!values.topic) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please enter a topic.' });
                setIsGenerating(false);
                return;
            }
            payload.topic = values.topic;
        } else {
            const vocabList = allWords
                .filter(word => selectedWords[word.userVocabularyId])
                .map(word => ({ term: word.term, definition: word.definition }));

            if (vocabList.length === 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one word from your vocabulary.' });
                setIsGenerating(false);
                return;
            }
            payload.vocabulary = vocabList;
        }

        try {
            const result = await generateStorybook(payload);
            setStorybook(result);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } catch (error) {
            console.error('Failed to generate storybook:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the storybook. Please try again.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddWord = async (word: string) => {
        if (!user) return;
        toast({ title: 'Adding word...', description: `"${word}" is being added to your vocabulary.` });
        try {
            const details = await generateWordDetails({ term: word });
            const newWordData: VocabularyEntry = {
                term: word,
                pronunciation: details.pronunciation,
                partOfSpeech: details.partOfSpeech,
                definition: details.definition,
                vietnameseDefinition: details.vietnameseDefinition,
                sentence: details.sentence,
                vietnameseSentence: details.vietnameseSentence,
            };
            const savedWord = await addWordToVocabulary(user.uid, newWordData);
            setAllWords(prev => [savedWord, ...prev]);
            toast({ variant: 'default', title: 'Success!', description: `"${word}" has been added to your vocabulary.` });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: `Could not add "${word}" to your vocabulary.` });
        }
    };


    const renderStoryContent = () => {
        if (!storybook) return null;
        
        const vocabTerms = new Set(storybook.keyVocabulary.map(v => v.word.toLowerCase()));
        
        // Regex to split story by words, keeping punctuation attached
        const storyParts = storybook.storyContent.split(/(\b[\w'-]+\b|[^\w\s]+)/g);

        return (
            <p className="whitespace-pre-wrap leading-loose">
                {storyParts.map((part, index) => {
                    const isVocab = /\w/.test(part) && vocabTerms.has(part.toLowerCase());
                    if (isVocab) {
                        return (
                             <span key={index} className="relative group">
                                <span className="bg-primary/10 text-primary font-semibold rounded p-1">{part}</span>
                                <span className="absolute bottom-full mb-2 w-max max-w-sm p-2 bg-popover text-popover-foreground border rounded-md shadow-lg text-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Click to add to your vocabulary.
                                </span>
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </p>
        );
    };

    return (
        <DashboardLayout
            activeView="storybook"
            setActiveView={() => {}}
            setWords={setAllWords}
        >
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookImage /> AI Storybook Generator</CardTitle>
                        <CardDescription>
                            Create personalized stories to learn English in context. Choose to generate a story from a topic or from your own vocabulary list.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="generationMode"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>How do you want to generate the story?</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-col sm:flex-row gap-4"
                                                >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="topic" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">From a Topic</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="vocabulary" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">From My Vocabulary</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {generationMode === 'topic' ? (
                                    <FormField
                                        control={form.control}
                                        name="topic"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Topic</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., 'A trip to the moon', 'Cooking a meal'" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                    <FormItem>
                                        <FormLabel>Vocabulary</FormLabel>
                                        <VocabularySelector
                                            allWords={allWords}
                                            isLoading={isVocabLoading}
                                            selectedWords={selectedWords}
                                            setSelectedWords={setSelectedWords}
                                        />
                                    </FormItem>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="level"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Your English Level</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="beginner">Beginner</SelectItem>
                                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                                        <SelectItem value="advanced">Advanced</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="format"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Story Format</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="bilingual">Bilingual (English & Vietnamese)</SelectItem>
                                                        <SelectItem value="interspersed">Interspersed (Truyện chêm)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
                                <Button type="submit" className="w-full" disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                    Generate Story
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {isGenerating && (
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground">The AI is writing your story... This might take a moment.</p>
                        </CardContent>
                    </Card>
                )}

                {storybook && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{storybook.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Key Vocabulary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {storybook.keyVocabulary.map((v, i) => {
                                    const isAdded = allWords.some(w => w.term.toLowerCase() === v.word.toLowerCase());
                                    return (
                                        <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold">{v.word} <span className="font-normal text-muted-foreground">({v.partOfSpeech})</span></p>
                                                    <p className="font-sans text-muted-foreground">{v.pronunciation}</p>
                                                </div>
                                                <Button size="icon" variant={isAdded ? "ghost" : "outline"} className="h-7 w-7" onClick={() => handleAddWord(v.word)} disabled={isAdded}>
                                                    {isAdded ? <Check className="h-4 w-4 text-green-500" /> : <PlusCircle className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="mt-1">{v.definition}</p>
                                        </div>
                                    )
                                })}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Story</h3>
                                {renderStoryContent()}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

interface VocabularySelectorProps {
    allWords: CombinedVocabulary[];
    isLoading: boolean;
    selectedWords: Record<string, boolean>;
    setSelectedWords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const VocabularySelector: FC<VocabularySelectorProps> = ({ allWords, isLoading, selectedWords, setSelectedWords }) => {
    const selectedCount = Object.values(selectedWords).filter(Boolean).length;
    return (
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <span>{selectedCount > 0 ? `${selectedCount} word(s) selected` : "Select words from your vocabulary"}</span>
                    <List />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Vocabulary</DialogTitle>
                    <DialogDescription>Choose the words you want the AI to include in the story.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 w-full rounded-md border">
                    {isLoading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading vocabulary...</div>
                    ) : allWords.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">Your vocabulary list is empty.</div>
                    ) : (
                        allWords.map(word => (
                            <div key={word.userVocabularyId} className="flex items-center space-x-3 p-3 border-b">
                                <Checkbox
                                    id={word.userVocabularyId}
                                    checked={selectedWords[word.userVocabularyId] || false}
                                    onCheckedChange={(checked) => setSelectedWords(prev => ({...prev, [word.userVocabularyId]: !!checked}))}
                                />
                                <label htmlFor={word.userVocabularyId} className="flex-1 cursor-pointer">
                                    <div className="font-medium">{word.term}</div>
                                    <div className="text-sm text-muted-foreground">{word.definition}</div>
                                </label>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default StorybookPage;
