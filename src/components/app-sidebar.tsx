
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
  PanelLeft, 
  Menu 
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar, 
  SidebarContent,
  SidebarHeader as DesktopSidebarHeader, // Renamed to avoid conflict
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger as DesktopSidebarTrigger, 
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button'; 
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'; // Added SheetHeader, SheetTitle

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
  const { state: desktopSidebarState, isMobile, openMobile, setOpenMobile } = useSidebar();

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
          >
            <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
              <item.icon className="h-4 w-4" />
              <span className={cn(
                (desktopSidebarState === 'collapsed' && !isMobile) ? "sr-only" : "",
                (isMobile && openMobile) ? "" : (desktopSidebarState === 'collapsed' && !isMobile) ? "sr-only" : "",
                "group-data-[collapsible=icon]:sr-only" 
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
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-[var(--sidebar-width-mobile,18rem)] bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="border-b border-sidebar-border p-2"> {/* Use SheetHeader */}
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-semibold tracking-tight text-sidebar-foreground">4Eunoia</SheetTitle> {/* Use SheetTitle */}
                <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground">
                        <PanelLeft />
                        <span className="sr-only">Close sidebar</span>
                    </Button>
                </SheetClose>
              </div>
            </SheetHeader>
            <SidebarContent className="p-2"> {/* This SidebarContent is from ui/sidebar and is fine as a div */}
              {sidebarMenuContent}
            </SidebarContent>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <Sidebar variant="sidebar" collapsible="icon"> 
      <DesktopSidebarHeader> {/* Use aliased DesktopSidebarHeader */}
        <div className="flex items-center justify-between">
           {(desktopSidebarState === 'expanded') && (
             <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
               4Eunoia
             </h1>
           )}
           <DesktopSidebarTrigger aria-label="Toggle sidebar" />
        </div>
      </DesktopSidebarHeader>
      <SidebarContent className="p-2"> {/* This SidebarContent is from ui/sidebar */}
        {sidebarMenuContent}
      </SidebarContent>
    </Sidebar>
  );
}
