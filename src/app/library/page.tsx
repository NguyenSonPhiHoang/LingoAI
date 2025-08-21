
"use client";

import * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Book, Trash2, PlusCircle, FileText, ChevronRight, Eye, Search, X, Heading1, Heading2, Heading3, Bold, Italic, List, ListOrdered } from 'lucide-react';
import mammoth from "mammoth";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument } from '@/services/library';
import { addDocument, getDocuments, deleteDocument } from '@/services/library';
import { extractTextFromFile } from '@/ai/flows/extract-text-from-file';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const MarkdownToolbar: FC<{ textareaRef: React.RefObject<HTMLTextAreaElement>; onContentChange: (newContent: string) => void }> = ({ textareaRef, onContentChange }) => {
    
    const applyFormat = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const newText = `${prefix}${selectedText}${suffix}`;
        
        const updatedValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        onContentChange(updatedValue);
    };

    const applyList = (prefix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const currentLineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
        const newText = `${prefix} `;

        const updatedValue = textarea.value.substring(0, currentLineStart) + newText + textarea.value.substring(currentLineStart);
        onContentChange(updatedValue);
        
        // Wait for state update and then focus
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = currentLineStart + newText.length;
        }, 0);
    }
    
    const toolbarActions = [
        { icon: Heading1, onClick: () => applyFormat('# '), tooltip: 'Heading 1' },
        { icon: Bold, onClick: () => applyFormat('**', '**'), tooltip: 'Bold' },
        { icon: Italic, onClick: () => applyFormat('*', '*'), tooltip: 'Italic' },
        { icon: List, onClick: () => applyList('-'), tooltip: 'Bulleted List' },
        { icon: ListOrdered, onClick: () => applyList('1.'), tooltip: 'Numbered List' },
    ];

    return (
        <div className="flex items-center gap-1 border rounded-md p-1 mb-2 bg-muted">
            {toolbarActions.map((action, index) => (
                <Button key={index} variant="ghost" size="icon" onClick={action.onClick} className="h-8 w-8" title={action.tooltip}>
                    <action.icon className="h-4 w-4" />
                </Button>
            ))}
        </div>
    );
};


const LibraryPage: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

    const [documents, setDocuments] = useState<LibraryDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        getDocuments(user.uid)
            .then(setDocuments)
            .catch(err => {
                console.error("Failed to fetch documents", err);
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch your library." });
            })
            .finally(() => setIsLoading(false));
    }, [user, toast]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        toast({ title: "Processing File...", description: "AI is reading your document. This might take a moment." });
        setPreviewTitle(file.name);

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
            
            setPreviewContent(extractedText);

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: 'destructive', title: "Processing Failed", description: "Could not process the uploaded file." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleSavePreview = async () => {
        if (!previewContent || !previewTitle || !user) return;
        setIsSaving(true);
        try {
            const newDoc = await addDocument(user.uid, previewTitle, previewContent);
            setDocuments(prev => [newDoc, ...prev]);
            toast({ title: "Success!", description: `"${previewTitle}" has been added to your library.`});
            setPreviewContent(null);
            setPreviewTitle('');
        } catch (error) {
             console.error("Error saving document:", error);
             toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the document to your library." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleDelete = async (docId: string) => {
        const originalDocs = [...documents];
        setDocuments(prev => prev.filter(d => d.id !== docId));
        try {
            await deleteDocument(docId);
            toast({ title: "Document Deleted", description: "The document has been removed from your library." });
        } catch (error) {
            console.error("Failed to delete document:", error);
            toast({ variant: 'destructive', title: "Deletion Failed" });
            setDocuments(originalDocs);
        }
    }

    const filteredDocuments = useMemo(() => {
        if (!searchQuery) return documents;
        return documents.filter(doc => 
            doc.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [documents, searchQuery]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </div>
            );
        }

        if (documents.length === 0) {
            return (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <Book className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your Library is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Upload your first document to start building your personal learning space.
                    </p>
                </div>
            );
        }
        
        if (filteredDocuments.length === 0) {
             return (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">No documents match your search.</p>
                </div>
             );
        }

        return (
            <div className="space-y-4">
                {filteredDocuments.map(doc => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-md">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-grow">
                                <h4 className="font-semibold">{doc.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                    Added {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="icon" asChild>
                                    <Link href={`/library/${doc.id}`}>
                                        <Eye className="h-5 w-5" />
                                    </Link>
                                 </Button>
                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                                    <Trash2 className="h-5 w-5" />
                                 </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
             <Dialog open={!!previewContent} onOpenChange={(isOpen) => !isOpen && setPreviewContent(null)}>
                <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Extracted Content Preview</DialogTitle>
                        <DialogDescription>Review and format the content extracted from your file. You can use Markdown for styling.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 flex-grow flex flex-col min-h-0">
                        <div className="space-y-2">
                            <Label htmlFor="preview-title">Title</Label>
                            <Input id="preview-title" value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2 flex-grow flex flex-col min-h-0">
                            <Label htmlFor="preview-content">Content</Label>
                            <MarkdownToolbar textareaRef={contentTextareaRef} onContentChange={setPreviewContent} />
                            <ScrollArea className="flex-grow rounded-md border">
                               <Textarea
                                   ref={contentTextareaRef}
                                   id="preview-content"
                                   className="h-full w-full border-0 focus-visible:ring-0 resize-none"
                                   value={previewContent || ''}
                                   onChange={(e) => setPreviewContent(e.target.value)}
                               />
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewContent(null)}>Cancel</Button>
                        <Button onClick={handleSavePreview} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 animate-spin" />}
                            Save to Library
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>My Library</CardTitle>
                            <CardDescription>Upload your personal documents to create interactive learning materials.</CardDescription>
                        </div>
                         <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                            Upload Document
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".docx,image/*"
                        />
                    </div>
                </CardHeader>
                 <CardContent>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search documents..." 
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                 </CardContent>
            </Card>
            
            {renderContent()}
        </div>
    );
};

export default LibraryPage;
