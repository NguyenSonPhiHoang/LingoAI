"use client";

import { useState } from "react";
import type { FC } from "react";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import DashboardOverview from "@/components/lingo/dashboard-overview";
import LevelView from "@/components/lingo/level-view";
import AiSuggester from "@/components/lingo/ai-suggester";
import VocabularyList from "@/components/lingo/vocabulary-list";
import ReviewView from "@/components/lingo/review-view";
import type { Word } from "@/components/lingo/vocabulary-list";

export type View =
  | "overview"
  | "levels"
  | "ai-suggester"
  | "vocabulary"
  | "review";

const initialWords: Word[] = [
  {
    id: 1,
    term: "Ubiquitous",
    pronunciation: "/juːˈbɪkwɪtəs/",
    definition: "Present, appearing, or found everywhere.",
    sentence: "Smartphones have become ubiquitous in modern society.",
    favorite: false,
    viewCount: 5,
  },
  {
    id: 2,
    term: "Ephemeral",
    pronunciation: "/ɪˈfemərəl/",
    definition: "Lasting for a very short time.",
    sentence: "The beauty of the cherry blossoms is ephemeral.",
    favorite: true,
    viewCount: 3,
  },
  {
    id: 3,
    term: "Mellifluous",
    pronunciation: "/məˈlɪfluəs/",
    definition: "(of a voice or words) Sweet or musical; pleasant to hear.",
    sentence: "Her mellifluous voice captivated the audience.",
    favorite: false,
    viewCount: 7,
  },
];

const Home: FC = () => {
  const [activeView, setActiveView] = useState<View>("overview");
  const [words, setWords] = useState<Word[]>(initialWords);

  const favoriteWords = words.filter((word) => word.favorite);

  const renderContent = () => {
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
