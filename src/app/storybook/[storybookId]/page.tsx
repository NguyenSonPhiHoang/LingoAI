
"use client";

import * as React from 'react';
import { useState, useEffect, type FC } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, BookHeart, Volume2, Languages, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getStorybook, updateStorybook, type Storybook } from '@/services/storybooks';
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { Skeleton } from '@/components/ui/skeleton';
import InteractiveText from '@/components/lingo/interactive-text';
import { getVocabulary, addWordToVocabulary, type CombinedVocabulary } from '@/services/vocabulary';
import type { VocabularyEntry } from '@/ai/flows/schemas';


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

    const handleAddWord = async (vocabItem: { word: string, definition: string, partOfSpeech: string, pronunciation: string }) => {
        if (!user) return;
        setIsSavingWord(prev => ({...prev, [vocabItem.word]: true}));
        try {
            // We need to create a full VocabularyEntry object.
            // Some fields will be blank and can be filled in later by the user or another AI call.
            const newWord: VocabularyEntry = {
                term: vocabItem.word,
                definition: vocabItem.definition,
                partOfSpeech: vocabItem.partOfSpeech,
                pronunciation: vocabItem.pronunciation,
                vietnameseDefinition: '...', // Placeholder
                sentence: '...', // Placeholder
                vietnameseSentence: '...', // Placeholder
            };

            await addWordToVocabulary(user.uid, newWord);
            toast({
                title: 'Word Added!',
                description: `"${vocabItem.word}" has been saved to your vocabulary.`,
            });
        } catch (error) {
            console.error("Failed to add word:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the word to your vocabulary.' });
        } finally {
             setIsSavingWord(prev => ({...prev, [vocabItem.word]: false}));
        }
    }


    const playAndCacheStoryAudio = async (
        key: 'title' | 'content', 
        text: string, 
        existingUrl: string | undefined
    ) => {
        const audioKey = `${storybookId}-${key}`;
        
        if (existingUrl) {
            playbackHook.playAudio(audioKey, text, existingUrl);
            return;
        }

        const newUrl = await playbackHook.playAudio(audioKey, text);

        if (newUrl && storybook) {
            try {
                const updates = key === 'title' ? { titleAudioUrl: newUrl } : { contentAudioUrl: newUrl };
                await updateStorybook(storybook.id, updates);
                setStorybook(prev => prev ? { ...prev, ...updates } : null);
            } catch (error) {
                 console.warn(`Failed to save new audio URL for ${key}`, error);
            }
        }
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
    const storyAudioKey = `${storybook.id}-content`;

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
                            <Button variant="outline" onClick={() => playAndCacheStoryAudio('title', storybook.title, storybook.titleAudioUrl)} disabled={playbackHook.isLoadingAudio[titleAudioKey]}>
                                {playbackHook.isLoadingAudio[titleAudioKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <BookHeart className="mr-2" />}
                                Listen to Title
                            </Button>
                             <Button variant="outline" onClick={() => playAndCacheStoryAudio('content', storybook.storyContent, storybook.contentAudioUrl)} disabled={playbackHook.isLoadingAudio[storyAudioKey]}>
                                {playbackHook.isLoadingAudio[storyAudioKey] ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="mr-2" />}
                                Read Aloud
                            </Button>
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
                                                    onClick={() => playbackHook.playAudio(vocabAudioKey, v.word)}
                                                    disabled={isAudioLoading}
                                                >
                                                    {isAudioLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? <Loader2 className="animate-spin h-4 w-4"/> : <PlusCircle className="mr-2" />}
                                                    Add to List
                                                </Button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                     <article className="prose dark:prose-invert max-w-none">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {storybook.storyContent}
                         </ReactMarkdown>
                    </article>
                </CardContent>
             </Card>
        </div>
    )
}

export default StorybookDetailPage;

    