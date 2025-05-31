
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
  LogIn,
  LogOut,
  UserCircle,
  Loader2
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader as DesktopSidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger as DesktopSidebarTrigger,
  useSidebar,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const { user, isLoading: authLoading, signInWithGoogle, signOutUser } = useAuth();

  const commonItemProps = (itemHref: string) => ({
    isActive: pathname === itemHref,
    className: "justify-start",
    onClick: () => {
      if (isMobile) setOpenMobile(false);
    }
  });

  const sidebarMenuContent = (
    <SidebarMenu className="flex-grow">
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            {...commonItemProps(item.href)}
            aria-label={item.label}
            tooltip={item.label}
          >
            <Link href={item.href}>
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

  const authSection = (
    <div className="p-2">
      <SidebarSeparator className="my-2" />
      {authLoading ? (
        <Button variant="ghost" className="w-full justify-start" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className={cn((desktopSidebarState === 'collapsed' && !isMobile && !openMobile) && "sr-only")}>Loading...</span>
        </Button>
      ) : user ? (
        <div className="space-y-2">
           <div className={cn("flex items-center gap-2 p-2", (desktopSidebarState === 'collapsed' && !isMobile && !openMobile) && "justify-center")}>
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5"/>}</AvatarFallback>
            </Avatar>
            {(desktopSidebarState === 'expanded' || (isMobile && openMobile)) && (
              <span className="text-xs font-medium truncate">{user.displayName || 'User'}</span>
            )}
          </div>
          <SidebarMenuButton variant="ghost" className="w-full justify-start" onClick={signOutUser} tooltip="Sign Out">
            <LogOut className="h-4 w-4" />
            <span className={cn((desktopSidebarState === 'collapsed' && !isMobile && !openMobile) && "sr-only")}>Sign Out</span>
          </SidebarMenuButton>
        </div>
      ) : (
        <SidebarMenuButton variant="outline" className="w-full justify-start" onClick={signInWithGoogle} tooltip="Sign In with Google">
          <LogIn className="h-4 w-4" />
           <span className={cn((desktopSidebarState === 'collapsed' && !isMobile && !openMobile) && "sr-only")}>Sign In</span>
        </SidebarMenuButton>
      )}
    </div>
  );


  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[var(--sidebar-width-mobile,18rem)] bg-sidebar p-0 text-sidebar-foreground flex flex-col">
          <SheetHeader className="border-b border-sidebar-border p-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold tracking-tight text-sidebar-foreground">4Eunoia</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground">
                  <PanelLeft />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          <SidebarContent className="p-2 flex-grow overflow-y-auto">
            {sidebarMenuContent}
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-2">
             {authSection}
          </SidebarFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Sidebar
  return (
    <Sidebar variant="sidebar" collapsible="icon" className="flex flex-col">
      <DesktopSidebarHeader>
        <div className="flex items-center justify-between">
           {(desktopSidebarState === 'expanded') && (
             <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
               4Eunoia
             </h1>
           )}
           <DesktopSidebarTrigger aria-label="Toggle sidebar" />
        </div>
      </DesktopSidebarHeader>
      <SidebarContent className="p-2 flex-grow overflow-y-auto">
        {sidebarMenuContent}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
          {authSection}
      </SidebarFooter>
    </Sidebar>
  );
}
