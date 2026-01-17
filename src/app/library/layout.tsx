"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import type { CombinedVocabulary } from "@/services/vocabulary";
import type { View } from "@/app/page";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = React.useState<
    View | "storybook" | "library" | "guide"
  >("library");
  const [words, setWords] = React.useState<CombinedVocabulary[]>([]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
  }, [user, authLoading, router]);

  const handleSetActiveView = (
    view: View | "storybook" | "library" | "guide"
  ) => {
    if (view === "library") {
      router.push("/library");
    } else if (view === "storybook") {
      router.push("/storybook");
    } else if (view === "guide") {
      router.push("/guide");
    } else {
      router.push("/");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      activeView={activeView}
      setActiveView={handleSetActiveView}
      setWords={setWords}
    >
      {children}
    </DashboardLayout>
  );
}
