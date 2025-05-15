
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DataModeProvider } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';

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
  usePathname: jest.fn(() => '/'),
}));

// Mock DataModeProvider
jest.mock('@/context/data-mode-context', () => ({
    DataModeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useDataMode: () => ({
      dataMode: 'mock',
      switchToUserDataMode: jest.fn(),
      resetToMockMode: jest.fn(),
      isLoading: false,
    }),
}));

// Mock useToast
const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToastFn,
  }),
}));

// Mock AI Flows
jest.mock('@/ai/flows/generate-daily-plan', () => ({
  generateDailyPlan: jest.fn(() => Promise.resolve({
    suggestedPlan: [{ startTime: 'Morning', activity: 'Mock Plan Item', category: 'Work' }],
    planRationale: 'Mock plan rationale from test.',
    warnings: [],
  })),
}));
jest.mock('@/ai/flows/process-voice-input', () => ({
    processVoiceInput: jest.fn(() => Promise.resolve({
        intent: 'log_activity',
        extractedDetails: { title: 'Processed Voice Input' },
        responseText: 'Okay, processing your voice input.',
    })),
}));


// Mock Services
jest.mock('@/services/daily-log', () => ({ getDailyLogs: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/task', () => ({ getTasks: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/calendar', () => ({ getCalendarEvents: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/goal', () => ({ getGoals: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/habit', () => ({ getHabits: jest.fn(() => Promise.resolve([])) }));

// Mock SpeechRecognition API
const mockStop = jest.fn();
const mockStart = jest.fn();
const mockSpeechRecognition = jest.fn(() => ({
  continuous: false,
  interimResults: true,
  lang: 'en-US',
  onstart: jest.fn(),
  onresult: jest.fn(),
  onerror: jest.fn(),
  onend: jest.fn(),
  stop: mockStop,
  start: mockStart,
  abort: jest.fn(),
}));
global.SpeechRecognition = mockSpeechRecognition;
(global as any).webkitSpeechRecognition = mockSpeechRecognition; // For Safari/Chrome compatibility


describe('Home Page (Dashboard)', () => {
    const renderHomePage = () => {
        render(
           <DataModeProvider>
               <SidebarProvider>
                   <Home />
               </SidebarProvider>
           </DataModeProvider>
        );
    };

  beforeEach(() => {
    mockToastFn.mockClear();
    mockStart.mockClear();
    mockStop.mockClear();
    // Reset recognitionRef mocks if they were assigned to instance properties
    if (mockSpeechRecognition.mock.instances.length > 0) {
        const instance = mockSpeechRecognition.mock.instances[0];
        instance.onstart.mockClear();
        instance.onresult.mockClear();
        instance.onerror.mockClear();
        instance.onend.mockClear();
    }
  });

  it('renders the main heading', () => {
    renderHomePage();
    const heading = screen.getByRole('heading', { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
  });

   it("renders the 'Today's Suggested Plan' card title and content", async () => {
       renderHomePage();
       const planTitle = await screen.findByText(/Today's Suggested Plan/i);
       expect(planTitle).toBeInTheDocument();
       // Check for mocked plan item
       await waitFor(() => {
           expect(screen.getByText('Mock Plan Item')).toBeInTheDocument();
           expect(screen.getByText('Mock plan rationale from test.')).toBeInTheDocument();
       });
   });

    it('renders core feature cards (e.g., Daily Log, Tasks)', () => {
        renderHomePage();
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();
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

         const insightsLink = screen.getByRole('link', { name: /insights get ai-powered personal insights./i });
        expect(insightsLink).toHaveAttribute('href', '/insights');
    });

    describe('Voice Companion', () => {
        it('renders the Voice Companion card and button', () => {
            renderHomePage();
            expect(screen.getByText('Voice Companion')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
        });

        it('toggles listening state when voice input button is clicked', () => {
            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });

            fireEvent.click(voiceButton);
            expect(mockStart).toHaveBeenCalledTimes(1);
            // Assuming the button text changes or an icon appears
            expect(screen.getByRole('button', { name: /listening.../i })).toBeInTheDocument();

            fireEvent.click(voiceButton); // Click again to stop
            expect(mockStop).toHaveBeenCalledTimes(1);
            expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
        });
        
        it('shows toast if SpeechRecognition API is not supported', () => {
            const originalSpeechRecognition = (window as any).SpeechRecognition;
            const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;
            delete (window as any).SpeechRecognition;
            delete (window as any).webkitSpeechRecognition;
            
            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton);

            expect(mockToastFn).toHaveBeenCalledWith({
                title: "Voice Input Not Supported",
                description: "Your browser doesn't support speech recognition.",
                variant: "destructive",
            });

            // Restore
            (window as any).SpeechRecognition = originalSpeechRecognition;
            (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
        });
    });
});
    