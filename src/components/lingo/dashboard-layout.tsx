"use client";

import Image from "next/image";
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
  BarChart3,
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
  SidebarGroup,
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
import { OnboardingTour, reopenOnboardingTour } from "./onboarding-tour";

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
      id: "vtep-student",
      label: "VTEP Practice",
      icon: FileText,
      role: ["role_student", "role_teacher", "role_admin"],
      href: "/vtep-student",
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
      label: "VTEP Documents",
      icon: FileText,
      role: ["role_teacher", "role_admin"],
      href: "/vtep",
    },
    {
      id: "vteptests",
      label: "VTEP Tests (Manage)",
      icon: FileText,
      role: ["role_teacher", "role_admin"],
      href: "/vteptests",
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
    {
      id: "admin-analytics",
      label: "Analytics",
      icon: BarChart3,
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
    itemId: View | "storybook" | "library" | "guide" | "admin-analytics",
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
            className="flex w-full items-center justify-center min-h-[40px]"
            onClick={() => handleViewChange("overview")}
          >
            {/* Full logo - visible when sidebar is expanded */}
            <Image
              src="/logo.png"
              alt="LingoAI"
              width={120}
              height={40}
              className="object-contain group-data-[collapsible=icon]:hidden"
              priority
            />
            {/* Icon only - visible when sidebar is collapsed */}
            <Image
              src="/logo-icon.png"
              alt="LingoAI Icon"
              width={32}
              height={32}
              className="object-contain hidden group-data-[collapsible=icon]:block"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {user?.status === "approved" &&
                availableMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      id={`nav-${item.id}`}
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
          </SidebarGroup>
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
            {user?.status === "approved" && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Xem lại hướng dẫn"
                  onClick={() => {
                    const uid = user?.uid || user?.id;
                    if (uid) reopenOnboardingTour(uid);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Xem lại hướng dẫn</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
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
      {user?.status === "approved" && (
        <OnboardingTour
          userId={(user?.uid || user?.id) ?? ""}
          onStartPlacementTest={() =>
            setActiveView("placement-test" as View)
          }
        />
      )}
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
