
"use client";

import { useState, useEffect, useMemo, type FC, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/context/auth-context';
import { getLessons, type Lesson, deleteLesson, updateLesson, LessonStatus } from '@/services/lessons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ArrowRight, Headphones, Mic, BookOpen, FilePenLine, ListFilter, X, Sparkles, GraduationCap, MoreVertical, Edit, Trash2, LayoutGrid, List, CheckCircle, Circle, CircleDashed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ViewState } from '@/app/page';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import type { UserLevel } from '@/ai/flows/schemas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
    Listening: Headphones,
    Speaking: Mic,
    Reading: BookOpen,
    Writing: FilePenLine,
};

const skillStyles: Record<Skill, string> = {
    Listening: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    Speaking: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    Reading: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    Writing: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
};


const levels: UserLevel[] = ["beginner", "intermediate", "advanced"];


interface MyLessonsViewProps {
    setActiveViewState: Dispatch<SetStateAction<ViewState>>;
}

const editLessonSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters."),
  level: z.enum(levels),
});

const getStatusIcon = (status: LessonStatus) => {
    switch (status) {
        case 'completed':
            return { icon: CheckCircle, className: 'text-green-500', tooltip: 'Completed' };
        case 'in-progress':
            return { icon: CircleDashed, className: 'text-yellow-500', tooltip: 'In Progress' };
        case 'not-started':
        default:
            return { icon: Circle, className: 'text-muted-foreground/60', tooltip: 'Not Started' };
    }
};

const EditLessonDialog: FC<{ lesson: Lesson, onLessonUpdate: (updatedLesson: Lesson) => void }> = ({ lesson, onLessonUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof editLessonSchema>>({
        resolver: zodResolver(editLessonSchema),
        defaultValues: {
            topic: lesson.topic,
            level: lesson.level,
        },
    });

    const onSubmit = async (values: z.infer<typeof editLessonSchema>) => {
        try {
            await updateLesson(lesson.docId, values);
            const updatedLesson = { ...lesson, ...values };
            onLessonUpdate(updatedLesson);
            toast({ title: "Success", description: "Lesson updated successfully." });
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating lesson:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not update the lesson.",
            });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <DialogTrigger className="w-full flex items-center">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </DialogTrigger>
            </DropdownMenuItem>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Lesson</DialogTitle>
                    <DialogDescription>
                        Make changes to your lesson details here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Topic</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Level</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a level" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {levels.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
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

const MyLessonsView: FC<MyLessonsViewProps> = ({ setActiveViewState }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [skillFilters, setSkillFilters] = useState<Record<Skill, boolean>>({
        Listening: true,
        Speaking: true,
        Reading: true,
        Writing: true,
    });
    const [levelFilters, setLevelFilters] = useState<Record<UserLevel, boolean>>({
        beginner: true,
        intermediate: true,
        advanced: true,
    });

    useEffect(() => {
        const fetchLessons = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const userLessons = await getLessons(user.uid);
                setLessons(userLessons);
            } catch (error) {
                console.error("Failed to fetch lessons:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not fetch your saved lessons.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchLessons();
    }, [user, toast]);
    
    const handleSkillFilterChange = (skill: Skill) => {
        setSkillFilters(prev => ({ ...prev, [skill]: !prev[skill] }));
    }
    
    const handleLevelFilterChange = (level: UserLevel) => {
        setLevelFilters(prev => ({ ...prev, [level]: !prev[level] }));
    }

    const filteredLessons = useMemo(() => {
        return lessons
            .filter(lesson => skillFilters[lesson.skill as Skill])
            .filter(lesson => levelFilters[lesson.level])
            .filter(lesson => lesson.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [lessons, searchTerm, skillFilters, levelFilters]);
    
    const handleStartLesson = (lesson: Lesson) => {
        setActiveViewState({ view: 'lesson-detail', lesson });
    };

    const handleLessonUpdate = (updatedLesson: Lesson) => {
        setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
    };

    const handleLessonDelete = async (lessonToDelete: Lesson) => {
        try {
            await deleteLesson(lessonToDelete.docId);
            setLessons(prev => prev.filter(l => l.id !== lessonToDelete.id));
            toast({ title: "Success", description: "Lesson deleted." });
        } catch (error) {
             console.error("Failed to delete lesson:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete the lesson.",
            });
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const renderGridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map(lesson => {
                const { icon: StatusIcon, className: statusClassName } = getStatusIcon(lesson.status);
                return (
                    <Card key={lesson.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader className="relative">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <EditLessonDialog lesson={lesson} onLessonUpdate={handleLessonUpdate} />
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
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the lesson
                                                    <span className="font-semibold"> "{lesson.topic}"</span>.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleLessonDelete(lesson)}>
                                                    Continue
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={cn(skillStyles[lesson.skill as Skill])}>{lesson.skill}</Badge>
                                <Badge variant="outline" className="capitalize">{lesson.level}</Badge>
                            </div>
                            <CardTitle className="pt-2 pr-8">{lesson.topic}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{formatDistanceToNow(new Date(lesson.createdAt), { addSuffix: true })}</span>
                                <StatusIcon className={cn("h-5 w-5", statusClassName)} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleStartLesson(lesson)}>
                                Open Lesson <ArrowRight className="ml-2" />
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );

    const renderListView = () => (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Skill</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredLessons.map(lesson => {
                        const { icon: StatusIcon, className: statusClassName, tooltip } = getStatusIcon(lesson.status);
                        return (
                            <TableRow key={lesson.id} className="cursor-pointer" onClick={() => handleStartLesson(lesson)}>
                                <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <StatusIcon className={cn("h-5 w-5", statusClassName)} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{tooltip}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell className="font-medium">{lesson.topic}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={cn(skillStyles[lesson.skill as Skill])}>{lesson.skill}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">{lesson.level}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(lesson.createdAt), { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleStartLesson(lesson)}>
                                                <BookOpen className="mr-2 h-4 w-4" /> Open
                                            </DropdownMenuItem>
                                            <EditLessonDialog lesson={lesson} onLessonUpdate={handleLessonUpdate} />
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
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the lesson <span className="font-semibold">"{lesson.topic}"</span>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleLessonDelete(lesson)}>Continue</AlertDialogAction>
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
    );
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle>My Lessons</CardTitle>
                            <CardDescription>Search, filter, and select a lesson to start practicing.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                                <LayoutGrid className="h-5 w-5" />
                                <span className="sr-only">Grid View</span>
                            </Button>
                            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                                <List className="h-5 w-5" />
                                <span className="sr-only">List View</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search by topic..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <GraduationCap className="mr-2" />
                                        Filter by Level
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Show Levels</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {levels.map(level => (
                                        <DropdownMenuCheckboxItem
                                            key={level}
                                            checked={levelFilters[level]}
                                            onCheckedChange={() => handleLevelFilterChange(level)}
                                            className="capitalize"
                                        >
                                            {level}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <ListFilter className="mr-2" />
                                        Filter by Skill
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Show Skills</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.keys(skillFilters).map(skill => (
                                        <DropdownMenuCheckboxItem
                                            key={skill}
                                            checked={skillFilters[skill as Skill]}
                                            onCheckedChange={() => handleSkillFilterChange(skill as Skill)}
                                        >
                                            {skill}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => setActiveViewState({view: 'ai-suggester'})}
                        >
                            <Sparkles className="mr-2" />
                            Generate New Lessons
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {filteredLessons.length > 0 ? (
                viewMode === 'grid' ? renderGridView() : renderListView()
            ) : (
                <div className="text-center py-16">
                    <X className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Lessons Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Try adjusting your search or filters, or generate some new lessons.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MyLessonsView;
