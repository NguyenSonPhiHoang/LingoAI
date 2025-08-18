
"use client";

import { useState, useEffect, useMemo, type FC, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/context/auth-context';
import { getLessons, type Lesson } from '@/services/lessons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ArrowRight, Headphones, Mic, BookOpen, FilePenLine, ListFilter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ViewState } from '@/app/page';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

type Skill = "Listening" | "Speaking" | "Reading" | "Writing";

const skillIcons: Record<Skill, React.ElementType> = {
    Listening: Headphones,
    Speaking: Mic,
    Reading: BookOpen,
    Writing: FilePenLine,
};

interface MyLessonsViewProps {
    setActiveViewState: Dispatch<SetStateAction<ViewState>>;
}

const MyLessonsView: FC<MyLessonsViewProps> = ({ setActiveViewState }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [skillFilters, setSkillFilters] = useState<Record<Skill, boolean>>({
        Listening: true,
        Speaking: true,
        Reading: true,
        Writing: true,
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

    const filteredLessons = useMemo(() => {
        return lessons
            .filter(lesson => skillFilters[lesson.skill as Skill])
            .filter(lesson => lesson.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [lessons, searchTerm, skillFilters]);
    
    const handleStartLesson = (lesson: Lesson) => {
        setActiveViewState({ view: 'lesson-detail', lesson });
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>My Lessons</CardTitle>
                    <CardDescription>Here are all your saved lessons. Search, filter, and select one to start practicing.</CardDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLessons.map(lesson => {
                        const Icon = skillIcons[lesson.skill as Skill];
                        return (
                            <Card key={lesson.id} className="flex flex-col hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary">{lesson.skill}</Badge>
                                        <Icon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <CardTitle className="pt-2">{lesson.topic}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription>
                                        Created {formatDistanceToNow(new Date(lesson.createdAt), { addSuffix: true })}
                                    </CardDescription>
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
