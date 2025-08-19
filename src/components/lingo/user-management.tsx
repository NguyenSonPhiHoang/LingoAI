
"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Timer } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getAllUsers, updateUserStatus } from '@/services/users';
import { getAllUsersTotalActivity } from '@/services/activity';
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
import { format, formatDistanceToNowStrict } from 'date-fns';

const formatTotalDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return 'N/A';
    return formatDistanceToNowStrict(new Date(Date.now() - totalSeconds * 1000), {
        unit: 'hour',
        roundingMethod: 'round'
    });
};


const UserManagement: FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [activity, setActivity] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
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
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Approve or reject new user registrations and view their activity.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
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
                            <TableRow key={u.uid}>
                                <TableCell>{u.displayName}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Timer className="h-4 w-4 text-muted-foreground" />
                                        {formatTotalDuration(activity[u.uid] || 0)}
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
                                            <DropdownMenuItem onClick={() => handleStatusChange(u.uid, 'approved')} disabled={u.status === 'approved'}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(u.uid, 'pending')} disabled={u.status === 'pending'}>
                                                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                                                Set to Pending
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(u.uid, 'rejected')} disabled={u.status === 'rejected'}>
                                                 <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                                Reject
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default UserManagement;
