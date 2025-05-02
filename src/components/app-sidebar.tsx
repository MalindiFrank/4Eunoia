'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookText,
  Calendar,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  PieChart,
  Settings,
  Smile, // For Wellness
  StickyNote,
  Target, // For Goals/Habits
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
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily-log', label: 'Daily Log', icon: BookText },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/reminders', label: 'Reminders', icon: StickyNote }, // Kept StickyNote for consistency
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/goals-habits', label: 'Goals & Habits', icon: Target }, // New
  { href: '/wellness', label: 'Wellness', icon: Smile }, // New
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/visualizations', label: 'Visualizations', icon: PieChart },
  { href: '/settings', label: 'Settings', icon: Settings }, // New
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar(); // Get sidebar state
  const isMobile = useIsMobile();

  return (
    <Sidebar variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
           {/* Conditionally render title based on state if not mobile */}
           {(!isMobile || state === 'expanded') && (
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
              <Link href={item.href} passHref legacyBehavior>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={pathname === item.href}
                          asChild
                          className="justify-start"
                          aria-label={item.label} // Add aria-label for accessibility
                        >
                          <a>
                            <item.icon className="h-4 w-4" />
                            {/* Hide span visually when collapsed on desktop, but keep for screen readers */}
                             <span className={cn("group-data-[collapsible=icon]:sr-only", state === 'collapsed' && !isMobile ? "sr-only" : "")}>{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                     </TooltipTrigger>
                     {/* Only show tooltip when collapsed on desktop */}
                    {(state === 'collapsed' && !isMobile) && (
                         <TooltipContent side="right" align="center">
                             {item.label}
                         </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
