
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, type FC, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle, BookOpen, FilePenLine, Headphones, Mic, AudioWaveform, Trash2, ExternalLink, Wand2, Upload, Heading, Bold, Italic, List as ListIcon, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import mammoth from "mammoth";

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
import { extractTextFromFile } from '@/ai/flows/extract-text-from-file';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import InteractiveText from '@/components/lingo/interactive-text';
import { useAudioPlayback } from '@/hooks/use-audio-playback';


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


const PreviewAndSaveDialog: FC<{
    extractedContent: string;
    fileName: string;
    onSave: (markdownContent: string) => void;
    onClose: () => void;
    isSaving: boolean;
}> = ({ extractedContent, fileName, onSave, onClose, isSaving }) => {
    const [content, setContent] = useState(extractedContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyFormat = (format: 'heading' | 'bold' | 'italic' | 'bullet' | 'number') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        let newText = '';

        switch (format) {
            case 'heading':
                newText = `# ${selectedText}`;
                break;
            case 'bold':
                newText = `**${selectedText}**`;
                break;
            case 'italic':
                newText = `*${selectedText}*`;
                break;
            case 'bullet':
                 newText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
                 break;
            case 'number':
                 newText = selectedText.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');
                 break;
        }

        const updatedContent = content.substring(0, start) + newText + content.substring(end);
        setContent(updatedContent);
        
        // Focus and select the newly inserted text for better UX
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start;
            textarea.selectionEnd = start + newText.length;
        }, 0);
    };
    
    const Toolbar = () => (
         <div className="flex items-center gap-1 p-1 rounded-t-md border-b bg-muted">
            <Button variant="ghost" size="icon" onClick={() => applyFormat('heading')} title="Heading"><Heading className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('bullet')} title="Bulleted List"><ListIcon className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('number')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
        </div>
    );

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Preview & Edit Content</DialogTitle>
                    <DialogDescription>
                        Review the extracted content from <span className="font-semibold">{fileName}</span>. You can edit it using Markdown before saving.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
                    <div className="flex flex-col">
                        <Toolbar />
                        <ScrollArea className="flex-grow rounded-b-md border">
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="h-full w-full !mt-0 border-0 rounded-t-none resize-none focus-visible:ring-0"
                                placeholder="Edit your content here..."
                            />
                        </ScrollArea>
                    </div>
                     <div className="flex flex-col">
                        <div className="p-1 rounded-t-md border-b bg-muted font-medium text-sm text-center">Preview</div>
                        <ScrollArea className="flex-grow rounded-b-md border p-4">
                            <article className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </article>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(content)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                        Save to Library
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const AddDocumentDialog: FC<{
    onDocumentAdded: (newDoc: LibraryDocument) => void;
}> = ({ onDocumentAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<{ content: string; name: string, skill: LibrarySkill, title: string, url: string } | null>(null);

    const form = useForm<z.infer<typeof addDocSchema>>({
        resolver: zodResolver(addDocSchema),
        defaultValues: { title: "", url: "" },
    });
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const values = form.getValues();
        
        if (!file || !user || !values.skill || !values.title || !values.url) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill out the Title, URL, and Skill fields before uploading a file."});
            return;
        }

        setIsProcessing(true);
        toast({ title: "Processing File...", description: "AI is reading your file. This might take a moment." });

        try {
            let extractedText = '';
            if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const arrayBuffer = await file.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer });
                extractedText = value;
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const dataUri = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                const result = await extractTextFromFile({ imageDataUri: dataUri });
                extractedText = result.text;
            } else {
                toast({ variant: "destructive", title: "Unsupported File", description: "Please upload a .docx or an image file." });
                setIsProcessing(false);
                return;
            }
            
            if (!extractedText.trim()) {
                 toast({ variant: "destructive", title: "No Content Found", description: "Could not extract any text from the file." });
                 setIsProcessing(false);
                 return;
            }
            
            setPreview({ content: extractedText, name: file.name, skill: values.skill, title: values.title, url: values.url });

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: 'destructive', title: "Processing Failed", description: "Could not process the uploaded file." });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleSavePreview = async (markdownContent: string) => {
        if (!user || !preview) return;
        setIsProcessing(true);
        try {
            // First, create the main library document
            const newDoc = await addDocument(user.uid, preview.title, preview.url, preview.skill);
            
            // Then, add the extracted content as a note associated with it
            // NOTE: The previous version was missing this part, which is now implied by the new structure
            // This will be handled on the docId page. For now, we just create the document and navigate.
            
            onDocumentAdded(newDoc);
            toast({ title: "Success!", description: `"${preview.title}" has been added. Redirecting...`});
            router.push(`/library/${newDoc.id}`);
            
            form.reset();
            setIsOpen(false);
            setPreview(null);
        } catch (error) {
            console.error("Error saving document:", error);
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsProcessing(false);
        }
    };

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
        <>
        {preview && (
            <PreviewAndSaveDialog
                extractedContent={preview.content}
                fileName={preview.name}
                onSave={handleSavePreview}
                onClose={() => setPreview(null)}
                isSaving={isProcessing}
            />
        )}
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
                        
                        <div className="space-y-2 !mt-6">
                             <Label>Add Notes (Optional)</Label>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".docx,image/*" />
                             <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                                Upload .docx or Image to Add Notes
                             </Button>
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                Add Document Only
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        </>
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
