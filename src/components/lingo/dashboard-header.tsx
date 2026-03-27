"use client";
import type { FC } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { View } from "@/app/page";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Users, Database } from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  activeView: View | "guide";
  setActiveView: (view: View | "guide") => void;
}

  const viewTitles: Record<string, string> = {
  overview: "Overview",
  levels: "All Levels",
  "ai-suggester": "AI Suggester",
  "my-lessons": "My Lessons",
  grammar: "Grammar",
  vocabulary: "My Vocabulary",
  review: "Review",
  "user-management": "User Management",
  "word-management": "Word Management",
  "lesson-detail": "Lesson Details",
  profile: "My Profile",
  settings: "Settings",
  storybook: "AI Storybook",
  "placement-test": "Placement Test",
  "review-test": "Review Test",
  library: "My Library",
  guide: "User Guide",
  "admin-analytics": "Thống kê Admin",
};

const DashboardHeader: FC<DashboardHeaderProps> = ({
  activeView,
  setActiveView,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getTitle = () => {
    if (user?.status === "pending") {
      return "Waiting for Approval";
    }
    return viewTitles[activeView] || "Dashboard";
  };

  return (
    <header
      className="sticky top-0 z-10 flex h-16 min-w-0 items-center gap-4 px-4 sm:px-6"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(99,102,241,0.12)",
        boxShadow: "0 1px 20px rgba(99,102,241,0.08)",
      }}
    >
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      {/* Page title with colored accent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="h-6 w-1 rounded-full shrink-0"
          style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6)" }}
        />
        <h1 className="text-base font-bold truncate text-foreground">
          {getTitle()}
        </h1>
      </div>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="h-8 w-8 ring-2 ring-primary/30">
              <AvatarImage
                src={user?.photoUrl || "https://placehold.co/100x100.png"}
                data-ai-hint="person"
              />
              <AvatarFallback
                className="text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm hidden sm:inline truncate max-w-[9rem]">
              {user?.displayName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{user?.displayName || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveView("profile")}>
            <User className="mr-2 h-4 w-4 text-primary" />
            <span>Hồ sơ cá nhân</span>
          </DropdownMenuItem>
          {isAdmin() && (
            <>
              <DropdownMenuItem onClick={() => setActiveView("user-management")}>
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span>Quản lý người dùng</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView("word-management")}>
                <Database className="mr-2 h-4 w-4 text-primary" />
                <span>Quản lý từ vựng</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => setActiveView("settings")}>
            <Settings className="mr-2 h-4 w-4 text-primary" />
            <span>Cài đặt</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default DashboardHeader;
