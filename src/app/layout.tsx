// src/app/layout.tsx
'use client'; // Root layout can be a client component to use useEffect for theme

import type { Metadata } from 'next/metadata'; // Keep for metadata object, but actual metadata export might need adjustment
import { Geist, Geist_Mono } from 'next/font/google';
import React, { useEffect } from 'react'; // Import useEffect
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { DataModeProvider } from '@/context/data-mode-context';
import { DataModeSwitcher } from '@/components/data-mode-switcher';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getInitialTheme, applyTheme } from '@/lib/theme-utils'; // Import theme utilities

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata can still be defined here for static export, Next.js handles it.
// export const metadata: Metadata = {
//   title: '4Eunoia - Your Life, In Harmony',
//   description: 'Track your productivity and personal development.',
// };
// For dynamic titles based on client-side logic, you'd update document.title in a useEffect.
// For now, we'll keep the static metadata approach.


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Apply theme on initial client-side mount
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    // Optional: Add listener for system theme changes if 'system' is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getInitialTheme() === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set document title effect (example of dynamic title update if needed)
  useEffect(() => {
    document.title = '4Eunoia - Your Life, In Harmony';
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
             <SidebarProvider>
               <div className="flex">
                 <AppSidebar />
                 <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                   <DataModeSwitcher />
                   <div className="mt-4">
                      {children}
                   </div>
                 </main>
               </div>
             </SidebarProvider>
           </DataModeProvider>
         </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
