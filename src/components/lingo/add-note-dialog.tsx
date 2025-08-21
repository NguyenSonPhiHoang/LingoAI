
"use client";

import * as React from 'react';
import { useState } from 'react';
import type { FC } from 'react';
import { Loader2, PlusCircle, Wand2, Clipboard, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryContent } from '@/services/library';
import { addContentToDocument } from '@/services/library';
import { extractTextFromFile } from '@/ai/flows/extract-text-from-file';
import { format } from 'date-fns';

const AddNoteDialog: FC<{
    docId: string;
    onNoteAdded: (newNote: LibraryContent) => void;
}> = ({ docId, onNoteAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    // State for manual entry
    const [noteTitle, setNoteTitle] = useState(`Note - ${format(new Date(), 'PPP')}`);
    const [noteContent, setNoteContent] = useState('');
    
    // State for clipboard
    const [clipboardText, setClipboardText] = useState('');
    const [clipboardImage, setClipboardImage] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    
    const handleOpenChange = async (open: boolean) => {
        if (open) {
            // Reset state when opening
            setNoteTitle(`Note - ${format(new Date(), 'PPP')}`);
            setNoteContent('');
            setClipboardText('');
            setClipboardImage(null);
            setIsExtracting(false);
        }
        setIsOpen(open);
    }
    
    const handlePasteFromClipboard = async () => {
        setClipboardText('');
        setClipboardImage(null);
        try {
            if (!navigator.clipboard.read) {
                toast({ variant: 'destructive', title: "Browser not supported", description: "Clipboard API is not available." });
                return;
            }
            const items = await navigator.clipboard.read();
            for (const item of items) {
                if (item.types.some(t => t.startsWith('image/'))) {
                    const imageType = item.types.find(t => t.startsWith('image/'))!;
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = () => setClipboardImage(reader.result as string);
                    reader.readAsDataURL(blob);
                    return; // Prioritize image
                }
                 if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    const text = await blob.text();
                    setClipboardText(text);
                    return;
                }
            }
            toast({ title: "Clipboard Empty", description: "No text or image found on the clipboard." });
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            toast({ variant: 'destructive', title: "Paste Failed", description: "Could not read from clipboard. You may need to grant permission." });
        }
    };
    
    const handleExtractText = async () => {
        if (!clipboardImage) return;
        setIsExtracting(true);
        try {
            const result = await extractTextFromFile({ imageDataUri: clipboardImage });
            if (result.text) {
                setClipboardText(result.text);
                setClipboardImage(null); // Clear image after extraction
                toast({ title: "Text Extracted!", description: "The extracted text has been placed in the text area for you to save." });
            } else {
                 toast({ variant: "destructive", title: "No Text Found", description: "AI could not find any text in the image." });
            }
        } catch (error) {
             console.error("Error extracting from image:", error);
             toast({ variant: 'destructive', title: "Extraction Failed" });
        } finally {
            setIsExtracting(false);
        }
    };
    
    const handleSaveNote = async (contentToSave: string, titleToSave: string) => {
        if (!contentToSave || !titleToSave) {
            toast({ variant: 'destructive', title: 'Missing Content', description: 'Please provide a title and content for the note.' });
            return;
        }
        setIsSaving(true);
        try {
            const newNote = await addContentToDocument(docId, titleToSave, contentToSave);
            onNoteAdded(newNote);
            toast({ title: "Success", description: "Your note has been added." });
            setIsOpen(false);
        } catch (error) {
            console.error("Error saving note:", error);
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" /> Add New Note
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add a New Note</DialogTitle>
                    <DialogDescription>
                        Write a note manually with Markdown, or paste text/images from your clipboard.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="write">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="write">Write Note</TabsTrigger>
                        <TabsTrigger value="paste" onClick={handlePasteFromClipboard}>Paste from Clipboard</TabsTrigger>
                    </TabsList>
                    <TabsContent value="write" className="space-y-4 pt-4">
                         <div className="space-y-2">
                            <Label htmlFor="note-title">Note Title</Label>
                            <Input id="note-title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note-content">Content (Markdown supported)</Label>
                            <Textarea id="note-content" value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={10} />
                        </div>
                        <Button className="w-full" onClick={() => handleSaveNote(noteContent, noteTitle)} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                            Save Written Note
                        </Button>
                    </TabsContent>
                    <TabsContent value="paste" className="space-y-4 pt-4">
                        {clipboardImage ? (
                            <div className="space-y-4 text-center">
                                <div className="relative border-2 border-dashed rounded-lg p-2 max-h-60 overflow-hidden">
                                     <Image src={clipboardImage} alt="Clipboard image" width={300} height={200} className="w-full h-auto object-contain max-h-56" />
                                </div>
                                <Button onClick={handleExtractText} disabled={isExtracting} className="w-full">
                                    {isExtracting ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                    Extract Text from Image
                                </Button>
                            </div>
                        ) : (
                             <>
                                <div className="space-y-2">
                                    <Label htmlFor="clipboard-title">Note Title</Label>
                                    <Input id="clipboard-title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clipboard-content">Pasted Content</Label>
                                    <Textarea id="clipboard-content" value={clipboardText} onChange={(e) => setClipboardText(e.target.value)} rows={10} placeholder="Click the 'Paste from Clipboard' tab header to read clipboard data..." />
                                </div>
                                <Button className="w-full" onClick={() => handleSaveNote(clipboardText, noteTitle)} disabled={isSaving || !clipboardText}>
                                     {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                                     Save Pasted Note
                                </Button>
                             </>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AddNoteDialog;
