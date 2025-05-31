
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, toggleSidebar, state: desktopSidebarState, openMobile } = useSidebar();

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
      <main className={cn(
        "flex-1 overflow-y-auto transition-[padding-left] duration-200 ease-linear",
        "p-4 pt-16 md:p-6 md:pt-4 lg:p-8 lg:pt-4",
        // Adjust left padding based on desktop sidebar state if not mobile
        // This logic assumes AppSidebar has a fixed width or its width is known via CSS variables
        !isMobile && desktopSidebarState === 'expanded' && "md:pl-[var(--sidebar-width,16rem)]",
        !isMobile && desktopSidebarState === 'collapsed' && "md:pl-[var(--sidebar-width-icon,3rem)]"
      )}>
        <div className="mt-4">
          {children}
        </div>
      </main>
    </div>
  );
}
