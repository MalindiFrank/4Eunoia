// src/components/data-mode-switcher.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useDataMode } from '@/context/data-mode-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export const DataModeSwitcher: React.FC = () => {
  const { dataMode, switchToUserDataMode, isLoading } = useDataMode();

  if (isLoading) {
    return null; // Don't show anything while loading the mode
  }

  if (dataMode === 'user') {
    return (
      <Alert variant="default" className="mt-4 bg-primary/10 border-primary/20">
         <Terminal className="h-4 w-4 text-primary" />
         <AlertTitle className="text-primary">Live Data Mode</AlertTitle>
        <AlertDescription>
          The app is currently using your data stored locally. All changes will be saved.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="default" className="mt-4 bg-accent/50 border-accent">
      <Terminal className="h-4 w-4" />
       <AlertTitle>Mock Data Mode</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <span>
            You are currently viewing sample data. Your changes will not be saved. Click the button to start using your own data.
        </span>
        <Button onClick={switchToUserDataMode} size="sm" className="mt-2 sm:mt-0 flex-shrink-0">
          Start My Journey
        </Button>
      </AlertDescription>
    </Alert>
  );
};
