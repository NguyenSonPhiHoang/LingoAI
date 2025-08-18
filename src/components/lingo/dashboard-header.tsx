"use client";
import type { FC } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { View } from "@/app/page";

interface DashboardHeaderProps {
  activeView: View;
}

const viewTitles: Record<View, string> = {
  overview: "Tổng quan",
  levels: "Tất cả các cấp độ",
  "ai-suggester": "Gợi ý của AI",
  vocabulary: "Từ vựng của tôi",
  review: "Ôn tập",
};

const DashboardHeader: FC<DashboardHeaderProps> = ({ activeView }) => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-lg font-semibold md:text-xl">
        {viewTitles[activeView]}
      </h1>
    </header>
  );
};

export default DashboardHeader;
