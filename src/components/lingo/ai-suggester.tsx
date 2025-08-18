
"use client";

import { useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lightbulb, List, Loader2, Sparkles, Headphones, Mic, BookOpen, FilePenLine, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  suggestPersonalizedLessons,
  type SuggestPersonalizedLessonsInput,
} from "@/ai/flows/suggest-personalized-lessons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { addLesson, getLessons, type Lesson } from "@/services/lessons";
import type { ViewState } from "@/app/page";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  userLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your proficiency level.",
  }),
  learningGoals: z
    .string()
    .min(10, "Please describe your goals in at least 10 characters."),
  interests: z.string().optional(),
});

type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
    Listening: Headphones,
    Speaking: Mic,
    Reading: BookOpen,
    Writing: FilePenLine,
};

interface AiSuggesterProps {
    setActiveViewState: Dispatch<SetStateAction<ViewState>>;
}

const AiSuggester: FC<AiSuggesterProps> = ({ setActiveViewState }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      learningGoals: "",
      interests: "",
    },
  });

  useEffect(() => {
    const fetchLessons = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userLessons = await getLessons(user.uid);
        setLessons(userLessons);
      } catch (error) {
        console.error("Failed to fetch lessons:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch your saved lessons.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, [user, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in to generate lessons.",
        });
        return;
    }
    setIsGenerating(true);
    try {
      const result = await suggestPersonalizedLessons(
        values as SuggestPersonalizedLessonsInput
      );
      
      const newLessonPromises = result.lessonSuggestions.map(suggestion => 
        addLesson(user.uid, suggestion)
      );
      const newLessons = await Promise.all(newLessonPromises);

      setLessons(prev => [...newLessons, ...prev]);
      toast({
        title: "Success!",
        description: `${newLessons.length} new lessons have been added.`
      })

    } catch (error) {
      console.error("Failed to get suggestions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch suggestions. Please try again later.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartLesson = (lesson: Lesson) => {
    setActiveViewState({ view: 'lesson-detail', lesson: lesson });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Personalized Path</CardTitle>
            <CardDescription>
              Tell us about yourself, and our AI will create a custom learning
              plan for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="userLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your English Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your level" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="learningGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learning Goals</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., "Improve business communication"'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        What do you want to achieve?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Interests (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., "Technology, movies, travel"'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Topics you enjoy discussing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Lessons
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="min-h-full">
          <CardHeader>
            <CardTitle>Your AI-Generated Lessons</CardTitle>
            <CardDescription>
              Here are topics tailored just for you. Select one to start learning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-5/6" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : lessons.length > 0 ? (
              <ul className="space-y-3">
                {lessons.map((lesson) => {
                  const Icon = skillIcons[lesson.skill as Skill] || Lightbulb;
                  return (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
                    >
                      <Icon className="h-6 w-6 flex-shrink-0 text-primary" />
                      <div className="flex-grow">
                        <p className="font-medium">{lesson.topic}</p>
                        <Badge variant="secondary">{lesson.skill}</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleStartLesson(lesson)}>
                        Start <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center">
                <List className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  No lessons yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill out the form to get your personalized lesson plan.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              These lessons are generated by AI. Click 'Start' to add content and activities.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AiSuggester;
