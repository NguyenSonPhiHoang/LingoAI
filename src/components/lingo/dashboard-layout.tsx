
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
  BookImage,
  Library,
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
  activeView: View | "storybook" | "library";
  setActiveView: (view: View | "storybook" | "library") => void;
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
    { id: "overview", label: "Overview", icon: LayoutDashboard, role: ['user', 'admin'], href: "/" },
    { id: "levels", label: "All Levels", icon: GraduationCap, role: ['user', 'admin'], href: "/" },
    { id: "ai-suggester", label: "AI Suggester", icon: Sparkles, role: ['user', 'admin'], href: "/" },
    { id: "my-lessons", label: "My Lessons", icon: BookMarked, role: ['user', 'admin'], href: "/" },
    { id: "storybook", label: "AI Storybook", icon: BookImage, role: ['user', 'admin'], href: "/storybook" },
    { id: "library", label: "My Library", icon: Library, role: ['user', 'admin'], href: "/library" },
    { id: "vocabulary", label: "My Vocabulary", icon: BookCopy, role: ['user', 'admin'], href: "/" },
    { id: "review", label: "Review", icon: ClipboardCheck, role: ['user', 'admin'], href: "/" },
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
                <Link href={item.href}>
                    <SidebarMenuButton
                    onClick={() => item.href === "/" && handleViewChange(item.id as View)}
                    isActive={activeView === item.id || (activeView === 'lesson-detail' && item.id === 'my-lessons')}
                    tooltip={item.label}
                    >
                    <item.icon />
                    <span>{item.label}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             {user?.status === 'approved' && (
                <SidebarMenuItem>
                    <AddWordDialog
                        setWords={setWords}
                        trigger={
                            <SidebarMenuButton tooltip="Add New Word">
                                <Plus />
                                <span>Add New Word</span>
                            </SidebarMenuButton>
                        }
                    />
                </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
             {/* Management links moved to header dropdown */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader activeView={activeView as View} setActiveView={setActiveView as (view: View) => void} />
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
