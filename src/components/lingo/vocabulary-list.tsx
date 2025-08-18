
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
import { groupVocabularyByTopic } from "@/ai/flows/group-vocabulary";
import type { VocabularyEntry, VocabularyTopic } from "@/ai/flows/schemas";
import { Switch } from "@/components/ui/switch";
import {
  addMultipleWordsToVocabulary,
  deleteUserVocabulary,
  updateUserVocabulary,
} from "@/services/vocabulary";
import type { UserVocabulary } from "@/services/vocabulary";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import AddWordDialog from "./add-word-dialog";

interface VocabularyListProps {
  words: UserVocabulary[];
  setWords: Dispatch<SetStateAction<UserVocabulary[]>>;
}


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
  word: UserVocabulary;
  setWords: Dispatch<SetStateAction<UserVocabulary[]>>;
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
      await updateUserVocabulary(word.id, values);
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

const GroupedView: FC<{
  words: UserVocabulary[];
  setWords: Dispatch<SetStateAction<UserVocabulary[]>>;
}> = ({ words, setWords }) => {

  const grouped = words.reduce((acc, word) => {
    const topic = word.topic || 'Miscellaneous';
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(word);
    return acc;
  }, {} as Record<string, UserVocabulary[]>);

  const topics = Object.keys(grouped).sort();
  
  if (topics.length === 0) {
    return (
      <div className="h-24 text-center flex items-center justify-center text-sm text-muted-foreground">
          No words found for your current filter.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {topics.map(topic => (
        <Card key={topic}>
          <CardHeader>
            <CardTitle>{topic}</CardTitle>
          </CardHeader>
          <CardContent>
            <VocabularyListInternal words={grouped[topic]} allWords={words} setWords={setWords} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const VocabularyListInternal: FC<{ 
  words: UserVocabulary[];
  allWords: UserVocabulary[]; 
  setWords: Dispatch<SetStateAction<UserVocabulary[]>>;
}> = ({ words, allWords, setWords }) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<Record<string, boolean>>({});

  const handleDeleteWord = async (word: UserVocabulary) => {
    try {
      await deleteUserVocabulary(word.id);
      setWords(allWords.filter((w) => w.id !== word.id));
      toast({ title: "Success", description: "Word deleted." });
    } catch (error) {
      console.error("Error deleting word:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the word." });
    }
  };
  
  const toggleFavorite = async (word: UserVocabulary) => {
    const newFavoriteState = !word.favorite;
    setWords(allWords.map(w => 
      w.id === word.id ? { ...w, favorite: newFavoriteState } : w
    ));
    try {
      await updateUserVocabulary(word.id, { favorite: newFavoriteState });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      setWords(allWords.map(w => 
        w.id === word.id ? { ...w, favorite: !newFavoriteState } : w
      ));
      toast({ variant: "destructive", title: "Error", description: "Could not update favorite status." });
    }
  };
  
  const incrementViewCount = async (word: UserVocabulary) => {
    const newViewCount = (word.viewCount || 0) + 1;
    const updatedWords = allWords.map(w => w.id === word.id ? { ...w, viewCount: newViewCount } : w);
    setWords(updatedWords);
    try {
        await updateUserVocabulary(word.id, { viewCount: newViewCount });
    } catch (error) {
        console.error("Error updating view count:", error);
    }
  }

  const handlePlayAudio = async (word: UserVocabulary, type: 'term' | 'sentence') => {
    const audioUrlKey = type === 'term' ? 'audioUrl' : 'sentenceAudioUrl';
    let audioUrl = word[audioUrlKey];
    const audioGenKey = `${word.id}-${type}`;

    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
      return;
    }

    setIsGeneratingAudio(prev => ({...prev, [audioGenKey]: true}));

    try {
      const textToGenerate = type === 'term' ? word.term : word.sentence;
      const result = await generateAudio({text: textToGenerate});
      audioUrl = result.audioUrl;
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
      
      await updateUserVocabulary(word.id, { [audioUrlKey]: audioUrl });
      setWords(prev => prev.map(w => w.id === word.id ? { ...w, [audioUrlKey]: audioUrl } : w));
    } catch (e: any) {
       toast({
          variant: "destructive",
          title: "Audio Generation Failed",
          description: e.message || "Please try again in a moment.",
      });
    } finally {
      setIsGeneratingAudio(prev => ({...prev, [audioGenKey]: false}));
    }
  }
  
  useEffect(() => {
    const wordToUpdate = allWords.find(word => word.id === accordionValue);
    if (wordToUpdate) {
        incrementViewCount(wordToUpdate);
    }
  }, [accordionValue]);

  const toggleAccordionItem = (id: string) => {
    setAccordionValue(prev => prev === id ? undefined : id);
  }

  return (
    <div className="border rounded-lg">
      <audio ref={audioRef} className="hidden" />
       <Accordion type="single" collapsible className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
        {words.length > 0 ? (
            words.map((word) => (
              <AccordionItem value={word.id} key={word.id} className="border-b last:border-b-0">
                  <div className="flex items-center">
                    <div 
                      className="flex-1 text-left cursor-pointer transition-colors hover:bg-muted/50 p-4" 
                      onClick={() => toggleAccordionItem(word.id)}
                    >
                      {/* Desktop View */}
                      <div className="hidden md:flex flex-1 items-center gap-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'term'); }}
                            disabled={isGeneratingAudio[`${word.id}-term`]}
                            className="h-8 w-8 flex-shrink-0"
                          >
                            {isGeneratingAudio[`${word.id}-term`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                            <span className="sr-only">Play term audio</span>
                          </Button>
                          <div className="flex-1 grid grid-cols-[minmax(200px,1.5fr),2fr] gap-x-6 items-center">
                            <div>
                                <p className="font-semibold">{word.term}</p>
                                <div className="text-sm text-muted-foreground font-sans">{word.pronunciation}</div>
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
                        <div className="md:hidden flex items-center gap-3 flex-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handlePlayAudio(word, 'term'); }}
                              disabled={isGeneratingAudio[`${word.id}-term`]}
                              className="h-8 w-8 flex-shrink-0"
                            >
                              {isGeneratingAudio[`${word.id}-term`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                              <span className="sr-only">Play term audio</span>
                            </Button>
                            <div>
                                <p className="font-semibold">{word.term}</p>
                                <div className="text-sm text-muted-foreground font-sans">{word.pronunciation}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pr-2">
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
                           <span className="sr-only">Toggle Details</span>
                        </AccordionTrigger>
                    </div>
                  </div>
                  <AccordionContent>
                    <div className="px-4 pb-4 pt-0 pl-16 space-y-4 text-sm">
                        <div className="md:hidden">
                          <div className="font-semibold text-muted-foreground">Part of Speech: <Badge variant="outline" className="ml-1">{word.partOfSpeech}</Badge></div>
                          <div className="mt-1"><strong className="font-semibold text-muted-foreground">Definition (EN): </strong>{word.definition}</div>
                           <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="flex items-center gap-1.5">
                                  <Eye className="h-3 w-3" />
                                  {word.viewCount || 0}
                                </Badge>
                              </div>
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
                                  disabled={isGeneratingAudio[`${word.id}-sentence`]}
                                  className="h-8 w-8 flex-shrink-0 -ml-2"
                              >
                                  {isGeneratingAudio[`${word.id}-sentence`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                  <span className="sr-only">Play sentence audio</span>
                              </Button>
                              <p className="italic pt-1.5">"{word.sentence}"</p>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Example (VI):</p>
                          <p className="italic ml-10">"{word.vietnameseSentence}"</p>
                        </div>
                    </div>
                  </AccordionContent>
              </AccordionItem>
            ))
          ) : (
            <div className="h-24 text-center flex items-center justify-center text-sm text-muted-foreground">
                Your vocabulary list is empty. Add a new word to get started!
            </div>
          )}
      </Accordion>
    </div>
  );
}


const VocabularyList: FC<VocabularyListProps> = ({ words, setWords }) => {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  
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
      
      const newWords = await addMultipleWordsToVocabulary(result.vocabulary, user.uid);

      setWords(prevWords => {
          const newWordsMap = new Map(newWords.map(w => [w.id, w]));
          const updatedPrevWords = prevWords.map(pw => newWordsMap.get(pw.id) || pw);
          const trulyNewWords = newWords.filter(nw => !prevWords.some(pw => pw.id === nw.id));
          return [...trulyNewWords, ...updatedPrevWords];
      });

      toast({
        title: "Success",
        description: `${newWords.length} words were successfully imported or updated.`,
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
  
  const handleGroupByTopic = async () => {
    setIsGrouping(true);
    setViewMode('grouped');
    try {
      const wordsToGroup = words.filter(word => !word.topic);
      
      if (wordsToGroup.length > 0) {
        toast({ title: "AI is at work!", description: `Grouping ${wordsToGroup.length} new word(s) by topic.`});
        
        const plainWordsToGroup = wordsToGroup.map(({ id, userId, favorite, viewCount, createdAt, audioUrl, sentenceAudioUrl, topic, ...rest }) => rest);
        const result = await groupVocabularyByTopic({ vocabulary: plainWordsToGroup as VocabularyEntry[] });
        
        const updatedWords = [...words];
        for (const topicGroup of result.topics) {
          for (const wordFromAI of topicGroup.words) {
            const originalWordIndex = updatedWords.findIndex(w => w.term === wordFromAI.term);
            if (originalWordIndex !== -1) {
              const wordToUpdate = updatedWords[originalWordIndex];
              const newTopic = topicGroup.topic;
              updatedWords[originalWordIndex] = { ...wordToUpdate, topic: newTopic };
              // Update in Firestore without waiting
              updateUserVocabulary(wordToUpdate.id, { topic: newTopic }).catch(console.error);
            }
          }
        }
        setWords(updatedWords);
      } else {
        toast({ title: "All words are grouped!", description: "No new words to classify."});
      }

    } catch (error) {
        console.error("Error grouping by topic:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not group words by topic." });
        setViewMode('list'); // Revert view mode on error
    } finally {
        setIsGrouping(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }

  const filteredWords = words
    .filter(word => showOnlyFavorites ? word.favorite : true)
    .filter(word => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const termMatch = word.term.toLowerCase().includes(query);
      const topicMatch = word.topic?.toLowerCase().includes(query);
      return termMatch || topicMatch;
    });

  const renderContent = () => {
    if (viewMode === 'grouped') {
        if (isGrouping) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">AI is analyzing your vocabulary...</p>
                </div>
            )
        }
        return <GroupedView words={filteredWords} setWords={setWords} />;
    }

    return <VocabularyListInternal words={filteredWords} allWords={words} setWords={setWords} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <CardTitle>My Vocabulary</CardTitle>
            <CardDescription>
              A personalized list of words, phrases, and sentences you are learning.
            </CardDescription>
          </div>
          <div className="flex-1">
             <Input
                placeholder="Search by word or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:max-w-xs"
              />
          </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
             <div className="flex items-center space-x-2">
                <Switch
                    id="view-mode"
                    checked={viewMode === 'grouped'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleGroupByTopic();
                      } else {
                        setViewMode('list');
                      }
                    }}
                    disabled={isGrouping}
                />
                <Label htmlFor="view-mode">Group by Topic</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="favorites-only"
                checked={showOnlyFavorites}
                onCheckedChange={setShowOnlyFavorites}
              />
              <Label htmlFor="favorites-only">Favorites</Label>
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
                  setWords={setWords}
                  trigger={
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Word
                      </Button>
                  }
               />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default VocabularyList;
