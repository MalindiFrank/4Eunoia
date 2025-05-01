import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page'; // Adjust the import path as necessary
import { SidebarProvider } from '@/components/ui/sidebar'; // Import if needed by layout/page

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <a href={href}>{children}</a>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'), // Mock the current path
}));


describe('Home Page (Dashboard)', () => {
  it('renders the main heading', () => {
    render(
       <SidebarProvider> {/* Wrap if SidebarProvider is used in layout */}
            <Home />
       </SidebarProvider>
    );
    const heading = screen.getByRole('heading', { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
  });

   it('renders the daily outlook card title', () => {
       render(
           <SidebarProvider>
               <Home />
           </SidebarProvider>
       );
       const outlookTitle = screen.getByText(/Today's Outlook/i);
       expect(outlookTitle).toBeInTheDocument();
   });

    it('renders core feature cards (e.g., Daily Log, Tasks)', () => {
        render(
            <SidebarProvider>
                <Home />
            </SidebarProvider>
        );
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();
        // Add more checks for other cards if needed
    });

    it('renders links for core features', () => {
        render(
            <SidebarProvider>
                <Home />
            </SidebarProvider>
        );
        const dailyLogLink = screen.getByRole('link', { name: /daily log log activities, mood & reflections./i });
        expect(dailyLogLink).toHaveAttribute('href', '/daily-log');

        const tasksLink = screen.getByRole('link', { name: /tasks manage your to-do list./i });
        expect(tasksLink).toHaveAttribute('href', '/tasks');
    });

    it('renders the Insights and Visualizations cards', () => {
        render(
            <SidebarProvider>
                <Home />
            </SidebarProvider>
        );
        expect(screen.getByText('Insights')).toBeInTheDocument();
        expect(screen.getByText('Visualizations')).toBeInTheDocument();

         const insightsLink = screen.getByRole('link', { name: /insights get ai-powered personal insights on productivity, mood, spending, and more./i });
        expect(insightsLink).toHaveAttribute('href', '/insights');
    });
});
