
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle, BookOpen, FilePenLine, Headphones, Mic, AudioWaveform, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument, LibrarySkill } from '@/services/library';
import { getDocumentsGroupedBySkill, addDocument, deleteDocument } from '@/services/library';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';


const SKILLS: LibrarySkill[] = ["Reading", "Writing", "Listening", "Speaking", "Pronunciation"];
const skillIcons: Record<LibrarySkill, React.ElementType> = {
  Reading: BookOpen,
  Writing: FilePenLine,
  Listening: Headphones,
  Speaking: Mic,
  Pronunciation: AudioWaveform,
};

const addDocSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    url: z.string().url("Please enter a valid URL."),
    skill: z.enum(SKILLS, { required_error: "Please select a skill." }),
});

const AddDocumentDialog: FC<{
    onDocumentAdded: (newDoc: LibraryDocument) => void;
}> = ({ onDocumentAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const form = useForm<z.infer<typeof addDocSchema>>({
        resolver: zodResolver(addDocSchema),
        defaultValues: { title: "", url: "" },
    });

    const onSubmit = async (values: z.infer<typeof addDocSchema>) => {
        if (!user) return;
        try {
            const newDoc = await addDocument(user.uid, values.title, values.url, values.skill);
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
                        Save a link to an article, video, or any other online resource. You'll be able to add notes and extracted content to it later.
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
                            name="skill"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Skill</FormLabel>
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


const LibraryPage: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [documents, setDocuments] = useState<Record<LibrarySkill, LibraryDocument[]>>({
        Reading: [], Writing: [], Listening: [], Speaking: [], Pronunciation: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        getDocumentsGroupedBySkill(user.uid)
            .then(setDocuments)
            .catch(err => {
                console.error("Failed to fetch documents", err);
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch your library." });
            })
            .finally(() => setIsLoading(false));
    }, [user, toast]);

    const handleDocumentAdded = (newDoc: LibraryDocument) => {
        setDocuments(prev => ({
            ...prev,
            [newDoc.skill]: [newDoc, ...prev[newDoc.skill]],
        }));
    };
    
    const handleDocumentDeleted = (deletedDoc: LibraryDocument) => {
         deleteDocument(deletedDoc.id)
            .then(() => {
                 setDocuments(prev => ({
                    ...prev,
                    [deletedDoc.skill]: prev[deletedDoc.skill].filter(d => d.id !== deletedDoc.id),
                }));
                toast({ title: "Document Deleted" });
            })
            .catch(err => {
                console.error("Failed to delete document", err);
                toast({ variant: 'destructive', title: "Deletion Failed" });
            });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const totalDocs = Object.values(documents).reduce((sum, list) => sum + list.length, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>My Library</CardTitle>
                            <CardDescription>Organize your learning resources by skill.</CardDescription>
                        </div>
                        <AddDocumentDialog onDocumentAdded={handleDocumentAdded} />
                    </div>
                </CardHeader>
            </Card>

            {totalDocs === 0 ? (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your Library is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add your first document to start building your personal learning space.
                    </p>
                </div>
            ) : (
                SKILLS.map(skill => {
                    const Icon = skillIcons[skill];
                    const skillDocs = documents[skill];

                    return (
                        <Card key={skill}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-primary" />
                                    <span>{skill}</span>
                                    <Badge variant="secondary">{skillDocs.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {skillDocs.length > 0 ? (
                                    <div className="space-y-3">
                                        {skillDocs.map(doc => (
                                            <div key={doc.id} className="group flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex-grow">
                                                    <Link href={`/library/${doc.id}`} className="font-semibold hover:underline">{doc.title}</Link>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary truncate">
                                                        <ExternalLink className="h-3 w-3" />
                                                        {doc.url}
                                                    </a>
                                                </div>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will delete the document and all its associated notes. This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDocumentDeleted(doc)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No documents for this skill yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
};

export default LibraryPage;
