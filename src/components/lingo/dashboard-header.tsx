
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
  activeView: View;
  setActiveView: (view: View) => void;
}

const viewTitles: Record<View, string> = {
  overview: "Overview",
  levels: "All Levels",
  "ai-suggester": "AI Suggester",
  "my-lessons": "My Lessons",
  vocabulary: "My Vocabulary",
  review: "Review",
  "user-management": "User Management",
  "word-management": "Word Management",
  "lesson-detail": "Lesson Details",
  "profile": "My Profile",
};

const DashboardHeader: FC<DashboardHeaderProps> = ({ activeView, setActiveView }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const getTitle = () => {
    if (user?.status === 'pending') {
      return "Waiting for Approval";
    }
    return viewTitles[activeView];
  }
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />
      <h1 className="text-lg font-semibold md:text-xl flex-1">
        {getTitle()}
      </h1>
       <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2 rounded-full h-10 pr-4 pl-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} data-ai-hint="person" />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{user?.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveView('profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
               {user?.role === 'admin' && (
                <>
                    <DropdownMenuItem onSelect={() => setActiveView('user-management')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>User Management</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setActiveView('word-management')}>
                        <Database className="mr-2 h-4 w-4" />
                        <span>Word Management</span>
                    </DropdownMenuItem>
                </>
               )}
              <DropdownMenuItem>
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
