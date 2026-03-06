"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, ShieldCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { verifyOtpApi } from "@/services/auth-api";

// --- Step 1 schema ---
const registerSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

// --- Step 2 schema ---
const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d+$/, "OTP must be numeric"),
});

export default function SignupPage() {
  const router = useRouter();
  const { signup, login } = useAuth();
  const { toast } = useToast();

  // step: "register" | "otp"
  const [step, setStep] = useState<"register" | "otp">("register");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ---- Step 1 form ----
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  // ---- Step 2 form ----
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  // Step 1: submit registration → server sends OTP email
  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsSubmitting(true);
    try {
      await signup(values.email, values.password, values.displayName);
      setPendingEmail(values.email);
      setPendingPassword(values.password);
      setStep("otp");
      startResendCooldown();
      toast({ title: "OTP Sent!", description: `Check your email: ${values.email}` });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: verify OTP → login
  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setIsSubmitting(true);
    try {
      await verifyOtpApi(pendingEmail, values.otp);
      // OTP verified → auto login
      await login(pendingEmail, pendingPassword);
      toast({ title: "Welcome!", description: "Your account has been verified." });
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      const values = registerForm.getValues();
      await signup(values.email, values.password, values.displayName);
      startResendCooldown();
      toast({ title: "OTP Resent", description: "A new code was sent to your email." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        {/* --- STEP 1: Register form --- */}
        {step === "register" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create an Account</CardTitle>
              <CardDescription>
                Join LingoAI to start your personalized learning adventure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Sign Up
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm">
              <p>
                Already have an account?&nbsp;
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </CardFooter>
          </>
        )}

        {/* --- STEP 2: OTP input --- */}
        {step === "otp" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Verify your Email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <strong>{pendingEmail}</strong>.
                <br />It expires in 5 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123456"
                            maxLength={6}
                            className="text-center text-2xl tracking-widest font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Verify Code
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-center text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={onResend}
                disabled={resendCooldown > 0 || isSubmitting}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:underline text-xs"
                onClick={() => setStep("register")}
              >
                ← Back to Sign Up
              </button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
