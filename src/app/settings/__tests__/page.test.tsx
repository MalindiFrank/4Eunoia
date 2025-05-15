
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
    ...jest.requireActual('@/context/data-mode-context'),
  useDataMode: () => ({
    dataMode: 'user',
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
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
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
     await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Application Settings/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Customization/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Neurodivergent Mode/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reset Application/i })).toBeInTheDocument();
  });

  it('allows changing the theme and AI preferences, and saves settings', async () => {
    renderSettingsPage();
    await waitFor(() => {
        expect(screen.getByLabelText('Select application theme')).toBeInTheDocument();
        expect(screen.getByLabelText('Select AI Persona')).toBeInTheDocument();
        expect(screen.getByLabelText('Select AI Insight Verbosity')).toBeInTheDocument();
        expect(screen.getByLabelText('Your Typical Energy Pattern')).toBeInTheDocument();
    });

    // Change Theme
    fireEvent.mouseDown(screen.getByLabelText('Select application theme'));
    await waitFor(() => { expect(screen.getByText('Dark')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('Dark'));

    // Change AI Persona
    fireEvent.mouseDown(screen.getByLabelText('Select AI Persona'));
    await waitFor(() => { expect(screen.getByText('Neutral Assistant')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('Neutral Assistant'));

    // Change AI Verbosity
    fireEvent.mouseDown(screen.getByLabelText('Select AI Insight Verbosity'));
    await waitFor(() => { expect(screen.getByText('Brief Summary')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('Brief Summary'));
    
    // Change Energy Pattern
    const energyPatternInput = screen.getByLabelText('Your Typical Energy Pattern');
    fireEvent.change(energyPatternInput, { target: { value: 'Productive mornings' } });


    const saveButton = screen.getByRole('button', { name: /Save All Settings/i });
    fireEvent.click(saveButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
    
    const settings = JSON.parse(localStorage.getItem('4eunoia-app-settings') || '{}');
    expect(settings.preferences.theme).toBe('dark');
    expect(settings.preferences.aiPersona).toBe('Neutral Assistant');
    expect(settings.preferences.aiInsightVerbosity).toBe('Brief Summary');
    expect(settings.preferences.energyPattern).toBe('Productive mornings');
  });

  it('toggles a notification switch and Neurodivergent Mode Focus Shield, then saves', async () => {
    renderSettingsPage();
     await waitFor(() => {
        expect(screen.getByLabelText('Toggle task due date reminders')).toBeInTheDocument();
        expect(screen.getByLabelText('Enable Neurodivergent Mode')).toBeInTheDocument();
    });
    const taskRemindersSwitch = screen.getByLabelText('Toggle task due date reminders');
    fireEvent.click(taskRemindersSwitch); // Toggle it off

    const neuroModeSwitch = screen.getByLabelText('Enable Neurodivergent Mode');
    fireEvent.click(neuroModeSwitch); // Enable Neuro Mode
    
    await waitFor(() => { // Wait for conditional elements to render
        expect(screen.getByLabelText('Enable Focus Shield (In-App)')).toBeInTheDocument();
    });
    const focusShieldSwitch = screen.getByLabelText('Enable Focus Shield (In-App)');
    fireEvent.click(focusShieldSwitch); // Enable Focus Shield

    const saveButton = screen.getByRole('button', { name: /Save All Settings/i });
    fireEvent.click(saveButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
    const settings = JSON.parse(localStorage.getItem('4eunoia-app-settings') || '{}');
    expect(settings.notifications.taskReminders).toBe(false);
    expect(settings.neurodivergent.enabled).toBe(true);
    expect(settings.neurodivergent.focusShieldEnabled).toBe(true);
  });


  it('shows confirmation dialog on reset and calls resetToMockMode', async () => {
    renderSettingsPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clear All My Data & Reset/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Clear All My Data & Reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Are you absolutely sure?/i })).toBeInTheDocument();
    });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Yes, Delete Everything/i });
    fireEvent.click(confirmDeleteButton);

    expect(mockResetToMockMode).toHaveBeenCalledTimes(1);
  });

   it('loads saved settings from localStorage on mount', async () => {
       const initialSettings = {
           preferences: { 
             theme: 'dark', 
             defaultView: '/', 
             growthPace: 'Aggressive',
             aiPersona: 'Direct Analyst',
             aiInsightVerbosity: 'Brief Summary',
             energyPattern: 'Peaks in evening',
            },
           notifications: { taskReminders: false, eventAlerts: false, habitNudges: false, insightNotifications: false },
           neurodivergent: { enabled: true, focusShieldEnabled: true, lowStimulationUI: true, taskChunking: true, focusModeTimer: 'custom' },
       };
       localStorage.setItem('4eunoia-app-settings', JSON.stringify(initialSettings));

       renderSettingsPage();

       await waitFor(() => {
         expect(screen.getByLabelText('Select application theme')).toHaveTextContent('Dark');
         expect(screen.getByLabelText('Select personal growth pace')).toHaveTextContent('Aggressive');
         expect(screen.getByLabelText('Select AI Persona')).toHaveTextContent('Direct Analyst');
         expect(screen.getByLabelText('Select AI Insight Verbosity')).toHaveTextContent('Brief Summary');
         expect(screen.getByLabelText('Your Typical Energy Pattern')).toHaveValue('Peaks in evening');
         expect(screen.getByLabelText('Enable Neurodivergent Mode')).toHaveAttribute('data-state', 'checked');
         expect(screen.getByLabelText('Enable Focus Shield (In-App)')).toHaveAttribute('data-state', 'checked');
       });
       
       const taskRemindersSwitch = screen.getByLabelText('Toggle task due date reminders') as HTMLButtonElement;
       expect(taskRemindersSwitch).toHaveAttribute('data-state', 'unchecked'); 
   });
});
    