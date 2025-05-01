'use client';

import React, { createContext, useState, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

type DataMode = 'mock' | 'user';

interface DataModeContextProps {
  dataMode: DataMode;
  switchToUserDataMode: () => void;
  isLoading: boolean; // Indicate if mode is being determined
}

const DataModeContext = createContext<DataModeContextProps | undefined>(undefined);

const DATA_MODE_STORAGE_KEY = 'prodev-data-mode';

export const DataModeProvider = ({ children }: { children: ReactNode }) => {
  const [dataMode, setDataMode] = useState<DataMode>('mock'); // Default to mock
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load the persisted data mode from localStorage on mount
    const savedMode = localStorage.getItem(DATA_MODE_STORAGE_KEY) as DataMode | null;
    if (savedMode && (savedMode === 'mock' || savedMode === 'user')) {
      setDataMode(savedMode);
    }
    // Regardless of saved mode, finish loading
    setIsLoading(false);
  }, []);

  const switchToUserDataMode = useCallback(() => {
    setDataMode('user');
    localStorage.setItem(DATA_MODE_STORAGE_KEY, 'user');
    toast({
      title: "Switched to User Data Mode",
      description: "The app will now use data stored in your browser's local storage.",
    });
    // Optional: Could trigger a data refresh here if needed
    // Consider if clearing mock data from state in services is necessary
  }, [toast]);

  const value = { dataMode, switchToUserDataMode, isLoading };

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
