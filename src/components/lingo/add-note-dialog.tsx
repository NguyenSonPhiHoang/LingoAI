
"use client";

import * as React from 'react';
import { useState, useRef, type FC, type RefObject } from 'react';
import { Loader2, PlusCircle, Wand2, Clipboard, Image as ImageIcon, Bold, Italic, Heading2, List, ListOrdered, Undo, Trash2, Save, Maximize, Minimize } from 'lucide-react';
import Image from 'next/image';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';

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
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '@/lib/utils';

const MarkdownToolbar: FC<{ textareaRef: React.RefObject<HTMLTextAreaElement>, onContentChange: (newContent: string) => void }> = ({ textareaRef, onContentChange }) => {
    
    const applyFormat = (formatType: 'bold' | 'italic' | 'heading' | 'ul' | 'ol') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let newText = '';
        let newCursorPos = 0;

        switch (formatType) {
            case 'bold':
                newText = `**${selectedText}**`;
                newCursorPos = start + 2;
                break;
            case 'italic':
                newText = `*${selectedText}*`;
                newCursorPos = start + 1;
                break;
            case 'heading':
                newText = `## ${selectedText}`;
                newCursorPos = start + 3;
                break;
            case 'ul':
                newText = `- ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'ol':
                newText = `1. ${selectedText}`;
                newCursorPos = start + 3;
                break;
        }

        const updatedValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        onContentChange(updatedValue);
        
        // Use timeout to wait for react state update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
        }, 0);
    };

    const toolbarItems = [
        { type: 'bold', icon: Bold, tooltip: 'Bold' },
        { type: 'italic', icon: Italic, tooltip: 'Italic' },
        { type: 'heading', icon: Heading2, tooltip: 'Heading' },
        { type: 'ul', icon: List, tooltip: 'Bulleted List' },
        { type: 'ol', icon: ListOrdered, tooltip: 'Numbered List' },
    ] as const;

    return (
        <div className="flex items-center gap-1 p-1 border rounded-md bg-muted">
            <TooltipProvider>
                {toolbarItems.map(item => (
                     <Tooltip key={item.type}>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat(item.type)}>
                                <item.icon className="h-4 w-4" />
                                <span className="sr-only">{item.tooltip}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{item.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    );
}


const AddNoteDialog: FC<{
    docId: string;
    onNoteAdded: (newNote: LibraryContent) => void;
}> = ({ docId, onNoteAdded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    // State for manual entry
    const [noteTitle, setNoteTitle] = useState(`Note - ${format(new Date(), 'PP')}`);
    const [noteContent, setNoteContent] = useState('');
    const writeTextareaRef = useRef<HTMLTextAreaElement>(null);
    const pastedTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    // State for clipboard
    const [clipboardText, setClipboardText] = useState('');
    const [clipboardImage, setClipboardImage] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    // State for handwriting
    const canvasRef = useRef<ReactSketchCanvasRef>(null);
    const [strokeColor, setStrokeColor] = useState("#444");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
    
    const handleOpenChange = async (open: boolean) => {
        if (open) {
            // Reset state when opening
            setNoteTitle(`Note - ${format(new Date(), 'PP')}`);
            setNoteContent('');
            setClipboardText('');
            setClipboardImage(null);
            setIsExtracting(false);
            canvasRef.current?.clearCanvas();
            setIsCanvasFullscreen(false);
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
    
    const handleSaveNote = async (contentToSave: string, titleToSave: string, type: 'markdown' | 'image' = 'markdown') => {
        if (!contentToSave || !titleToSave) {
            toast({ variant: 'destructive', title: 'Missing Content', description: 'Please provide a title and content for the note.' });
            return;
        }
        setIsSaving(true);
        try {
            const newNote = await addContentToDocument(docId, titleToSave, contentToSave, type);
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
    
    const handleSaveCanvas = async () => {
        if (!canvasRef.current) return;
        try {
            const dataUrl = await canvasRef.current.exportImage('png');
            handleSaveNote(dataUrl, `Handwritten Note - ${format(new Date(), 'PP')}`, 'image');
        } catch (error) {
            console.error("Error exporting canvas image:", error);
            toast({ variant: 'destructive', title: "Save Drawing Failed" });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" /> Add New Note
                </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-2xl", isCanvasFullscreen && "w-screen h-screen max-w-full")}>
                <div className={cn(isCanvasFullscreen && "hidden")}>
                    <DialogHeader>
                        <DialogTitle>Add a New Note</DialogTitle>
                        <DialogDescription>
                            Write with Markdown, paste from clipboard, or use a stylus to write by hand.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="write">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="write">Write</TabsTrigger>
                            <TabsTrigger value="paste" onClick={handlePasteFromClipboard}>Paste</TabsTrigger>
                            <TabsTrigger value="draw">Handwriting</TabsTrigger>
                        </TabsList>
                        <TabsContent value="write" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="note-title">Note Title</Label>
                                <Input id="note-title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="note-content">Content (Markdown supported)</Label>
                                <div className="space-y-1">
                                    <MarkdownToolbar textareaRef={writeTextareaRef} onContentChange={setNoteContent} />
                                    <Textarea id="note-content" ref={writeTextareaRef} value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={10} />
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => handleSaveNote(noteContent, noteTitle, 'markdown')} disabled={isSaving}>
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
                                        <div className="space-y-1">
                                        <MarkdownToolbar textareaRef={pastedTextareaRef} onContentChange={setClipboardText} />
                                        <Textarea id="clipboard-content" ref={pastedTextareaRef} value={clipboardText} onChange={(e) => setClipboardText(e.target.value)} rows={10} placeholder="Click the 'Paste from Clipboard' tab header to read clipboard data..." />
                                        </div>
                                    </div>
                                    <Button className="w-full" onClick={() => handleSaveNote(clipboardText, noteTitle, 'markdown')} disabled={isSaving || !clipboardText}>
                                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                                        Save Pasted Note
                                    </Button>
                                </>
                            )}
                        </TabsContent>
                        <TabsContent value="draw" className="space-y-4 pt-4">
                             {/* This content is now handled by the fullscreen view logic below */}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Handwriting Canvas Area (conditionally fullscreen) */}
                <div className={cn(
                    "space-y-4", 
                    isCanvasFullscreen 
                        ? "fixed inset-0 bg-background z-50 p-4 flex flex-col" 
                        : "relative"
                )}>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>Color:</Label>
                            <Input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-14 h-9 p-1" />
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <Label>Size:</Label>
                            <Input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="flex-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => canvasRef.current?.undo()}>
                                <Undo className="h-4 w-4" />
                                <span className="sr-only">Undo</span>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => canvasRef.current?.clearCanvas()}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Clear</span>
                            </Button>
                             <Button variant="outline" size="icon" onClick={() => setIsCanvasFullscreen(prev => !prev)}>
                                {isCanvasFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                <span className="sr-only">{isCanvasFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                            </Button>
                        </div>
                    </div>
                    <div className={cn("border rounded-lg overflow-hidden", isCanvasFullscreen && "flex-1")}>
                            <ReactSketchCanvas
                            ref={canvasRef}
                            strokeWidth={strokeWidth}
                            strokeColor={strokeColor}
                            height={isCanvasFullscreen ? "100%" : "300px"}
                            width="100%"
                        />
                    </div>
                    <Button className="w-full" onClick={handleSaveCanvas} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Drawing
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddNoteDialog;
