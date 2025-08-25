
"use client";

import * as React from 'react';
import { useState, useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookImage, PlusCircle, Trash2, MoreVertical, Search } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getStorybooks, deleteStorybook, type Storybook } from '@/services/storybooks';
import DashboardLayout from '@/components/lingo/dashboard-layout';
import type { CombinedVocabulary } from '@/services/vocabulary';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const StorybookCard: FC<{ story: Storybook; onStoryDeleted: (id: string) => void; }> = ({ story, onStoryDeleted }) => {
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        try {
            await deleteStorybook(story.id);
            toast({ title: 'Success', description: 'Story deleted successfully.' });
            onStoryDeleted(story.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the story.' });
        }
    };

    return (
        <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="relative">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete "{story.title}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
                <CardTitle className="pt-2 pr-8">{story.title}</CardTitle>
                <div className="flex items-center gap-2 !mt-2">
                    <Badge variant="outline" className="capitalize">{story.level}</Badge>
                    <Badge variant="secondary" className="capitalize">{story.format === 'interspersed' ? 'Truyện Chêm' : 'Bilingual'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm text-muted-foreground line-clamp-3">
                    {story.storyContent.substring(0, 150)}...
                </p>
                 <p className="text-xs text-muted-foreground mt-4">
                    Created {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                </p>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" variant="outline" onClick={() => router.push(`/storybook/${story.id}`)}>
                    Read Story
                </Button>
            </CardFooter>
        </Card>
    )
}

const StorybookLibraryPage: FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [storybooks, setStorybooks] = useState<Storybook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;
        const fetchStorybooks = async () => {
            setIsLoading(true);
            try {
                const fetchedStorybooks = await getStorybooks(user.uid);
                setStorybooks(fetchedStorybooks);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your storybooks.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStorybooks();
    }, [user, toast]);

    const handleStoryDeleted = (deletedStoryId: string) => {
        setStorybooks(prev => prev.filter(s => s.id !== deletedStoryId));
    };

    const filteredStorybooks = storybooks.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || isLoading) {
         return (
            <div className="flex h-full w-full items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><BookImage /> My Storybooks</CardTitle>
                            <CardDescription>Your personal library of AI-generated stories. Read them again or generate new ones!</CardDescription>
                        </div>
                         <Link href="/storybook/generate">
                            <Button>
                                <PlusCircle className="mr-2" /> Generate New Story
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search stories by title..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {filteredStorybooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStorybooks.map(story => (
                        <StorybookCard key={story.id} story={story} onStoryDeleted={handleStoryDeleted} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <BookImage className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your Storybook Library is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {searchTerm ? "No stories match your search." : "Click 'Generate New Story' to create your first one."}
                    </p>
                </div>
            )}

        </div>
    )
}

const StorybookLayout: FC = () => {
    const router = useRouter();

    return (
        <DashboardLayout
            activeView="storybook"
            setActiveView={(view) => {
                 if (view === 'storybook') router.push('/storybook');
                 else if (view === 'library') router.push('/library');
                 else if (view === 'guide') router.push('/guide');
                 else router.push('/');
            }}
            setWords={() => {}}
        >
            <StorybookLibraryPage />
        </DashboardLayout>
    );
}

export default StorybookLayout;
