
"use client";

import * as React from 'react';
import { useState, useEffect, type FC } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, BookHeart, Volume2, Languages } from 'lucide-react';
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
import { getVocabulary, type CombinedVocabulary } from '@/services/vocabulary';


const StorybookDetailPage: FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const storybookId = params.storybookId as string;

    const [storybook, setStorybook] = useState<Storybook | null>(null);
    const [vocabulary, setVocabulary] = useState<CombinedVocabulary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
                             <ul className="space-y-2 text-sm columns-1 md:columns-2">
                                {storybook.keyVocabulary.map((v, i) => {
                                     const vocabAudioKey = `vocab-${i}-${storybook.id}`;
                                     const isAudioLoading = playbackHook.isLoadingAudio[vocabAudioKey];
                                    return (
                                        <li key={i} className="flex items-start gap-2 break-inside-avoid-column">
                                             <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 flex-shrink-0"
                                                onClick={() => playbackHook.playAudio(vocabAudioKey, v.word)}
                                                disabled={isAudioLoading}
                                             >
                                                {isAudioLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </Button>
                                            <div>
                                                <strong>{v.word}</strong> <em className="text-muted-foreground">({v.partOfSpeech}) - {v.pronunciation}</em>: {v.definition}
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
