"use client";

import { useRef, useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { PlusCircle, Trash2, Upload, Loader2, Volume2, Star, Sparkles } from "lucide-react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { extractVocabularyFromFile } from "@/ai/flows/extract-vocabulary";
import { generateAudio } from "@/ai/flows/generate-audio";
import { generateWordDetails } from "@/ai/flows/generate-word-details";
import type { VocabularyEntry, GenerateWordDetailsOutput } from "@/ai/flows/schemas";
import { Switch } from "@/components/ui/switch";
import { addWordToFirestore, deleteWordFromFirestore, updateWordInFirestore, addMultipleWordsToFirestore } from "@/services/vocabulary";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";


export interface Word extends VocabularyEntry {
  id: string; // This is now the Firestore document ID
  docId: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
  sentenceAudioUrl?: string;
  isGeneratingSentenceAudio?: boolean;
  favorite: boolean;
  viewCount: number;
  userId: string;
}

interface VocabularyListProps {
  words: Word[];
  setWords: Dispatch<SetStateAction<Word[]>>;
}

const generateAndSaveAudio = async (
  word: Word,
  setWords: Dispatch<SetStateAction<Word[]>>,
  updateInFirestore: typeof updateWordInFirestore
) => {
  // Generate audio for the term
  if (!word.audioUrl) {
    try {
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, isGeneratingAudio: true } : w));
      const termResult = await generateAudio(word.term);
      await updateInFirestore(word.docId, { audioUrl: termResult.audioUrl });
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: termResult.audioUrl, isGeneratingAudio: false } : w));
    } catch (e) {
      console.error("Error generating term audio", e);
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, isGeneratingAudio: false } : w));
    }
  }

  // Generate audio for the sentence
  if (!word.sentenceAudioUrl) {
    try {
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, isGeneratingSentenceAudio: true } : w));
      const sentenceResult = await generateAudio(word.sentence);
      await updateInFirestore(word.docId, { sentenceAudioUrl: sentenceResult.audioUrl });
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, sentenceAudioUrl: sentenceResult.audioUrl, isGeneratingSentenceAudio: false } : w));
    } catch (e) {
      console.error("Error generating sentence audio", e);
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, isGeneratingSentenceAudio: false } : w));
    }
  }
};


