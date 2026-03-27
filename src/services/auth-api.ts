// Auth API service

import { apiPost, apiGet } from "./api";

export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  ok: boolean;
  message?: string;
}

export interface VerifyOtpResponse {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    roleId: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  roleName?: string;
  createdAt?: string;
  omniChatEnabled?: boolean | null;
}

// Token storage
const TOKEN_KEY = "lingoai_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// API calls
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiPost<LoginResponse>("/api/auth/login", {
    emailOrId: email,
    password,
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return res;
}

export async function registerApi(
  email: string,
  password: string,
  displayName: string
): Promise<RegisterResponse> {
  // Generate a unique ID for new user
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return apiPost<RegisterResponse>("/api/auth/register", {
    id,
    email,
    password,
    displayName,
    roleId: "role_student",
  });
}

export async function verifyOtpApi(
  email: string,
  otp: string
): Promise<VerifyOtpResponse> {
  return apiPost<VerifyOtpResponse>("/api/auth/verify-otp", { email, otp });
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const user = await apiGet<UserProfile>("/api/auth/me", token);
    return user;
  } catch (error) {
    // Token invalid or expired — log error for debugging and remove token
    console.error("getCurrentUser failed:", error);
    removeStoredToken();
    return null;
  }
}

export function logoutApi(): void {
  removeStoredToken();
}
