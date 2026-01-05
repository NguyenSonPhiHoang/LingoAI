"use client";

// Re-export the new backend-based auth context
export { AuthProvider, useAuth } from "./auth-context-new";
export type { User } from "./auth-context-new";
