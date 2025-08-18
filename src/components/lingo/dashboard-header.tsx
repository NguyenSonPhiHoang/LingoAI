
"use client";
import type { FC } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { View } from "@/app/page";
import { useAuth } from "@/context/auth-context";

interface DashboardHeaderProps {
  activeView: View;
}

const viewTitles: Record<View, string> = {
  overview: "Overview",
  levels: "All Levels",
  "ai-suggester": "AI Suggester",
  "my-lessons": "My Lessons",
  vocabulary: "My Vocabulary",
  review: "Review",
  "user-management": "User Management",
  "lesson-detail": "Lesson Details",
};

const DashboardHeader: FC<DashboardHeaderProps> = ({ activeView }) => {
  const { user } = useAuth();
  
  const getTitle = () => {
    if (user?.status === 'pending') {
      return "Waiting for Approval";
    }
    return viewTitles[activeView];
  }
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-lg font-semibold md:text-xl">
        {getTitle()}
      </h1>
    </header>
  );
};

export default DashboardHeader;
