
"use client";

import * as React from 'react';
import { useState, useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookImage, PlusCircle, Trash2, MoreVertical, Search, CircleDashed, Circle, CheckCircle, LayoutGrid, List, BookOpen } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    
    const formatClass = story.format === 'bilingual' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-purple-50 dark:bg-purple-900/30';

    return (
         <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className={cn("relative p-3", formatClass)}>
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize bg-background/50">{story.level}</Badge>
                        <Badge variant="secondary" className="capitalize bg-background/50">{story.format === 'interspersed' ? 'Truyện Chêm' : 'Bilingual'}</Badge>
                    </div>
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
                 </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3">
                 <div className="flex items-start gap-2 mb-2">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="mt-1">
                                <StatusIcon className={cn("h-5 w-5 flex-shrink-0", statusClassName)} />
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>Status: {statusLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <CardTitle className="text-base font-semibold line-clamp-2">
                       {story.title}
                    </CardTitle>
                 </div>
                  <div className="flex-grow" />
                 <div className="flex justify-end items-center text-xs text-muted-foreground mt-2">
                    <p>
                        {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="p-3">
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
    const router = useRouter();
    const [storybooks, setStorybooks] = useState<Storybook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    
    const handleDeleteFromList = async (story: Storybook) => {
         try {
            await deleteStorybook(story.id);
            toast({ title: 'Success', description: 'Story deleted successfully.' });
            handleStoryDeleted(story.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the story.' });
        }
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
                        <div className="flex items-center gap-2">
                            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                                <LayoutGrid className="h-5 w-5" />
                                <span className="sr-only">Grid View</span>
                            </Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                                <List className="h-5 w-5" />
                                <span className="sr-only">List View</span>
                            </Button>
                            <Link href="/storybook/generate">
                                <Button>
                                    <PlusCircle className="mr-2" /> Generate New Story
                                </Button>
                            </Link>
                         </div>
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
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredStorybooks.map(story => (
                            <StorybookCard key={story.id} story={story} onStoryDeleted={handleStoryDeleted} />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Format</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredStorybooks.map(story => {
                                     const { icon: StatusIcon, className: statusClassName, label: statusLabel } = getStatusInfo(story.status);
                                     return (
                                        <TableRow key={story.id}>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <StatusIcon className={cn("h-5 w-5", statusClassName)} />
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{statusLabel}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell className="font-medium">{story.title}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{story.level}</Badge></TableCell>
                                            <TableCell><Badge variant="secondary" className="capitalize">{story.format === 'interspersed' ? 'Truyện Chêm' : 'Bilingual'}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => router.push(`/storybook/${story.id}`)}><BookOpen className="mr-2" /> Read</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                                                                    <AlertDialogAction onClick={() => handleDeleteFromList(story)}>Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                     )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )
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



