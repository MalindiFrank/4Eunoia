// src/context/data-mode-context.tsx
'use client';

import React, { createContext, useState, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CALENDAR_EVENTS_STORAGE_KEY } from '@/services/calendar';
import { DAILY_LOG_STORAGE_KEY } from '@/services/daily-log';
import { EXPENSE_STORAGE_KEY } from '@/services/expense';
import { GOALS_STORAGE_KEY } from '@/services/goal';
import { HABITS_STORAGE_KEY } from '@/services/habit';
import { NOTES_STORAGE_KEY } from '@/services/note';
import { REMINDER_STORAGE_KEY } from '@/services/reminder';
import { TASK_STORAGE_KEY } from '@/services/task';
import { WELLNESS_GRATITUDE_STORAGE_KEY, WELLNESS_REFRAMING_STORAGE_KEY } from '@/services/wellness';


type DataMode = 'mock' | 'user';

interface DataModeContextProps {
  dataMode: DataMode;
  switchToUserDataMode: () => void;
  resetToMockMode: () => void;
  isLoading: boolean;
}

const DataModeContext = createContext<DataModeContextProps | undefined>(undefined);

const DATA_MODE_STORAGE_KEY = '4eunoia-data-mode';

// List of all local storage keys used by the services for actual user data
const ALL_USER_DATA_STORAGE_KEYS = [
    CALENDAR_EVENTS_STORAGE_KEY,
    DAILY_LOG_STORAGE_KEY,
    EXPENSE_STORAGE_KEY,
    GOALS_STORAGE_KEY,
    HABITS_STORAGE_KEY,
    NOTES_STORAGE_KEY,
    REMINDER_STORAGE_KEY,
    TASK_STORAGE_KEY,
    WELLNESS_GRATITUDE_STORAGE_KEY,
    WELLNESS_REFRAMING_STORAGE_KEY,
    // Add other data storage keys here if they are introduced
];
const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';


export const DataModeProvider = ({ children }: { children: ReactNode }) => {
  const [dataMode, setDataMode] = useState<DataMode>('mock');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem(DATA_MODE_STORAGE_KEY) as DataMode | null;
        if (savedMode && (savedMode === 'mock' || savedMode === 'user')) {
          setDataMode(savedMode);
        } else {
             localStorage.setItem(DATA_MODE_STORAGE_KEY, 'mock');
             setDataMode('mock');
        }
        setIsLoading(false);
    } else {
         setDataMode('mock');
         setIsLoading(false);
    }
  }, []);

  const switchToUserDataMode = useCallback(() => {
     if (typeof window === 'undefined') return;

    // Clear all existing user data storage keys to ensure a fresh start
    // This is effectively clearing any previously stored "mock" data that might
    // have been loaded into these keys if services were called in mock mode
    // and then the mode switched without a full reset.
    ALL_USER_DATA_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });

    setDataMode('user');
    localStorage.setItem(DATA_MODE_STORAGE_KEY, 'user');
    toast({
      title: "Switched to Your Data Mode",
      description: "Mock data has been cleared. The app will now save your personal data locally.",
      duration: 5000,
    });
    // Trigger a reload to ensure all components re-fetch data, now from empty storage.
    // This ensures that any components holding mock data in their state will refresh.
    window.location.reload();
  }, [toast]);

   const resetToMockMode = useCallback(() => {
     if (typeof window === 'undefined') return;
     ALL_USER_DATA_STORAGE_KEYS.forEach(key => {
         localStorage.removeItem(key);
     });
     localStorage.removeItem(SETTINGS_STORAGE_KEY); // Also reset app settings

     setDataMode('mock');
     localStorage.setItem(DATA_MODE_STORAGE_KEY, 'mock');
     // Toast is handled in settings page

     window.location.reload();
   }, []);

  const value = { dataMode, switchToUserDataMode, resetToMockMode, isLoading };

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
};

export const useDataMode = (): DataModeContextProps => {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
};
