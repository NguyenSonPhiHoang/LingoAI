"use client";

import { useRef, useState } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { PlusCircle, Trash2, Upload, Loader2, Volume2, Star } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { extractVocabularyFromFile } from "@/ai/flows/extract-vocabulary";
import { generateAudio } from "@/ai/flows/generate-audio";
import type { VocabularyEntry } from "@/ai/flows/schemas";
import { Switch } from "@/components/ui/switch";
import { addWordToFirestore, deleteWordFromFirestore, updateWordInFirestore, addMultipleWordsToFirestore } from "@/services/vocabulary";
import { useAuth } from "@/context/auth-context";


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

const VocabularyList: FC<VocabularyListProps> = ({ words, setWords }) => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleAddWord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add a word." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    const newWordData = {
      term: formData.get("term") as string,
      pronunciation: formData.get("pronunciation") as string,
      definition: formData.get("definition") as string,
      sentence: formData.get("sentence") as string,
      favorite: false,
      viewCount: 0,
      userId: user.uid,
    };
    if (newWordData.term && newWordData.definition) {
      try {
        const savedWord = await addWordToFirestore(newWordData);
        setWords(prevWords => [savedWord, ...prevWords]);
        setIsDialogOpen(false);
        toast({ title: "Success", description: "Word added to your list." });
      } catch (error) {
        console.error("Error adding word:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the word." });
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
    const newViewCount = word.viewCount + 1;
    setWords(prev => prev.map(w => w.id === word.id ? { ...w, viewCount: newViewCount } : w));
    try {
        await updateWordInFirestore(word.docId, { viewCount: newViewCount });
    } catch (error) {
        console.error("Error updating view count:", error);
        // Optionally revert state or show toast
    }
  }

  const handlePlayAudio = async (wordId: string, type: 'term' | 'sentence') => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;
  
    incrementViewCount(word);
    const textToSpeak = type === 'term' ? word.term : word.sentence;
    let audioUrl = type === 'term' ? word.audioUrl : word.sentenceAudioUrl;
    const isGenerating = type === 'term' ? word.isGeneratingAudio : word.isGeneratingSentenceAudio;
  
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      return;
    }
  
    if (isGenerating) return;
  
    try {
      setWords(prev => prev.map(w => w.id === wordId ? (type === 'term' ? { ...w, isGeneratingAudio: true } : { ...w, isGeneratingSentenceAudio: true }) : w));
      const result = await generateAudio(textToSpeak);
      audioUrl = result.audioUrl;
      
      const updateData = type === 'term' ? { audioUrl: audioUrl, isGeneratingAudio: false } : { sentenceAudioUrl: audioUrl, isGeneratingSentenceAudio: false };
      
      setWords(prev => prev.map(w => w.id === wordId ? { ...w, ...updateData } : w));
      await updateWordInFirestore(word.docId, type === 'term' ? { audioUrl } : { sentenceAudioUrl: audioUrl });

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
  
    } catch (error) {
       console.error("Error generating audio:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate audio. Please try again.",
      });
       const updateData = type === 'term' ? { isGeneratingAudio: false } : { isGeneratingSentenceAudio: false };
       setWords(prev => prev.map(w => w.id === wordId ? { ...w, ...updateData } : w));
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
              A personalized list of words you are learning.
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
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Word
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Word</DialogTitle>
                    <DialogDescription>
                      Save a new word to your personal vocabulary list.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddWord}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="term" className="text-right">
                          Term
                        </Label>
                        <Input id="term" name="term" className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pronunciation" className="text-right">
                          Pronunciation
                        </Label>
                        <Input id="pronunciation" name="pronunciation" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="definition" className="text-right">
                          Definition
                        </Label>
                        <Input
                          id="definition"
                          name="definition"
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sentence" className="text-right">
                          Sentence
                        </Label>
                        <Input
                          id="sentence"
                          name="sentence"
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save Word</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Term & Audio</TableHead>
              <TableHead className="w-[50%]">Definition & Example</TableHead>
              <TableHead className="text-center">Favorite</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWords.length > 0 ? (
              filteredWords.map((word) => (
                <TableRow key={word.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlayAudio(word.id, 'term')}
                        disabled={word.isGeneratingAudio}
                        className="h-8 w-8"
                      >
                        {word.isGeneratingAudio ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Play term audio</span>
                      </Button>
                      <div>
                        <p>{word.term}</p>
                        <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{word.definition}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlayAudio(word.id, 'sentence')}
                        disabled={word.isGeneratingSentenceAudio}
                        className="h-8 w-8"
                      >
                        {word.isGeneratingSentenceAudio ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Play sentence audio</span>
                      </Button>
                      <p className="text-sm text-muted-foreground italic">
                        "{word.sentence}"
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => toggleFavorite(word)}>
                      <Star className={`h-5 w-5 ${word.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                      <span className="sr-only">Favorite</span>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center font-medium">{word.viewCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWord(word)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                   {showOnlyFavorites
                    ? "You don't have any favorite words yet. Go ahead and star a few!"
                    : "Your vocabulary list is empty. Add a new word to get started!"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VocabularyList;
