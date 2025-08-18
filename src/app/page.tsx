
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
import WordManagement from "@/components/lingo/word-management";
import WaitingForApproval from "@/components/lingo/waiting-for-approval";
import LessonDetailView from "@/components/lingo/lesson-detail-view";
import MyLessonsView from "@/components/lingo/my-lessons-view";
import type { CombinedVocabulary } from "@/services/vocabulary";
import { getVocabulary } from "@/services/vocabulary";
import type { Lesson } from "@/services/lessons";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export type View =
  | "overview"
  | "levels"
  | "ai-suggester"
  | "my-lessons"
  | "vocabulary"
  | "review"
  | "user-management"
  | "word-management"
  | "lesson-detail";

export type ViewState = {
  view: View;
  lesson?: Lesson;
};

const Home: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeViewState, setActiveViewState] = useState<ViewState>({ view: "overview" });
  const [words, setWords] = useState<CombinedVocabulary[]>([]);
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
            title: "Error Fetching Vocabulary",
            description: "Could not fetch your vocabulary. Please check permissions or try again later.",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchWords();
    } else {
      // For 'pending' or 'rejected' statuses, we don't need to fetch words,
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
      switch (activeViewState.view) {
        case "overview":
          return <DashboardOverview setActiveView={(view) => setActiveViewState({ view })} />;
        case "levels":
          return <LevelView />;
        case "ai-suggester":
          return <AiSuggester setActiveView={(view) => setActiveViewState({view})} />;
        case "my-lessons":
          return <MyLessonsView setActiveViewState={setActiveViewState} />;
        case "vocabulary":
          return <VocabularyList words={words} setWords={setWords} />;
        case "review":
          return <ReviewView words={favoriteWords} />;
        case "user-management":
          return <UserManagement />;
        case "word-management":
            return <WordManagement />;
        case "lesson-detail":
           return activeViewState.lesson ? (
            <LessonDetailView
              lesson={activeViewState.lesson}
              vocabulary={words}
              onBack={() => setActiveViewState({ view: "my-lessons" })}
              setWords={setWords}
            />
          ) : (
            // Fallback if no lesson is provided
            <MyLessonsView setActiveViewState={setActiveViewState} />
          );
        default:
          return <DashboardOverview setActiveView={(view) => setActiveViewState({ view })} />;
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
    <DashboardLayout
      activeView={activeViewState.view}
      setActiveView={(view) => setActiveViewState({ view })}
      setWords={setWords}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default Home;
