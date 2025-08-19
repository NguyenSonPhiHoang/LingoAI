
"use client";

import { useState, useRef, useEffect, type FC } from 'react';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, User, Mail, Shield, CheckCircle, Clock, XCircle, Calendar, Upload, Pencil, FileText, Star } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/services/users';
import { getTestResults, type TestResult } from '@/services/test-results';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

const PlacementTestHistory: FC = () => {
    const { user } = useAuth();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const testResults = await getTestResults(user.uid);
                setResults(testResults);
            } catch (error) {
                console.error("Failed to fetch test results", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [user]);
    
    // The results are already sorted newest to oldest from Firestore.
    // Take the 10 most recent results for the chart and reverse them for chronological display.
    const chartData = results
        .slice(0, 10)
        .map(result => ({
            date: format(new Date(result.takenAt), 'MMM d'),
            percentage: Number(result.percentage.toFixed(1)),
        }))
        .reverse();


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin" />
            </div>
        );
    }
    
    if (results.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">No test history found.</p>;
    }

    return (
        <div className="space-y-8">
            <ChartContainer config={{
                 percentage: {
                    label: "Score",
                    color: "hsl(var(--primary))",
                },
                trend: {
                    label: "Trend",
                    color: "hsl(var(--accent))"
                }
            }} className="h-64 w-full">
                 <ComposedChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                    />
                    <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip 
                        cursor={false}
                        content={<ChartTooltipContent 
                            formatter={(value, name) => (
                                <div className="flex items-center gap-2">
                                  <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: name === 'percentage' ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}} />
                                    <div className="flex flex-1 justify-between">
                                        <span className="text-muted-foreground">{name === 'percentage' ? 'Score' : 'Trend'}</span>
                                        <span className="font-bold">{value}%</span>
                                    </div>
                                </div>
                            )}
                        />} 
                    />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={4} />
                    <Line dataKey="percentage" name="trend" type="monotone" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
                </ComposedChart>
            </ChartContainer>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Recommended Level</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map(result => (
                        <TableRow key={result.id}>
                            <TableCell>{format(new Date(result.takenAt), 'PPP')}</TableCell>
                            <TableCell>
                                <Badge variant={result.testType === 'Placement Test' ? 'default' : 'secondary'}>
                                    {result.testType === 'Placement Test' ? <Star className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
                                    {result.testType}
                                </Badge>
                            </TableCell>
                            <TableCell>{result.correctAnswers}/{result.totalQuestions}</TableCell>
                            <TableCell>{result.percentage.toFixed(1)}%</TableCell>
                            <TableCell className="capitalize">{result.recommendedLevel || 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const ProfileView: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        values: {
            displayName: user?.displayName || '',
        },
    });

    if (!user) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
        setIsSubmitting(true);
        try {
            await updateUserProfile(user.uid, { displayName: values.displayName });
            toast({
                title: "Success",
                description: "Your profile has been updated.",
            });
        } catch (error: any) {
            console.error("Profile update failed:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "An unknown error occurred.",
            });
            form.reset({ displayName: user.displayName || '' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        toast({
            title: "File Upload (Demo)",
            description: "In a real application, this file would be uploaded to storage. This feature is not fully implemented yet."
        });

        setTimeout(() => {
            setIsUploading(false);
        }, 2000);
    };

    const statusInfo = {
        approved: { icon: CheckCircle, text: 'Approved', color: 'text-green-600' },
        pending: { icon: Clock, text: 'Pending Approval', color: 'text-yellow-600' },
        rejected: { icon: XCircle, text: 'Rejected', color: 'text-red-600' },
    }[user.status || 'pending'];
    
    const roleInfo = {
        admin: { text: 'Administrator', color: 'bg-primary text-primary-foreground' },
        user: { text: 'User', color: 'bg-secondary text-secondary-foreground' }
    }[user.role || 'user'];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>View and manage your personal details.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center text-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                                <AvatarImage src={user.photoURL || `https://placehold.co/200x200.png`} data-ai-hint="person" />
                                <AvatarFallback className="text-4xl">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                             <Button 
                                size="icon" 
                                className="absolute bottom-1 right-1 rounded-full h-9 w-9 group-hover:bg-primary/90"
                                onClick={handleAvatarClick}
                                disabled={isUploading}
                              >
                                {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="h-5 w-5"/>}
                                <span className="sr-only">Upload new photo</span>
                             </Button>
                        </div>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="sr-only">Display Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="text-center text-lg font-semibold"/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isDirty}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                                    Save Name
                                </Button>
                            </form>
                        </Form>
                    </div>
                    <div className="md:col-span-2 space-y-4 text-sm">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="font-semibold">Email</div>
                                <div className="text-muted-foreground">{user.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                             <div>
                                <div className="font-semibold">Role</div>
                                <Badge variant="secondary" className={roleInfo.color}>{roleInfo.text}</Badge>
                            </div>
                        </div>
                         <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <statusInfo.icon className={`h-5 w-5 ${statusInfo.color}`} />
                             <div>
                                <div className="font-semibold">Account Status</div>
                                <div className={`${statusInfo.color}`}>{statusInfo.text}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                             <div>
                                <div className="font-semibold">Member Since</div>
                                <div className="text-muted-foreground">
                                    {user.createdAt ? format(new Date(user.createdAt as any), 'PPP') : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Test History</CardTitle>
                    <CardDescription>Review your past placement and review test results to track your progress.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PlacementTestHistory />
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfileView;
