
"use client";

import { useRef, useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { PlusCircle, Trash2, Upload, Loader2, Volume2, Star, Sparkles, Pencil, Eye, ChevronDown } from "lucide-react";
import mammoth from "mammoth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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
  id: string;
  docId: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
  sentenceAudioUrl?: string;
  isGeneratingSentenceAudio?: boolean;
  favorite: boolean;
  viewCount: number;
  userId: string;
  createdAt: any;
}

interface VocabularyListProps {
  words: Word[];
  setWords: Dispatch<SetStateAction<Word[]>>;
}


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

        const newWordData: Omit<Word, 'id' | 'docId' | 'createdAt'> = {
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
            const savedWord = await addWordToFirestore(newWordData);
            setWords(prevWords => [savedWord, ...prevWords]);
            handleCloseDialog();
            toast({ title: 'Success', description: 'Word added to your list.' });
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
                     <div><strong className="text-muted-foreground">Part of Speech:</strong> {generatedDetails.partOfSpeech}</div>
                     <div><strong className="text-muted-foreground">Pronunciation:</strong> {generatedDetails.pronunciation}</div>
                     <div><strong className="text-muted-foreground">Definition (EN):</strong> {generatedDetails.definition}</div>
                     <div><strong className="text-muted-foreground">Definition (VI):</strong> {generatedDetails.vietnameseDefinition}</div>
                     <div><strong className="text-muted-foreground">Example (EN):</strong> "{generatedDetails.sentence}"</div>
                     <div><strong className="text-muted-foreground">Example (VI):</strong> "{generatedDetails.vietnameseSentence}"</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    AI-generated details will appear here.
                  </div>
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


const editWordSchema = z.object({
  term: z.string().min(1, "Term cannot be empty."),
  pronunciation: z.string(),
  partOfSpeech: z.string(),
  definition: z.string().min(1, "Definition cannot be empty."),
  vietnameseDefinition: z.string(),
  sentence: z.string().min(1, "Example sentence cannot be empty."),
  vietnameseSentence: z.string(),
});

const EditWordDialog: FC<{
  word: Word;
  setWords: Dispatch<SetStateAction<Word[]>>;
}> = ({ word, setWords }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editWordSchema>>({
    resolver: zodResolver(editWordSchema),
    defaultValues: {
      term: word.term,
      pronunciation: word.pronunciation,
      partOfSpeech: word.partOfSpeech,
      definition: word.definition,
      vietnameseDefinition: word.vietnameseDefinition,
      sentence: word.sentence,
      vietnameseSentence: word.vietnameseSentence,
    },
  });

  const onSubmit = async (values: z.infer<typeof editWordSchema>) => {
    setIsSaving(true);
    try {
      await updateWordInFirestore(word.docId, values);
      setWords(prev =>
        prev.map(w => (w.id === word.id ? { ...w, ...values } : w))
      );
      toast({ title: "Success", description: "Word updated successfully." });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the word.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
          <span className="sr-only">Edit Word</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Word</DialogTitle>
          <DialogDescription>
            Make changes to your vocabulary word here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pronunciation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pronunciation (IPA)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="partOfSpeech"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Part of Speech</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="definition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Definition (EN)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="vietnameseDefinition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Definition (VI)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="sentence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Example Sentence (EN)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="vietnameseSentence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Example Sentence (VI)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter className="sticky bottom-0 bg-background pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
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
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);

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
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


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
    }
  }

  const handlePlayAudio = async (word: Word, type: 'term' | 'sentence') => {
    const audioUrlKey = type === 'term' ? 'audioUrl' : 'sentenceAudioUrl';
    let audioUrl = word[audioUrlKey];
    const isGeneratingKey = type === 'term' ? 'isGeneratingAudio' : 'isGeneratingSentenceAudio';

    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
      return;
    }

    setWords(prev => prev.map(w => w.id === word.id ? { ...w, [isGeneratingKey]: true } : w));
    try {
      const textToGenerate = type === 'term' ? word.term : word.sentence;
      const result = await generateAudio(textToGenerate);
      audioUrl = result.audioUrl;
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
      
      await updateWordInFirestore(word.docId, { [audioUrlKey]: audioUrl });
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, [audioUrlKey]: audioUrl, [isGeneratingKey]: false } : w));
    } catch (e: any) {
       toast({
          variant: "destructive",
          title: "Audio Generation Failed",
          description: e.message || "Please try again in a moment.",
      });
       setWords(prev => prev.map(w => w.id === word.id ? { ...w, [isGeneratingKey]: false } : w));
    }
  }
  
  useEffect(() => {
    const wordToUpdate = words.find(word => word.id === accordionValue);
    if (wordToUpdate) {
        incrementViewCount(wordToUpdate);
    }
  }, [accordionValue]);

  const filteredWords = showOnlyFavorites
    ? words.filter((word) => word.favorite)
    : words;

  const toggleAccordionItem = (id: string) => {
    setAccordionValue(prev => prev === id ? undefined : id);
  }

  return (
    <Card>
      <audio ref={audioRef} className="hidden" />
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                Import
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
        <div className="border rounded-lg">
          <Accordion type="single" collapsible className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
            {filteredWords.length > 0 ? (
                filteredWords.map((word) => (
                  <AccordionItem value={word.id} key={word.id} className="border-b last:border-b-0">
                     <div className="flex items-center pr-4">
                        <div 
                          className="flex-1 text-left cursor-pointer transition-colors hover:bg-muted/50" 
                          onClick={() => toggleAccordionItem(word.id)}
                        >
                           {/* Desktop View */}
                          <div className="hidden md:flex flex-1 items-center gap-4 px-4 py-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'term'); }}
                                disabled={word.isGeneratingAudio}
                                className="h-8 w-8 flex-shrink-0"
                              >
                                {word.isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                <span className="sr-only">Play term audio</span>
                              </Button>
                              <div className="flex-1 grid grid-cols-[minmax(200px,1.5fr),2fr] gap-x-6 items-center">
                                <div>
                                    <p className="font-semibold">{word.term}</p>
                                    <p className="text-sm text-muted-foreground font-normal italic">{word.pronunciation}</p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p>{word.definition}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="flex items-center gap-1.5">
                                  <Eye className="h-3 w-3" />
                                  {word.viewCount || 0}
                                </Badge>
                                <Badge variant="outline">{word.partOfSpeech}</Badge>
                              </div>
                          </div>
                           {/* Mobile View */}
                           <div className="md:hidden flex items-center gap-3 flex-1 px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'term'); }}
                                  disabled={word.isGeneratingAudio}
                                  className="h-8 w-8 flex-shrink-0"
                                >
                                  {word.isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                  <span className="sr-only">Play term audio</span>
                                </Button>
                                <div>
                                    <p className="font-semibold">{word.term}</p>
                                    <p className="text-sm text-muted-foreground font-normal italic">{word.pronunciation}</p>
                                </div>
                           </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 pl-2">
                           <EditWordDialog word={word} setWords={setWords} />
                           <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleFavorite(word); }}>
                             <Star className={`h-5 w-5 transition-colors ${word.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`} />
                             <span className="sr-only">Favorite</span>
                           </Button>
                           <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteWord(word); }}>
                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                             <span className="sr-only">Delete</span>
                           </Button>
                           <AccordionTrigger className="p-2 [&[data-state=open]>svg]:rotate-180">
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                           </AccordionTrigger>
                        </div>
                     </div>
                     <AccordionContent className="px-4 pb-4 pt-0 bg-background">
                        <div className="pl-12 space-y-4 text-sm">
                           <div className="md:hidden">
                              <div className="font-semibold text-muted-foreground">Part of Speech: <Badge variant="outline" className="ml-1">{word.partOfSpeech}</Badge></div>
                              <div className="mt-1"><strong className="font-semibold text-muted-foreground">Definition (EN): </strong>{word.definition}</div>
                           </div>
                           <div>
                             <p className="font-semibold text-muted-foreground">Vietnamese Definition:</p>
                             <p>{word.vietnameseDefinition}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-semibold text-muted-foreground">Example (EN):</p>
                              <div className="flex items-start gap-2">
                                  <Button
                                      variant="ghost" size="icon"
                                      onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'sentence'); }}
                                      disabled={word.isGeneratingSentenceAudio}
                                      className="h-8 w-8 flex-shrink-0"
                                  >
                                      {word.isGeneratingSentenceAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                      <span className="sr-only">Play sentence audio</span>
                                  </Button>
                                  <p className="italic pt-1.5">"{word.sentence}"</p>
                              </div>
                           </div>
                           <div>
                              <p className="font-semibold text-muted-foreground">Example (VI):</p>
                              <p className="italic ml-12">"{word.vietnameseSentence}"</p>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyList;
