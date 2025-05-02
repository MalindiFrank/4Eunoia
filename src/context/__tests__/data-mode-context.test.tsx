
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataModeProvider, useDataMode } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';
import { CALENDAR_EVENTS_STORAGE_KEY } from '@/services/calendar';
import { DAILY_LOG_STORAGE_KEY } from '@/services/daily-log';
// Import other keys as needed

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true, // Allow mocking
});


const TestComponent: React.FC = () => {
  const { dataMode, switchToUserDataMode, resetToMockMode, isLoading } = useDataMode();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'true' : 'false'}</span>
      <span data-testid="mode">{dataMode}</span>
      <button onClick={switchToUserDataMode}>Switch To User</button>
      <button onClick={resetToMockMode}>Reset To Mock</button>
    </div>
  );
};

const DATA_MODE_STORAGE_KEY = '4eunoia-data-mode';

describe('DataModeContext', () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockReload.mockClear(); // Clear reload mock calls
  });

  it('initializes with "mock" mode by default if nothing is in localStorage', async () => {
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     // Wait for loading state to become false
     await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('mode')).toHaveTextContent('mock');
    expect(localStorage.getItem(DATA_MODE_STORAGE_KEY)).toBe('mock'); // Check if default was saved
  });

   it('initializes with "mock" mode if localStorage value is invalid', async () => {
    localStorage.setItem(DATA_MODE_STORAGE_KEY, 'invalid-mode');
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );
     await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
     expect(screen.getByTestId('mode')).toHaveTextContent('mock');
     expect(localStorage.getItem(DATA_MODE_STORAGE_KEY)).toBe('mock'); // Should reset to mock
   });


  it('loads "user" mode from localStorage if previously saved', async () => {
    localStorage.setItem(DATA_MODE_STORAGE_KEY, 'user');
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false')); // Wait for loading

    expect(screen.getByTestId('mode')).toHaveTextContent('user');
  });

  it('switches to "user" mode and saves to localStorage when switchToUserDataMode is called', async () => {
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false')); // Wait for loading

    expect(screen.getByTestId('mode')).toHaveTextContent('mock');

    const switchButton = screen.getByRole('button', { name: /switch to user/i });
    act(() => {
        fireEvent.click(switchButton);
    })


    expect(screen.getByTestId('mode')).toHaveTextContent('user');
    expect(localStorage.getItem(DATA_MODE_STORAGE_KEY)).toBe('user');
     expect(mockToast).toHaveBeenCalledWith({
       title: "Switched to User Data Mode",
       description: "The app will now use data stored in your browser's local storage.",
     });
  });

  it('resetToMockMode clears all data keys, sets mode to mock, saves, and reloads', async () => {
     // Setup: Start in user mode with some dummy data
     localStorage.setItem(DATA_MODE_STORAGE_KEY, 'user');
     localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify([{ id: 'event1' }]));
     localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify([{ id: 'log1' }]));
     localStorage.setItem('4eunoia-app-settings', JSON.stringify({ theme: 'dark' }));


     render(
       <DataModeProvider>
         <TestComponent />
       </DataModeProvider>
     );

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      expect(screen.getByTestId('mode')).toHaveTextContent('user'); // Verify starting in user mode

     const resetButton = screen.getByRole('button', { name: /reset to mock/i });
     act(() => {
         fireEvent.click(resetButton);
     });

      // Check localStorage changes BEFORE reload mock happens
      expect(localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(DAILY_LOG_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('4eunoia-app-settings')).toBeNull();
      expect(localStorage.getItem(DATA_MODE_STORAGE_KEY)).toBe('mock');

      // Check if reload was called
      expect(mockReload).toHaveBeenCalledTimes(1);

      // Note: We cannot easily test the state *after* reload in JSDOM.
      // We rely on the fact that localStorage was updated and reload was called.
  });


   it('throws an error if useDataMode is used outside of DataModeProvider', () => {
     // Prevent console error pollution during expected error test
     const originalError = console.error;
     console.error = jest.fn();

     expect(() => render(<TestComponent />)).toThrow('useDataMode must be used within a DataModeProvider');

     // Restore console.error
     console.error = originalError;
   });
});
