
"use client";

import * as React from 'react';
import { useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument, LibrarySkill } from '@/services/library';
import { addDocument } from '@/services/library';

const SKILLS: LibrarySkill[] = ["Reading", "Writing", "Listening", "Speaking", "Pronunciation"];

const addDocSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    url: z.string().url("Please enter a valid URL."),
    skill: z.enum(SKILLS, { required_error: "Please select a skill." }),
    summary: z.string().optional(),
});

const AddDocumentDialog: FC<{
    onDocumentAdded: (newDoc: LibraryDocument) => void;
}> = ({ onDocumentAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<z.infer<typeof addDocSchema>>({
        resolver: zodResolver(addDocSchema),
        defaultValues: { title: "", url: "", summary: "" },
    });

    const onSubmit = async (values: z.infer<typeof addDocSchema>) => {
        if (!user) return;
        try {
            const newDoc = await addDocument(user.uid, values.title, values.url, values.skill, values.summary);
            onDocumentAdded(newDoc);
            toast({ title: "Success!", description: `"${values.title}" has been added.`});
            form.reset();
            setIsOpen(false);
        } catch (error) {
             console.error("Error saving document:", error);
             toast({ variant: 'destructive', title: "Save Failed" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" /> Add New Document
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a New Learning Document</DialogTitle>
                    <DialogDescription>
                        Save a link to an article, video, or other resource. You can add AI-powered notes later.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Article on AI Advancements'" {...field} />
                                    </FormControl>
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
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="summary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Summary (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="A brief summary of the content..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="skill"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Main Skill</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the main skill for this document" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {SKILLS.map(skill => (
                                                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                Add Document
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default AddDocumentDialog;
