"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import {
  PlusCircle,
  Trash2,
  Upload,
  Loader2,
  Volume2,
  Star,
  Pencil,
  Eye,
  Search,
  Languages,
  Wand2,
} from "lucide-react";
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
import { generateWordDetails } from "@/ai/flows/generate-word-details";
import { generateAudio } from "@/ai/flows/generate-audio";
import { groupVocabularyByTopic } from "@/ai/flows/group-vocabulary";
import type { VocabularyTopic } from "@/ai/flows/schemas";
import { Switch } from "@/components/ui/switch";
import {
  addWordToVocabulary,
  deleteUserVocabulary,
  updateUserVocabulary,
  updateWord,
  addMultipleWordsToVocabulary,
} from "@/services/vocabulary";
import type { CombinedVocabulary } from "@/services/vocabulary";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import AddWordDialog from "./add-word-dialog";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import InteractiveText from "./interactive-text";
import { useSettings } from "@/context/settings-context";

interface VocabularyListProps {
  words: CombinedVocabulary[];
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}

const editWordSchema = z.object({
  partOfSpeech: z.string(),
  definition: z.string().min(1, "Definition cannot be empty."),
  vietnameseDefinition: z.string(),
  sentence: z.string().min(1, "Example sentence cannot be empty."),
  vietnameseSentence: z.string(),
  synonyms: z.string().optional(),
  antonyms: z.string().optional(),
  v1: z.string().optional(),
  v2: z.string().optional(),
  v3: z.string().optional(),
  wordFormsNoun: z.string().optional(),
  wordFormsVerb: z.string().optional(),
  wordFormsAdjective: z.string().optional(),
  wordFormsAdverb: z.string().optional(),
});

