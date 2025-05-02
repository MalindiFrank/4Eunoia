
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page'; // Adjust the import path as necessary
import { SidebarProvider } from '@/components/ui/sidebar'; // Import if needed by layout/page
import { DataModeProvider } from '@/context/data-mode-context'; // Import DataModeProvider

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

// Mock DataModeProvider
jest.mock('@/context/data-mode-context', () => ({
    DataModeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, // Simple pass-through
    useDataMode: () => ({
      dataMode: 'mock', // Default to mock for tests
      switchToUserDataMode: jest.fn(),
      resetToMockMode: jest.fn(),
      isLoading: false,
    }),
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock AI Flows (return basic structure or null)
jest.mock('@/ai/flows/generate-daily-plan', () => ({
  generateDailyPlan: jest.fn(() => Promise.resolve({
    suggestedPlan: [],
    planRationale: 'Mock plan rationale.',
    warnings: [],
  })),
}));

// Mock Services (return empty arrays initially)
jest.mock('@/services/daily-log', () => ({ getDailyLogs: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/task', () => ({ getTasks: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/calendar', () => ({ getCalendarEvents: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/goal', () => ({ getGoals: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/habit', () => ({ getHabits: jest.fn(() => Promise.resolve([])) }));


describe('Home Page (Dashboard)', () => {
    // Helper function to render with providers
    const renderHomePage = () => {
        render(
           <DataModeProvider>
               <SidebarProvider> {/* Wrap if SidebarProvider is used in layout */}
                   <Home />
               </SidebarProvider>
           </DataModeProvider>
        );
    };

  it('renders the main heading', () => {
    renderHomePage();
    const heading = screen.getByRole('heading', { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
  });

   it("renders the 'Today's Suggested Plan' card title", async () => {
       renderHomePage();
       // Wait for the plan to potentially load (even if mock)
       const planTitle = await screen.findByText(/Today's Suggested Plan/i);
       expect(planTitle).toBeInTheDocument();
   });

    it('renders core feature cards (e.g., Daily Log, Tasks)', () => {
        renderHomePage();
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();
        // Add more checks for other cards if needed
    });

    it('renders links for core features', () => {
        renderHomePage();
        const dailyLogLink = screen.getByRole('link', { name: /daily log log activities, mood & reflections./i });
        expect(dailyLogLink).toHaveAttribute('href', '/daily-log');

        const tasksLink = screen.getByRole('link', { name: /tasks manage your to-do list./i });
        expect(tasksLink).toHaveAttribute('href', '/tasks');
    });

    it('renders the Insights and Visualizations cards', () => {
        renderHomePage();
        expect(screen.getByText('Insights')).toBeInTheDocument();
        expect(screen.getByText('Visualizations')).toBeInTheDocument();

         const insightsLink = screen.getByRole('link', { name: /insights get ai-powered personal insights on productivity, mood, spending, and more./i });
        expect(insightsLink).toHaveAttribute('href', '/insights');
    });
});
