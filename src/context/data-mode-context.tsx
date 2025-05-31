
// src/context/data-mode-context.tsx
'use client';

import React, { createContext, useState, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
// Storage keys are not needed if resetToMockMode is removed or becomes a simple data clearer.

type DataMode = 'user'; // Only 'user' mode now

interface DataModeContextProps {
  dataMode: DataMode;
  isLoading: boolean;
  // switchToUserDataMode and resetToMockMode might be removed or become no-ops
}

const DataModeContext = createContext<DataModeContextProps | undefined>(undefined);

// const DATA_MODE_STORAGE_KEY = '4eunoia-data-mode'; // No longer needed for mode switching
// const SETTINGS_STORAGE_KEY = '4eunoia-app-settings'; // Keep if settings are still cleared somewhere else
// const ALL_USER_DATA_STORAGE_KEYS = [ /* ... all your keys ... */ ]; // Still needed if a "clear all data" feature is desired

export const DataModeProvider = ({ children }: { children: ReactNode }) => {
  const [dataMode] = useState<DataMode>('user'); // Always 'user'
  const [isLoading, setIsLoading] = useState(true); // Still useful for initial load status
  // const { toast } = useToast(); // Toast might not be needed here anymore

  useEffect(() => {
    // Simulate async loading or just set loading to false after mount
    setIsLoading(false);
  }, []);

  // switchToUserDataMode is now a no-op as we are always in user mode.
  const switchToUserDataMode = useCallback(() => {
    // console.log("Already in user data mode.");
  }, []);

  // resetToMockMode is removed as mock mode is removed.
  // If a "clear all data" feature is desired, it would be a different function.
  const resetToMockMode = useCallback(() => {
    // console.warn("Mock data mode has been removed. This function is a no-op.");
    // If there was a settings page button calling this, it should be removed.
    // If data clearing is needed, it should be a dedicated "Clear My Data" function.
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
