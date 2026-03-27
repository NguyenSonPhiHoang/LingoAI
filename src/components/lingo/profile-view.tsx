"use client";

import { useState, useRef, useEffect, type FC } from "react";
import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Loader2,
  User,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Upload,
  Pencil,
  FileText,
  Star,
  Timer,
  KeyRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getProfile, updateProfile, uploadPhoto } from "@/services/profile";
import { getTestResults, type TestResult } from "@/services/test-results";
import { getTotalUserActivity } from "@/services/activity";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  bio: z.string().max(2000, { message: "Bio is too long." }).optional(),
});

const passwordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required." }),
    newPassword: z
      .string()
      .min(6, { message: "New password must be at least 6 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatTotalDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "N/A";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

const PlacementTestHistory: FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const testResults = await getTestResults(user.id);
        setResults(testResults);
      } catch (error) {
        console.error("Failed to fetch test results", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [user]);

  const chartData = results
    .slice(0, 10)
    .map((result) => ({
      date: format(new Date(result.takenAt), "MMM d"),
      percentage: Number(result.percentage.toFixed(1)),
      trend: Number(result.percentage.toFixed(1)),
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
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No test history found.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <ChartContainer
        config={{
          percentage: {
            label: "Score",
            color: "hsl(var(--primary))",
          },
          trend: {
            label: "Trend",
            color: "hsl(var(--accent))",
          },
        }}
        className="h-64 w-full"
      >
        <ComposedChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
        >
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
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const isTrend = name === "trend";
                  return (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: isTrend
                            ? "hsl(var(--accent))"
                            : "hsl(var(--primary))",
                        }}
                      />
                      <div className="flex flex-1 justify-between">
                        <span className="text-muted-foreground">
                          {isTrend ? "Trend" : "Score"}
                        </span>
                        <span className="font-bold">{value}%</span>
                      </div>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={4} />
          <Line
            dataKey="trend"
            type="monotone"
            name="trend"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(var(--accent))" }}
          />
        </ComposedChart>
      </ChartContainer>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Test Type</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Recommended Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell>{format(new Date(result.takenAt), "PPP")}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    result.testType === "Placement Test"
                      ? "default"
                      : "secondary"
                  }
                >
                  {result.testType === "Placement Test" ? (
                    <Star className="mr-1 h-3 w-3" />
                  ) : (
                    <FileText className="mr-1 h-3 w-3" />
                  )}
                  {result.testType}
                </Badge>
              </TableCell>
              <TableCell>
                {result.correctAnswers}/{result.totalQuestions} (
                {result.percentage.toFixed(1)}%)
              </TableCell>
              <TableCell>
                {formatDuration(result.durationSeconds ?? 0)}
              </TableCell>
              <TableCell className="capitalize">
                {result.recommendedLevel || "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ChangePasswordForm: FC = () => {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    setIsSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({
        title: "Success",
        description: "Your password has been changed successfully.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Password change failed:", error);
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: "Please check your current password and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
          Change Password
        </Button>
      </form>
    </Form>
  );
};

const ProfileView: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalActivity, setTotalActivity] = useState(0);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [profile, setProfile] = useState<{
    displayName?: string | null;
    status?: string | null;
    photoUrl?: string | null;
    bio?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    values: {
      displayName: profile?.displayName || user?.displayName || "",
      bio: profile?.bio || "",
    },
  });

  useEffect(() => {
    form.reset({
      displayName: profile?.displayName || user?.displayName || "",
      bio: profile?.bio || "",
    });
  }, [profile, user, form]);

  useEffect(() => {
    if (!user) return;
    setIsActivityLoading(true);
    getTotalUserActivity(user.id)
      .then(setTotalActivity)
      .catch((err) => console.error("Failed to get user activity", err))
      .finally(() => setIsActivityLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getProfile()
      .then((p) => {
        setProfile(p);
        form.reset({ displayName: p.displayName || user.displayName || "" });
      })
      .catch((err) => {
        console.error("Failed to fetch profile", err);
      });
  }, [user, form]);

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
      const updated = await updateProfile({
        displayName: values.displayName,
        bio: values.bio ?? null,
      });
      setProfile(updated);
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
      form.reset({
        displayName: profile?.displayName || user.displayName || "",
        bio: profile?.bio || "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadPhoto(file);
      setProfile(result.profile as any);
      toast({
        title: "Upload Success",
        description: "Your avatar was uploaded.",
      });
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "Failed to upload file.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const statusInfo = {
    approved: { icon: CheckCircle, text: "Approved", color: "text-green-600" },
    pending: {
      icon: Clock,
      text: "Pending Approval",
      color: "text-yellow-600",
    },
    rejected: { icon: XCircle, text: "Rejected", color: "text-red-600" },
  }[
    (profile?.status || user.status || "pending") as
      | "approved"
      | "pending"
      | "rejected"
  ];

  const roleKey: "admin" | "user" = (() => {
    const roleValue =
      (profile as unknown as { role?: unknown } | null)?.role ??
      (user as unknown as { role?: unknown } | null)?.role;
    return roleValue === "admin" ? "admin" : "user";
  })();

  const roleInfoByKey = {
    admin: {
      text: "Administrator",
      color: "bg-primary text-primary-foreground",
    },
    user: { text: "User", color: "bg-secondary text-secondary-foreground" },
  } satisfies Record<"admin" | "user", { text: string; color: string }>;

  const roleInfo = roleInfoByKey[roleKey];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            View and manage your personal details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center text-center gap-4">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                <AvatarImage
                  src={
                    profile?.photoUrl ||
                    user.photoUrl ||
                    `https://placehold.co/200x200.png`
                  }
                  data-ai-hint="person"
                />
                <AvatarFallback className="text-4xl">
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <Button
                size="icon"
                className="absolute bottom-1 right-1 rounded-full h-9 w-9 group-hover:bg-primary/90"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="sr-only">Upload new photo</span>
              </Button>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 w-full"
              >
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Display Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="text-center text-lg font-semibold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell us about yourself"
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !form.formState.isDirty}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="mr-2 h-4 w-4" />
                  )}
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
                <Badge variant="secondary" className={roleInfo.color}>
                  {roleInfo.text}
                </Badge>
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
                  {user.createdAt
                    ? format(new Date(user.createdAt as any), "PPP")
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-semibold">Total Time Spent</div>
                <div className="text-muted-foreground">
                  {isActivityLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    formatTotalDuration(totalActivity)
                  )}
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-semibold mb-1">Bio</div>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {profile?.bio?.trim() ? profile.bio : "No bio provided."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>
            Review your past placement and review test results to track your
            progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlacementTestHistory />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileView;
