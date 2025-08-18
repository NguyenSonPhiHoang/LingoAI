
"use client";

import { useState } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { Loader2, Sparkles, PlusCircle } from "lucide-react";
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
import type { GenerateWordDetailsOutput } from "@/ai/flows/schemas";
import { addWordToFirestore } from "@/services/vocabulary";
import type { Word } from "./vocabulary-list";

interface AddWordDialogProps {
  user: any;
  setWords: Dispatch<SetStateAction<Word[]>>;
  trigger: React.ReactNode;
}

const AddWordDialog: FC<AddWordDialogProps> = ({
  user,
  setWords,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [generatedDetails, setGeneratedDetails] =
    useState<GenerateWordDetailsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDialogOpen = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTerm(text.trim());
      }
    } catch (error) {
      // This can happen if the user hasn't granted permission to the clipboard API
      // or if they are in an insecure context (not HTTPS). We can ignore this error
      // and just open the dialog without pre-filling.
      console.warn("Could not read from clipboard:", error);
    }
    setIsOpen(true);
  };
  
  const handleCloseDialog = () => {
    setTerm("");
    setGeneratedDetails(null);
    setIsGenerating(false);
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

    const newWordData: Omit<Word, "id" | "docId" | "createdAt"> = {
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
      setWords((prevWords) => [savedWord, ...prevWords]);
      handleCloseDialog();
      toast({ title: "Success", description: "Word added to your list." });
    } catch (error) {
      console.error("Error adding word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the word.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <div onClick={handleDialogOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Word with AI</DialogTitle>
          <DialogDescription>
            Copy a word/phrase, then open this dialog. It will be pasted
            automatically.
          </DialogDescription>
        </DialogHeader>
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
              placeholder="Type or paste here"
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
        </div>
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
            disabled={!generatedDetails || isGenerating}
          >
            Save Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWordDialog;

    