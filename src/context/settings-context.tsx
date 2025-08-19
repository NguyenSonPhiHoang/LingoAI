
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

const DEFAULT_SPEECH_RATE = 1.0;
const DEFAULT_THEME = 'default';
const THEMES = ['default', 'orange', 'blue', 'green', 'rose'];

interface SettingsContextType {
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedRate = localStorage.getItem('lingoai_speechRate');
      if (storedRate) {
        const parsedRate = parseFloat(storedRate);
        if (!isNaN(parsedRate)) {
          setSpeechRate(parsedRate);
        }
      }
      const storedTheme = localStorage.getItem('lingoai_theme');
      if (storedTheme && THEMES.includes(storedTheme)) {
          setTheme(storedTheme);
      }
    } catch (error) {
        console.warn("Could not read settings from localStorage", error);
    }
    setIsInitialized(true);
  }, []);
  
  useEffect(() => {
    const body = document.body;
    // Remove all possible theme classes
    THEMES.forEach(t => {
      if (t !== 'default') body.classList.remove(`theme-${t}`);
    });
    // Add the new theme class if it's not the default
    if (theme !== 'default') {
        body.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const handleSetSpeechRate = useCallback((rate: number) => {
    try {
        localStorage.setItem('lingoai_speechRate', rate.toString());
        setSpeechRate(rate);
    } catch (error) {
        console.warn("Could not save speechRate to localStorage", error);
    }
  }, []);
  
  const handleSetTheme = useCallback((newTheme: string) => {
      try {
          localStorage.setItem('lingoai_theme', newTheme);
          setTheme(newTheme);
      } catch (error) {
          console.warn("Could not save theme to localStorage", error);
      }
  }, []);
  
  if (!isInitialized) {
      return null; // Or a loading spinner
  }

  return (
    <SettingsContext.Provider value={{ speechRate, setSpeechRate: handleSetSpeechRate, theme, setTheme: handleSetTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
