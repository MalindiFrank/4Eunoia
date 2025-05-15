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

type DataMode = 'mock' | 'user';

interface DataModeContextProps {
  dataMode: DataMode;
  switchToUserDataMode: () => void;
  resetToMockMode: () => void; // Added reset function
  isLoading: boolean; // Indicate if mode is being determined
}

const DataModeContext = createContext<DataModeContextProps | undefined>(undefined);

const DATA_MODE_STORAGE_KEY = '4eunoia-data-mode'; // Updated key

// List of all local storage keys used by the services
const ALL_DATA_STORAGE_KEYS = [
    CALENDAR_EVENTS_STORAGE_KEY,
    DAILY_LOG_STORAGE_KEY,
    EXPENSE_STORAGE_KEY,
    GOALS_STORAGE_KEY,
    HABITS_STORAGE_KEY,
    NOTES_STORAGE_KEY,
    REMINDER_STORAGE_KEY,
    TASK_STORAGE_KEY,
    // Add other data storage keys here
];
const SETTINGS_STORAGE_KEY = '4eunoia-app-settings'; // Added settings key


export const DataModeProvider = ({ children }: { children: ReactNode }) => {
  const [dataMode, setDataMode] = useState<DataMode>('mock'); // Default to mock
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load the persisted data mode from localStorage on mount
    if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem(DATA_MODE_STORAGE_KEY) as DataMode | null;
        if (savedMode && (savedMode === 'mock' || savedMode === 'user')) {
          setDataMode(savedMode);
        } else {
            // If no mode is saved, default to mock and save it
             localStorage.setItem(DATA_MODE_STORAGE_KEY, 'mock');
             setDataMode('mock');
        }
        setIsLoading(false);
    } else {
         // Handle server-side or environments without localStorage
         setDataMode('mock');
         setIsLoading(false);
    }
  }, []);

  const switchToUserDataMode = useCallback(() => {
     if (typeof window === 'undefined') return;
    setDataMode('user');
    localStorage.setItem(DATA_MODE_STORAGE_KEY, 'user');
    toast({
      title: "Switched to User Data Mode",
      description: "The app will now use data stored in your browser's local storage.",
    });
    // Optional: Could trigger a data refresh here if needed
  }, [toast]);

   const resetToMockMode = useCallback(() => {
     if (typeof window === 'undefined') return;
     // Clear all known data storage keys
     ALL_DATA_STORAGE_KEYS.forEach(key => {
         localStorage.removeItem(key);
     });
      // Clear settings key too
     localStorage.removeItem(SETTINGS_STORAGE_KEY);

     // Set mode to 'mock' and save
     setDataMode('mock');
     localStorage.setItem(DATA_MODE_STORAGE_KEY, 'mock');
     // Toast message is handled in the settings page where this is called

     // IMPORTANT: Force a reload to ensure all components re-fetch data with the new mode
     // and clear any potentially cached user data in component state.
     window.location.reload();

   }, []); // Removed toast dependency

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
