
"use client";

import { useState, useRef, type FC } from 'react';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, User, Mail, Shield, CheckCircle, Clock, XCircle, Calendar, Upload, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/services/users';

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

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
            // Revert form to original value on error
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

        // In a real app, you would upload this file to Firebase Storage
        // and get a download URL. For this demo, we'll use a placeholder.
        setIsUploading(true);
        toast({
            title: "File Upload (Demo)",
            description: "In a real application, this file would be uploaded to storage. This feature is not fully implemented yet."
        });

        // Simulating upload
        setTimeout(() => {
             // Example: const photoURL = await uploadFileAndGetURL(file);
             // await updateUserProfile(user.uid, { photoURL });
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
        </div>
    );
};

export default ProfileView;
