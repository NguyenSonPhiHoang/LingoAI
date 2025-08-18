
"use client";

import { useState } from "react";
import type { FC, Dispatch, SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
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

const formSchema = z.object({
  userLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your proficiency level.",
  }),
  learningGoals: z
    .string()
    .min(10, "Please describe your goals in at least 10 characters."),
  interests: z.string().optional(),
});


interface AiSuggesterProps {
    setActiveView: Dispatch<SetStateAction<ViewState>>;
}

const AiSuggester: FC<AiSuggesterProps> = ({ setActiveView }) => {
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
      await Promise.all(newLessonPromises);

      toast({
        title: "Success!",
        description: `${result.lessonSuggestions.length} new lessons have been added to 'My Lessons'.`
      })
      
      setActiveView({view: 'my-lessons'});

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

  return (
    <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>AI Lesson Suggester</CardTitle>
            <CardDescription>
              Tell us about yourself, and our AI will create a custom learning
              plan for you. The generated lessons will be saved in "My Lessons".
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
