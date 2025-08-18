
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
import ProfileView from "@/components/lingo/profile-view";
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
  | "lesson-detail"
  | "profile";

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
  
  const userId = user?.uid;
  const userStatus = user?.status;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    if (userStatus === 'approved') {
      const fetchWords = async () => {
        setIsLoading(true);
        try {
          const fetchedWords = await getVocabulary(userId);
          setWords(fetchedWords);
        } catch (error) {
          console.error("Error fetching vocabulary:", error);
          toast({
            variant: "destructive",
            title: "Error Fetching Vocabulary",
            description: "Could not fetch your vocabulary. Please try again later.",
          });
        } finally {
            setIsLoading(false);
        }
      };
      fetchWords();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userStatus, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const favoriteWords = words.filter((word) => word.favorite);

  const renderContent = () => {
    if (user.status === 'approved' && isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (user.status === 'pending' || user.status === 'rejected') {
        return <WaitingForApproval />;
    }
    
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
        case "profile":
            return <ProfileView />;
        case "lesson-detail":
           return activeViewState.lesson ? (
            <LessonDetailView
              lesson={activeViewState.lesson}
              vocabulary={words}
              onBack={() => setActiveViewState({ view: "my-lessons" })}
              setWords={setWords}
            />
          ) : (
            <MyLessonsView setActiveViewState={setActiveViewState} />
          );
        default:
          return <DashboardOverview setActiveView={(view) => setActiveViewState({ view })} />;
      }
    }

    return null;
  };
  
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
