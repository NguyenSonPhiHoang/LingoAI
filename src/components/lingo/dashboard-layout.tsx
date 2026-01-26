"use client";

import type { Dispatch, FC, ReactNode, SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookCopy,
  BookOpenText,
  GraduationCap,
  LayoutDashboard,
  FileText,
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
  HelpCircle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: View | "storybook" | "library" | "guide";
  setActiveView: (view: View | "storybook" | "library" | "guide") => void;
  setWords: Dispatch<SetStateAction<CombinedVocabulary[]>>;
}

const DashboardLayoutContent: FC<DashboardLayoutProps> = ({
  children,
  activeView,
  setActiveView,
  setWords,
}) => {
  const { setOpenMobile } = useSidebar();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const roleIdRaw = (user?.roleId || user?.roleName || "")
    .toString()
    .toLowerCase();
  const roleIdNormalized = roleIdRaw.startsWith("role_")
    ? roleIdRaw
    : roleIdRaw
      ? `role_${roleIdRaw}`
      : "role_student";
  const isAdminRole = roleIdNormalized === "role_admin";

  const menuItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "levels",
      label: "All Levels",
      icon: GraduationCap,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "ai-suggester",
      label: "AI Suggester",
      icon: Sparkles,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "my-lessons",
      label: "My Lessons",
      icon: BookMarked,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "storybook",
      label: "AI Storybook",
      icon: BookImage,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/storybook",
    },
    {
      id: "library",
      label: "My Library",
      icon: Library,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/library",
    },
    {
      id: "grammar",
      label: "Grammar",
      icon: BookOpenText,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/grammar",
    },
    {
      id: "vtep",
      label: "VTEP",
      icon: FileText,
      role: ["role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "vocabulary",
      label: "My Vocabulary",
      icon: BookCopy,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "review",
      label: "Review",
      icon: ClipboardCheck,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/",
    },
    {
      id: "user-management",
      label: "User Management",
      icon: Users,
      role: ["role_admin"],
      href: "/",
    },
    {
      id: "word-management",
      label: "Word Management",
      icon: Database,
      role: ["role_admin"],
      href: "/",
    },
  ];

  const availableMenuItems = menuItems.filter((item) => {
    if (!user) return false;
    if (isAdminRole) return true;
    return item.role.includes(roleIdNormalized);
  });

  const handleViewChange = (view: View | "guide") => {
    setActiveView(view);
    setOpenMobile(false);
  };

  const handleMenuClick = (
    itemId: View | "storybook" | "library" | "guide",
    href: string,
  ) => {
    if (href && href !== "/") {
      router.push(href);
    } else {
      handleViewChange(itemId as View);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            href="/"
            className="block"
            onClick={() => handleViewChange("overview")}
          >
            <h1 className="text-2xl font-bold text-primary">
              <span className="group-data-[collapsible=icon]:hidden">
                Lingo
              </span>
              <span>AI</span>
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {user?.status === "approved" &&
              availableMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item.id as View, item.href)}
                    isActive={
                      activeView === item.id ||
                      (activeView === "lesson-detail" &&
                        item.id === "my-lessons")
                    }
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            {user?.status === "approved" && (
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
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/guide" passHref>
                <SidebarMenuButton
                  onClick={() => handleViewChange("guide")}
                  isActive={activeView === "guide"}
                  tooltip="User Guide"
                  asChild
                >
                  <p>
                    <HelpCircle />
                    <span>User Guide</span>
                  </p>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader
          activeView={activeView as View | "guide"}
          setActiveView={setActiveView as (view: View | "guide") => void}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">{children}</main>
      </SidebarInset>
    </>
  );
};

const DashboardLayout: FC<Omit<DashboardLayoutProps, "user">> = (props) => {
  return (
    <SidebarProvider>
      <DashboardLayoutContent {...props} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
