"use client";

import * as React from "react";
import { useState, useEffect, type FC } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles, BookHeart, Save, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getVocabulary, type CombinedVocabulary } from "@/services/vocabulary";
import { getLessonStorybookSeed } from "@/services/lessons";
import {
  generateStorybook,
  type GenerateStorybookInput,
} from "@/ai/flows/generate-storybook-flow";
import { addStorybook } from "@/services/storybooks";
import {
  StorybookFormatSchema,
  UserLevelSchema,
  type GenerateStorybookOutput,
} from "@/ai/flows/schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Timestamp } from "firebase/firestore";

const formSchema = z
  .object({
    level: UserLevelSchema,
    format: StorybookFormatSchema,
    generationType: z.enum(["topic", "vocabulary"]),
    topic: z.string().optional(),
    vocabulary: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.generationType === "topic")
        return !!data.topic && data.topic.length > 2;
      if (data.generationType === "vocabulary")
        return !!data.vocabulary && data.vocabulary.length > 0;
      return false;
    },
    {
      message: "Please provide a topic or select at least one vocabulary word.",
      path: ["topic"],
    },
  );

const GenerateStorybookPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const lessonId = (searchParams.get("lessonId") || "").trim();
  const lessonLevelRaw = (searchParams.get("level") || "").trim();
  const lessonLevel =
    lessonLevelRaw === "beginner" ||
    lessonLevelRaw === "intermediate" ||
    lessonLevelRaw === "advanced"
      ? (lessonLevelRaw as z.infer<typeof UserLevelSchema>)
      : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedStory, setGeneratedStory] =
    useState<GenerateStorybookOutput | null>(null);
  const [favoriteWords, setFavoriteWords] = useState<CombinedVocabulary[]>([]);
  const [isVocabLoading, setIsVocabLoading] = useState(true);
  const playbackHook = useAudioPlayback({ setWords: setFavoriteWords });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      level: lessonLevel || "beginner",
      format: "bilingual",
      generationType: lessonId ? "vocabulary" : "topic",
      topic: "",
      vocabulary: [],
    },
  });

  useEffect(() => {
    if (!user) return;
    setIsVocabLoading(true);

    if (lessonId) {
      getLessonStorybookSeed(lessonId)
        .then((seed) => {
          const resolvedLevel = seed?.level || lessonLevel || "beginner";
          const vocabulary = seed?.vocabulary || [];

          form.setValue("level", resolvedLevel);

          const vocab = vocabulary.map((v) => ({
            id: v.term,
            term: v.term,
            term_normalized: v.term.toLowerCase(),
            pronunciation: "",
            createdAt: Timestamp.now(),
            audioUrl: undefined,
            userVocabularyId: v.term,
            partOfSpeech: "",
            definition: v.definition || "",
            vietnameseDefinition: "",
            sentence: "",
            vietnameseSentence: "",
            sentenceAudioUrl: undefined,
            synonyms: undefined,
            antonyms: undefined,
            irregularForms: undefined,
            favorite: true,
            topic: undefined,
          })) as CombinedVocabulary[];

          setFavoriteWords(vocab);
          form.setValue("generationType", "vocabulary");
          form.setValue(
            "vocabulary",
            vocab.map((v) => v.id),
          );
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load lesson vocabulary.",
          });
        })
        .finally(() => setIsVocabLoading(false));
      return;
    }

    getVocabulary(user.uid)
      .then((allWords) => {
        setFavoriteWords(allWords.filter((w) => w.favorite));
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your favorite words.",
        });
      })
      .finally(() => setIsVocabLoading(false));
  }, [user, toast, lessonId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setGeneratedStory(null);
    try {
      let finalInput: GenerateStorybookInput;

      if (values.generationType === "topic") {
        finalInput = {
          level: values.level,
          format: values.format,
          topic: values.topic,
        };
      } else {
        const selectedVocab = favoriteWords
          .filter((w) => values.vocabulary?.includes(w.id))
          .map((w) => ({ term: w.term, definition: w.definition }));
        finalInput = {
          level: values.level,
          format: values.format,
          vocabulary: selectedVocab,
        };
      }

      const result = await generateStorybook(finalInput);
      // Ensure the result is a plain JS object before setting state
      setGeneratedStory(JSON.parse(JSON.stringify(result)));
    } catch (error) {
      console.error("Failed to generate story:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate the story. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStory = async () => {
    if (!user || !generatedStory) return;
    setIsSaving(true);
    try {
      const { level, format } = form.getValues();
      await addStorybook(
        user.uid,
        generatedStory,
        level,
        format,
        lessonId || undefined,
      );
      toast({
        title: "Success!",
        description: "Your story has been saved to your library.",
      });
      router.push("/storybook");
    } catch (error) {
      console.error("Failed to save story:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the story.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={playbackHook.audioRef} />
      <Button
        variant="ghost"
        onClick={() => router.push("/storybook")}
        className="-ml-4"
      >
        <ArrowLeft className="mr-2" /> Back to Storybook Library
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Story</CardTitle>
            <CardDescription>
              Fill in the details below and let the AI write a story for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reading Level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">
                              Intermediate
                            </SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story Format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bilingual">
                              Bilingual (EN/VI)
                            </SelectItem>
                            <SelectItem value="interspersed">
                              Truyện Chêm (VI/EN)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <Tabs
                  defaultValue={lessonId ? "vocabulary" : "topic"}
                  onValueChange={(value) =>
                    form.setValue(
                      "generationType",
                      value as "topic" | "vocabulary",
                    )
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="topic">From Topic</TabsTrigger>
                    <TabsTrigger value="vocabulary">
                      From Vocabulary
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="topic" className="pt-4">
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., A trip to the moon"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter a topic for the story.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="vocabulary" className="pt-4">
                    <FormItem>
                      <FormLabel>Favorite Vocabulary</FormLabel>
                      <FormDescription>
                        Select words to include in the story.
                      </FormDescription>
                      <Card className="h-48 mt-2">
                        <ScrollArea className="h-full w-full">
                          <CardContent className="p-4">
                            {isVocabLoading ? (
                              <div className="space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-5 w-2/3" />
                              </div>
                            ) : favoriteWords.length > 0 ? (
                              <FormField
                                control={form.control}
                                name="vocabulary"
                                render={() => (
                                  <div className="space-y-2">
                                    {favoriteWords.map((word) => (
                                      <FormField
                                        key={word.id}
                                        control={form.control}
                                        name="vocabulary"
                                        render={({ field }) => (
                                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(
                                                  word.id,
                                                )}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                    ? field.onChange([
                                                        ...(field.value || []),
                                                        word.id,
                                                      ])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                          (value) =>
                                                            value !== word.id,
                                                        ),
                                                      );
                                                }}
                                              />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              {word.term}
                                            </FormLabel>
                                          </FormItem>
                                        )}
                                      />
                                    ))}
                                  </div>
                                )}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No favorite words found.
                              </p>
                            )}
                          </CardContent>
                        </ScrollArea>
                      </Card>
                    </FormItem>
                  </TabsContent>
                </Tabs>
                <FormMessage>
                  {form.formState.errors.topic?.message}
                </FormMessage>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2" />
                  )}
                  Generate Story
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Story</CardTitle>
            <CardDescription>
              Your AI-generated story will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-96">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ) : generatedStory ? (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold">{generatedStory.title}</h2>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        playbackHook.playAudio("title", generatedStory.title)
                      }
                      disabled={playbackHook.isLoadingAudio["title"]}
                    >
                      {playbackHook.isLoadingAudio["title"] ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <BookHeart className="mr-2" />
                      )}
                      Listen to Title
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Vocabulary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {generatedStory.keyVocabulary.map((v, i) => (
                        <li key={i} className="text-sm">
                          <strong>{v.word}</strong> ({v.partOfSpeech}) -{" "}
                          <em>{v.pronunciation}</em>: {v.definition}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:mt-2 [&_h2]:mb-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedStory.englishStory ||
                      generatedStory.interspersedStory ||
                      ""}
                  </ReactMarkdown>
                </article>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BookHeart className="h-16 w-16" />
                <p className="mt-4">Your story awaits!</p>
              </div>
            )}
          </CardContent>
          {generatedStory && (
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleSaveStory}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 animate-spin" />
                ) : (
                  <Save className="mr-2" />
                )}
                Save Story
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GenerateStorybookPage;
