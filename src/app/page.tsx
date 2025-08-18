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
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Don't do anything until auth is resolved
    if (authLoading) {
      return;
    }
  
    // If the user is logged in, handle data fetching or show pending status
    if (user) {
      if (user.status === 'approved') {
        const fetchWords = async () => {
          try {
            setIsLoading(true); // Keep loading while fetching words
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
            setIsLoading(false); // Stop loading after fetching
          }
        };
        fetchWords();
      } else {
        // For 'pending' or 'rejected' users, just stop loading
        setIsLoading(false);
      }
    } else {
      // If there's no user and auth is done, stop loading
      setIsLoading(false);
    }
  }, [user, authLoading, toast]);


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
    
    if (user.status === 'pending') {
        return <WaitingForApproval />;
    }
    
    // Add this check to handle rejected users
    if (user.status !== 'approved') {
        // You can create a dedicated 'rejected' component later
        return <WaitingForApproval />;
    }

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
  };

  return (
    <DashboardLayout activeView={activeView} setActiveView={setActiveView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Home;
