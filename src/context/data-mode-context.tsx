
// src/context/data-mode-context.tsx
'use client';

import React, { createContext, useState, useContext, useCallback, useEffect, type ReactNode } from 'react';
// This context is no longer used to manage data mode switching.
// It is kept minimal to avoid breaking existing imports if any, but its functionality
// related to 'mock' vs 'user' mode is removed. AuthContext now dictates data storage.

interface DataModeContextProps {
  isLoading: boolean; // Retained for potential initial app loading state if needed elsewhere.
}

const DataModeContext = createContext<DataModeContextProps | undefined>(undefined);

export const DataModeProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading or set to false if no specific initial loading task.
    setIsLoading(false);
  }, []);

  // dataMode, switchToUserDataMode, resetToMockMode are removed as they are obsolete.
  const value = { isLoading };

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
  // console.warn("useDataMode is deprecated. Use useAuth to determine data storage location.");
  return context;
};
