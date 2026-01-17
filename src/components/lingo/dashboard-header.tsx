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

const viewTitles: Record<View | "guide", string> = {
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
    <header className="sticky top-0 z-10 flex h-16 min-w-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />
      <h1 className="text-lg font-semibold md:text-xl flex-1 min-w-0 truncate">
        {getTitle()}
      </h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative flex min-w-0 items-center gap-2 rounded-full h-10 pr-4 pl-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  user?.photoUrl ||
                  user?.photoURL ||
                  "https://placehold.co/100x100.png"
                }
                data-ai-hint="person"
              />
              <AvatarFallback>
                {(user?.displayName || user?.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm hidden sm:inline truncate max-w-[10rem]">
              {user?.displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.displayName || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveView("profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
          {isAdmin() && (
            <>
              <DropdownMenuItem
                onClick={() => setActiveView("user-management")}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>User Management</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveView("word-management")}
              >
                <Database className="mr-2 h-4 w-4" />
                <span>Word Management</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => setActiveView("settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default DashboardHeader;
