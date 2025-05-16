
// src/app/layout.tsx
'use client';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import React, { useEffect } from 'react';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'; // Import useSidebar
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { DataModeProvider } from '@/context/data-mode-context';
import { DataModeSwitcher } from '@/components/data-mode-switcher';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getInitialTheme, applyTheme } from '@/lib/theme-utils';
import { Button } from '@/components/ui/button'; // Import Button
import { PanelLeft, Menu } from 'lucide-react'; // Import PanelLeft or Menu icon

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Layout component that uses the sidebar context
function AppLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, toggleSidebar } = useSidebar(); // Get isMobile and toggleSidebar from context

  return (
    <div className="flex">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm hover:bg-accent" // Positioned for mobile, hidden on md+
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-16 md:pt-4"> {/* Add padding-top for mobile to account for fixed trigger */}
        <DataModeSwitcher />
        <div className="mt-4">
          {children}
        </div>
      </main>
    </div>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getInitialTheme() === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.title = '4Eunoia - Your Personal OS';
  }, []);

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
             <SidebarProvider> {/* SidebarProvider wraps the layout that needs sidebar context */}
                <AppLayout>{children}</AppLayout>
             </SidebarProvider>
           </DataModeProvider>
         </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
