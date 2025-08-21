"use client";

import { useState } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { LibraryDocument, LibrarySkill } from '@/services/library';
import { updateDocument } from '@/services/library';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const SKILLS: LibrarySkill[] = ["Reading", "Writing", "Listening", "Speaking", "Pronunciation"];

const editDocSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters."),
    url: z.string().url("Please enter a valid URL."),
    skill: z.enum(SKILLS, { required_error: "Please select a skill." }),
});

type EditDocumentDialogProps = {
    doc: LibraryDocument;
    onDocumentUpdated: (updatedDoc: LibraryDocument) => void;
};

const EditDocumentDialog: FC<EditDocumentDialogProps> = ({ doc, onDocumentUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const form = useForm<z.infer<typeof editDocSchema>>({
        resolver: zodResolver(editDocSchema),
        defaultValues: {
            title: doc.title,
            url: doc.url,
            skill: doc.skill
        },
    });

    const onSubmit = async (values: z.infer<typeof editDocSchema>) => {
        try {
            await updateDocument(doc.id, values);
            onDocumentUpdated({ ...doc, ...values });
            toast({ title: "Success", description: "Document updated." });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update document:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update document." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Document</DialogTitle>
                    <DialogDescription>Update the details of your saved resource.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
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
                                    <FormControl><Input {...field} /></FormControl>
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
                                                <SelectValue placeholder="Select the main skill" />
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
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default EditDocumentDialog;

    