"use client";

import { useEffect } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import ChatEmbed from "@/components/lingo/ChatEmbed";
import CopyToVocabularyListener from "@/components/lingo/copy-to-vocabulary-listener";
import { AuthProvider } from "@/context/auth-context";
import { SettingsProvider, useSettings } from "@/context/settings-context";
import { ActivityTracker } from "@/context/activity-tracker";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Metadata object cannot be used in a client component.
// We can define it statically or fetch it if needed in a server component parent.
// For now, we remove it to fix the immediate error.
/*
export const metadata: Metadata = {
  title: "LingoAI",
  description: "Your personalized AI-powered English learning companion.",
};
*/

const AppBody = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useSettings();

  useEffect(() => {
    const body = document.body;
    body.classList.remove(
      "theme-orange",
      "theme-blue",
      "theme-green",
      "theme-rose"
    );
    if (theme !== "default") {
      body.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return <>{children}</>;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LingoAI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Your personalized AI-powered English learning companion."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-body antialiased")}>
        <AuthProvider>
          <ActivityTracker>
            <SettingsProvider>
              <AppBody>
                {children}
                <CopyToVocabularyListener />
                <Toaster />
                <ChatEmbed />
              </AppBody>
            </SettingsProvider>
          </ActivityTracker>
        </AuthProvider>
      </body>
    </html>
  );
}
