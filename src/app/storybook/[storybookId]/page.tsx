
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, type FC } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, BookHeart, Volume2, Languages, PlusCircle, CheckCircle, ChevronsUpDown, CircleDashed, Circle, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getStorybook, updateStorybook, type Storybook, type StorybookStatus } from '@/services/storybooks';
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { Skeleton } from '@/components/ui/skeleton';
import InteractiveText from '@/components/lingo/interactive-text';
import { getVocabulary, addWordToVocabulary, type CombinedVocabulary } from '@/services/vocabulary';
import { generateWordDetails } from '@/ai/flows/generate-word-details';
import type { VocabularyEntry } from '@/ai/flows/schemas';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const statusOptions: { value: StorybookStatus; label: string; icon: React.ElementType }[] = [
    { value: 'not-started', label: 'Not Started', icon: Circle },
    { value: 'in-progress', label: 'In Progress', icon: CircleDashed },
    { value: 'completed', label: 'Completed', icon: CheckCircle },
];

const StorybookDetailPage: FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const storybookId = params.storybookId as string;

    const [storybook, setStorybook] = useState<Storybook | null>(null);
    const [vocabulary, setVocabulary] = useState<CombinedVocabulary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingWord, setIsSavingWord] = useState<Record<string, boolean>>({});
    const playbackHook = useAudioPlayback({ setWords: setVocabulary });

    useEffect(() => {
        if (!user || !storybookId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [fetchedStorybook, fetchedVocab] = await Promise.all([
                    getStorybook(storybookId),
                    getVocabulary(user.uid),
                ]);

                if (!fetchedStorybook) {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This storybook does not exist or you do not have permission to view it.' });
                    router.push('/storybook');
                    return;
                }
                setStorybook(fetchedStorybook);
                setVocabulary(fetchedVocab);
            } catch (error) {
                console.error("Failed to fetch storybook:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the storybook.' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();

    }, [user, storybookId, toast, router]);
    
    const userVocabularySet = useMemo(() => {
        return new Map(vocabulary.map(v => [v.term.toLowerCase(), v]));
    }, [vocabulary]);

    const handleAddWord = async (vocabItem: { word: string; definition: string; partOfSpeech: string; pronunciation: string; vietnameseWord: string; }) => {
        if (!user) return;
        setIsSavingWord(prev => ({...prev, [vocabItem.word]: true}));
        
        try {
            // 1. Get full details from AI
            const details = await generateWordDetails({ term: vocabItem.word });

            // 2. Construct the full vocabulary entry
            const newWordData: VocabularyEntry = {
                term: vocabItem.word,
                pronunciation: details.pronunciation || vocabItem.pronunciation,
                partOfSpeech: details.partOfSpeech || vocabItem.partOfSpeech,
                definition: details.definition || vocabItem.definition,
                vietnameseDefinition: details.vietnameseDefinition,
                sentence: details.sentence,
                vietnameseSentence: details.vietnameseSentence,
            };

            // 3. Save to database
            const savedWord = await addWordToVocabulary(user.uid, newWordData);
            
            // 4. Update local state
            setVocabulary(prev => [...prev, savedWord]);
            
            toast({
                title: 'Word Added!',
                description: `"${vocabItem.word}" has been saved to your vocabulary with full details.`,
            });
        } catch (error) {
            console.error("Failed to add word:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the word to your vocabulary.' });
        } finally {
             setIsSavingWord(prev => ({...prev, [vocabItem.word]: false}));
        }
    }


    const playAndCacheStoryAudio = async (
        key: 'title' | 'englishContent' | 'vietnameseContent', 
        text: string, 
    ) => {
        if (!storybook || !text) return;
        
        const audioKey = `${storybook.id}-${key}`;
        let existingUrl: string | undefined;
        let updateField: keyof Pick<Storybook, 'titleAudioUrl' | 'englishContentAudioUrl' | 'vietnameseContentAudioUrl'> | null = null;
        
        if (key === 'title') {
            existingUrl = storybook.titleAudioUrl;
            updateField = 'titleAudioUrl';
        } else if (key === 'englishContent') {
            existingUrl = storybook.englishContentAudioUrl;
            updateField = 'englishContentAudioUrl';
        } else if (key === 'vietnameseContent') {
            existingUrl = storybook.vietnameseContentAudioUrl;
            updateField = 'vietnameseContentAudioUrl';
        }

        if (existingUrl) {
            playbackHook.playAudio(audioKey, text, existingUrl);
            return;
        }

        // Use browser TTS for immediate feedback while generating AI audio
        playbackHook.playWithBrowserTTS(audioKey, text);

        const newUrl = await playbackHook.generateAndCacheAudio(audioKey, text);

        if (newUrl && storybook && updateField) {
            try {
                const updates = { [updateField]: newUrl };
                await updateStorybook(storybook.id, updates);
                setStorybook(prev => prev ? { ...prev, ...updates } : null);
            } catch (error) {
                 console.warn(`Failed to save new audio URL for ${key}`, error);
            }
        }
    };

    const handleStatusChange = async (newStatus: StorybookStatus) => {
        if (!storybook || storybook.status === newStatus) return;
        
        const previousStatus = storybook.status;
        const updatedStorybook = { ...storybook, status: newStatus };
        setStorybook(updatedStorybook); // Optimistic update

        try {
            await updateStorybook(storybook.id, { status: newStatus });
            toast({ title: "Status Updated" });
        } catch (error) {
            setStorybook(prev => prev ? { ...prev, status: previousStatus } : null); // Revert on failure
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update storybook status.' });
        }
    };
    
    const highlightKeywords = (text: string, keywords: { word: string, vietnameseWord?: string }[], language: 'en' | 'vi') => {
        if (!text || !keywords || keywords.length === 0) return text;
    
        const keywordMap = new Map(
            keywords.map(kw => {
                if (language === 'en' && kw.word) {
                    return [kw.word.toLowerCase(), kw.word];
                }
                if (language === 'vi' && kw.vietnameseWord) {
                    return [kw.vietnameseWord.toLowerCase(), kw.vietnameseWord];
                }
                return null;
            }).filter(Boolean) as [string, string][]
        );
    
        if (keywordMap.size === 0) return text;

        const regex = new RegExp(`\\b(${Array.from(keywordMap.keys()).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
        
        return text.replace(regex, (match) => {
            const originalCaseWord = keywordMap.get(match.toLowerCase());
            return `<strong>${originalCaseWord || match}</strong>`;
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                 <Skeleton className="h-10 w-48" />
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <div className="flex gap-2">
                             <Skeleton className="h-6 w-20" />
                             <Skeleton className="h-6 w-24" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                 </Card>
            </div>
        )
    }

    if (!storybook) {
        return (
            <div className="text-center">
                <p>Storybook not found.</p>
                <Button onClick={() => router.push('/storybook')} className="mt-4">Back to Library</Button>
            </div>
        );
    }
    
    const titleAudioKey = `${storybook.id}-title`;
    const storyContentToPlay = storybook.format === 'bilingual' 
        ? storybook.englishStory 
        : storybook.interspersedStory;
    
    const englishAudioKey = `${storybook.id}-englishContent`;
    const vietnameseAudioKey = `${storybook.id}-vietnameseContent`;

    const highlightedEnglishStory = storybook.format === 'bilingual' ? highlightKeywords(storybook.englishStory || '', storybook.keyVocabulary, 'en') : storybook.englishStory || '';
    const highlightedVietnameseStory = storybook.format === 'bilingual' ? highlightKeywords(storybook.vietnameseStory || '', storybook.keyVocabulary, 'vi') : storybook.vietnameseStory || '';

    const currentStatusInfo = statusOptions.find(s => s.value === storybook.status) || statusOptions[0];


    return (
        <div className="space-y-6">
            <audio ref={playbackHook.audioRef} />
            <Button variant="ghost" onClick={() => router.push('/storybook')} className="-ml-4">
                <ArrowLeft className="mr-2" /> Back to Storybook Library
            </Button>
             <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">{storybook.level}</Badge>
                                <Badge variant="secondary" className="capitalize">{storybook.format === 'interspersed' ? 'Truyện Chêm' : 'Bilingual'}</Badge>
                            </div>
                            <CardTitle className="text-4xl font-bold">{storybook.title}</CardTitle>
                        </div>
                         <div className="flex items-center gap-2 flex-shrink-0">
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
                                        <DropdownMenuItem key={option.value} onClick={() => handleStatusChange(option.value)} disabled={storybook.status === option.value}>
                                            <option.icon className="mr-2 h-4 w-4" />
                                            {option.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="outline" onClick={() => playAndCacheStoryAudio('title', storybook.title)} disabled={playbackHook.isLoadingAudio[titleAudioKey]}>
                                {playbackHook.isLoadingAudio[titleAudioKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <BookHeart className="mr-2" />}
                                Listen to Title
                            </Button>
                             {storybook.format === 'interspersed' && storyContentToPlay && (
                                 <Button variant="outline" onClick={() => playAndCacheStoryAudio('englishContent', storyContentToPlay)} disabled={playbackHook.isLoadingAudio[englishAudioKey]}>
                                    {playbackHook.isLoadingAudio[englishAudioKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="mr-2" />}
                                    Read Aloud
                                </Button>
                             )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Key Vocabulary</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ul className="space-y-4 text-sm columns-1 md:columns-2">
                                {storybook.keyVocabulary.map((v, i) => {
                                     const vocabAudioKey = `vocab-${i}-${storybook.id}`;
                                     const definitionTranslationKey = `def-trans-${i}-${storybook.id}`;
                                     const isAudioLoading = playbackHook.isLoadingAudio[vocabAudioKey];
                                     const isTranslating = playbackHook.isTranslating[definitionTranslationKey];
                                     const isSaving = isSavingWord[v.word];
                                     const existingWord = userVocabularySet.get(v.word.toLowerCase());
                                     const hasAudio = !!existingWord?.audioUrl;

                                    return (
                                        <li key={i} className="flex flex-col gap-2 break-inside-avoid-column p-3 rounded-md bg-background border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <strong className="text-base">{v.word}</strong>
                                                    <div className="text-muted-foreground">
                                                        <em className="mr-2">({v.partOfSpeech})</em>
                                                        <span className="font-mono">{v.pronunciation}</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 flex-shrink-0"
                                                    onClick={() => playbackHook.playTermAudio(v as any)}
                                                    disabled={isAudioLoading}
                                                >
                                                    {isAudioLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className={cn("h-4 w-4", hasAudio && 'text-primary')} />}
                                                </Button>
                                            </div>
                                            <p>{v.definition}</p>
                                            {playbackHook.translations[definitionTranslationKey] && (
                                                <div className="text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
                                                    <strong>Dịch:</strong> {playbackHook.translations[definitionTranslationKey]}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                                                 <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => playbackHook.toggleTranslation(definitionTranslationKey, v.definition)}
                                                    disabled={isTranslating}
                                                >
                                                    {isTranslating ? <Loader2 className="animate-spin h-4 w-4"/> : <Languages className="mr-2" />}
                                                    Translate
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="w-full"
                                                    onClick={() => handleAddWord(v)}
                                                    disabled={isSaving || !!existingWord}
                                                >
                                                    {isSaving ? <Loader2 className="animate-spin h-4 w-4"/> : (existingWord ? <CheckCircle className="mr-2" /> : <PlusCircle className="mr-2" />)}
                                                    {existingWord ? 'Added' : 'Add to List'}
                                                </Button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                     
                    {storybook.format === 'bilingual' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-xl">English</h3>
                                    <Button variant="ghost" size="icon" onClick={() => playAndCacheStoryAudio('englishContent', storybook.englishStory || '')} disabled={playbackHook.isLoadingAudio[englishAudioKey]}>
                                        {playbackHook.isLoadingAudio[englishAudioKey] ? <Loader2 className="animate-spin h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                        <span className="sr-only">Read English Story</span>
                                    </Button>
                                </div>
                                <article className="prose dark:prose-invert max-w-none">
                                    <InteractiveText text={highlightedEnglishStory} vocabulary={[]} playbackHook={playbackHook} activePlaybackKey={englishAudioKey}/>
                                </article>
                            </div>
                             <div className="border-t md:border-l md:border-t-0 md:pl-8 pt-4 md:pt-0">
                                <div className="flex justify-between items-center mb-2">
                                     <h3 className="font-bold text-xl">Vietnamese</h3>
                                     <Button variant="ghost" size="icon" onClick={() => playAndCacheStoryAudio('vietnameseContent', storybook.vietnameseStory || '')} disabled={playbackHook.isLoadingAudio[vietnameseAudioKey]}>
                                        {playbackHook.isLoadingAudio[vietnameseAudioKey] ? <Loader2 className="animate-spin h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                        <span className="sr-only">Read Vietnamese Story</span>
                                    </Button>
                                </div>
                                <article className="prose dark:prose-invert max-w-none">
                                     <InteractiveText text={highlightedVietnameseStory} vocabulary={[]} playbackHook={playbackHook} activePlaybackKey={vietnameseAudioKey} />
                                </article>
                            </div>
                        </div>
                    )}

                    {storybook.format === 'interspersed' && storybook.interspersedStory && (
                        <article className="prose dark:prose-invert max-w-none">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {storybook.interspersedStory}
                             </ReactMarkdown>
                        </article>
                    )}

                     {storybook.format === 'interspersed' && storybook.fullEnglishStory && (
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <ChevronsUpDown className="mr-2" />
                                    Show Full English Version
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Card className="mt-4">
                                     <CardHeader>
                                        <CardTitle>Full English Version</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <article className="prose dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {storybook.fullEnglishStory}
                                            </ReactMarkdown>
                                        </article>
                                    </CardContent>
                                </Card>
                            </CollapsibleContent>
                        </Collapsible>
                    )}
                </CardContent>
             </Card>
        </div>
    )
}

export default StorybookDetailPage;
