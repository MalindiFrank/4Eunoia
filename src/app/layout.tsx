
// src/app/layout.tsx
'use client';

// import type { Metadata } from 'next'; // Metadata type can be used if you plan static metadata
import { Geist, Geist_Mono } from 'next/font/google'; // Corrected: Import directly
import React, { useEffect, useState } from 'react'; // Added useState
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { DataModeProvider } from '@/context/data-mode-context';
import { DataModeSwitcher } from '@/components/data-mode-switcher';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getInitialTheme, applyTheme, type Theme } from '@/lib/theme-utils'; // Ensure Theme type is imported
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react'; // PanelLeft was not used, Menu is more standard for mobile toggle
import { OnboardingGuide } from '@/components/onboarding-guide';

const geistSans = Geist({ // Use direct import
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ // Use direct import
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// export const metadata: Metadata = { // Example of static metadata
//   title: '4Eunoia - Your Personal OS',
//   description: 'Track your productivity and personal development.',
// };

// Layout component that uses the sidebar context
function AppLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, toggleSidebar } = useSidebar();

  return (
    <div className="flex">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm hover:bg-accent"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-6 md:pt-4 lg:p-8 lg:pt-4">
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Set mounted to true only on the client
  }, []);

  useEffect(() => {
    if (!isMounted) return; // Only run after client has mounted

    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    // console.log("Initial theme applied in layout:", initialTheme);

    document.title = '4Eunoia - Your Personal OS'; // Set document title here

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentStoredTheme = getInitialTheme(); // Re-fetch from localStorage
      if (currentStoredTheme === 'system') {
        applyTheme('system'); // Re-apply system theme if system preference changes
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted]); // Re-run if isMounted changes

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
                <AppLayout>{children}</AppLayout>
                <OnboardingGuide />
             </SidebarProvider>
           </DataModeProvider>
         </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
