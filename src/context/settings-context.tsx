"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { getUserSettings, saveUserSettings } from "@/services/settings";

const DEFAULT_SPEECH_RATE = 1.0;
const DEFAULT_THEME = "default";
const THEMES = ["default", "orange", "blue", "green", "rose"];

interface SettingsContextType {
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Try backend first
        const remote = await getUserSettings();
        if (remote) {
          if (typeof remote.speechRate === "number")
            setSpeechRate(remote.speechRate);
          if (remote.theme && THEMES.includes(remote.theme))
            setTheme(remote.theme);
        } else {
          // Fallback to localStorage
          const storedRate = localStorage.getItem("lingoai_speechRate");
          if (storedRate) {
            const parsedRate = parseFloat(storedRate);
            if (!isNaN(parsedRate)) setSpeechRate(parsedRate);
          }
          const storedTheme = localStorage.getItem("lingoai_theme");
          if (storedTheme && THEMES.includes(storedTheme))
            setTheme(storedTheme);
        }
      } catch (error) {
        console.warn("Could not initialize settings", error);
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const body = document.body;
    // Remove all possible theme classes
    THEMES.forEach((t) => {
      if (t !== "default") body.classList.remove(`theme-${t}`);
    });
    // Add the new theme class if it's not the default
    if (theme !== "default") {
      body.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const handleSetSpeechRate = useCallback(
    (rate: number) => {
      try {
        localStorage.setItem("lingoai_speechRate", rate.toString());
        setSpeechRate(rate);
        // Best-effort sync to backend; ignore errors here
        saveUserSettings({ speechRate: rate, theme });
      } catch (error) {
        console.warn("Could not save speechRate to localStorage", error);
      }
    },
    [theme]
  );

  const handleSetTheme = useCallback(
    (newTheme: string) => {
      try {
        localStorage.setItem("lingoai_theme", newTheme);
        setTheme(newTheme);
        // Best-effort sync to backend; ignore errors here
        saveUserSettings({ speechRate, theme: newTheme });
      } catch (error) {
        console.warn("Could not save theme to localStorage", error);
      }
    },
    [speechRate]
  );

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <SettingsContext.Provider
      value={{
        speechRate,
        setSpeechRate: handleSetSpeechRate,
        theme,
        setTheme: handleSetTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
