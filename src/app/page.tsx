"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import DashboardOverview from "@/components/lingo/dashboard-overview";
import LevelView from "@/components/lingo/level-view";
import AiSuggester from "@/components/lingo/ai-suggester";
import VocabularyList from "@/components/lingo/vocabulary-list";
import ReviewView from "@/components/lingo/review-view";
import type { Word } from "@/components/lingo/vocabulary-list";
import { getVocabulary } from "@/services/vocabulary";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type View =
  | "overview"
  | "levels"
  | "ai-suggester"
  | "vocabulary"
  | "review";

const Home: FC = () => {
  const [activeView, setActiveView] = useState<View>("overview");
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWords = async () => {
      try {
        setIsLoading(true);
        const fetchedWords = await getVocabulary();
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
  }, [toast]);


  const favoriteWords = words.filter((word) => word.favorite);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
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
