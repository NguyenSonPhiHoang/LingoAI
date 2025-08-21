
"use client";

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Trash2, FileText, ExternalLink, Upload } from 'lucide-react';
import mammoth from "mammoth";
import ReactMarkdown from 'react-markdown';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument, LibraryContent } from '@/services/library';
import { getDocument, getContentForDocument, addContentToDocument, deleteContent } from '@/services/library';
import { extractTextFromFile } from '@/ai/flows/extract-text-from-file';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';


const LibraryDocPage: FC<{ params: { docId: string } }> = ({ params }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const docId = params.docId;
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [doc, setDoc] = useState<LibraryDocument | null>(null);
    const [contents, setContents] = useState<LibraryContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!user || !docId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [fetchedDoc, fetchedContent] = await Promise.all([
                    getDocument(docId),
                    getContentForDocument(docId),
                ]);
                
                if (!fetchedDoc) {
                    toast({ variant: 'destructive', title: "Not Found", description: "This document does not exist or you don't have permission to view it." });
                    router.push('/library');
                    return;
                }
                
                setDoc(fetchedDoc);
                setContents(fetchedContent);

            } catch (error) {
                console.error("Failed to fetch document data:", error);
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch the document." });
                router.push('/library');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, docId, toast, router]);
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !docId) return;

        setIsUploading(true);
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
                setIsUploading(false);
                return;
            }
            
            if (!extractedText.trim()) {
                 toast({ variant: "destructive", title: "No Content Found", description: "Could not extract any text from the file." });
                 setIsUploading(false);
                 return;
            }
            
            const newContent = await addContentToDocument(docId, file.name, extractedText);
            setContents(prev => [newContent, ...prev]);
            toast({ title: "Success!", description: "New note has been added to this document." });

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: 'destructive', title: "Processing Failed", description: "Could not process and save the content." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteContent = async (contentId: string) => {
        const originalContents = [...contents];
        setContents(prev => prev.filter(c => c.id !== contentId));
        try {
            await deleteContent(contentId);
            toast({ title: "Note Deleted" });
        } catch (error) {
            console.error("Failed to delete content:", error);
            toast({ variant: 'destructive', title: "Deletion Failed" });
            setContents(originalContents);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!doc) {
        // This case is handled in useEffect, but as a fallback
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
               <p>Document not found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <Button variant="ghost" onClick={() => router.push('/library')} className="-ml-4">
                    <ArrowLeft className="mr-2" /> Back to Library
                 </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".docx,image/*"
                  />
                 <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                    Add Note from File
                 </Button>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>{doc.title}</CardTitle>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline truncate">
                       <ExternalLink className="h-4 w-4" />
                       {doc.url}
                    </a>
                </CardHeader>
             </Card>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">My Notes &amp; Content</h3>
                {contents.length > 0 ? (
                    contents.map(content => (
                        <Card key={content.id} className="group">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2"><FileText /> {content.fileName}</CardTitle>
                                        <CardDescription>Added on {format(new Date(content.createdAt), 'PPP')}</CardDescription>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteContent(content.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-60 rounded-md border bg-muted/30 p-4">
                                    <article className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{content.extractedText}</ReactMarkdown>
                                    </article>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No notes added yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Upload a file to add your first note to this document.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LibraryDocPage;
