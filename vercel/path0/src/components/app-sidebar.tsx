
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
  Smile, 
  StickyNote,
  Target, 
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
  const { state, isMobile, openMobile } = useSidebar(); 

  return (
    <Sidebar variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
           {(!isMobile || state === 'expanded' || openMobile) && (
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
              <Link href={item.href} passHref>
                {/* SidebarMenuButton is now Link-aware and handles its own tooltip */}
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className="justify-start"
                  aria-label={item.label}
                  tooltip={item.label} // Pass label for tooltip
                  href={item.href} // Pass href to ensure it renders as <a>
                >
                  <item.icon className="h-4 w-4" />
                  <span className={cn(
                    (state === 'collapsed' && !isMobile) ? "sr-only" : "", // Standard sr-only for desktop collapsed
                    "group-data-[collapsible=icon]:sr-only" // Keep this for icon-only styling from sidebar component
                  )}>
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
