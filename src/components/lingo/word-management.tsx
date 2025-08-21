
"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, Pencil, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getAllWords, updateWord, type Word } from '@/services/vocabulary';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAudioPlayback } from '@/hooks/use-audio-playback';

const editWordSchema = z.object({
  term: z.string().min(1, "Term cannot be empty."),
  pronunciation: z.string().min(1, "Pronunciation cannot be empty."),
});

const EditWordDialog: FC<{ word: Word; onWordUpdate: (updatedWord: Word) => void }> = ({ word, onWordUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof editWordSchema>>({
        resolver: zodResolver(editWordSchema),
        defaultValues: {
            term: word.term,
            pronunciation: word.pronunciation,
        },
    });

    const onSubmit = async (values: z.infer<typeof editWordSchema>) => {
        try {
            await updateWord(word.id, values);
            const updatedWord = { ...word, ...values };
            onWordUpdate(updatedWord);
            toast({ title: "Success", description: "Word updated successfully." });
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating word:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not update the word.",
            });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Global Word</DialogTitle>
                    <DialogDescription>
                        Modify the core properties of a word. This will affect all users.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="term"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Term</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pronunciation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pronunciation (IPA)</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
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


const WordManagement: FC = () => {
    const { user } = useAuth();
    const [words, setWords] = useState<Word[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const { audioRef, isPlaying, playGlobalWordAudio } = useAudioPlayback({ setWords: () => {} });


    useEffect(() => {
        const fetchWords = async () => {
            if (user?.role !== 'admin') {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const fetchedWords = await getAllWords();
                setWords(fetchedWords);
            } catch (error) {
                console.error("Error fetching words:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not fetch the global word list.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchWords();
    }, [user, toast]);
    
    const handleWordUpdate = (updatedWord: Word) => {
        setWords(prev => prev.map(w => (w.id === updatedWord.id ? updatedWord : w)));
    };

    const filteredWords = words.filter(word => 
        word.term.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.role !== 'admin') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view this page.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card>
             <audio ref={audioRef} className="hidden" />
            <CardHeader>
                <CardTitle>Word Management</CardTitle>
                <CardDescription>
                    View and edit the global vocabulary list. There are currently {words.length} words in the database. Changes made here will affect all users.
                </CardDescription>
                 <div className="relative mt-4 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by term..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Term</TableHead>
                            <TableHead>Pronunciation (IPA)</TableHead>
                            <TableHead>Audio</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWords.map((word) => (
                            <TableRow key={word.id}>
                                <TableCell className="font-medium">{word.term}</TableCell>
                                <TableCell className="font-sans">{word.pronunciation}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => playGlobalWordAudio(word)}
                                        disabled={isPlaying[word.id]}
                                        className={word.audioUrl ? 'text-primary' : 'text-muted-foreground'}
                                    >
                                        {isPlaying[word.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <EditWordDialog word={word} onWordUpdate={handleWordUpdate} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {filteredWords.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No words found.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default WordManagement;
