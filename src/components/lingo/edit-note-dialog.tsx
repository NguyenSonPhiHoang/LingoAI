
"use client";

import * as React from 'react';
import { useState } from 'react';
import type { FC } from 'react';
import { Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { LibraryContent } from '@/services/library';
import { updateContent } from '@/services/library';
import { Label } from '../ui/label';
import Image from 'next/image';

interface EditNoteDialogProps {
    note: LibraryContent;
    onNoteUpdated: (updatedNote: LibraryContent) => void;
    children: React.ReactNode;
}

const EditNoteDialog: FC<EditNoteDialogProps> = ({ note, onNoteUpdated, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const [title, setTitle] = useState(note.fileName);
    const [content, setContent] = useState(note.content);

    const handleSave = async () => {
        if (!title || !content) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Title and content cannot be empty.' });
            return;
        }
        setIsSaving(true);
        try {
            await updateContent(note.id, { fileName: title, content: content });
            onNoteUpdated({ ...note, fileName: title, content: content });
            toast({ title: "Success!", description: 'Your note has been updated.' });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update note:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Note</DialogTitle>
                    <DialogDescription>Update the title or content of your note below.</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="content" className="text-right pt-2">Content</Label>
                        {note.type === 'image' ? (
                            <div className="col-span-3 border rounded-md p-2">
                                <Image src={note.content} alt={note.fileName} width={500} height={300} className="w-full h-auto object-contain" />
                                <p className="text-xs text-muted-foreground mt-2 text-center">Handwritten notes cannot be edited.</p>
                            </div>
                        ) : (
                             <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="col-span-3" rows={15} />
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving || note.type === 'image'}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditNoteDialog;