const AddWordDialog: FC<{ 
  user: any; 
  setWords: Dispatch<SetStateAction<Word[]>>;
  isDialogOpen: boolean;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ user, setWords, isDialogOpen, setIsDialogOpen }) => {
    const [term, setTerm] = useState('');
    const [generatedDetails, setGeneratedDetails] = useState<GenerateWordDetailsOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleFocus = async () => {
        if (!term) {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    setTerm(text.trim());
                }
            } catch (err) {
                console.warn('Failed to read clipboard contents: ', err);
            }
        }
    };
    
    const handleGenerateDetails = async () => {
        if (!term) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a term to generate details.' });
            return;
        }
        setIsGenerating(true);
        setGeneratedDetails(null);
        try {
            const result = await generateWordDetails({ term });
            setGeneratedDetails(result);
        } catch (error) {
            console.error('Error generating word details:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate details for the word.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSaveWord = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        if (!term || !generatedDetails) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please generate details before saving.' });
            return;
        }

        const newWordData: Omit<VocabularyEntry, 'term'> & { term: string; favorite: boolean; viewCount: number; userId: string; } = {
            term: term,
            pronunciation: generatedDetails.pronunciation,
            definition: generatedDetails.definition,
            sentence: generatedDetails.sentence,
            partOfSpeech: generatedDetails.partOfSpeech,
            vietnameseDefinition: generatedDetails.vietnameseDefinition,
            vietnameseSentence: generatedDetails.vietnameseSentence,
            favorite: false,
            viewCount: 0,
            userId: user.uid,
        };

        try {
            const savedWord = await addWordToFirestore(newWordData as any);
            setWords(prevWords => [savedWord, ...prevWords]);
            handleCloseDialog();
            toast({ title: 'Success', description: 'Word added to your list.' });
            // Pre-generate audio in the background
            generateAndSaveAudio(savedWord, setWords, updateWordInFirestore);
        } catch (error) {
            console.error('Error adding word:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save the word.' });
        }
    };
    
    const handleCloseDialog = () => {
      setTerm('');
      setGeneratedDetails(null);
      setIsGenerating(false);
      setIsDialogOpen(false);
    }

    return (
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(open);
      }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Word
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Word with AI</DialogTitle>
              <DialogDescription>
                Enter a word, phrase or sentence, and AI will generate the rest. Click the input box to paste from your clipboard.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="term" className="text-right">Term</Label>
                <Input
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onFocus={handleFocus}
                  className="col-span-3"
                  placeholder="Click to paste or type"
                />
              </div>
              <Button onClick={handleGenerateDetails} disabled={isGenerating || !term} className="w-full">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Details
              </Button>
              <div className="space-y-4 rounded-lg border bg-muted/50 p-4 max-h-[300px] overflow-y-auto">
                {isGenerating ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : generatedDetails ? (
                  <div className="space-y-2 text-sm">
                     <p><strong className="text-muted-foreground">Part of Speech:</strong> {generatedDetails.partOfSpeech}</p>
                     <p><strong className="text-muted-foreground">Pronunciation:</strong> {generatedDetails.pronunciation}</p>
                     <p><strong className="text-muted-foreground">Definition (EN):</strong> {generatedDetails.definition}</p>
                     <p><strong className="text-muted-foreground">Definition (VI):</strong> {generatedDetails.vietnameseDefinition}</p>
                     <p><strong className="text-muted-foreground">Example (EN):</strong> "{generatedDetails.sentence}"</p>
                     <p><strong className="text-muted-foreground">Example (VI):</strong> "{generatedDetails.vietnameseSentence}"</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    AI-generated details will appear here.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="button" onClick={handleSaveWord} disabled={!generatedDetails || isGenerating}>Save Word</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    );
};


