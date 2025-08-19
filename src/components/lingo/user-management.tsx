
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, type FC } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Timer, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getAllUsers, updateUserStatus } from '@/services/users';
import { getAllUsersTotalActivity, getUserActivityForMonth, type DailyActivity } from '@/services/activity';
import type { User } from '@/context/auth-context';
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
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formatTotalDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0h 0m';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
};


const UserActivityDetails: FC<{ userId: string }> = ({ userId }) => {
    const [activityData, setActivityData] = useState<DailyActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });
    const { toast } = useToast();

    useEffect(() => {
        const fetchActivity = async () => {
            setIsLoading(true);
            try {
                const data = await getUserActivityForMonth(userId, selectedDate.year, selectedDate.month);
                setActivityData(data);
            } catch (error) {
                 console.error("Error fetching monthly activity:", error);
                 toast({ variant: "destructive", title: "Error", description: "Could not fetch user activity." });
            } finally {
                setIsLoading(false);
            }
        }
        fetchActivity();
    }, [userId, selectedDate, toast]);
    
    const chartData = useMemo(() => {
        const daysInMonth = new Date(selectedDate.year, selectedDate.month, 0).getDate();
        const data = Array.from({ length: daysInMonth }, (_, i) => ({
            day: (i + 1).toString(),
            duration: 0,
        }));

        activityData.forEach(activity => {
            const dayOfMonth = new Date(activity.date).getDate();
            data[dayOfMonth - 1].duration = Math.round(activity.durationSeconds / 60); // in minutes
        });
        
        return data;

    }, [activityData, selectedDate]);
    
    const totalMinutes = chartData.reduce((sum, day) => sum + day.duration, 0);
    const activeDays = chartData.filter(day => day.duration > 0).length;
    const averageMinutes = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);


    return (
        <div className="p-4 bg-muted/50 space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <h4 className="font-semibold text-lg">Activity Details</h4>
                <div className="flex items-center gap-2">
                    <Select value={selectedDate.month.toString()} onValueChange={(val) => setSelectedDate(p => ({...p, month: parseInt(val)}))}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m} value={m.toString()}>{format(new Date(2000, m - 1), 'MMMM')}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedDate.year.toString()} onValueChange={(val) => setSelectedDate(p => ({...p, year: parseInt(val)}))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin" /></div>
            ) : chartData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Daily Activity - {format(new Date(selectedDate.year, selectedDate.month - 1), 'MMMM yyyy')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={{ duration: { label: "Minutes", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                                <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        label="Day of Month"
                                    />
                                    <YAxis tickFormatter={(value) => `${value}m`} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="duration" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Monthly Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-1 gap-4 text-center">
                            <div className="p-4 bg-background rounded-lg">
                                <div className="text-3xl font-bold">{formatTotalDuration(totalMinutes * 60)}</div>
                                <div className="text-sm text-muted-foreground">Total Time</div>
                            </div>
                             <div className="p-4 bg-background rounded-lg">
                                <div className="text-3xl font-bold">{formatTotalDuration(averageMinutes * 60)}</div>
                                <div className="text-sm text-muted-foreground">Daily Average</div>
                            </div>
                            <div className="p-4 bg-background rounded-lg">
                                <div className="text-3xl font-bold">{activeDays}</div>
                                <div className="text-sm text-muted-foreground">Active Days</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">No activity data for this period.</div>
            )}

        </div>
    )
}

const UserRow: FC<{
    u: User;
    totalActivity: number;
    isOpen: boolean;
    onToggle: () => void;
    onStatusChange: (uid: string, status: 'approved' | 'rejected' | 'pending') => void;
}> = ({ u, totalActivity, isOpen, onToggle, onStatusChange }) => {
    
    const getStatusBadge = (status: User['status']) => {
        switch (status) {
            case 'approved':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    }

    return (
        <TableRow data-state={isOpen ? 'open' : 'closed'}>
            <TableCell>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                 </Button>
            </TableCell>
            <TableCell>{u.displayName}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    {formatTotalDuration(totalActivity || 0)}
                </div>
            </TableCell>
            <TableCell>
                {u.createdAt ? format(new Date(u.createdAt as any), 'PPpp') : 'N/A'}
            </TableCell>
            <TableCell>{getStatusBadge(u.status)}</TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">Change Status</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onStatusChange(u.uid, 'approved')} disabled={u.status === 'approved'}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(u.uid, 'pending')} disabled={u.status === 'pending'}>
                            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                            Set to Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(u.uid, 'rejected')} disabled={u.status === 'rejected'}>
                             <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Reject
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};


const UserManagement: FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [activity, setActivity] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedActivity] = await Promise.all([
                getAllUsers(),
                getAllUsersTotalActivity()
            ]);
            setUsers(fetchedUsers);
            setActivity(fetchedActivity);
        } catch (error) {
            console.error("Error fetching user data:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch user data.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (user?.role === 'admin') {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleStatusChange = async (uid: string, status: 'approved' | 'rejected' | 'pending') => {
        try {
            await updateUserStatus(uid, status);
            setUsers(users.map(u => u.uid === uid ? { ...u, status } : u));
            toast({
                title: "Success",
                description: `User status updated to ${status}.`
            });
        } catch (error) {
             console.error("Error updating user status:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update user status.",
            });
        }
    };
    
    const handleToggleCollapsible = (uid: string) => {
        setOpenCollapsibles(prev => ({ ...prev, [uid]: !prev[uid] }));
    };

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
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Approve registrations and view user activity statistics.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"><BarChart3 className="h-5 w-5" /></TableHead>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Usage</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                           <React.Fragment key={u.uid}>
                             <UserRow 
                                u={u} 
                                totalActivity={activity[u.uid] || 0}
                                onStatusChange={handleStatusChange}
                                isOpen={!!openCollapsibles[u.uid]}
                                onToggle={() => handleToggleCollapsible(u.uid)}
                             />
                             {openCollapsibles[u.uid] && (
                                <TableRow>
                                    <TableCell colSpan={7} className="p-0">
                                       <UserActivityDetails userId={u.uid} />
                                    </TableCell>
                                </TableRow>
                             )}
                           </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default UserManagement;
