
"use client";

import { useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateWordDetails } from "@/ai/flows/generate-word-details";
import { extractVocabularyFromFile } from "@/ai/flows/extract-vocabulary";
import type { GenerateWordDetailsOutput, VocabularyEntry } from "@/ai/flows/schemas";
import { addWordToVocabulary, addMultipleWordsToVocabulary, type CombinedVocabulary } from "@/services/vocabulary";
import { useAuth } from "@/context/auth-context";
import Image from 'next/image';
import VocabularyImportPreview from "./vocabulary-import-preview";


interface AddWordDialogProps {
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
  trigger: React.ReactNode;
}

const AddWordDialog: FC<AddWordDialogProps> = ({
  setWords,
  trigger,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [generatedDetails, setGeneratedDetails] =
    useState<GenerateWordDetailsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // State for clipboard image
  const [clipboardImage, setClipboardImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedWords, setExtractedWords] = useState<VocabularyEntry[]>([]);


  const handleDialogOpen = async () => {
    // Reset all state when opening
    setTerm("");
    setGeneratedDetails(null);
    setIsGenerating(false);
    setClipboardImage(null);
    setExtractedWords([]);
    setIsExtracting(false);
    setIsOpen(true);
    
    try {
        if (!navigator.clipboard.read) {
            // Fallback for older browsers
             const text = await navigator.clipboard.readText();
             if (text) setTerm(text.trim());
             return;
        }

        const items = await navigator.clipboard.read();
        let foundText = false;
        for (const item of items) {
            if (item.types.includes("text/plain")) {
                const blob = await item.getType("text/plain");
                const text = await blob.text();
                if (text) {
                    setTerm(text.trim());
                    foundText = true;
                }
                break; // Prioritize text
            }
        }
        
        if (!foundText) {
             for (const item of items) {
                const imageType = item.types.find(type => type.startsWith("image/"));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = () => {
                        setClipboardImage(reader.result as string);
                    };
                    reader.readAsDataURL(blob);
                    break; 
                }
            }
        }

    } catch (error) {
      console.warn("Could not read from clipboard:", error);
    }
  };
  
  const handleCloseDialog = () => {
    setIsOpen(false);
  };


  const handleGenerateDetails = async () => {
    if (!term) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a term to generate details.",
      });
      return;
    }
    setIsGenerating(true);
    setGeneratedDetails(null);
    try {
      const result = await generateWordDetails({ term });
      setGeneratedDetails(result);
    } catch (error) {
      console.error("Error generating word details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate details for the word.",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExtractFromImage = async () => {
      if (!clipboardImage || !user) return;
      setIsExtracting(true);
      setExtractedWords([]);
      try {
          const result = await extractVocabularyFromFile({ imageDataUri: clipboardImage });
          if (result.vocabulary.length === 0) {
              toast({ title: "No Words Found", description: "The AI could not find any vocabulary in the image." });
          } else {
              setExtractedWords(result.vocabulary);
          }
      } catch (error) {
          console.error("Error extracting from image:", error);
          toast({ variant: "destructive", title: "Extraction Failed", description: "Could not extract words from the image." });
      } finally {
          setIsExtracting(false);
      }
  };
  
  const handleSaveImportedWords = async (wordsToSave: VocabularyEntry[]) => {
      if (!user) return;
      setIsSaving(true);
      try {
          const newWords = await addMultipleWordsToVocabulary(wordsToSave, user.uid);
          setWords(prevWords => {
              const prevWordsMap = new Map(prevWords.map(w => [w.userVocabularyId, w]));
              newWords.forEach(nw => prevWordsMap.set(nw.userVocabularyId, nw));
              return Array.from(prevWordsMap.values()).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          });
          toast({ title: "Success!", description: `${newWords.length} words were imported.` });
          handleCloseDialog();
      } catch (error) {
          console.error("Error saving imported words:", error);
          toast({ variant: "destructive", title: "Save Failed", description: "Could not save the imported words." });
      } finally {
          setIsSaving(false);
      }
  };


  const handleSaveWord = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in.",
      });
      return;
    }
    if (!term || !generatedDetails) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please generate details before saving.",
      });
      return;
    }
    setIsSaving(true);
    
    try {
      const fullWordData = { term, ...generatedDetails };
      const savedCombinedVocabulary = await addWordToVocabulary(user.uid, fullWordData);
      
      setWords((prevWords) => {
        if (!prevWords || prevWords.length === 0) {
            return [savedCombinedVocabulary];
        }
        
        // Check if the word already exists in the local state by its user-specific ID.
        const existingWordIndex = prevWords.findIndex(w => w.userVocabularyId === savedCombinedVocabulary.userVocabularyId);
        if (existingWordIndex !== -1) {
          // If it exists, update it. This is crucial for UI consistency.
          const newWords = [...prevWords];
          newWords[existingWordIndex] = savedCombinedVocabulary;
          return newWords;
        } else {
          // If it's a new word for the user, add it to the top of the list.
          return [savedCombinedVocabulary, ...prevWords];
        }
      });

      handleCloseDialog();
      toast({ title: "Success", description: `"${savedCombinedVocabulary.term}" saved to your list.` });
    } catch (error) {
      console.error("Error adding word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the word.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderMainContent = () => {
      if (extractedWords.length > 0) {
          return (
             <VocabularyImportPreview 
                words={extractedWords} 
                onSave={handleSaveImportedWords}
                isSaving={isSaving}
             />
          );
      }
      
      return (
        <div className="space-y-4">
            <DialogDescription>
              Enter a word/phrase, or copy text/image before opening. The tool will automatically paste it for you.
            </DialogDescription>
             <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="term" className="text-right">
                  Term
                </Label>
                <Input
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="col-span-3"
                  placeholder="Type or paste text here"
                  disabled={!!clipboardImage}
                />
              </div>
              <Button
                onClick={handleGenerateDetails}
                disabled={isGenerating || !term}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
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
                    <div>
                      <strong className="text-muted-foreground">Part of Speech:</strong>{" "}
                      {generatedDetails.partOfSpeech}
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Pronunciation:</strong>{" "}
                      <span className="font-sans">{generatedDetails.pronunciation}</span>
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Definition (EN):</strong>{" "}
                      {generatedDetails.definition}
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Definition (VI):</strong>{" "}
                      {generatedDetails.vietnameseDefinition}
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Example (EN):</strong> "
                      {generatedDetails.sentence}"
                    </div>
                    <div>
                      <strong className="text-muted-foreground">Example (VI):</strong> "
                      {generatedDetails.vietnameseSentence}"
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    AI-generated details will appear here.
                  </div>
                )}
              </div>
              {clipboardImage && (
                    <div className="space-y-4">
                        <div className="relative border-2 border-dashed rounded-lg p-2">
                            <Image src={clipboardImage} alt="Clipboard image" width={150} height={100} className="w-full h-auto rounded-md object-contain max-h-48" />
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <span className="text-white font-semibold bg-black/50 px-2 py-1 rounded">Image from Clipboard</span>
                            </div>
                        </div>
                        <Button onClick={handleExtractFromImage} disabled={isExtracting} className="w-full">
                            {isExtracting ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                            Extract Words from Image
                        </Button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild onClick={handleDialogOpen}>
            {trigger}
        </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Word with AI</DialogTitle>
        </DialogHeader>
        
        {renderMainContent()}
        
        {extractedWords.length === 0 && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveWord}
                disabled={!generatedDetails || isGenerating || isSaving}
              >
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Word
              </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddWordDialog;