const VocabularyList: FC<VocabularyListProps> = ({ words, setWords }) => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    words.forEach(word => {
        if (!word.audioUrl || !word.sentenceAudioUrl) {
            generateAndSaveAudio(word, setWords, updateWordInFirestore);
        }
    })
  }, [words, setWords]);

  const handleDeleteWord = async (word: Word) => {
    try {
      await deleteWordFromFirestore(word.docId);
      setWords(words.filter((w) => w.id !== word.id));
      toast({ title: "Success", description: "Word deleted." });
    } catch (error) {
      console.error("Error deleting word:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the word." });
    }
  };
  
  const toggleFavorite = async (word: Word) => {
    const newFavoriteState = !word.favorite;
    setWords(words.map(w => 
      w.id === word.id ? { ...w, favorite: newFavoriteState } : w
    ));
    try {
      await updateWordInFirestore(word.docId, { favorite: newFavoriteState });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      setWords(words.map(w => 
        w.id === word.id ? { ...w, favorite: !newFavoriteState } : w
      ));
      toast({ variant: "destructive", title: "Error", description: "Could not update favorite status." });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to import words." });
      return;
    }

    if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please upload only .docx files.",
      });
      return;
    }

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      
      const result = await extractVocabularyFromFile({ documentContent: text });
      
      const newWords = await addMultipleWordsToFirestore(result.vocabulary, user.uid);
      
      setWords(prevWords => [...newWords, ...prevWords]);
      toast({
        title: "Success",
        description: `${newWords.length} words were successfully imported.`,
      });
    } catch (error) {
      console.error("Error importing file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to import from file. Please try again.",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }
  
  const incrementViewCount = async (word: Word) => {
    const newViewCount = (word.viewCount || 0) + 1;
    setWords(prev => prev.map(w => w.id === word.id ? { ...w, viewCount: newViewCount } : w));
    try {
        await updateWordInFirestore(word.docId, { viewCount: newViewCount });
    } catch (error) {
        console.error("Error updating view count:", error);
        // Optionally revert state or show toast
    }
  }

  const handlePlayAudio = (word: Word, type: 'term' | 'sentence') => {
    incrementViewCount(word);
    const audioUrl = type === 'term' ? word.audioUrl : word.sentenceAudioUrl;
  
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    } else {
        toast({
            variant: "destructive",
            title: "Audio not ready",
            description: "Audio is being generated in the background. Please try again in a moment."
        })
    }
  }

  const filteredWords = showOnlyFavorites
    ? words.filter((word) => word.favorite)
    : words;


  return (
    <Card>
      <audio ref={audioRef} className="hidden" />
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Vocabulary</CardTitle>
            <CardDescription>
              A personalized list of words, phrases, and sentences you are learning.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="favorites-only"
                checked={showOnlyFavorites}
                onCheckedChange={setShowOnlyFavorites}
              />
              <Label htmlFor="favorites-only">Show favorites only</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".docx"
              />
              <Button onClick={triggerFileSelect} disabled={isImporting} variant="outline">
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import from File
              </Button>
               <AddWordDialog 
                 user={user} 
                 setWords={setWords}
                 isDialogOpen={isDialogOpen}
                 setIsDialogOpen={setIsDialogOpen}
               />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <div className="border-b">
             <div className="flex font-medium text-muted-foreground px-4 py-3 text-sm">
                <div className="w-[30%]">Term</div>
                <div className="flex-1">Definition &amp; Example</div>
                <div className="w-[150px] text-center">Actions</div>
             </div>
          </div>
          {filteredWords.length > 0 ? (
              filteredWords.map((word) => (
                <AccordionItem value={word.id} key={word.id} className="border-b group">
                   <div className="flex items-center w-full text-left py-0 px-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'term'); }}
                            disabled={word.isGeneratingAudio || !word.audioUrl}
                            className="h-8 w-8 flex-shrink-0 mr-2"
                        >
                            {word.isGeneratingAudio ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                            <Volume2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Play term audio</span>
                        </Button>
                        <AccordionTrigger className="flex-1 py-4 pr-4 hover:no-underline">
                            <div className="flex items-center w-full text-left">
                                <div className="font-medium w-[calc(30%_/_0.85)] pr-4">
                                    <div>
                                        <p>{word.term}</p>
                                        <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
                                        <Badge variant="outline" className="mt-1">{word.partOfSpeech}</Badge>
                                    </div>
                                </div>
                                <div className="flex-1 pr-4">
                                    <p><strong>EN:</strong> {word.definition}</p>
                                    <p className="italic mt-2">"{word.sentence}"</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="w-[150px] flex justify-center items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleFavorite(word); }}>
                            <Star className={`h-5 w-5 ${word.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                            <span className="sr-only">Favorite</span>
                            </Button>
                            <div className="text-center font-medium">{word.viewCount || 0} views</div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteWord(word); }}
                            >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                            </Button>
                        </div>
                   </div>
                   <AccordionContent className="px-4 pb-4">
                      <div className="pl-12 space-y-2">
                         <p className="text-sm text-muted-foreground"><strong>VI:</strong> {word.vietnameseDefinition}</p>
                          <div className="flex items-start gap-2 mt-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'sentence'); }}
                                disabled={word.isGeneratingSentenceAudio || !word.sentenceAudioUrl}
                                className="h-8 w-8 flex-shrink-0"
                            >
                                {word.isGeneratingSentenceAudio ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                <Volume2 className="h-4 w-4" />
                                )}
                                <span className="sr-only">Play sentence audio</span>
                            </Button>
                            <p className="text-sm text-muted-foreground italic">"{word.vietnameseSentence}"</p>
                          </div>
                      </div>
                   </AccordionContent>
                </AccordionItem>
              ))
            ) : (
             <div className="h-24 text-center flex items-center justify-center text-sm text-muted-foreground">
                 {showOnlyFavorites
                    ? "You don't have any favorite words yet. Go ahead and star a few!"
                    : "Your vocabulary list is empty. Add a new word to get started!"}
             </div>
            )}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default VocabularyList;
    

    