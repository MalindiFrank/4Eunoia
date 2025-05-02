
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppSidebar } from '@/components/app-sidebar'; // Adjust the import path as necessary
import { SidebarProvider } from '@/components/ui/sidebar'; // Needed to wrap the sidebar

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
  usePathname: jest.fn(() => '/'), // Mock the current path, change as needed for tests
}));

// Mock useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false), // Default to desktop view
}));

describe('AppSidebar Component', () => {
   beforeEach(() => {
     // Reset mocks before each test if necessary
     jest.clearAllMocks();
     // Mock usePathname for specific tests if needed
     jest.mock('next/navigation', () => ({
       usePathname: jest.fn(() => '/'),
     }));
      // Mock useIsMobile for specific tests if needed
     jest.mock('@/hooks/use-mobile', () => ({
       useIsMobile: jest.fn(() => false), // Default to desktop view
     }));
   });

  it('renders the sidebar header with the app name', () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );
    // Wait for potential async operations or state updates if necessary
     // Use queryByText which doesn't throw error if not found initially
    const appName = screen.queryByText('4Eunoia');
    // In desktop mode, the name should be visible initially
    expect(appName).toBeInTheDocument();
    // Use getByRole for the trigger which should always be there (though visually hidden on desktop)
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it('renders all navigation menu items', () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );

    const expectedLabels = [
      'Dashboard', 'Daily Log', 'Tasks', 'Reminders', 'Calendar',
      'Expenses', 'Notes', 'Goals & Habits', 'Wellness', 'Insights',
      'Visualizations', 'Settings'
    ];

    expectedLabels.forEach(label => {
      // Check for the button associated with the tooltip or the visible text
      // Note: Tooltips might not render fully in JSDOM. We rely on accessible name or link text.
      // Find the link which contains the label text
       const linkElement = screen.getByRole('link', { name: new RegExp(label, 'i') });
       expect(linkElement).toBeInTheDocument();
    });
  });

   it('highlights the active menu item based on pathname', () => {
     // Mock pathname to be '/tasks'
     jest.mock('next/navigation', () => ({
       usePathname: jest.fn(() => '/tasks'),
     }));

     render(
       <SidebarProvider>
         <AppSidebar />
       </SidebarProvider>
     );

     const tasksButton = screen.getByRole('link', { name: /tasks/i }).closest('button');
     expect(tasksButton).toHaveAttribute('data-active', 'true');

     const dashboardButton = screen.getByRole('link', { name: /dashboard/i }).closest('button');
     expect(dashboardButton).toHaveAttribute('data-active', 'false');
   });

    // Example for mobile view test (if needed)
    // it('renders differently in mobile view', () => {
    //   jest.mock('@/hooks/use-mobile', () => ({
    //     useIsMobile: jest.fn(() => true),
    //   }));
    //   render(
    //     <SidebarProvider>
    //       <AppSidebar />
    //     </SidebarProvider>
    //   );
    //    // Add assertions specific to mobile view (e.g., Sheet presence)
    // });
});
