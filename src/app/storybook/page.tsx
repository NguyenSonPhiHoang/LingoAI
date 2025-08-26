
"use client";

import * as React from 'react';
import { useState, useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookImage, PlusCircle, Trash2, MoreVertical, Search, CircleDashed, Circle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getStorybooks, deleteStorybook, type Storybook, type StorybookStatus } from '@/services/storybooks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const getStatusInfo = (status: StorybookStatus) => {
    switch (status) {
        case 'completed':
            return { icon: CheckCircle, className: 'text-green-500', label: 'Completed' };
        case 'in-progress':
            return { icon: CircleDashed, className: 'text-yellow-500', label: 'In Progress' };
        case 'not-started':
        default:
            return { icon: Circle, className: 'text-muted-foreground/60', label: 'Not Started' };
    }
};


const StorybookCard: FC<{ story: Storybook; onStoryDeleted: (id: string) => void; }> = ({ story, onStoryDeleted }) => {
    const { toast } = useToast();
    const router = useRouter();
    const {icon: StatusIcon, className: statusClassName, label: statusLabel} = getStatusInfo(story.status);

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
            <CardHeader className="relative pb-2">
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
                <CardTitle className="pr-8 text-base font-semibold">{story.title}</CardTitle>
                 <div className="flex items-center gap-2 !mt-1">
                    <Badge variant="outline" className="capitalize text-xs">{story.level}</Badge>
                    <Badge variant="secondary" className="capitalize text-xs">{story.format === 'interspersed' ? 'Truyện Chêm' : 'Bilingual'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end pt-2">
                 <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                    <StatusIcon className={cn("h-4 w-4", statusClassName)} />
                                    <span>{statusLabel}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>Status: {statusLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <p>
                        {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                    </p>
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

export default StorybookLibraryPage;
