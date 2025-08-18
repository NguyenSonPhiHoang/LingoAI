"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import DashboardOverview from "@/components/lingo/dashboard-overview";
import LevelView from "@/components/lingo/level-view";
import AiSuggester from "@/components/lingo/ai-suggester";
import VocabularyList from "@/components/lingo/vocabulary-list";
import ReviewView from "@/components/lingo/review-view";
import UserManagement from "@/components/lingo/user-management";
import WaitingForApproval from "@/components/lingo/waiting-for-approval";
import type { Word } from "@/components/lingo/vocabulary-list";
import { getVocabulary } from "@/services/vocabulary";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export type View =
  | "overview"
  | "levels"
  | "ai-suggester"
  | "vocabulary"
  | "review"
  | "user-management";

const Home: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("overview");
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Wait until authentication is resolved.
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    // If there is no user, redirect to login.
    if (!user) {
      router.push("/login");
      return;
    }

    // If user is present, handle approved vs. pending status.
    if (user.status === 'approved') {
      const fetchWords = async () => {
        setIsLoading(true);
        try {
          const fetchedWords = await getVocabulary(user.uid);
          setWords(fetchedWords);
        } catch (error) {
          console.error("Error fetching vocabulary:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch vocabulary from Firebase.",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchWords();
    } else {
      // For 'pending' or 'rejected' users, just stop loading and let the UI show the appropriate message.
      setIsLoading(false);
    }
  }, [user, authLoading, router, toast]);


  const favoriteWords = words.filter((word) => word.favorite);

  const renderContent = () => {
    if (authLoading || isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) {
      // This will be briefly visible before redirecting
      return null;
    }
    
    if (user.status === 'pending' || user.status === 'rejected') {
        return <WaitingForApproval />;
    }
    
    // Only render the main dashboard if user is approved
    if (user.status === 'approved') {
      switch (activeView) {
        case "overview":
          return <DashboardOverview setActiveView={setActiveView} />;
        case "levels":
          return <LevelView />;
        case "ai-suggester":
          return <AiSuggester />;
        case "vocabulary":
          return <VocabularyList words={words} setWords={setWords} />;
        case "review":
          return <ReviewView words={favoriteWords} />;
        case "user-management":
          return <UserManagement />;
        default:
          return <DashboardOverview setActiveView={setActiveView} />;
      }
    }

    // Fallback for any other state, though it shouldn't be reached
    return <WaitingForApproval />;
  };

  if (!user && !authLoading) {
    return null; // Don't render layout if not logged in
  }

  return (
    <DashboardLayout activeView={activeView} setActiveView={setActiveView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Home;
