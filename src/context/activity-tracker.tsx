"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { recordActivity } from "@/services/activity";
import { apiPost } from "@/services/api";

const PING_INTERVAL_MS = 15 * 1000; // 15 seconds

export const ActivityTracker = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const recentCopiedTermsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (loading || !user?.uid) return;

    const isTypingContext = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if ((el as any).isContentEditable) return true;
      return false;
    };

    const extractSingleWord = (raw: string): string | null => {
      const s = (raw || "").trim();
      if (!s) return null;
      // Only accept a single token (no spaces/newlines)
      if (/\s/.test(s)) return null;
      // Trim common punctuation around a word
      const cleaned = s.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, "");
      if (!cleaned) return null;
      // Basic English word check (allow apostrophes, hyphens)
      if (!/^[A-Za-z][A-Za-z'-]{0,38}$/.test(cleaned)) return null;
      return cleaned;
    };

    const onCopy = async () => {
      try {
        if (isTypingContext()) return;

        const selection = window.getSelection?.()?.toString() || "";
        const term = extractSingleWord(selection);
        if (!term) return;

        const key = term.toLowerCase();
        const now = Date.now();
        const last = recentCopiedTermsRef.current[key] || 0;
        // Prevent spamming the API for repeated copies
        if (now - last < 60_000) return;
        recentCopiedTermsRef.current[key] = now;

        await apiPost("/api/user-vocabulary", { term });
      } catch {
        // Silent: copying should never be interrupted by failures.
      }
    };

    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("copy", onCopy);
    };
  }, [user, loading]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user && !loading) {
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          recordActivity(user.uid, PING_INTERVAL_MS / 1000);
        }
      }, PING_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, loading]);

  return <>{children}</>;
};
