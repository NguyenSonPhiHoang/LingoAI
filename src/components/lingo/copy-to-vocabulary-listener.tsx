"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { generateWordDetails } from "@/ai/flows/generate-word-details";
import { addWordToVocabulary } from "@/services/vocabulary";

const normalizeSelectedWord = (raw: string): string | null => {
  const s = String(raw || "").trim();
  if (!s) return null;

  // Strip punctuation at the ends but keep inner apostrophes/hyphens.
  const cleaned = s.replace(/^[^\p{L}'’\-]+|[^\p{L}'’\-]+$/gu, "");
  if (!cleaned) return null;

  // Must be a single word (letters with optional inner apostrophes/hyphens).
  if (!/^[\p{L}]+(?:[\-’'][\p{L}]+)*$/u.test(cleaned)) return null;

  // Avoid absurdly long selections.
  if (cleaned.length > 64) return null;

  return cleaned;
};

export default function CopyToVocabularyListener() {
  const { user } = useAuth();
  const lastSavedRef = useRef<{ term: string; at: number } | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      // Don’t auto-save when copying inside inputs / editable fields.
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.(
          'input, textarea, [contenteditable="true"], [role="textbox"]'
        )
      ) {
        return;
      }

      const userId = user?.uid || user?.id;
      if (!userId) return;

      const selection = window.getSelection?.()?.toString() || "";
      const term = normalizeSelectedWord(selection);
      if (!term) return;

      const now = Date.now();
      const last = lastSavedRef.current;
      if (
        last &&
        last.term.toLowerCase() === term.toLowerCase() &&
        now - last.at < 3000
      ) {
        return;
      }

      if (inFlightRef.current.has(term.toLowerCase())) return;
      inFlightRef.current.add(term.toLowerCase());
      lastSavedRef.current = { term, at: now };

      // Fire-and-forget; never block the actual Copy.
      (async () => {
        try {
          const details = await generateWordDetails({ term });
          await addWordToVocabulary(userId, { term, ...details } as any);
        } catch {
          // Intentionally silent: copying should still succeed.
        } finally {
          inFlightRef.current.delete(term.toLowerCase());
        }
      })();
    };

    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [user?.id, user?.uid]);

  return null;
}
