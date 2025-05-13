
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataModeSwitcher } from '@/components/data-mode-switcher';
import { useDataMode, DataModeProvider } from '@/context/data-mode-context';

// Mock useDataMode
const mockSwitchToUserDataMode = jest.fn();
const mockResetToMockMode = jest.fn();

// Default mock implementation
let currentDataMode: 'mock' | 'user' = 'mock';
let currentIsLoading = false;

jest.mock('@/context/data-mode-context', () => ({
  ...jest.requireActual('@/context/data-mode-context'), // Import and retain default behavior
  useDataMode: () => ({
    dataMode: currentDataMode,
    switchToUserDataMode: mockSwitchToUserDataMode,
    resetToMockMode: mockResetToMockMode,
    isLoading: currentIsLoading,
  }),
}));

describe('DataModeSwitcher', () => {
  beforeEach(() => {
    // Reset mocks and state for each test
    mockSwitchToUserDataMode.mockClear();
    mockResetToMockMode.mockClear();
    currentDataMode = 'mock'; // Default to 'mock'
    currentIsLoading = false; // Default to not loading
  });

  const renderSwitcher = () => {
     // We need DataModeProvider here because the actual useDataMode might be called by internal logic
     // or if the component itself re-renders and calls the hook again.
     // The mock above will intercept the hook call.
    render(
        <DataModeProvider> 
            <DataModeSwitcher />
        </DataModeProvider>
    );
  };

  it('renders correctly in "mock" mode', () => {
    currentDataMode = 'mock';
    renderSwitcher();
    expect(screen.getByText('Mock Data Mode')).toBeInTheDocument();
    expect(screen.getByText(/You are currently viewing sample data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start My Journey/i })).toBeInTheDocument();
  });

  it('renders correctly in "user" mode', () => {
    currentDataMode = 'user';
    renderSwitcher();
    expect(screen.getByText('Live Data Mode')).toBeInTheDocument();
    expect(screen.getByText(/The app is currently using your data stored locally/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start My Journey/i })).not.toBeInTheDocument();
  });

  it('calls switchToUserDataMode when "Start My Journey" button is clicked', () => {
    currentDataMode = 'mock';
    renderSwitcher();
    const switchButton = screen.getByRole('button', { name: /Start My Journey/i });
    fireEvent.click(switchButton);
    expect(mockSwitchToUserDataMode).toHaveBeenCalledTimes(1);
  });

  it('does not render if isLoading is true', () => {
    currentIsLoading = true;
    const { container } = render(<DataModeSwitcher />); // Render directly without provider for this specific test
    expect(container.firstChild).toBeNull();
  });
});
