"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, UserPlus, ShieldCheck, RefreshCw,
  Mail, Lock, User, Sparkles, BookOpen, Zap, Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { verifyOtpApi } from "@/services/auth-api";

const registerSchema = z.object({
  email: z.string().email({ message: "Email không hợp lệ." }),
  password: z.string().min(6, { message: "Mật khẩu tối thiểu 6 ký tự." }),
  displayName: z.string().min(2, { message: "Tên tối thiểu 2 ký tự." }),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, { message: "Mã OTP gồm 6 chữ số." })
    .regex(/^\d+$/, "Mã OTP chỉ gồm số."),
});

const FEATURES = [
  { icon: Sparkles, text: "AI gợi ý bài học cá nhân hóa" },
  { icon: BookOpen, text: "Kho từ vựng thông minh" },
  { icon: Zap,      text: "Ôn tập với Flashcard & Quiz" },
  { icon: Globe,    text: "Luyện thi VTEP hiệu quả" },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, login } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"register" | "otp">("register");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) { clearInterval(iv); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsSubmitting(true);
    try {
      await signup(values.email, values.password, values.displayName);
      setPendingEmail(values.email);
      setPendingPassword(values.password);
      setStep("otp");
      startResendCooldown();
      toast({ title: "Đã gửi mã OTP!", description: `Kiểm tra hộp thư: ${values.email}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Đăng ký thất bại", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setIsSubmitting(true);
    try {
      await verifyOtpApi(pendingEmail, values.otp);
      await login(pendingEmail, pendingPassword);
      toast({ title: "Chào mừng bạn! 🎉", description: "Tài khoản đã được xác minh." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xác minh thất bại", description: error.message || "Mã OTP không hợp lệ hoặc đã hết hạn." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      const v = registerForm.getValues();
      await signup(v.email, v.password, v.displayName);
      startResendCooldown();
      toast({ title: "Đã gửi lại mã", description: "Kiểm tra hộp thư của bạn." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT: Hero panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 75%, #5b21b6 100%)",
        }}
      >
        {/* Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #c084fc, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">
            Lingo<span className="text-indigo-300">AI</span>
          </h1>
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              Bắt đầu hành trình<br />
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #a5b4fc, #e879f9)" }}>
                học tiếng Anh
              </span>
            </h2>
            <p className="text-indigo-200 text-lg leading-relaxed">
              Miễn phí. Cá nhân hóa. Hiệu quả từ ngày đầu tiên.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(165,180,252,0.15)", border: "1px solid rgba(165,180,252,0.25)" }}>
                  <Icon className="h-4 w-4 text-indigo-300" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-indigo-300 text-sm italic">
            "Đầu tư vào kiến thức luôn mang lại lợi nhuận tốt nhất."
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-bold text-primary">LingoAI</h1>
          </div>

          {/* ── STEP 1: Register ── */}
          {step === "register" && (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Tạo tài khoản ✨
                </h2>
                <p className="text-muted-foreground">
                  Bắt đầu chỉ trong vài giây.
                </p>
              </div>

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
                  <FormField
                    control={registerForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Họ và tên</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Nguyễn Văn A" className="pl-10 h-11" {...field} />
                          </div>
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
                        <FormLabel className="text-sm font-semibold">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="you@example.com" className="pl-10 h-11" {...field} />
                          </div>
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
                        <FormLabel className="text-sm font-semibold">Mật khẩu</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="password" placeholder="Tối thiểu 6 ký tự" className="pl-10 h-11" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Tạo tài khoản
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Đăng nhập
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <>
              <div className="space-y-2">
                {/* Shield icon */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Xác minh email 🔐
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Chúng tôi đã gửi mã 6 chữ số đến{" "}
                  <span className="font-semibold text-foreground">{pendingEmail}</span>.
                  <br />Mã có hiệu lực trong 5 phút.
                </p>
              </div>

              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Mã xác minh</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="_ _ _ _ _ _"
                            maxLength={6}
                            className="text-center text-3xl tracking-[0.6em] font-mono h-14"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Xác minh
                  </Button>
                </form>
              </Form>

              <div className="flex flex-col items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  onClick={() => setStep("register")}
                >
                  ← Quay lại đăng ký
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
