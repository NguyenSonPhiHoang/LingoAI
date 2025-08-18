
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
    // Don't do anything until Firebase auth state is resolved.
    if (authLoading) {
      return;
    }

    // If auth is resolved and there's no user, redirect to login.
    if (!user) {
      router.push("/login");
      return;
    }

    // If the user object is present but doesn't have a status yet,
    // it means the Firestore data is still loading. We wait.
    if (!user.status) {
      setIsLoading(true);
      return;
    }
    
    // If user is approved, fetch their data.
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
      // For 'pending' or other statuses, we don't need to fetch words,
      // so we can stop loading. The UI will show the correct component.
      setIsLoading(false);
    }
  }, [user, authLoading, router, toast]);


  const favoriteWords = words.filter((word) => word.favorite);

  const renderContent = () => {
    // Show a loader while authentication or data fetching is in progress.
    if (authLoading || isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
    
    // This state should not be reachable if the useEffect logic is correct,
    // but as a fallback, we prevent rendering anything.
    if (!user) {
      return null;
    }
    
    // Show the waiting for approval screen if the user is not approved.
    if (user.status === 'pending' || user.status === 'rejected') {
        return <WaitingForApproval />;
    }
    
    // Only render the main dashboard if the user is approved.
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

    // Fallback for any other state, though it shouldn't be reached.
    return <WaitingForApproval />;
  };

  // Do not render the layout if there is no user and authentication is complete.
  // This prevents a flash of the layout before the redirect to login happens.
  if (!user && !authLoading) {
    return null;
  }

  return (
    <DashboardLayout activeView={activeView} setActiveView={setActiveView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Home;
