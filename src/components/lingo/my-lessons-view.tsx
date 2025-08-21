
"use client";

import { useState, useEffect, useMemo, type FC, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/context/auth-context';
import { getLessons, type Lesson, deleteLesson, updateLesson, type LessonStatus } from '@/services/lessons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ArrowRight, Headphones, Mic, BookOpen, FilePenLine, ListFilter, X, Sparkles, GraduationCap, MoreVertical, Edit, Trash2, LayoutGrid, List, CheckCircle, Circle, CircleDashed, Voicemail, Folder, Check, Ban, FileText, AudioWaveform } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { generateReviewTest } from '@/ai/flows/generate-review-test-flow';


type Skill = "Listening" | "Speaking" | "Reading" | "Writing" | "Pronunciation";

const skillIcons: Record<Skill, React.ElementType> = {
    Listening: Headphones,
    Speaking: Mic,
    Reading: BookOpen,
    Writing: FilePenLine,
    Pronunciation: AudioWaveform,
};

const skillStyles: Record<Skill, string> = {
    Listening: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    Speaking: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    Reading: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    Writing: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    Pronunciation: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
};

const levelMapping: Record<string, { label: string, value: UserLevel }> = {
    'a1': { label: 'Level 1 (A1 – Beginner)', value: 'beginner' },
    'a2': { label: 'Level 2 (A2 – Elementary)', value: 'beginner' },
    'b1': { label: 'Level 3 (B1 – Intermediate)', value: 'intermediate' },
    'b2': { label: 'Level 4 (B2 – Upper Intermediate)', value: 'intermediate' },
    'c1': { label: 'Level 5 (C1 – Advanced)', value: 'advanced' },
    'c2': { label: 'Level 6 (C2 – Proficiency)', value: 'advanced' },
};

const levels: UserLevel[] = ["beginner", "intermediate", "advanced"];


interface MyLessonsViewProps {
    lessons: Lesson[];
    setLessons: Dispatch<SetStateAction<Lesson[]>>;
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

const EditLessonDialog: FC<{
    lesson: Lesson;
    onLessonUpdate: (updatedLesson: Lesson) => void;
}> = ({ lesson, onLessonUpdate }) => {
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

const LessonGrid: FC<{
    lessons: Lesson[];
    onStartLesson: (lesson: Lesson) => void;
    onLessonUpdate: (lesson: Lesson) => void;
    onLessonDelete: (lesson: Lesson) => void;
}> = ({ lessons, onStartLesson, onLessonUpdate, onLessonDelete }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map(lesson => {
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
                                <EditLessonDialog lesson={lesson} onLessonUpdate={onLessonUpdate} />
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
                                            <AlertDialogAction onClick={() => onLessonDelete(lesson)}>
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
                        <Button className="w-full" onClick={() => onStartLesson(lesson)}>
                            Open Lesson <ArrowRight className="ml-2" />
                        </Button>
                    </CardFooter>
                </Card>
            )
        })}
    </div>
);


const MyLessonsView: FC<MyLessonsViewProps> = ({ lessons, setLessons, setActiveViewState }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const initialSkillFilters = {
        Listening: true,
        Speaking: true,
        Reading: true,
        Writing: true,
        Pronunciation: true,
    };
    const [skillFilters, setSkillFilters] = useState<Record<Skill, boolean>>(initialSkillFilters);
    const [tempSkillFilters, setTempSkillFilters] = useState<Record<Skill, boolean>>(initialSkillFilters);
    const [isSkillFilterOpen, setIsSkillFilterOpen] = useState(false);

    const initialLevelFilters = Object.keys(levelMapping).reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {} as Record<string, boolean>);

    const [levelFilters, setLevelFilters] = useState<Record<string, boolean>>(initialLevelFilters);
    const [tempLevelFilters, setTempLevelFilters] = useState<Record<string, boolean>>(initialLevelFilters);
    const [isLevelFilterOpen, setIsLevelFilterOpen] = useState(false);

    const [topicGroupFilters, setTopicGroupFilters] = useState<Record<string, boolean>>({});
    const [tempTopicGroupFilters, setTempTopicGroupFilters] = useState<Record<string, boolean>>({});
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);

    useEffect(() => {
        // Initialize topic filters based on fetched lessons
        const uniqueTopicGroups = [...new Set(lessons.map(l => l.topicGroup))];
        const initialTopicFilters = uniqueTopicGroups.reduce((acc, topicGroup) => {
            acc[topicGroup] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTopicGroupFilters(initialTopicFilters);
        setTempTopicGroupFilters(initialTopicFilters);
    }, [lessons]);
    
    // --- Topic Group Filter Handlers ---
    const handleTempTopicGroupFilterChange = (topicGroup: string) => {
        setTempTopicGroupFilters(prev => ({...prev, [topicGroup]: !prev[topicGroup] }));
    }
    const applyTopicGroupFilters = () => {
        setTopicGroupFilters(tempTopicGroupFilters);
        setIsGroupFilterOpen(false);
    };
    const cancelTopicGroupFilters = () => {
        setTempTopicGroupFilters(topicGroupFilters);
        setIsGroupFilterOpen(false);
    };
    const handleSelectAllTopics = (select: boolean) => {
        setTempTopicGroupFilters(prev => {
            const newFilters: Record<string, boolean> = {};
            for (const topicGroup in prev) {
                newFilters[topicGroup] = select;
            }
            return newFilters;
        });
    };
    
    // --- Level Filter Handlers ---
    const handleTempLevelFilterChange = (levelKey: string) => {
        setTempLevelFilters(prev => ({...prev, [levelKey]: !prev[levelKey] }));
    }
    const applyLevelFilters = () => {
        setLevelFilters(tempLevelFilters);
        setIsLevelFilterOpen(false);
    };
    const cancelLevelFilters = () => {
        setTempLevelFilters(levelFilters);
        setIsLevelFilterOpen(false);
    };

    // --- Skill Filter Handlers ---
    const handleTempSkillFilterChange = (skill: Skill) => {
        setTempSkillFilters(prev => ({...prev, [skill]: !prev[skill] }));
    }
    const applySkillFilters = () => {
        setSkillFilters(tempSkillFilters);
        setIsSkillFilterOpen(false);
    };
    const cancelSkillFilters = () => {
        setTempSkillFilters(skillFilters);
        setIsSkillFilterOpen(false);
    };


    const uniqueTopicGroups = useMemo(() => [...new Set(lessons.map(l => l.topicGroup))].sort(), [lessons]);

    const filteredLessons = useMemo(() => {
        const activeTopicGroupFilters = Object.entries(topicGroupFilters)
            .filter(([, isActive]) => isActive)
            .map(([topicGroup]) => topicGroup);
        const activeSkillFilters = Object.entries(skillFilters)
            .filter(([, isActive]) => isActive)
            .map(([skill]) => skill);
        
        const activeLevels = Object.entries(levelFilters)
            .filter(([, isActive]) => isActive)
            .map(([levelKey]) => levelMapping[levelKey].value);
        const activeUserLevels = [...new Set(activeLevels)];
        
        return lessons
            .filter(lesson => activeSkillFilters.includes(lesson.skill))
            .filter(lesson => activeUserLevels.includes(lesson.level))
            .filter(lesson => activeTopicGroupFilters.includes(lesson.topicGroup))
            .filter(lesson => 
                lesson.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                lesson.topicGroup.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [lessons, searchTerm, skillFilters, levelFilters, topicGroupFilters]);
    
    const groupedLessons = useMemo(() => {
        return filteredLessons.reduce((acc, lesson) => {
            const group = lesson.topicGroup;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(lesson);
            return acc;
        }, {} as Record<string, Lesson[]>);
    }, [filteredLessons]);
    
    const handleCreateReviewTest = async () => {
        const completedLessons = lessons.filter(l => l.status === 'completed');
        if (completedLessons.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Completed Lessons',
                description: 'You must complete at least one lesson to create a review test.',
            });
            return;
        }

        setIsGeneratingTest(true);
        try {
            const vocabulary = completedLessons.flatMap(l => {
                const vocabContent = l.content?.find(c => c.type === 'vocabulary');
                if (!vocabContent) return [];
                try {
                    return JSON.parse(vocabContent.value).map((v: { word: string; definition: string; }) => ({
                        term: v.word,
                        definition: v.definition
                    }));
                } catch { return []; }
            });
            
            const passages = completedLessons.map(l => {
                 const passageContent = l.content?.find(c => c.type === 'passage');
                 if (!passageContent) return '';
                 try {
                     return JSON.parse(passageContent.value).body;
                 } catch { return ''; }
            }).filter(p => p);
            
            if (vocabulary.length === 0 && passages.length === 0) {
                toast({ variant: 'destructive', title: 'Not Enough Content', description: 'Your completed lessons do not have enough vocabulary or reading passages to generate a test.'});
                setIsGeneratingTest(false);
                return;
            }
            
            const test = await generateReviewTest({ vocabulary, passages });
            setActiveViewState({ view: 'review-test', reviewTest: test });

        } catch (error) {
            console.error('Failed to generate review test:', error);
            toast({ variant: 'destructive', title: 'Test Generation Failed', description: 'Could not create a review test. Please try again.' });
        } finally {
            setIsGeneratingTest(false);
        }
    };

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
    
    const renderGridView = () => {
        return (
            <Accordion type="multiple" defaultValue={Object.keys(groupedLessons)} className="space-y-6">
                {Object.entries(groupedLessons).map(([topicGroup, groupLessons]) => {
                    const stats = groupLessons.reduce((acc, lesson) => {
                        acc[lesson.status] = (acc[lesson.status] || 0) + 1;
                        return acc;
                    }, {} as Record<LessonStatus, number>);

                    return (
                        <AccordionItem value={topicGroup} key={topicGroup}>
                            <AccordionTrigger className="text-xl font-bold hover:no-underline flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Folder className="h-6 w-6 text-primary/80" />
                                    <span>{topicGroup}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground ml-auto pl-4">
                                    <div className="flex items-center gap-1.5" title="Not Started">
                                        <Circle className="h-3 w-3 text-muted-foreground/60" /> <span>{stats['not-started'] || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="In Progress">
                                        <CircleDashed className="h-3 w-3 text-yellow-500" /> <span>{stats['in-progress'] || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Completed">
                                        <CheckCircle className="h-3 w-3 text-green-500" /> <span>{stats['completed'] || 0}</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <LessonGrid 
                                    lessons={groupLessons}
                                    onStartLesson={handleStartLesson}
                                    onLessonUpdate={handleLessonUpdate}
                                    onLessonDelete={handleLessonDelete}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        );
    };

    const renderListView = () => (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Lesson Topic</TableHead>
                        <TableHead>Skill</TableHead>
                        <TableHead>Group</TableHead>
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
                                 <TableCell className="text-muted-foreground">{lesson.topicGroup}</TableCell>
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
                                placeholder="Search by lesson or group..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <DropdownMenu open={isGroupFilterOpen} onOpenChange={setIsGroupFilterOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Folder className="mr-2 h-4 w-4" />
                                        Group
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={() => cancelTopicGroupFilters()}>
                                    <DropdownMenuLabel>Show Groups</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                     <DropdownMenuItem onSelect={() => handleSelectAllTopics(true)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Select All
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleSelectAllTopics(false)}>
                                        <Ban className="mr-2 h-4 w-4" />
                                        Deselect All
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {uniqueTopicGroups.map(topicGroup => (
                                        <DropdownMenuCheckboxItem
                                            key={topicGroup}
                                            checked={tempTopicGroupFilters[topicGroup] ?? true}
                                            onCheckedChange={() => handleTempTopicGroupFilterChange(topicGroup)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            {topicGroup}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <div className="flex justify-end gap-2 p-2">
                                        <Button variant="ghost" size="sm" onClick={cancelTopicGroupFilters}>Cancel</Button>
                                        <Button size="sm" onClick={applyTopicGroupFilters}>Apply</Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                             <DropdownMenu open={isLevelFilterOpen} onOpenChange={setIsLevelFilterOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <GraduationCap className="mr-2 h-4 w-4" />
                                        Level
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={() => cancelLevelFilters()}>
                                    <DropdownMenuLabel>Show Levels</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(levelMapping).map(([key, { label }]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={tempLevelFilters[key]}
                                            onCheckedChange={() => handleTempLevelFilterChange(key)}
                                            onSelect={(e) => e.preventDefault()}
                                            className="capitalize"
                                        >
                                            {label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <div className="flex justify-end gap-2 p-2">
                                        <Button variant="ghost" size="sm" onClick={cancelLevelFilters}>Cancel</Button>
                                        <Button size="sm" onClick={applyLevelFilters}>Apply</Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu open={isSkillFilterOpen} onOpenChange={setIsSkillFilterOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <ListFilter className="mr-2 h-4 w-4" />
                                        Skill
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={() => cancelSkillFilters()}>
                                    <DropdownMenuLabel>Show Skills</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.keys(skillFilters).map(skill => (
                                        <DropdownMenuCheckboxItem
                                            key={skill}
                                            checked={tempSkillFilters[skill as Skill]}
                                            onCheckedChange={() => handleTempSkillFilterChange(skill as Skill)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            {skill}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <div className="flex justify-end gap-2 p-2">
                                        <Button variant="ghost" size="sm" onClick={cancelSkillFilters}>Cancel</Button>
                                        <Button size="sm" onClick={applySkillFilters}>Apply</Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={handleCreateReviewTest}
                            disabled={isGeneratingTest}
                        >
                            {isGeneratingTest ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Create Review Test
                        </Button>
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
