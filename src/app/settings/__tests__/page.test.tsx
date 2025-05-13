
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '@/app/settings/page';
import { DataModeProvider } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock useDataMode
const mockResetToMockMode = jest.fn();
jest.mock('@/context/data-mode-context', () => ({
    ...jest.requireActual('@/context/data-mode-context'), // Import and retain default behavior
  useDataMode: () => ({
    dataMode: 'user', // Default to user mode for tests
    switchToUserDataMode: jest.fn(),
    resetToMockMode: mockResetToMockMode,
    isLoading: false,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false, // Default to light mode for system theme
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });


describe('SettingsPage', () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockResetToMockMode.mockClear();
  });

  const renderSettingsPage = () => {
    render(
      <DataModeProvider>
        <SettingsPage />
      </DataModeProvider>
    );
  };

  it('renders all setting sections correctly', async () => {
    renderSettingsPage();
     await waitFor(() => { // Wait for settings to load
        expect(screen.getByRole('heading', { name: /Application Settings/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Neurodivergent Mode/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reset Application/i })).toBeInTheDocument();
  });

  it('allows changing the theme and saves settings', async () => {
    renderSettingsPage();
    await waitFor(() => {
        expect(screen.getByLabelText('Select application theme')).toBeInTheDocument();
    });

    const themeSelect = screen.getByLabelText('Select application theme');
    fireEvent.mouseDown(themeSelect); // Open the select

    // Wait for options to appear
    await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Dark'));


    const saveButton = screen.getByRole('button', { name: /Save All Settings/i });
    fireEvent.click(saveButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
    // Check if localStorage was updated (simplified check)
    const settings = JSON.parse(localStorage.getItem('4eunoia-app-settings') || '{}');
    expect(settings.preferences.theme).toBe('dark');
  });

  it('toggles a notification switch and saves settings', async () => {
    renderSettingsPage();
     await waitFor(() => {
        expect(screen.getByLabelText('Toggle task due date reminders')).toBeInTheDocument();
    });
    const taskRemindersSwitch = screen.getByLabelText('Toggle task due date reminders');
    fireEvent.click(taskRemindersSwitch); // Toggle it off (assuming default is on)

    const saveButton = screen.getByRole('button', { name: /Save All Settings/i });
    fireEvent.click(saveButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
    const settings = JSON.parse(localStorage.getItem('4eunoia-app-settings') || '{}');
    expect(settings.notifications.taskReminders).toBe(false); // Assuming default was true
  });


  it('shows confirmation dialog on reset and calls resetToMockMode', async () => {
    renderSettingsPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clear All My Data & Reset/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Clear All My Data & Reset/i });
    fireEvent.click(resetButton);

    // Wait for dialog to appear
    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Are you absolutely sure?/i })).toBeInTheDocument();
    });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Yes, Delete Everything/i });
    fireEvent.click(confirmDeleteButton);

    expect(mockResetToMockMode).toHaveBeenCalledTimes(1);
    // Toast for reset is handled in useDataMode, so we don't check it here unless we pass the mock down
  });

   it('loads saved settings from localStorage on mount', async () => {
       const initialSettings = {
           preferences: { theme: 'dark', defaultView: '/', growthPace: 'Aggressive' },
           notifications: { taskReminders: false, eventAlerts: false, habitNudges: false, insightNotifications: false },
       };
       localStorage.setItem('4eunoia-app-settings', JSON.stringify(initialSettings));

       renderSettingsPage();

       await waitFor(() => {
         expect(screen.getByLabelText('Select application theme')).toHaveTextContent('Dark'); // SelectValue might show this
         expect(screen.getByLabelText('Select personal growth pace')).toHaveTextContent('Aggressive');
       });
       
       const taskRemindersSwitch = screen.getByLabelText('Toggle task due date reminders') as HTMLButtonElement;
       // The 'checked' state is on the underlying input, but Radix Switch uses data-state
       expect(taskRemindersSwitch).toHaveAttribute('data-state', 'unchecked'); 
   });


});
