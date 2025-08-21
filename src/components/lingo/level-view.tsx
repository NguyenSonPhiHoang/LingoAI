
"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import { BookOpen, FilePenLine, Headphones, Mic, Loader2, Plus, Link as LinkIcon, Trash2, Upload, Wand2, AudioWaveform } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { getResources, addResource, deleteResource, type LearningResource } from "@/services/learning-resources";
import { addDocument } from "@/services/library";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";
import mammoth from "mammoth";
import { useRouter } from "next/navigation";


type Skill = "Listening" | "Speaking" | "Reading" | "Writing" | "Pronunciation";
type LevelKey = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';

const levelsData: Record<LevelKey, { level: string; cefr: string; skills: Record<Skill, { icon: React.ElementType, description: string }> }> = {
  a1: {
    level: "Level 1",
    cefr: "A1 – Beginner",
    skills: {
      Listening: { icon: Headphones, description: "Understand familiar words and basic phrases." },
      Speaking: { icon: Mic, description: "Interact in a simple way." },
      Reading: { icon: BookOpen, description: "Understand names, words, and simple sentences." },
      Writing: { icon: FilePenLine, description: "Write a short, simple postcard." },
      Pronunciation: { icon: AudioWaveform, description: "Master basic English sounds and intonation." }
    },
  },
   a2: {
    level: "Level 2",
    cefr: "A2 – Elementary",
    skills: {
      Listening: { icon: Headphones, description: "Grasp phrases and high-frequency vocabulary." },
      Speaking: { icon: Mic, description: "Communicate in simple, routine tasks." },
      Reading: { icon: BookOpen, description: "Read very short, simple texts." },
      Writing: { icon: FilePenLine, description: "Write short, simple notes and messages." },
      Pronunciation: { icon: AudioWaveform, description: "Improve clarity on common words and phrases." }
    },
  },
   b1: {
    level: "Level 3",
    cefr: "B1 – Intermediate",
    skills: {
      Listening: { icon: Headphones, description: "Understand main points on familiar matters." },
      Speaking: { icon: Mic, description: "Handle most situations likely to arise whilst travelling." },
      Reading: { icon: BookOpen, description: "Understand texts with high-frequency language." },
      Writing: { icon: FilePenLine, description: "Write simple connected text on familiar topics." },
      Pronunciation: { icon: AudioWaveform, description: "Focus on sentence rhythm and connected speech." }
    },
  },
   b2: {
    level: "Level 4",
    cefr: "B2 – Upper Intermediate",
    skills: {
      Listening: { icon: Headphones, description: "Understand extended speech and lectures." },
      Speaking: { icon: Mic, description: "Interact with fluency and spontaneity." },
      Reading: { icon: BookOpen, description: "Read articles and reports on contemporary problems." },
      Writing: { icon: FilePenLine, description: "Write clear, detailed text on a wide range of subjects." },
      Pronunciation: { icon: AudioWaveform, description: "Refine nuanced sounds and intonation patterns." }
    },
  },
    c1: {
    level: "Level 5",
    cefr: "C1 – Advanced",
    skills: {
      Listening: { icon: Headphones, description: "Understand extended speech even when it is not clearly structured." },
      Speaking: { icon: Mic, description: "Express ideas fluently and spontaneously." },
      Reading: { icon: BookOpen, description: "Understand long and complex factual and literary texts." },
      Writing: { icon: FilePenLine, description: "Write clear, well-structured text, expressing viewpoints at length." },
      Pronunciation: { icon: AudioWaveform, description: "Achieve native-like clarity and express subtle shades of meaning." }
    },
  },
  c2: {
    level: "Level 6",
    cefr: "C2 – Proficiency",
    skills: {
      Listening: { icon: Headphones, description: "Understand any kind of spoken language with ease." },
      Speaking: { icon: Mic, description: "Take part effortlessly in any conversation or discussion." },
      Reading: { icon: BookOpen, description: "Read all forms of written language with ease." },
      Writing: { icon: FilePenLine, description: "Write clear, smoothly flowing text in an appropriate style." },
      Pronunciation: { icon: AudioWaveform, description: "Perfect natural intonation and express fine shades of meaning precisely." }
    },
  },
};

const resourceFormSchema = z.object({
    label: z.string().min(3, "Label must be at least 3 characters."),
    url: z.string().url("Please enter a valid URL."),
});

