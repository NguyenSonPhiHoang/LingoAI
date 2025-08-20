
"use client";

import * as React from "react";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import { useAuth } from "@/context/auth-context";
import { getVocabulary } from "@/services/vocabulary";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const [words, setWords] = React.useState<any[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const fetchedWords = await getVocabulary(user.uid);
        setWords(fetchedWords);
      } catch (error) {
        console.error("Error fetching library data:", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
      <DashboardLayout
        activeView="library"
        setActiveView={(view) => {
            if (view === 'storybook') router.push('/storybook');
            else if (view === 'library') router.push('/library');
            else router.push('/');
        }}
        setWords={setWords}
      >
        {children}
      </DashboardLayout>
  );
}
