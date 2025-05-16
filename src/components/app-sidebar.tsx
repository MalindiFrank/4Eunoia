
// src/components/app-sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookText,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  PieChart,
  Settings,
  Smile,
  StickyNote,
  Target,
  PanelLeft, // For mobile trigger
  Menu // Alternative for mobile trigger
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar, // This is the desktop sidebar component
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger as DesktopSidebarTrigger, // Renamed to avoid confusion
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button'; // For mobile trigger
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // For mobile off-canvas

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily-log', label: 'Daily Log', icon: BookText },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/reminders', label: 'Reminders', icon: StickyNote },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/goals-habits', label: 'Goals & Habits', icon: Target },
  { href: '/wellness', label: 'Wellness', icon: Smile },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/visualizations', label: 'Visualizations', icon: PieChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state: desktopSidebarState, isMobile, openMobile, toggleSidebar, setOpenMobile } = useSidebar();

  const sidebarMenuContent = (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            className="justify-start"
            aria-label={item.label}
            tooltip={item.label}
            // On mobile sheet, tooltips are not usually needed as labels are visible
            // The tooltip logic in SidebarMenuButton handles visibility based on context
          >
            <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
              <item.icon className="h-4 w-4" />
              <span className={cn(
                // For desktop icon mode, hide label
                (desktopSidebarState === 'collapsed' && !isMobile) ? "sr-only" : "",
                // Always show label in mobile sheet if it's open
                (isMobile && openMobile) ? "" : (desktopSidebarState === 'collapsed' && !isMobile) ? "sr-only" : "",
                "group-data-[collapsible=icon]:sr-only" // From original ui/sidebar for icon mode
              )}>
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Trigger Button - Positioned in the main layout or a fixed header by parent */}
        {/* This button is now expected to be rendered in layout.tsx or a similar top-level component */}
        {/* For this example, we'll assume it's handled by layout.tsx.
            If this AppSidebar is the *only* thing, we'd put a SheetTrigger here.
            But since SidebarProvider wraps layout, the trigger should ideally be in layout.
        */}
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          {/* The <SheetTrigger> would typically be rendered in the main app header for mobile */}
          {/* For now, we'll rely on `toggleSidebar` being called from somewhere (e.g., a button in layout.tsx) */}
          <SheetContent side="left" className="w-[var(--sidebar-width-mobile,18rem)] bg-sidebar p-0 text-sidebar-foreground">
            <SidebarHeader className="border-b border-sidebar-border">
              <div className="flex items-center justify-between p-2">
                <h1 className="text-lg font-semibold tracking-tight">4Eunoia</h1>
                <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <PanelLeft />
                        <span className="sr-only">Close sidebar</span>
                    </Button>
                </SheetClose>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              {sidebarMenuContent}
            </SidebarContent>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <Sidebar variant="sidebar" collapsible="icon"> {/* Use the Sidebar component from ui/sidebar.tsx for desktop */}
      <SidebarHeader>
        <div className="flex items-center justify-between">
           {(desktopSidebarState === 'expanded') && (
             <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
               4Eunoia
             </h1>
           )}
           {/* DesktopSidebarTrigger is the one from ui/sidebar.tsx meant for desktop */}
           <DesktopSidebarTrigger aria-label="Toggle sidebar" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {sidebarMenuContent}
      </SidebarContent>
    </Sidebar>
  );
}
