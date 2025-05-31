
// src/components/data-mode-switcher.tsx
// This component is no longer needed as the app always uses user data (local or Firebase).
// Authentication state now determines where data is stored.
// This file can be safely deleted.

/*
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
// import { useDataMode } from '@/context/data-mode-context'; // Obsolete
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export const DataModeSwitcher: React.FC = () => {
  // const { dataMode, switchToUserDataMode, isLoading } = useDataMode(); // Obsolete

  // if (isLoading) {
  //   return null;
  // }

  // if (dataMode === 'user') {
  //   return (
  //     <Alert variant="default" className="mt-4 bg-primary/10 border-primary/20">
  //        <Terminal className="h-4 w-4 text-primary" />
  //        <AlertTitle className="text-primary">Live Data Mode</AlertTitle>
  //       <AlertDescription>
  //         The app is currently using your data stored locally. All changes will be saved.
  //       </AlertDescription>
  //     </Alert>
  //   );
  // }

  // return (
  //   <Alert variant="default" className="mt-4 bg-accent/50 border-accent">
  //     <Terminal className="h-4 w-4" />
  //      <AlertTitle>Mock Data Mode REMOVED</AlertTitle>
  //     <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
  //       <span>
  //           App now always uses user data (local or Firebase if signed in).
  //       </span>
  //       <Button onClick={() => {
  //         // switchToUserDataMode was here. Now, perhaps a "Sign In" prompt or similar.
  //         console.log("Sign in to sync your data.");
  //       }} size="sm" className="mt-2 sm:mt-0 flex-shrink-0">
  //         Sign In to Sync
  //       </Button>
  //     </AlertDescription>
  //   </Alert>
  // );
  return null; // Component is obsolete
};

*/
export {}; // Add an empty export to make it a module if file is kept temporarily
