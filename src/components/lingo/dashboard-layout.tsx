
"use client";

import type { Dispatch, FC, ReactNode, SetStateAction } from "react";
import Link from "next/link";
import {
  BookCopy,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  User,
  Users,
  ClipboardCheck,
  BookMarked,
  Plus,
  Database,
} from "lucide-react";
import type { View } from "@/app/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import DashboardHeader from "./dashboard-header";
import { useAuth } from "@/context/auth-context";
import AddWordDialog from "./add-word-dialog";
import type { CombinedVocabulary } from "@/services/vocabulary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: View;
  setActiveView: (view: View) => void;
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}

const DashboardLayoutContent: FC<DashboardLayoutProps> = ({
  children,
  activeView,
  setActiveView,
  setWords,
}) => {
  const { setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, role: ['user', 'admin'] },
    { id: "levels", label: "All Levels", icon: GraduationCap, role: ['user', 'admin'] },
    { id: "ai-suggester", label: "AI Suggester", icon: Sparkles, role: ['user', 'admin'] },
    { id: "my-lessons", label: "My Lessons", icon: BookMarked, role: ['user', 'admin'] },
    { id: "vocabulary", label: "My Vocabulary", icon: BookCopy, role: ['user', 'admin'] },
    { id: "review", label: "Review", icon: ClipboardCheck, role: ['user', 'admin'] },
    { id: "profile", label: "My Profile", icon: User, role: ['user', 'admin'] },
    { id: "user-management", label: "User Management", icon: Users, role: ['admin'] },
    { id: "word-management", label: "Word Management", icon: Database, role: ['admin'] },
  ];
  
  const availableMenuItems = menuItems.filter(item => user && user.role && item.role.includes(user.role));


  const handleViewChange = (view: View) => {
    setActiveView(view);
    setOpenMobile(false);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/" className="block" onClick={() => handleViewChange('overview')}>
             <h1 className="text-2xl font-bold text-primary">
                <span className="group-data-[collapsible=icon]:hidden">Lingo</span>
                <span>AI</span>
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {user?.status === 'approved' && availableMenuItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => handleViewChange(item.id as View)}
                  isActive={activeView === item.id || (activeView === 'lesson-detail' && item.id === 'my-lessons')}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">
          {children}
        </main>
      </SidebarInset>
    </>
  );
};

const DashboardLayout: FC<Omit<DashboardLayoutProps, 'user'>> = (props) => {
  return (
    <SidebarProvider>
      <DashboardLayoutContent {...props} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
