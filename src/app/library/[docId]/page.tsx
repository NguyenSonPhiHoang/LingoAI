
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Loader2, ArrowLeft, BookCopy, List, PlusCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument } from '@/services/library';
import { getDocument, updateDocument } from '@/services/library';
import { extractVocabularyFromFile } from '@/ai/flows/extract-vocabulary';
import type { VocabularyEntry } from '@/ai/flows/schemas';
import { addWordToVocabulary, getVocabulary, type CombinedVocabulary } from '@/services/vocabulary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import InteractiveText from '@/components/lingo/interactive-text';
import { useAudioPlayback } from '@/hooks/use-audio-playback';


const LibraryDocPage: FC<{ params: { docId: string } }> = ({ params }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const docId = params.docId;
    
    const [doc, setDoc] = useState<LibraryDocument | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});

    const [userVocabulary, setUserVocabulary] = useState<CombinedVocabulary[]>([]);
    const playbackHook = useAudioPlayback({ setWords: setUserVocabulary });

    useEffect(() => {
        if (!user || !docId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [fetchedDoc, fetchedVocab] = await Promise.all([
                    getDocument(docId),
                    getVocabulary(user.uid),
                ]);
                setDoc(fetchedDoc);
                setUserVocabulary(fetchedVocab);
            } catch (error) {
                console.error("Failed to fetch document:", error);
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch the document." });
                router.push('/library');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, docId, toast, router]);

    const handleExtractVocabulary = async () => {
        if (!doc || !doc.content) return;
        setIsExtracting(true);
        toast({ title: "Extracting Vocabulary...", description: "The AI is reading your document to find key terms." });
        try {
            const result = await extractVocabularyFromFile({ documentContent: doc.content });
            const updatedDoc = { ...doc, vocabulary: result.vocabulary };
            await updateDocument(doc.id, { vocabulary: result.vocabulary });
            setDoc(updatedDoc);
            toast({ title: "Success!", description: `Found ${result.vocabulary.length} vocabulary items.` });
        } catch (error) {
             console.error("Failed to extract vocabulary:", error);
            toast({ variant: 'destructive', title: "Extraction Failed" });
        } finally {
            setIsExtracting(false);
        }
    };
    
    const handleAddWord = async (word: VocabularyEntry) => {
        if (!user) return;
        setIsAdding(prev => ({ ...prev, [word.term]: true }));
        toast({ title: 'Adding word...', description: `"${word.term}" is being added to your vocabulary.` });
        try {
            await addWordToVocabulary(user.uid, word);
            
            const fetchedVocab = await getVocabulary(user.uid);
            setUserVocabulary(fetchedVocab);

            toast({ variant: 'default', title: 'Success!', description: `"${word.term}" has been added.` });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: `Could not add "${word.term}".` });
        } finally {
            setIsAdding(prev => ({ ...prev, [word.term]: false }));
        }
    };
    
    const userVocabularyTerms = useMemo(() => {
        return new Set(userVocabulary.map(v => v.term.toLowerCase()));
    }, [userVocabulary]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!doc) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
               <p>Document not found.</p>
            </div>
        )
    }

    const hasContent = !!doc.content;

    const MarkdownComponents: object = {
        p: (props: any) => {
            const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <p className="mb-2 last:mb-0"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></p>
        },
        h1: (props: any) => {
            const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <h1 className="text-2xl font-bold mt-4 mb-2"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></h1>
        },
        h2: (props: any) => {
             const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <h2 className="text-xl font-semibold mt-3 mb-2"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></h2>
        },
        h3: (props: any) => {
            const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <h3 className="text-lg font-semibold mt-2 mb-2"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></h3>
        },
        li: (props: any) => {
            // Children of li can be complex, so we need to handle nested p tags from markdown-react
            if (props.children.length > 0 && typeof props.children[0] === 'object' && props.children[0].type === 'p') {
                 const textContent = Array.isArray(props.children[0].props.children) ? props.children[0].props.children.join('') : props.children[0].props.children;
                 return <li className="ml-5 list-disc"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></li>;
            }
             const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <li className="ml-5 list-disc"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></li>
        },
        strong: (props: any) => {
            const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <strong className="font-bold"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></strong>
        },
        em: (props: any) => {
            const textContent = Array.isArray(props.children) ? props.children.join('') : props.children;
            return <em className="italic"><InteractiveText text={textContent} vocabulary={userVocabulary} playbackHook={playbackHook} activePlaybackKey={`doc-${doc.id}`} /></em>
        },
    }

    return (
        <div className="space-y-6">
             <audio ref={playbackHook.audioRef} className="hidden" />
             <Button variant="ghost" onClick={() => router.push('/library')} className="-ml-4">
              <ArrowLeft className="mr-2" /> Back to Library
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{doc.title}</CardTitle>
                        <CardDescription>Read your document content below. Highlighted words are from your vocabulary.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                            <div className="prose prose-sm max-w-none">
                                {hasContent ? (
                                     <ReactMarkdown components={MarkdownComponents}>
                                        {doc.content}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                         <p>This document has no content. This might happen if text extraction failed.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookCopy /> Vocabulary</CardTitle>
                        <CardDescription>AI-extracted vocabulary from this document.</CardDescription>
                    </CardHeader>
                     <CardContent>
                         <Button onClick={handleExtractVocabulary} disabled={isExtracting || !hasContent} className="w-full">
                            {isExtracting ? <Loader2 className="animate-spin mr-2" /> : <List className="mr-2" />}
                            {doc.vocabulary.length > 0 ? "Re-extract Vocabulary" : "Extract Vocabulary"}
                         </Button>
                         <ScrollArea className="h-[50vh] w-full mt-4">
                            <div className="space-y-3 pr-4">
                            {isExtracting && doc.vocabulary.length === 0 ? (
                                <div className="text-center py-10"><Loader2 className="animate-spin"/></div>
                            ) : doc.vocabulary.length > 0 ? (
                                doc.vocabulary.map((v, i) => {
                                    const isAdded = userVocabularyTerms.has(v.term.toLowerCase());
                                    const isCurrentlyAdding = isAdding[v.term];
                                    return (
                                        <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold">{v.term} <span className="font-normal text-muted-foreground">({v.partOfSpeech})</span></p>
                                                    <p className="font-sans text-muted-foreground">{v.pronunciation}</p>
                                                </div>
                                                <Button size="icon" variant={isAdded ? "ghost" : "outline"} className="h-7 w-7" onClick={() => handleAddWord(v)} disabled={isAdded || isCurrentlyAdding}>
                                                    {isCurrentlyAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAdded ? <Check className="h-4 w-4 text-green-500" /> : <PlusCircle className="h-4 w-4" />)}
                                                </Button>
                                            </div>
                                            <p className="mt-1">{v.definition}</p>
                                            <p className="mt-1 text-blue-600">{v.vietnameseDefinition}</p>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center text-muted-foreground py-10">No vocabulary extracted yet.</div>
                            )}
                            </div>
                         </ScrollArea>
                     </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default LibraryDocPage;