const EditWordDialog: FC<{
  word: CombinedVocabulary;
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}> = ({ word, setWords }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [globalTerm, setGlobalTerm] = useState(word.term);
  const [globalPronunciation, setGlobalPronunciation] = useState(
    word.pronunciation || ""
  );
  const { toast } = useToast();
  const { isAdmin, isTeacher } = useAuth();

  const canEditGlobal = isAdmin() || isTeacher();

  useEffect(() => {
    if (!isOpen) return;
    setGlobalTerm(word.term);
    setGlobalPronunciation(word.pronunciation || "");
  }, [isOpen, word.term, word.pronunciation]);

  const form = useForm<z.infer<typeof editWordSchema>>({
    resolver: zodResolver(editWordSchema),
    defaultValues: {
      partOfSpeech: word.partOfSpeech,
      definition: word.definition,
      vietnameseDefinition: word.vietnameseDefinition,
      sentence: word.sentence,
      vietnameseSentence: word.vietnameseSentence,
      synonyms: word.synonyms?.join(", ") || "",
      antonyms: word.antonyms?.join(", ") || "",
      v1: word.irregularForms?.v1 || "",
      v2: word.irregularForms?.v2 || "",
      v3: word.irregularForms?.v3 || "",
      wordFormsNoun: word.wordForms?.noun || "",
      wordFormsVerb: word.wordForms?.verb || "",
      wordFormsAdjective: word.wordForms?.adjective || "",
      wordFormsAdverb: word.wordForms?.adverb || "",
    },
  });

  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    try {
      const result = await generateWordDetails({ term: word.term });

      form.reset({
        partOfSpeech: result.partOfSpeech || "",
        definition: result.definition || "",
        vietnameseDefinition: result.vietnameseDefinition || "",
        sentence: result.sentence || "",
        vietnameseSentence: result.vietnameseSentence || "",
        synonyms: Array.isArray(result.synonyms)
          ? result.synonyms.join(", ")
          : "",
        antonyms: Array.isArray(result.antonyms)
          ? result.antonyms.join(", ")
          : "",
        v1: result.irregularForms?.v1 || "",
        v2: result.irregularForms?.v2 || "",
        v3: result.irregularForms?.v3 || "",
        wordFormsNoun: result.wordForms?.noun || "",
        wordFormsVerb: result.wordForms?.verb || "",
        wordFormsAdjective: result.wordForms?.adjective || "",
        wordFormsAdverb: result.wordForms?.adverb || "",
      });

      if (canEditGlobal && typeof result.pronunciation === "string") {
        setGlobalPronunciation(result.pronunciation);
      }

      toast({
        title: "AI generated",
        description: "Fields were regenerated. Review and save.",
      });
    } catch (error) {
      console.error("Error generating word details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate details for this word.",
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof editWordSchema>) => {
    setIsSaving(true);
    try {
      const updates: Partial<CombinedVocabulary> = {
        partOfSpeech: values.partOfSpeech,
        definition: values.definition,
        vietnameseDefinition: values.vietnameseDefinition,
        sentence: values.sentence,
        vietnameseSentence: values.vietnameseSentence,
        synonyms:
          values.synonyms
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) || [],
        antonyms:
          values.antonyms
            ?.split(",")
            .map((a) => a.trim())
            .filter(Boolean) || [],
      };

      if (values.v1 && values.v2 && values.v3) {
        updates.irregularForms = {
          v1: values.v1,
          v2: values.v2,
          v3: values.v3,
        };
      } else {
        updates.irregularForms = undefined;
      }

      const wordForms = {
        noun: values.wordFormsNoun?.trim() || undefined,
        verb: values.wordFormsVerb?.trim() || undefined,
        adjective: values.wordFormsAdjective?.trim() || undefined,
        adverb: values.wordFormsAdverb?.trim() || undefined,
      };
      if (
        wordForms.noun ||
        wordForms.verb ||
        wordForms.adjective ||
        wordForms.adverb
      ) {
        updates.wordForms = wordForms;
      } else {
        updates.wordForms = undefined;
      }

      // Guarantee core fields stay populated even when editing from any feature.
      // If any required fields are missing/blank, regenerate and fill only the missing ones.
      const effective = { ...word, ...updates } as any;
      const missingCore =
        !String(effective.partOfSpeech || "").trim() ||
        !String(effective.definition || "").trim() ||
        !String(effective.vietnameseDefinition || "").trim() ||
        !String(effective.sentence || "").trim() ||
        !String(effective.vietnameseSentence || "").trim();

      if (missingCore) {
        try {
          const regenerated = await generateWordDetails({ term: word.term });

          if (!String(effective.partOfSpeech || "").trim())
            updates.partOfSpeech = regenerated.partOfSpeech;
          if (!String(effective.definition || "").trim())
            updates.definition = regenerated.definition;
          if (!String(effective.vietnameseDefinition || "").trim())
            updates.vietnameseDefinition = regenerated.vietnameseDefinition;
          if (!String(effective.sentence || "").trim())
            updates.sentence = regenerated.sentence;
          if (!String(effective.vietnameseSentence || "").trim())
            updates.vietnameseSentence = regenerated.vietnameseSentence;

          const effSynonyms = Array.isArray(effective.synonyms)
            ? effective.synonyms
            : [];
          const effAntonyms = Array.isArray(effective.antonyms)
            ? effective.antonyms
            : [];
          if (effSynonyms.length === 0 && Array.isArray(regenerated.synonyms)) {
            updates.synonyms = regenerated.synonyms;
          }
          if (effAntonyms.length === 0 && Array.isArray(regenerated.antonyms)) {
            updates.antonyms = regenerated.antonyms;
          }

          if (!effective.irregularForms && regenerated.irregularForms) {
            // Only fill if currently missing (avoid undoing explicit clears).
            if (updates.irregularForms === undefined) {
              updates.irregularForms = regenerated.irregularForms as any;
            }
          }
          if (!effective.wordForms && regenerated.wordForms) {
            if (updates.wordForms === undefined) {
              updates.wordForms = regenerated.wordForms as any;
            }
          }
        } catch {
          // If AI generation fails, fall back to saving what user provided.
        }
      }

      await updateUserVocabulary(word.userVocabularyId, updates);
      setWords((prev) =>
        prev.map((w) =>
          w.userVocabularyId === word.userVocabularyId
            ? { ...w, ...updates }
            : w
        )
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

  const handleGlobalUpdate = async (globalValues: {
    term: string;
    pronunciation: string;
  }) => {
    if (!canEditGlobal) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only teachers/admins can edit global word properties.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const cleanTerm = String(globalValues.term || "").trim();
      let cleanPron = String(globalValues.pronunciation || "").trim();
      if (!cleanPron) {
        const regenerated = await generateWordDetails({
          term: cleanTerm || word.term,
        });
        cleanPron = String(regenerated.pronunciation || "").trim();
      }

      await updateWord(word.id, { term: cleanTerm, pronunciation: cleanPron });
      setWords((prev) =>
        prev.map((w) =>
          w.id === word.id
            ? { ...w, term: cleanTerm, pronunciation: cleanPron }
            : w
        )
      );
      toast({
        title: "Global Word Updated",
        description: `The term "${cleanTerm}" has been updated for all users.`,
      });
    } catch (error) {
      console.error("Error updating global word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the global word.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
          <span className="sr-only">Edit Word</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit: {word.term}</DialogTitle>
          <DialogDescription>
            Make changes to your personalized word details here. As an admin,
            you can also edit the global term and pronunciation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-h-[60vh] overflow-y-auto p-1"
          >
            {canEditGlobal && (
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Global Properties (Teacher/Admin)
                  </CardTitle>
                  <CardDescription>
                    Changes here affect all users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Term</FormLabel>
                    <FormControl>
                      <Input
                        value={globalTerm}
                        onChange={(e) => setGlobalTerm(e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Pronunciation (IPA)</FormLabel>
                    <FormControl>
                      <Input
                        value={globalPronunciation}
                        onChange={(e) => setGlobalPronunciation(e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setIsGeneratingAi(true);
                        try {
                          const result = await generateWordDetails({
                            term: globalTerm || word.term,
                          });
                          if (typeof result.pronunciation === "string") {
                            setGlobalPronunciation(result.pronunciation);
                            toast({
                              title: "AI generated",
                              description: "IPA pronunciation filled.",
                            });
                          }
                        } catch (error) {
                          console.error(
                            "Error generating pronunciation:",
                            error
                          );
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Could not generate pronunciation.",
                          });
                        } finally {
                          setIsGeneratingAi(false);
                        }
                      }}
                      disabled={isSaving || isGeneratingAi}
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Generate IPA
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        handleGlobalUpdate({
                          term: globalTerm,
                          pronunciation: globalPronunciation,
                        })
                      }
                      disabled={isSaving || isGeneratingAi}
                    >
                      Save Global Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    Personalized Properties
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAi}
                    disabled={isSaving || isGeneratingAi}
                  >
                    {isGeneratingAi ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <CardDescription>
                  Changes here only affect your own vocabulary list.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="synonyms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Synonyms</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter synonyms, separated by commas"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="antonyms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antonyms</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter antonyms, separated by commas"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Irregular Verb Forms</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="v1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>V1</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="v2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>V2</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="v3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>V3</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Word Forms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="wordFormsNoun"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Noun</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., decision" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wordFormsVerb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verb</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., decide" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wordFormsAdjective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adjective</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., decisive" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wordFormsAdverb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adverb</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., decisively" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <DialogFooter className="sticky bottom-0 bg-background pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isGeneratingAi}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Personalized Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const GroupedView: FC<{
  words: CombinedVocabulary[];
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}> = ({ words, setWords }) => {
  const grouped = words.reduce((acc, word) => {
    const topic = word.topic || "Miscellaneous";
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(word);
    return acc;
  }, {} as Record<string, CombinedVocabulary[]>);

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
      {topics.map((topic) => (
        <Card key={topic}>
          <CardHeader>
            <CardTitle>{topic}</CardTitle>
          </CardHeader>
          <CardContent>
            <VocabularyListInternal
              words={grouped[topic]}
              allWords={words}
              setWords={setWords}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const RelatedWordBadge: FC<{
  word: string;
  variant?: "secondary" | "outline";
  wordMap: Map<string, CombinedVocabulary>;
  playbackHook: ReturnType<typeof useAudioPlayback>;
}> = ({ word, variant, wordMap, playbackHook }) => {
  const relatedWordData = wordMap.get(word.toLowerCase());

  if (relatedWordData) {
    const audioKey = relatedWordData.userVocabularyId || relatedWordData.id;
    const isAudioLoading = playbackHook.isLoadingAudio[audioKey];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant={variant}
              className="cursor-pointer border-primary/50"
            >
              {word}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex justify-between items-center gap-2">
              <div>
                <div className="font-bold font-sans">
                  {relatedWordData.pronunciation}
                </div>
                <div className="text-muted-foreground">
                  {relatedWordData.vietnameseDefinition}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  playbackHook.playTermAudio(relatedWordData);
                }}
                disabled={isAudioLoading}
              >
                {isAudioLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Badge variant={variant}>{word}</Badge>;
};

const VocabularyListInternal: FC<{
  words: CombinedVocabulary[];
  allWords: CombinedVocabulary[];
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}> = ({ words, allWords, setWords }) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    undefined
  );
  const { speechRate } = useSettings();
  const playbackHook = useAudioPlayback({ setWords, speechRate });
  const { toast } = useToast();

  const allWordsMap = useMemo(() => {
    const map = new Map<string, CombinedVocabulary>();
    allWords.forEach((w) => map.set(w.term.toLowerCase(), w));
    return map;
  }, [allWords]);

  const handleDeleteWord = async (wordToDelete: CombinedVocabulary) => {
    try {
      await deleteUserVocabulary(wordToDelete.userVocabularyId);
      setWords(
        allWords.filter(
          (w) => w.userVocabularyId !== wordToDelete.userVocabularyId
        )
      );
      toast({ title: "Success", description: "Word deleted." });
    } catch (error) {
      console.error("Error deleting word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the word.",
      });
    }
  };

  const toggleFavorite = async (wordToUpdate: CombinedVocabulary) => {
    const newFavoriteState = !wordToUpdate.favorite;
    const optimisticWords = allWords.map((w) =>
      w.userVocabularyId === wordToUpdate.userVocabularyId
        ? { ...w, favorite: newFavoriteState }
        : w
    );
    setWords(optimisticWords);
    try {
      await updateUserVocabulary(wordToUpdate.userVocabularyId, {
        favorite: newFavoriteState,
      });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      // Revert on failure
      setWords(
        allWords.map((w) =>
          w.userVocabularyId === wordToUpdate.userVocabularyId
            ? { ...w, favorite: !newFavoriteState }
            : w
        )
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update favorite status.",
      });
    }
  };

  const toggleAccordionItem = (id: string) => {
    setAccordionValue((prev) => (prev === id ? undefined : id));
  };

  return (
    <div className="border rounded-lg">
      <audio ref={playbackHook.audioRef} className="hidden" />
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        {words.length > 0 ? (
          words.map((word) => {
            const termAudioKey = `${word.userVocabularyId}-term`;
            const sentenceAudioKey = `${word.userVocabularyId}-sentence`;
            const definitionTranslationKey = `${word.userVocabularyId}-definition`;
            const isTermAudioLoading =
              playbackHook.isLoadingAudio[termAudioKey];
            const isSentenceAudioLoading =
              playbackHook.isLoadingAudio[sentenceAudioKey];
            const isDefinitionTranslating =
              playbackHook.isTranslating[definitionTranslationKey];

            return (
              <AccordionItem
                value={word.userVocabularyId}
                key={word.userVocabularyId}
                className="border-b last:border-b-0"
              >
                <div className="flex items-center">
                  <div
                    className="flex-1 text-left cursor-pointer transition-colors hover:bg-muted/50 p-4"
                    onClick={() => toggleAccordionItem(word.userVocabularyId)}
                  >
                    {/* Desktop View */}
                    <div className="hidden md:flex flex-1 items-center gap-4">
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            playbackHook.playTermAudio(word);
                          }}
                          disabled={isTermAudioLoading}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          {isTermAudioLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Volume2
                              className={cn(
                                "h-4 w-4",
                                word.audioUrl && "text-primary"
                              )}
                            />
                          )}
                          <span className="sr-only">Play term audio</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            playbackHook.toggleTranslation(
                              definitionTranslationKey,
                              word.definition
                            );
                          }}
                          disabled={isDefinitionTranslating}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          {isDefinitionTranslating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Languages className="h-4 w-4" />
                          )}
                          <span className="sr-only">Translate definition</span>
                        </Button>
                      </div>
                      <div className="flex-1 grid grid-cols-[minmax(200px,1.5fr),2fr] gap-x-6 items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{word.term}</p>
                            <Badge variant="outline">{word.partOfSpeech}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground font-sans">
                            {word.pronunciation}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{word.definition}</p>
                          {playbackHook.translations[
                            definitionTranslationKey
                          ] && (
                            <p className="text-blue-600 mt-1">
                              <strong>Dịch:</strong>{" "}
                              {
                                playbackHook.translations[
                                  definitionTranslationKey
                                ]
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Mobile View */}
                    <div className="md:hidden flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          playbackHook.playTermAudio(word);
                        }}
                        disabled={isTermAudioLoading}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        {isTermAudioLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2
                            className={cn(
                              "h-4 w-4",
                              word.audioUrl && "text-primary"
                            )}
                          />
                        )}
                        <span className="sr-only">Play term audio</span>
                      </Button>
                      <div>
                        <p className="font-semibold">{word.term}</p>
                        <div className="text-sm text-muted-foreground font-sans">
                          {word.pronunciation}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pr-2">
                    <EditWordDialog word={word} setWords={setWords} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(word);
                      }}
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          word.favorite
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                      <span className="sr-only">Favorite</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWord(word);
                      }}
                    >
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
                      <div className="font-semibold text-muted-foreground">
                        Part of Speech:{" "}
                        <Badge variant="outline" className="ml-1">
                          {word.partOfSpeech}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <strong className="font-semibold text-muted-foreground">
                          Definition (EN):{" "}
                        </strong>
                        {word.definition}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Vietnamese Definition:
                      </p>
                      <p>{word.vietnameseDefinition}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-muted-foreground">
                        Example (EN):
                      </p>
                      <div className="flex items-start gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            playbackHook.playSentenceAudio(word);
                          }}
                          className="h-8 w-8 flex-shrink-0 -ml-2"
                        >
                          <Volume2
                            className={cn(
                              "h-4 w-4",
                              word.sentenceAudioUrl && "text-primary"
                            )}
                          />
                          <span className="sr-only">Play sentence audio</span>
                        </Button>
                        <p className="italic pt-1.5">
                          "
                          <InteractiveText
                            text={word.sentence}
                            vocabulary={[]}
                            playbackHook={playbackHook}
                            activePlaybackKey={sentenceAudioKey}
                          />
                          "
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Example (VI):
                      </p>
                      <p className="italic ml-10">
                        "{word.vietnameseSentence}"
                      </p>
                    </div>

                    {word.synonyms && word.synonyms.length > 0 && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          Synonyms:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 ml-10">
                          {word.synonyms.map((s, i) => (
                            <RelatedWordBadge
                              key={`${s}-${i}`}
                              word={s}
                              variant="secondary"
                              wordMap={allWordsMap}
                              playbackHook={playbackHook}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {word.antonyms && word.antonyms.length > 0 && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          Antonyms:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 ml-10">
                          {word.antonyms.map((a, i) => (
                            <RelatedWordBadge
                              key={`${a}-${i}`}
                              word={a}
                              variant="outline"
                              wordMap={allWordsMap}
                              playbackHook={playbackHook}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {word.irregularForms && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          Irregular Verb Forms:
                        </p>
                        <div className="flex flex-wrap gap-4 mt-1 ml-10">
                          <div>
                            V1:{" "}
                            <Badge variant="secondary">
                              {word.irregularForms.v1}
                            </Badge>
                          </div>
                          <div>
                            V2:{" "}
                            <Badge variant="secondary">
                              {word.irregularForms.v2}
                            </Badge>
                          </div>
                          <div>
                            V3:{" "}
                            <Badge variant="secondary">
                              {word.irregularForms.v3}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    {word.wordForms &&
                      (word.wordForms.noun ||
                        word.wordForms.verb ||
                        word.wordForms.adjective ||
                        word.wordForms.adverb) && (
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Word Forms:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1 ml-10">
                            {word.wordForms.noun && (
                              <Badge variant="secondary">
                                Noun: {word.wordForms.noun}
                              </Badge>
                            )}
                            {word.wordForms.verb && (
                              <Badge variant="secondary">
                                Verb: {word.wordForms.verb}
                              </Badge>
                            )}
                            {word.wordForms.adjective && (
                              <Badge variant="secondary">
                                Adjective: {word.wordForms.adjective}
                              </Badge>
                            )}
                            {word.wordForms.adverb && (
                              <Badge variant="secondary">
                                Adverb: {word.wordForms.adverb}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })
        ) : (
          <div className="h-24 text-center flex items-center justify-center text-sm text-muted-foreground">
            Your vocabulary list is empty. Add a new word to get started!
          </div>
        )}
      </Accordion>
    </div>
  );
};

const VocabularyList: FC<VocabularyListProps> = ({ words, setWords }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [isBackfillingIpa, setIsBackfillingIpa] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userId = user?.uid || user?.id;
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to import words.",
      });
      return;
    }

    setIsImporting(true);
    try {
      let result;
      if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        result = await extractVocabularyFromFile({ documentContent: text });
      } else if (file.type.startsWith("image/")) {
        const imageDataUri = await fileToDataUri(file);
        result = await extractVocabularyFromFile({ imageDataUri });
      } else {
        toast({
          variant: "destructive",
          title: "Unsupported File",
          description: "Please upload a .docx or an image file.",
        });
        setIsImporting(false);
        return;
      }

      const newWords = await addMultipleWordsToVocabulary(
        result.vocabulary,
        userId
      );

      setWords((prevWords) => {
        const prevWordsMap = new Map(
          prevWords.map((w) => [w.userVocabularyId, w])
        );
        newWords.forEach((nw) => prevWordsMap.set(nw.userVocabularyId, nw));
        // Sort by creation date after merging
        return Array.from(prevWordsMap.values()).sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        );
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleGroupByTopic = async () => {
    if (!user) return;
    setIsGrouping(true);
    setViewMode("grouped");
    try {
      const wordsToGroup = words.filter((word) => !word.topic);

      if (wordsToGroup.length > 0) {
        toast({
          title: "AI is at work!",
          description: `Grouping ${wordsToGroup.length} new word(s) by topic.`,
        });

        // We need to construct the VocabularyEntrySchema for the AI flow
        const vocabularyForAI = wordsToGroup.map((w) => ({
          term: w.term,
          pronunciation: w.pronunciation,
          partOfSpeech: w.partOfSpeech,
          definition: w.definition,
          vietnameseDefinition: w.vietnameseDefinition,
          sentence: w.sentence,
          vietnameseSentence: w.vietnameseSentence,
        }));

        const result = await groupVocabularyByTopic({
          vocabulary: vocabularyForAI,
        });

        const updatedWords = [...words];
        for (const topicGroup of result.topics) {
          for (const wordFromAI of topicGroup.words) {
            const originalWordIndex = updatedWords.findIndex(
              (w) => w.term === wordFromAI.term
            );
            if (originalWordIndex !== -1) {
              const userWordToUpdate = updatedWords[originalWordIndex];
              const newTopic = topicGroup.topic;
              updatedWords[originalWordIndex] = {
                ...userWordToUpdate,
                topic: newTopic,
              };
              // Update in Firestore without waiting
              updateUserVocabulary(userWordToUpdate.userVocabularyId, {
                topic: newTopic,
              }).catch(console.error);
            }
          }
        }
        setWords(updatedWords);
      } else {
        toast({
          title: "All words are grouped!",
          description: "No new words to classify.",
        });
      }
    } catch (error) {
      console.error("Error grouping by topic:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not group words by topic.",
      });
      setViewMode("list"); // Revert view mode on error
    } finally {
      setIsGrouping(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const canEditGlobal = isAdmin() || isTeacher();

  const handleBackfillMissingIpa = async () => {
    if (!canEditGlobal) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only teachers/admins can update global pronunciation.",
      });
      return;
    }

    const targets = words.filter((w) => !(w.pronunciation || "").trim());
    if (targets.length === 0) {
      toast({
        title: "All set",
        description: "No missing IPA pronunciations.",
      });
      return;
    }

    setIsBackfillingIpa(true);
    toast({
      title: "AI is working",
      description: `Filling IPA for ${targets.length} word(s)...`,
    });

    let ok = 0;
    let failed = 0;
    try {
      for (const w of targets) {
        try {
          const details = await generateWordDetails({ term: w.term });
          const ipa = (details.pronunciation || "").trim();
          if (!ipa) {
            failed += 1;
            continue;
          }
          await updateWord(w.id, { pronunciation: ipa });
          ok += 1;
          setWords((prev) =>
            prev.map((x) => (x.id === w.id ? { ...x, pronunciation: ipa } : x))
          );
        } catch {
          failed += 1;
        }
      }
    } finally {
      setIsBackfillingIpa(false);
    }

    if (failed === 0) {
      toast({ title: "Done", description: `Filled IPA for ${ok} word(s).` });
    } else {
      toast({
        variant: "destructive",
        title: "Partially done",
        description: `Filled IPA for ${ok} word(s), failed for ${failed}.`,
      });
    }
  };

  const filteredWords = words
    .filter((word) => (showOnlyFavorites ? word.favorite : true))
    .filter((word) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const termMatch = word.term.toLowerCase().includes(query);
      const topicMatch = word.topic?.toLowerCase().includes(query);
      return termMatch || topicMatch;
    });

  const renderContent = () => {
    if (viewMode === "grouped") {
      if (isGrouping) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              AI is analyzing your vocabulary...
            </p>
          </div>
        );
      }
      return <GroupedView words={filteredWords} setWords={setWords} />;
    }

    return (
      <VocabularyListInternal
        words={filteredWords}
        allWords={words}
        setWords={setWords}
      />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Vocabulary</CardTitle>
          <CardDescription>
            A personalized list of words, phrases, and sentences you are
            learning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by word or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Switch
                  id="favorites-only"
                  checked={showOnlyFavorites}
                  onCheckedChange={setShowOnlyFavorites}
                />
                <Label htmlFor="favorites-only">Favorites</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="view-mode"
                  checked={viewMode === "grouped"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleGroupByTopic();
                    } else {
                      setViewMode("list");
                    }
                  }}
                  disabled={isGrouping}
                />
                <Label htmlFor="view-mode">Group</Label>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".docx,image/*"
              />
              {canEditGlobal && (
                <Button
                  onClick={handleBackfillMissingIpa}
                  disabled={isBackfillingIpa}
                  variant="outline"
                >
                  {isBackfillingIpa ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Fill Missing IPA
                </Button>
              )}
              <Button
                onClick={triggerFileSelect}
                disabled={isImporting}
                variant="outline"
              >
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default VocabularyList;
