
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DataModeProvider } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';
import { processVoiceInput } from '@/ai/flows/process-voice-input';
import { addUserLog } from '@/services/daily-log';
import { addUserTask } from '@/services/task';
import { addUserNote } from '@/services/note';


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
      dataMode: 'user', // Default to user mode for voice actions
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
jest.mock('@/ai/flows/process-voice-input');
jest.mock('@/ai/flows/estimate-burnout-risk', () => ({
    estimateBurnoutRisk: jest.fn(() => Promise.resolve({
        riskLevel: 'Low', riskScore: 10, assessmentSummary: 'Low risk', contributingFactors: [], recommendations: []
    }))
}));


// Mock Services
jest.mock('@/services/daily-log', () => ({
    ...jest.requireActual('@/services/daily-log'), // Keep actual constants
    getDailyLogs: jest.fn(() => Promise.resolve([])),
    addUserLog: jest.fn(),
}));
jest.mock('@/services/task', () => ({
    ...jest.requireActual('@/services/task'),
    getTasks: jest.fn(() => Promise.resolve([])),
    addUserTask: jest.fn(),
}));
jest.mock('@/services/calendar', () => ({ getCalendarEvents: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/goal', () => ({ getGoals: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/habit', () => ({ getHabits: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/services/note', () => ({
    ...jest.requireActual('@/services/note'),
    addUserNote: jest.fn(),
}));


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
(global as any).webkitSpeechRecognition = mockSpeechRecognition;


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
    (processVoiceInput as jest.Mock).mockClear();
    (addUserLog as jest.Mock).mockClear();
    (addUserTask as jest.Mock).mockClear();
    (addUserNote as jest.Mock).mockClear();

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
       await waitFor(() => {
           expect(screen.getByText('Mock Plan Item')).toBeInTheDocument();
           expect(screen.getByText('Mock plan rationale from test.')).toBeInTheDocument();
       });
   });

    it('renders core feature cards', () => {
        renderHomePage();
        expect(screen.getByText('Daily Log')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
    });


    describe('Voice Companion Actions', () => {
        const mockRecognitionInstance = () => mockSpeechRecognition.mock.instances[0];

        it('calls addUserLog when voice input intent is "log_activity"', async () => {
            (processVoiceInput as jest.Mock).mockResolvedValueOnce({
                intent: 'log_activity',
                extractedDetails: { title: 'Logged via voice', mood: 'Happy', focusLevel: 4 },
                responseText: 'Activity logged.',
            });

            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton); // Start listening

            // Simulate speech recognition result
            act(() => {
                mockRecognitionInstance().onresult({
                    resultIndex: 0,
                    results: [{ 0: { transcript: 'Log that I finished coding' }, isFinal: true }],
                } as unknown as SpeechRecognitionEvent);
            });
             act(() => {
                mockRecognitionInstance().onend(); // Trigger processing
            });


            await waitFor(() => {
                expect(processVoiceInput).toHaveBeenCalledWith(expect.objectContaining({ transcribedText: 'Log that I finished coding' }));
            });
            await waitFor(() => {
                expect(addUserLog).toHaveBeenCalledWith(expect.objectContaining({
                    activity: 'Logged via voice',
                    mood: 'Happy',
                    focusLevel: 4,
                }));
                expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Command: log activity Executed',
                    description: 'Activity logged: "Logged via voice".',
                }));
            });
        });

        it('calls addUserTask when voice input intent is "create_task"', async () => {
            (processVoiceInput as jest.Mock).mockResolvedValueOnce({
                intent: 'create_task',
                extractedDetails: { title: 'Voice Task', description: 'Details for task' },
                responseText: 'Task created.',
            });

            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton);

            act(() => {
                mockRecognitionInstance().onresult({
                    resultIndex: 0,
                    results: [{ 0: { transcript: 'Create task voice task' }, isFinal: true }],
                } as unknown as SpeechRecognitionEvent);
            });
             act(() => {
                mockRecognitionInstance().onend();
            });

            await waitFor(() => {
                expect(processVoiceInput).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(addUserTask).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Task',
                    description: 'Details for task',
                    status: 'Pending',
                }));
                expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Command: create task Executed',
                    description: 'Task created: "Voice Task".',
                }));
            });
        });

        it('calls addUserNote when voice input intent is "create_note"', async () => {
            (processVoiceInput as jest.Mock).mockResolvedValueOnce({
                intent: 'create_note',
                extractedDetails: { title: 'Voice Note', content: 'This is the note content.' },
                responseText: 'Note created.',
            });
            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton);

            act(() => {
                mockRecognitionInstance().onresult({
                    resultIndex: 0,
                    results: [{ 0: { transcript: 'Note voice note this is the note content' }, isFinal: true }],
                } as unknown as SpeechRecognitionEvent);
            });
             act(() => {
                mockRecognitionInstance().onend();
            });

            await waitFor(() => {
                expect(processVoiceInput).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(addUserNote).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Note',
                    content: 'This is the note content.',
                }));
                 expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Command: create note Executed',
                    description: 'Note created: "Voice Note".',
                }));
            });
        });

        it('shows AI clarification response if details are missing', async () => {
            (processVoiceInput as jest.Mock).mockResolvedValueOnce({
                intent: 'create_task',
                extractedDetails: {}, // Missing title
                responseText: 'What should I call this task?',
            });
            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton);

            act(() => {
                 mockRecognitionInstance().onresult({
                    resultIndex: 0,
                    results: [{ 0: { transcript: 'Create a new task' }, isFinal: true }],
                } as unknown as SpeechRecognitionEvent);
            });
             act(() => {
                mockRecognitionInstance().onend();
            });

            await waitFor(() => expect(processVoiceInput).toHaveBeenCalled());
            await waitFor(() => {
                expect(addUserTask).not.toHaveBeenCalled();
                expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Voice Command: create task',
                    description: 'What should I call this task?',
                }));
            });
        });

         it('does not call action services if in mock mode', async () => {
             // Temporarily mock useDataMode to return 'mock'
             jest.spyOn(require('@/context/data-mode-context'), 'useDataMode').mockReturnValueOnce({
                 dataMode: 'mock',
                 switchToUserDataMode: jest.fn(),
                 resetToMockMode: jest.fn(),
                 isLoading: false,
             });

            (processVoiceInput as jest.Mock).mockResolvedValueOnce({
                intent: 'create_task',
                extractedDetails: { title: 'Test Task in Mock Mode' },
                responseText: 'Task created.',
            });

            renderHomePage();
            const voiceButton = screen.getByRole('button', { name: /start voice input/i });
            fireEvent.click(voiceButton);

            act(() => {
                mockRecognitionInstance().onresult({
                    resultIndex: 0,
                    results: [{ 0: { transcript: 'Create task test task' }, isFinal: true }],
                } as unknown as SpeechRecognitionEvent);
            });
             act(() => {
                mockRecognitionInstance().onend();
            });

            await waitFor(() => {
                expect(addUserTask).not.toHaveBeenCalled();
                 expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
                    title: "Voice Action Disabled",
                    description: "Actions via voice are disabled in Mock Data Mode. Please 'Start My Journey'.",
                    variant: "destructive",
                }));
            });

             // Restore the original mock
             jest.spyOn(require('@/context/data-mode-context'), 'useDataMode').mockRestore();
         });
    });
});

