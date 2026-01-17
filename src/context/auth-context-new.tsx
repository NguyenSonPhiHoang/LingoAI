"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import {
  loginApi,
  registerApi,
  getCurrentUser,
  logoutApi,
  getStoredToken,
  setStoredToken,
  UserProfile,
} from "@/services/auth-api";
import { apiPost } from "@/services/api";
import { endUserSession, startUserSession } from "@/services/activity";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  createdAt?: string;
  uid?: string | null;
  status?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  omniChatEnabled?: boolean | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isStudent: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          const userProfile = await getCurrentUser();
          if (userProfile) {
            setUser({
              id: userProfile.id,
              uid: userProfile.id,
              email: userProfile.email,
              displayName: userProfile.displayName,
              roleId:
                (userProfile as any).roleId || (userProfile as any).RoleId,
              roleName:
                (userProfile as any).roleName || (userProfile as any).RoleName,
              createdAt: userProfile.createdAt,
              // If backend doesn't provide a status field, assume approved
              status:
                (userProfile as any).status ||
                (userProfile as any).Status ||
                "approved",
              photoUrl: (userProfile as any).photoUrl || null,
              bio: (userProfile as any).bio || null,
              omniChatEnabled:
                typeof (userProfile as any).omniChatEnabled === "boolean"
                  ? (userProfile as any).omniChatEnabled
                  : null,
            });

            // Start a new session for this browser tab.
            startUserSession(userProfile.id);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
        // Clear invalid token
        logoutApi();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    const onBeforeUnload = () => {
      endUserSession(userId);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [user?.uid, user?.id]);

  const login = async (email: string, password: string) => {
    const response = await loginApi(email, password);
    setToken(response.token);

    // Fetch user profile after login
    const userProfile = await getCurrentUser();
    if (userProfile) {
      setUser({
        id: userProfile.id,
        uid: userProfile.id,
        email: userProfile.email,
        displayName: userProfile.displayName,
        roleId: (userProfile as any).roleId || (userProfile as any).RoleId,
        roleName:
          (userProfile as any).roleName || (userProfile as any).RoleName,
        createdAt: userProfile.createdAt,
        status:
          (userProfile as any).status ||
          (userProfile as any).Status ||
          "approved",
        photoUrl: (userProfile as any).photoUrl || null,
        bio: (userProfile as any).bio || null,
        omniChatEnabled:
          typeof (userProfile as any).omniChatEnabled === "boolean"
            ? (userProfile as any).omniChatEnabled
            : null,
      });

      startUserSession(userProfile.id);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    // Call backend endpoint to change password for current user
    await apiPost("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const response = await registerApi(email, password, displayName);

    // Auto login after registration
    await login(email, password);
  };

  const logout = () => {
    const userId = user?.uid || user?.id;
    if (userId) endUserSession(userId);
    logoutApi();
    setUser(null);
    setToken(null);
  };

  const isAdmin = () => {
    const roleName = user?.roleName?.toLowerCase();
    return (
      roleName === "admin" ||
      roleName === "role_admin" ||
      user?.roleId === "role_admin"
    );
  };

  const isTeacher = () => {
    const roleName = user?.roleName?.toLowerCase();
    return (
      roleName === "teacher" ||
      roleName === "role_teacher" ||
      user?.roleId === "role_teacher"
    );
  };

  const isStudent = () => {
    const roleName = user?.roleName?.toLowerCase();
    return (
      roleName === "student" ||
      roleName === "role_student" ||
      user?.roleId === "role_student"
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        signup,
        changePassword,
        logout,
        isAdmin,
        isTeacher,
        isStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
