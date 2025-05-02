import type { Metadata } from 'next/metadata';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { DataModeProvider } from '@/context/data-mode-context'; // Import DataModeProvider
import { DataModeSwitcher } from '@/components/data-mode-switcher'; // Import the switcher
import { TooltipProvider } from '@/components/ui/tooltip'; // Import TooltipProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '4Eunoia - Your Personal OS',
  description: 'Track your productivity and personal development.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          geistSans.variable,
          geistMono.variable
        )}
      >
         <TooltipProvider> {/* Wrap everything in TooltipProvider */}
           <DataModeProvider> {/* Wrap with DataModeProvider */}
             <SidebarProvider>
               <div className="flex">
                 <AppSidebar />
                 <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                   {/* Add the switcher component, maybe conditionally or always visible */}
                   <DataModeSwitcher />
                   <div className="mt-4"> {/* Add some space below the switcher */}
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
