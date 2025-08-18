
"use client";

import { useState } from "react";
import type { FC } from "react";
import {
  ArrowLeft,
  BookOpen,
  FilePenLine,
  Headphones,
  Mic,
  Sparkles,
  Loader2,
  MessageSquareQuote,
  FileText,
  GraduationCap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/services/lessons";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

interface LessonDetailViewProps {
  lesson: Lesson;
  onBack: () => void;
}

type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
  Listening: Headphones,
  Speaking: Mic,
  Reading: BookOpen,
  Writing: FilePenLine,
};

type ToolType = "conversation" | "reading-passage" | "grammar-explanation";

interface AiTool {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ElementType;
  supportedSkills: Skill[];
}

const aiTools: AiTool[] = [
  {
    id: "conversation",
    title: "Generate Dialogue",
    description: "Create a sample conversation about the lesson topic.",
    icon: MessageSquareQuote,
    supportedSkills: ["Listening", "Speaking"],
  },
  {
    id: "reading-passage",
    title: "Generate Reading Passage",
    description: "Create a short article or story related to the topic.",
    icon: FileText,
    supportedSkills: ["Reading"],
  },
  {
    id: "grammar-explanation",
    title: "Explain Grammar Point",
    description: "Generate a clear explanation for a related grammar rule.",
    icon: GraduationCap,
    supportedSkills: ["Reading", "Writing"],
  },
];


const LessonDetailView: FC<LessonDetailViewProps> = ({ lesson, onBack }) => {
  const [generatedContent, setGeneratedContent] = useState<Record<ToolType, string[]>>({
      conversation: [],
      'reading-passage': [],
      'grammar-explanation': [],
  });
  const [isLoading, setIsLoading] = useState<ToolType | null>(null);

  const Icon = skillIcons[lesson.skill as Skill] || Sparkles;

  const handleToolClick = async (toolId: ToolType) => {
    setIsLoading(toolId);
    // In a real app, you would call a specific AI flow for each tool.
    // For this prototype, we'll simulate it with a delay and placeholder text.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    let content = "";
    switch(toolId) {
        case "conversation":
            content = `Alex: Hey, have you ever thought about ${lesson.topic.toLowerCase()}?\n\nChris: All the time! It's such a fascinating subject.`;
            break;
        case "reading-passage":
            content = `The concept of ${lesson.topic.toLowerCase()} has intrigued humanity for centuries. Early philosophers discussed it, and modern scientists continue to explore its complexities.`;
            break;
        case "grammar-explanation":
            content = `When discussing ${lesson.topic.toLowerCase()}, it's common to use the present perfect tense (e.g., "has intrigued") to connect past events to the present.`;
            break;
    }

    setGeneratedContent(prev => ({
        ...prev,
        [toolId]: [...prev[toolId], content]
    }));
    setIsLoading(null);
  };
  
  const availableTools = aiTools.filter(tool => tool.supportedSkills.includes(lesson.skill as Skill));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2" /> Back to Suggestions
        </Button>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-1">{lesson.skill}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{lesson.topic}</h1>
            <p className="text-muted-foreground">
              Use the tools below to generate learning materials for this topic.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>AI Content Tools</CardTitle>
                    <CardDescription>Select a tool to generate content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {availableTools.map(tool => (
                         <Button 
                            key={tool.id} 
                            className="w-full justify-start h-auto py-3" 
                            variant="outline"
                            onClick={() => handleToolClick(tool.id)}
                            disabled={!!isLoading}
                        >
                            {isLoading === tool.id ? <Loader2 className="mr-2 animate-spin"/> : <tool.icon className="mr-2"/>}
                            <div>
                                <p className="text-sm font-semibold">{tool.title}</p>
                                <p className="text-xs text-muted-foreground text-left font-normal">{tool.description}</p>
                            </div>
                         </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Generated Content</CardTitle>
                    <CardDescription>Content you generate will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] p-4 rounded-lg border bg-muted/50">
                        {Object.entries(generatedContent).flatMap(([toolId, contents]) => 
                            contents.map((content, index) => (
                                <Card key={`${toolId}-${index}`} className="mb-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            {aiTools.find(t => t.id === toolId)?.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            readOnly
                                            value={content}
                                            className="h-auto bg-background"
                                            rows={Math.max(5, content.split('\n').length)}
                                        />
                                    </CardContent>
                                </Card>
                            ))
                        )}
                        
                        {!isLoading && Object.values(generatedContent).every(arr => arr.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <Sparkles className="h-12 w-12 mb-4" />
                                <h3 className="font-semibold">Your content area is empty</h3>
                                <p>Click a tool on the left to start learning!</p>
                            </div>
                        )}

                        {isLoading && (
                             <Card className="mb-4">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                        <Skeleton className="h-6 w-40" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-32 w-full" />
                                </CardContent>
                            </Card>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonDetailView;
