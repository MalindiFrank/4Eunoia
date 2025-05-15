
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
  Eye, // For Attention Patterns
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
// TooltipProvider is usually at a higher level (e.g., layout.tsx or SidebarProvider)
// If not, it should be added here if SidebarMenuButton relies on it directly being a child of TooltipProvider.
// For now, assuming TooltipProvider is correctly placed in layout.tsx or SidebarProvider.

import { useIsMobile } from '@/hooks/use-mobile';

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
  const { state: sidebarState, isMobile, openMobile } = useSidebar(); // Renamed 'state' to 'sidebarState' for clarity

  return (
    <Sidebar variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
           {(!isMobile || sidebarState === 'expanded' || openMobile) && (
             <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
               4Eunoia
             </h1>
           )}
           <SidebarTrigger aria-label="Toggle sidebar" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                className="justify-start"
                aria-label={item.label}
                tooltip={item.label} // SidebarMenuButton handles its own tooltip
                asChild // SidebarMenuButton will act as a Slot for the Link
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span className={cn(
                    // Show label if:
                    // 1. Not mobile AND sidebar is expanded OR
                    // 2. Is mobile AND mobile sidebar is open
                    // Otherwise, make it screen-reader only if collapsed on desktop
                    (sidebarState === 'expanded' && !isMobile) || (isMobile && openMobile) ? "" : ((sidebarState === 'collapsed' && !isMobile) ? "sr-only" : ""),
                    "group-data-[collapsible=icon]:sr-only" // General rule for icon-only state from parent
                  )}>
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
