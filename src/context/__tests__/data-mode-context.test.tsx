import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataModeProvider, useDataMode } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

const TestComponent: React.FC = () => {
  const { dataMode, switchToUserDataMode, isLoading } = useDataMode();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'true' : 'false'}</span>
      <span data-testid="mode">{dataMode}</span>
      <button onClick={switchToUserDataMode}>Switch Mode</button>
    </div>
  );
};

describe('DataModeContext', () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  it('initializes with "mock" mode by default', async () => {
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     // Wait for loading state to become false
     await screen.findByText('false');

    expect(screen.getByTestId('mode')).toHaveTextContent('mock');
     expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('loads "user" mode from localStorage if previously saved', async () => {
    localStorage.setItem('prodev-data-mode', 'user');
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     await screen.findByText('false'); // Wait for loading

    expect(screen.getByTestId('mode')).toHaveTextContent('user');
     expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('switches to "user" mode and saves to localStorage when switchToUserDataMode is called', async () => {
    render(
      <DataModeProvider>
        <TestComponent />
      </DataModeProvider>
    );

     await screen.findByText('false'); // Wait for loading

    expect(screen.getByTestId('mode')).toHaveTextContent('mock');

    const switchButton = screen.getByRole('button', { name: /switch mode/i });
    act(() => {
        fireEvent.click(switchButton);
    })


    expect(screen.getByTestId('mode')).toHaveTextContent('user');
    expect(localStorage.getItem('prodev-data-mode')).toBe('user');
     expect(mockToast).toHaveBeenCalledWith({
       title: "Switched to User Data Mode",
       description: "The app will now use data stored in your browser's local storage.",
     });
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
