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

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: View;
  setActiveView: Dispatch<SetStateAction<View>>;
}

const DashboardLayoutContent: FC<DashboardLayoutProps> = ({
  children,
  activeView,
  setActiveView,
}) => {
  const { setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, role: ['user', 'admin'] },
    { id: "levels", label: "All Levels", icon: GraduationCap, role: ['user', 'admin'] },
    { id: "ai-suggester", label: "AI Suggester", icon: Sparkles, role: ['user', 'admin'] },
    { id: "vocabulary", label: "My Vocabulary", icon: BookCopy, role: ['user', 'admin'] },
    { id: "review", label: "Review", icon: ClipboardCheck, role: ['user', 'admin'] },
    { id: "user-management", label: "User Management", icon: Users, role: ['admin'] },
  ];
  
  const availableMenuItems = menuItems.filter(item => user && user.role && item.role.includes(user.role));


  const handleViewChange = (view: View) => {
    setActiveView(view);
    setOpenMobile(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="block">
            <h1 className="text-2xl font-bold text-primary">LingoAI</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {user?.status === 'approved' && availableMenuItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => handleViewChange(item.id as View)}
                  isActive={activeView === item.id}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} data-ai-hint="person" />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-sm truncate">{user?.displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader activeView={activeView} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">
          {children}
        </main>
      </SidebarInset>
    </>
  );
};

const DashboardLayout: FC<DashboardLayoutProps> = (props) => {
  return (
    <SidebarProvider>
      <DashboardLayoutContent {...props} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
