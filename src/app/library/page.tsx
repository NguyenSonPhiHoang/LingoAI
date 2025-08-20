
"use client";

import * as React from 'react';
import { useState, useRef, useMemo } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Book, Trash2, PlusCircle, FileText, ChevronRight, Eye, Search } from 'lucide-react';
import mammoth from "mammoth";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument } from '@/services/library';
import { addDocument, getDocuments, deleteDocument } from '@/services/library';
import { extractTextFromFile } from '@/ai/flows/extract-text-from-file';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const LibraryPage: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<LibraryDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        toast({ title: "Processing File...", description: "The AI is extracting content from your document." });

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
            setDocuments(prev => [newDoc, ...prev]);
            toast({ title: "Success!", description: `"${file.name}" has been added to your library.` });

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: 'destructive', title: "Processing Failed", description: "Could not process the uploaded file." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
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