const AddResourceDialog: FC<{
    level: LevelKey;
    skill: Skill;
    onResourceAdded: (newResource: LearningResource) => void;
}> = ({ level, skill, onResourceAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const form = useForm<z.infer<typeof resourceFormSchema>>({
        resolver: zodResolver(resourceFormSchema),
        defaultValues: { label: "", url: "" },
    });

    const onSubmit = async (values: z.infer<typeof resourceFormSchema>) => {
        try {
            const newResource = await addResource({ ...values, level, skill });
            onResourceAdded(newResource);
            toast({ title: "Success", description: "Learning resource added." });
            form.reset();
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to add resource:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not add resource." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Resource for {level.toUpperCase()} - {skill}</DialogTitle>
                    <DialogDescription>Provide a label and a URL for the new learning material.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., 'TED Talk: The power of words'" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                Add Resource
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const AIPersonalization: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        toast({ title: "Processing File...", description: "AI is extracting content from your document to create a new library item." });

        try {
            let textContent = '';
            if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const arrayBuffer = await file.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer });
                textContent = value;
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const dataUri = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                const result = await extractTextFromFile({ imageDataUri: dataUri });
                textContent = result.text;
            } else {
                toast({ variant: "destructive", title: "Unsupported File", description: "Please upload a .docx or an image file." });
                setIsUploading(false);
                return;
            }

            if (!textContent.trim()) {
                 toast({ variant: "destructive", title: "No Content Found", description: "Could not extract any text from the file." });
                 setIsUploading(false);
                 return;
            }

            const newDoc = await addDocument(user.uid, file.name, textContent);
            toast({ title: "Success!", description: `"${file.name}" has been added. Redirecting to your library.` });
            router.push(`/library/${newDoc.id}`);

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: 'destructive', title: "Processing Failed", description: "Could not process the uploaded file." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };


    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 /> Personalize Your Learning</CardTitle>
                <CardDescription>Upload a document or image (e.g., an article, a screenshot) and let our AI create a personalized learning module for you in your library.</CardDescription>
            </CardHeader>
            <CardContent>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".docx,image/*"
                />
                 <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                    Upload & Personalize
                </Button>
            </CardContent>
        </Card>
    );
};


const LevelView: FC = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        getResources()
            .then(setResources)
            .catch(err => {
                console.error("Failed to fetch resources:", err);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch learning resources." });
            })
            .finally(() => setIsLoading(false));
    }, [toast]);
    
    const handleResourceAdded = (newResource: LearningResource) => {
        setResources(prev => [...prev, newResource]);
    }

    const handleResourceDeleted = async (resourceId: string) => {
        const originalResources = [...resources];
        setResources(prev => prev.filter(r => r.id !== resourceId)); // Optimistic update
        try {
            await deleteResource(resourceId);
            toast({ title: "Success", description: "Resource deleted." });
        } catch (error) {
            console.error("Failed to delete resource:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete resource." });
            setResources(originalResources); // Revert on error
        }
    };

    const groupedResources = resources.reduce((acc, resource) => {
        if (!acc[resource.level]) {
            acc[resource.level] = {};
        }
        if (!acc[resource.level][resource.skill]) {
            acc[resource.level][resource.skill] = [];
        }
        acc[resource.level][resource.skill].push(resource);
        return acc;
    }, {} as Record<LevelKey, Record<Skill, LearningResource[]>>);

    if (isLoading) {
        return (
             <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <AIPersonalization />
            <Accordion type="single" collapsible className="w-full space-y-4">
                {(Object.keys(levelsData) as LevelKey[]).map(levelKey => {
                    const level = levelsData[levelKey];
                    return (
                        <AccordionItem value={levelKey} key={levelKey} className="border rounded-lg bg-card">
                            <AccordionTrigger className="p-4 text-left hover:no-underline">
                                 <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 text-primary p-3 rounded-lg text-2xl font-bold w-16 h-16 flex items-center justify-center">
                                        {levelKey.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold">{level.level}</h3>
                                        <p className="text-md text-muted-foreground">{level.cefr}</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(Object.keys(level.skills) as Skill[]).map(skillKey => {
                                    const skill = level.skills[skillKey];
                                    const skillResources = groupedResources[levelKey]?.[skillKey] || [];
                                    const Icon = skill.icon;
                                    return (
                                         <Card key={skillKey} className="bg-muted/30">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-center">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Icon className="h-5 w-5" /> {skillKey}
                                                    </CardTitle>
                                                    {user?.role === 'admin' && (
                                                        <AddResourceDialog level={levelKey} skill={skillKey} onResourceAdded={handleResourceAdded} />
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {skillResources.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {skillResources.map(resource => (
                                                            <li key={resource.id} className="flex items-center justify-between gap-2 text-sm group">
                                                                <Link href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors flex-1 truncate">
                                                                    <LinkIcon className="h-4 w-4" />
                                                                    <span className="truncate">{resource.label}</span>
                                                                </Link>
                                                                 {user?.role === 'admin' && (
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleResourceDeleted(resource.id)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-2">No resources added yet.</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
};

export default LevelView;

    