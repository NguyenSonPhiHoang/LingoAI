"use client";

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getAllUsers, updateUserStatus } from '@/services/users';
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


const UserManagement: FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch users.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
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
                <CardDescription>Approve or reject new user registrations.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
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
                                <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
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
