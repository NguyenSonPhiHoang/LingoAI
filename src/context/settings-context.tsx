
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

const DEFAULT_SPEECH_RATE = 1.0;

interface SettingsContextType {
  speechRate: number;
  setSpeechRate: (rate: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);
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
    } catch (error) {
        console.warn("Could not read speechRate from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  const handleSetSpeechRate = useCallback((rate: number) => {
    try {
        localStorage.setItem('lingoai_speechRate', rate.toString());
        setSpeechRate(rate);
    } catch (error) {
        console.warn("Could not save speechRate to localStorage", error);
    }
  }, []);
  
  if (!isInitialized) {
      return null; // Or a loading spinner
  }

  return (
    <SettingsContext.Provider value={{ speechRate, setSpeechRate: handleSetSpeechRate }}>
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
