"use client";

import { useState } from "react";
import type { FC } from "react";
import DashboardLayout from "@/components/lingo/dashboard-layout";
import DashboardOverview from "@/components/lingo/dashboard-overview";
import LevelView from "@/components/lingo/level-view";
import AiSuggester from "@/components/lingo/ai-suggester";
import VocabularyList from "@/components/lingo/vocabulary-list";

export type View = "overview" | "levels" | "ai-suggester" | "vocabulary";

const Home: FC = () => {
  const [activeView, setActiveView] = useState<View>("overview");

  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return <DashboardOverview setActiveView={setActiveView} />;
      case "levels":
        return <LevelView />;
      case "ai-suggester":
        return <AiSuggester />;
      case "vocabulary":
        return <VocabularyList />;
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
