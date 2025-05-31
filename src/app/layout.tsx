
// src/app/layout.tsx
'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import React, { useEffect, useState } from 'react';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { DataModeProvider } from '@/context/data-mode-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getInitialTheme, applyTheme, type Theme } from '@/lib/theme-utils';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { AppClientLayout } from '@/components/app-client-layout'; // New import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    document.title = '4Eunoia - Your Personal OS';

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentStoredTheme = getInitialTheme(); 
      if (currentStoredTheme === 'system') {
        applyTheme('system'); 
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted]);

  // Render a minimal layout or nothing until mounted to avoid hydration errors with localStorage/theme
  if (!isMounted) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
           <title>4Eunoia - Your Personal OS</title>
        </head>
        <body className={cn(
          'min-h-screen bg-background font-sans antialiased',
          geistSans.variable,
          geistMono.variable
        )}>
          {/* You could put a global loading spinner here if desired */}
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          geistSans.variable,
          geistMono.variable
        )}
      >
         <TooltipProvider>
           <DataModeProvider>
             <SidebarProvider>
                <AppClientLayout>{children}</AppClientLayout>
             </SidebarProvider>
           </DataModeProvider>
         </TooltipProvider>
        <Toaster />
        <OnboardingGuide />
      </body>
    </html>
  );
}
