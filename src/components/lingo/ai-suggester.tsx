
"use client";

import { useState, useEffect } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, CheckCircle, Pencil } from "lucide-react";
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
  CardHeader,
  CardTitle,
  CardFooter
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { addLesson } from "@/services/lessons";
import type { ViewState } from "@/app/page";
import type { UserLevel } from "@/ai/flows/schemas";

const levelMapping: Record<string, { label: string, value: UserLevel }> = {
    'a1': { label: 'Level 1 (A1 – Beginner)', value: 'beginner' },
    'a2': { label: 'Level 2 (A2 – Elementary)', value: 'beginner' },
    'b1': { label: 'Level 3 (B1 – Intermediate)', value: 'intermediate' },
    'b2': { label: 'Level 4 (B2 – Upper Intermediate)', value: 'intermediate' },
    'c1': { label: 'Level 5 (C1 – Advanced)', value: 'advanced' },
    'c2': { label: 'Level 6 (C2 – Proficiency)', value: 'advanced' },
};


const formSchema = z.object({
  cefrLevel: z.enum(Object.keys(levelMapping) as [string, ...string[]], {
    required_error: "Please select your proficiency level.",
  }),
  learningGoals: z
    .string()
    .min(10, "Please describe your goals in at least 10 characters."),
  interests: z.string().optional(),
});


interface AiSuggesterProps {
    setActiveViewState: Dispatch<SetStateAction<ViewState>>;
    recommendedLevel?: UserLevel;
}

const AiSuggester: FC<AiSuggesterProps> = ({ setActiveViewState, recommendedLevel }) => {
  const [isGenerating, setIsGenerating] = useState(false);
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
    if (recommendedLevel) {
        // Find the first CEFR level that maps to the recommended UserLevel
        const recommendedCefr = Object.keys(levelMapping).find(
            key => levelMapping[key].value === recommendedLevel
        );
        if (recommendedCefr) {
            form.setValue('cefrLevel', recommendedCefr);
        }
    }
  }, [recommendedLevel, form]);

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

    const aiPayload: SuggestPersonalizedLessonsInput = {
        userLevel: levelMapping[values.cefrLevel].value,
        learningGoals: values.learningGoals,
        interests: values.interests,
    };

    try {
      const result = await suggestPersonalizedLessons(aiPayload);
      
      const newLessonPromises = result.lessonSuggestions.map(suggestion => 
        addLesson(user.uid, suggestion, values.learningGoals)
      );
      await Promise.all(newLessonPromises);

      toast({
        title: "Success!",
        description: `${result.lessonSuggestions.length} new lessons have been added to 'My Lessons'.`
      })
      
      setActiveViewState({view: 'my-lessons'});

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
  
  const handleTakeTest = () => {
    setActiveViewState({ view: 'placement-test' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle>Unsure about your level?</CardTitle>
                <CardDescription>Take our quick placement test to get an accurate recommendation.</CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button onClick={handleTakeTest} variant="outline" className="w-full">
                    <Pencil className="mr-2" />
                    Take a placement test
                 </Button>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Lesson Suggester</CardTitle>
            <CardDescription>
              Tell us about yourself, and our AI will create a custom learning
              plan for you. The generated lessons will be saved in "My Lessons".
            </CardDescription>
            {recommendedLevel && (
                <div className="!mt-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5"/>
                    <p className="text-sm">We've pre-selected a level for you based on your test results.</p>
                </div>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="cefrLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your English Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(levelMapping).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
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
                        This will be used as the title for your lesson group.
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
                  Generate & Save Lessons
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
    </div>
  );
};

export default AiSuggester;
