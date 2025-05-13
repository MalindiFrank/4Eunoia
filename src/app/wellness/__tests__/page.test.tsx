
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WellnessPage from '@/app/wellness/page';
import { DataModeProvider } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';
import { estimateBurnoutRisk } from '@/ai/flows/estimate-burnout-risk';

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock AI flow
jest.mock('@/ai/flows/estimate-burnout-risk', () => ({
    estimateBurnoutRisk: jest.fn(() => Promise.resolve({
        riskLevel: 'Low',
        riskScore: 20,
        assessmentSummary: 'Mock assessment summary.',
        contributingFactors: ['Mock factor 1'],
        recommendations: ['Mock recommendation 1'],
    })),
}));

// Mock service calls for data fetching by estimateBurnoutRisk
jest.mock('@/services/daily-log', () => ({
    ...jest.requireActual('@/services/daily-log'), // Keep actual constants
    getDailyLogs: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/services/task', () => ({
    ...jest.requireActual('@/services/task'),
    getTasks: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/services/calendar', () => ({
    ...jest.requireActual('@/services/calendar'),
    getCalendarEvents: jest.fn(() => Promise.resolve([])),
}));


// Mock services for wellness exercises
jest.mock('@/services/wellness', () => ({
    addGratitudeLog: jest.fn(),
    getGratitudeLogs: jest.fn(() => []), // Return empty array by default
    addReframingLog: jest.fn(),
    getReframingLogs: jest.fn(() => []), // Return empty array by default
}));


// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
      push: jest.fn(),
    }),
}));


describe('WellnessPage', () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (estimateBurnoutRisk as jest.Mock).mockClear();
  });

  const renderWellnessPage = () => {
    render(
      <DataModeProvider>
        <WellnessPage />
      </DataModeProvider>
    );
  };

  it('renders the main heading and tabs', async () => {
    renderWellnessPage();
    expect(screen.getByRole('heading', { name: /Wellness Center/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mood Tracking/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Journaling/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Focus Rituals/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Exercises/i })).toBeInTheDocument();

    // Wait for burnout risk to load (even if mock)
    await waitFor(() => {
        expect(screen.getByText(/Burnout Risk Meter/i)).toBeInTheDocument();
    });
  });

  it('renders Mood Tracking content by default', async () => {
    renderWellnessPage();
    expect(screen.getByRole('heading', { name: /Log Your Mood/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /😊 Happy/i })).toBeInTheDocument();
    await waitFor(() => { // Ensure burnout meter is also rendered in this tab
        expect(screen.getByText(/Burnout Risk Meter/i)).toBeInTheDocument();
    });
  });

  it('allows logging mood', async () => {
    renderWellnessPage();
    const happyButton = screen.getByRole('button', { name: /😊 Happy/i });
    fireEvent.click(happyButton);

    const notesTextarea = screen.getByPlaceholderText(/Add any notes about why you feel this way/i);
    fireEvent.change(notesTextarea, { target: { value: 'Feeling great today!' } });

    const logMoodButton = screen.getByRole('button', { name: /Log Mood/i });
    fireEvent.click(logMoodButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Mood Logged',
      description: 'Logged feeling Happy. (Storage not implemented yet)', // Update if storage gets implemented
    });
    expect(notesTextarea).toHaveValue(''); // Check if form resets
  });

  it('switches to Journaling tab and allows saving entry', async () => {
    renderWellnessPage();
    const journalingTab = screen.getByRole('tab', { name: /Journaling/i });
    fireEvent.click(journalingTab);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Daily Journal/i })).toBeInTheDocument();
    });

    const journalTextarea = screen.getByPlaceholderText(/Start writing.../i);
    fireEvent.change(journalTextarea, { target: { value: 'My journal entry.' } });

    const saveEntryButton = screen.getByRole('button', { name: /Save Entry/i });
    fireEvent.click(saveEntryButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Journal Entry Saved',
      description: 'Your thoughts have been recorded. (Storage not implemented yet)',
    });
    expect(journalTextarea).toHaveValue('');
  });

  it('switches to Focus Rituals tab and allows starting/stopping a ritual', async () => {
    renderWellnessPage();
    const focusTab = screen.getByRole('tab', { name: /Focus Rituals/i });
    fireEvent.click(focusTab);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Focus Rituals/i })).toBeInTheDocument();
    });
    
    const soundSelectTrigger = screen.getByRole('button', { name: /Select a soundscape.../i});
    fireEvent.mouseDown(soundSelectTrigger);

    // Wait for select options to appear
    await waitFor(() => {
        expect(screen.getByText('Gentle Rain')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Gentle Rain'));


    const startButton = screen.getByRole('button', { name: /Start Focus Ritual/i });
    fireEvent.click(startButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Focus Ritual Started',
      description: 'Playing rain soundscape.',
    });
    expect(screen.getByText(/Focus Ritual Active/i)).toBeInTheDocument();

    const stopButton = screen.getByRole('button', { name: /Stop Ritual/i });
    fireEvent.click(stopButton);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Focus Ritual Stopped',
      description: 'rain soundscape stopped.',
    });
    expect(screen.queryByText(/Focus Ritual Active/i)).not.toBeInTheDocument();
  });

  it('switches to Exercises tab and allows saving gratitude', async () => {
    renderWellnessPage();
    const exercisesTab = screen.getByRole('tab', { name: /Exercises/i });
    fireEvent.click(exercisesTab);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Micro-Therapy & Growth Exercises/i })).toBeInTheDocument();
    });
    
    const gratitudeTextarea = screen.getByPlaceholderText('1. ...');
    fireEvent.change(gratitudeTextarea, { target: { value: 'Grateful for sunshine.' } });

    const saveGratitudeButton = screen.getByRole('button', { name: /Save Gratitude/i });
    fireEvent.click(saveGratitudeButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Gratitude Saved',
      description: 'Your gratitude has been recorded.',
    });
  });
});
