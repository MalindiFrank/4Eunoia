
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, Calendar, ListChecks, CreditCard, Lightbulb, PieChart, Settings, Smile, StickyNote, Target, BrainCircuit, Loader2, Mic, XCircle, CheckCircle, Eye, Map, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

import { useDataMode } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { generateDailyPlan, type GenerateDailyPlanInput, type GenerateDailyPlanOutput, type UserPreferences } from '@/ai/flows/generate-daily-plan';
import { processVoiceInput, type ProcessVoiceInput, type ProcessedVoiceOutput } from '@/ai/flows/process-voice-input';
import { estimateBurnoutRisk, type EstimateBurnoutRiskInput, type EstimateBurnoutRiskOutput } from '@/ai/flows/estimate-burnout-risk';
import { getDailyLogs } from '@/services/daily-log';
import { getTasks } from '@/services/task';
import { getCalendarEvents } from '@/services/calendar';
import { getGoals } from '@/services/goal';
import { getHabits } from '@/services/habit';
import { formatISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Helper to format data for flows
const formatForFlow = <T extends Record<string, any>>(items: T[] = [], dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate', 'lastCompleted', 'targetDate']): any[] => {
    return items.map(item => {
        const newItem: Record<string, any> = { ...item };
        dateKeys.forEach(key => {
            if (item[key] && item[key] instanceof Date) {
                newItem[key] = formatISO(item[key]);
            } else if (item[key] === undefined || item[key] === null) {
                // newItem[key] = undefined; // Or handle as needed
            }
        });
        return newItem;
    });
};

export default function Home() {
    const [dailyPlan, setDailyPlan] = useState<GenerateDailyPlanOutput | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const { dataMode } = useDataMode();
    const { toast } = useToast();

    // Voice Input State
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const [aiPreferences, setAiPreferences] = useState<UserPreferences>({
        aiPersona: 'Supportive Coach',
        aiInsightVerbosity: 'Detailed Analysis',
        energyLevelPattern: 'Steady throughout day',
        growthPace: 'Moderate',
        preferredWorkTimes: 'Flexible',
        theme: 'system',
        defaultView: '/',
    });
    const [neuroSettings, setNeuroSettings] = useState({ focusShieldEnabled: false, enabled: false, lowStimulationUI: false, taskChunking: false, focusModeTimer: 'pomodoro' as 'pomodoro' | 'custom' });
    const [burnoutData, setBurnoutData] = useState<EstimateBurnoutRiskOutput | null>(null);
    const [isLoadingBurnout, setIsLoadingBurnout] = useState(false); // Initialized to false, fetched on demand

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const storedSettings = localStorage.getItem('4eunoia-app-settings');
        if (storedSettings) {
          try {
            const parsed = JSON.parse(storedSettings);
            if (parsed.preferences) {
              setAiPreferences(prev => ({
                ...prev,
                aiPersona: parsed.preferences.aiPersona || prev.aiPersona,
                aiInsightVerbosity: parsed.preferences.aiInsightVerbosity || prev.aiInsightVerbosity,
                energyLevelPattern: parsed.preferences.energyPattern || prev.energyLevelPattern,
                growthPace: parsed.preferences.growthPace || prev.growthPace,
                preferredWorkTimes: parsed.preferences.preferredWorkTimes || prev.preferredWorkTimes,
              }));
            }
            if (parsed.neurodivergent) {
              setNeuroSettings(prev => ({
                ...prev,
                enabled: parsed.neurodivergent.enabled || false,
                focusShieldEnabled: parsed.neurodivergent.focusShieldEnabled || false,
                lowStimulationUI: parsed.neurodivergent.lowStimulationUI || false,
                taskChunking: parsed.neurodivergent.taskChunking || false,
                focusModeTimer: parsed.neurodivergent.focusModeTimer || 'pomodoro',
              }));
            }
          } catch (e) {
            console.error("Error loading settings for Home page:", e);
          }
        }
      }
    }, []);

    const fetchBurnoutRisk = useCallback(async () => {
        if (!neuroSettings.enabled || !neuroSettings.focusShieldEnabled) { // Only fetch if relevant settings are enabled
            setBurnoutData(null); // Clear data if not needed
            return;
        }
        setIsLoadingBurnout(true);
        try {
            const endDate = new Date();
            const startDate = subDays(endDate, 14); // Analyze past 14 days for burnout

            const [logs, tasks, events] = await Promise.all([
                getDailyLogs(dataMode).then(d => d.filter(l => l.date >= startDate && l.date <= endDate)),
                getTasks(dataMode),
                getCalendarEvents(dataMode).then(e => e.filter(ev => ev.start >= startDate && ev.start <= endDate)),
            ]);

            const input: EstimateBurnoutRiskInput = {
                startDate: formatISO(startDate),
                endDate: formatISO(endDate),
                dailyLogs: formatForFlow(logs, ['date']),
                tasks: formatForFlow(tasks, ['createdAt', 'dueDate']),
                calendarEvents: formatForFlow(events, ['start', 'end']),
            };
            const result = await estimateBurnoutRisk(input);
            setBurnoutData(result);
        } catch (error) {
            console.error("Failed to estimate burnout risk:", error);
            toast({ title: "Error", description: "Could not load burnout risk data for Focus Shield.", variant: "destructive" });
            setBurnoutData(null);
        } finally {
            setIsLoadingBurnout(false);
        }
    }, [dataMode, toast, neuroSettings.enabled, neuroSettings.focusShieldEnabled]);

    useEffect(() => {
        fetchBurnoutRisk(); // Fetch on initial load or when settings change
    }, [fetchBurnoutRisk]);


    const fetchDailyPlan = useCallback(async () => {
        setIsLoadingPlan(true);
        try {
            const today = new Date();
            const startDateLogs = startOfDay(subDays(today, 2)); // Logs from past 2 days
            const endDateLogs = endOfDay(today);

            const [logs, tasks, events, goals, habits] = await Promise.all([
                getDailyLogs(dataMode).then(d => d.filter(l => l.date >= startDateLogs && l.date <= endDateLogs)),
                getTasks(dataMode).then(t => t.filter(task => (task.dueDate && task.dueDate >= startOfDay(today) && task.dueDate <= endOfDay(today)) || task.status !== 'Completed')),
                getCalendarEvents(dataMode).then(e => e.filter(ev => ev.start >= startOfDay(today) && ev.start <= endOfDay(today))),
                getGoals(dataMode).then(g => g.filter(goal => goal.status === 'In Progress')),
                getHabits(dataMode),
            ]);

            const planInput: GenerateDailyPlanInput = {
                targetDate: formatISO(today),
                recentLogs: formatForFlow(logs, ['date']),
                tasksForDate: formatForFlow(tasks, ['createdAt', 'dueDate']),
                eventsForDate: formatForFlow(events, ['start', 'end']),
                activeGoals: formatForFlow(goals, ['createdAt', 'updatedAt', 'targetDate']),
                activeHabits: formatForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                userPreferences: aiPreferences,
            };

            const result = await generateDailyPlan(planInput);
            setDailyPlan(result);
        } catch (error) {
            console.error("Failed to generate daily plan:", error);
            if (error instanceof Error && error.message.includes("503")) {
                 toast({ title: "AI Service Unavailable", description: "Could not generate daily plan, the AI service is temporarily overloaded. Please try again later.", variant: "destructive", duration: 7000 });
            } else {
                 toast({ title: "Error", description: "Could not load daily plan suggestions.", variant: "destructive" });
            }
            setDailyPlan(null);
        } finally {
            setIsLoadingPlan(false);
        }
    }, [dataMode, toast, aiPreferences]);

    useEffect(() => {
        fetchDailyPlan();
    }, [fetchDailyPlan]);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognitionAPI();
            const recognition = recognitionRef.current;
            if (!recognition) return;

            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setVoiceError(null);
                setInterimTranscript('');
                setFinalTranscript('');
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setInterimTranscript(interim);
                if (final) setFinalTranscript(final);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setVoiceError(event.error === 'no-speech' ? 'No speech detected. Please try again.' : event.error === 'network' ? 'Network error for speech service.' : 'Speech recognition error. Please try again.');
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
      if (!isListening && finalTranscript.trim()) {
        handleVoiceInput(finalTranscript.trim());
        setFinalTranscript('');
      }
    }, [isListening, finalTranscript]); // Removed handleVoiceInput from deps to avoid re-triggering

    const toggleListen = () => {
        if (!recognitionRef.current) {
            toast({ title: "Voice Input Not Supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (e) {
                 console.error("Error starting recognition:", e);
                 toast({ title: "Voice Error", description: "Could not start voice recognition. Please check microphone permissions.", variant: "destructive" });
            }
        }
    };

    const handleVoiceInput = async (text: string) => {
        if (!text) return;
        toast({ title: "Processing voice input...", description: `Recognized: "${text}"`});
        try {
            const input: ProcessVoiceInput = {
                transcribedText: text,
                currentDate: formatISO(new Date()),
            };
            const result = await processVoiceInput(input);
            // Determine action based on intent
            let actionDescription = result.responseText;
            if (result.intent === 'log_activity' && result.extractedDetails?.title) {
                actionDescription = `Logged activity: "${result.extractedDetails.title}".`;
                // Consider actually adding the log via service if desired here
            } else if (result.intent === 'create_task' && result.extractedDetails?.title) {
                actionDescription = `Created task: "${result.extractedDetails.title}".`;
                // Consider actually adding task
            } else if (result.intent === 'create_note' && result.extractedDetails?.title) {
                actionDescription = `Created note: "${result.extractedDetails.title}".`;
                // Consider actually adding note
            }

            toast({
                title: `Voice Command: ${result.intent.replace(/_/g, ' ')}`,
                description: actionDescription,
                duration: 7000,
            });

        } catch (error) {
            console.error("Error processing voice input with AI:", error);
            if (error instanceof Error && error.message.includes("503")) {
                 toast({ title: "AI Service Unavailable", description: "Could not process voice command, the AI service is temporarily overloaded.", variant: "destructive", duration: 7000 });
            } else {
                toast({ title: "AI Processing Error", description: "Could not process your voice command.", variant: "destructive" });
            }
        }
    };
    
    const showFocusShieldAlert = neuroSettings.enabled && neuroSettings.focusShieldEnabled && burnoutData && (burnoutData.riskLevel === 'High' || burnoutData.riskLevel === 'Very High');

  return (
    <div className={cn("flex flex-col gap-8", neuroSettings.enabled && neuroSettings.lowStimulationUI && "filter grayscale contrast-75")}>
        <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2 flex flex-col gap-8">
                 <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

                {isLoadingBurnout && neuroSettings.enabled && neuroSettings.focusShieldEnabled && (
                    <Alert variant="default" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700">
                        <Loader2 className="h-4 w-4 animate-spin text-yellow-600 dark:text-yellow-400" />
                        <AlertTitle className="text-yellow-700 dark:text-yellow-300">Focus Shield</AlertTitle>
                        <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                            Assessing burnout risk for Focus Shield...
                        </AlertDescription>
                    </Alert>
                )}
                {showFocusShieldAlert && burnoutData && (
                    <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700">
                        <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertTitle className="text-yellow-700 dark:text-yellow-300">Focus Shield Activated ({burnoutData.riskLevel} Risk)</AlertTitle>
                        <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                            Cognitive load seems high. Some non-essential dashboard cards are de-emphasized to help you focus. Consider a wellness activity.
                        </AlertDescription>
                    </Alert>
                )}

                 <Card className="shadow-lg border-primary/20">
                     <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                             <BrainCircuit className="h-5 w-5 text-primary" /> Today's Suggested Plan
                         </CardTitle>
                         <CardDescription>AI-suggested plan based on your schedule, tasks, and recent activity, guided by your AI preferences.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         {isLoadingPlan ? (
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-3/4 rounded-md"/>
                                <Skeleton className="h-4 w-1/2 rounded-md"/>
                                <Skeleton className="h-4 w-2/3 rounded-md"/>
                                <Skeleton className="h-4 w-3/4 rounded-md"/>
                            </div>
                         ) : dailyPlan && dailyPlan.suggestedPlan.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold italic text-primary/90">{dailyPlan.planRationale}</p>
                                {dailyPlan.warnings && dailyPlan.warnings.length > 0 && (
                                     <Alert variant="destructive" className="py-2 px-3 text-xs">
                                        <AlertCircle className="h-3 w-3" />
                                        <AlertTitle className="text-xs font-medium">Plan Warnings</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc list-inside">
                                                {dailyPlan.warnings.map((w, i) => <li key={`warn-${i}`}>{w}</li>)}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <ul className="list-none space-y-2 pt-2">
                                     {dailyPlan.suggestedPlan.map((block, i) => (
                                         <li key={`plan-${i}`} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm p-2 border-l-2 border-primary/40 bg-background/60 rounded-r-md">
                                             <span className="font-semibold w-full sm:w-28 flex-shrink-0 text-primary">
                                                 {block.startTime} {block.endTime ? `- ${block.endTime}` : ''}
                                             </span>
                                             <div className="flex-grow">
                                                 <span>{block.activity}</span>
                                                 <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground ml-1.5">{block.category}</span>
                                                 {block.reasoning && <p className="text-xs text-muted-foreground italic mt-0.5">({block.reasoning})</p>}
                                             </div>
                                         </li>
                                     ))}
                                </ul>
                            </div>
                         ) : (
                             <p className="text-sm text-muted-foreground">No suggested plan available. Try adding some logs, tasks, or events!</p>
                         )}
                     </CardContent>
                 </Card>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <DashboardCard title="Daily Log" icon={Activity} description="Log activities, mood & focus." href="/daily-log" data-ai-hint="journal writing" />
                    <DashboardCard title="Tasks" icon={ListChecks} description="Manage your to-do list." href="/tasks" data-ai-hint="task checklist" />
                    <DashboardCard title="Goals & Habits" icon={Target} description="Track goals and build habits." href="/goals-habits" data-ai-hint="target goal" />
                    <DashboardCard title="Reminders" icon={StickyNote} description="Set and view reminders." href="/reminders" isShielded={showFocusShieldAlert} data-ai-hint="reminder notification" />
                    <DashboardCard title="Calendar" icon={Calendar} description="View your schedule." href="/calendar" data-ai-hint="calendar schedule" />
                    <DashboardCard title="Expenses" icon={CreditCard} description="Track your spending." href="/expenses" isShielded={showFocusShieldAlert} data-ai-hint="finance money" />
                    <DashboardCard title="Notes" icon={StickyNote} description="Take and organize notes." href="/notes" isShielded={showFocusShieldAlert} data-ai-hint="notebook ideas" />
                    <DashboardCard title="Wellness" icon={Smile} description="Access self-care tools." href="/wellness" data-ai-hint="meditation yoga" />
                    <DashboardCard title="Settings" icon={Settings} description="Customize your experience." href="/settings" data-ai-hint="settings gear" />
                </div>
            </div>

             <div className="lg:col-span-1 flex flex-col gap-6 pt-12 lg:pt-[68px]">
                  <DashboardCardLarge title="Insights" icon={Lightbulb} description="Get AI-powered personal insights." href="/insights" isShielded={showFocusShieldAlert} data-ai-hint="analytics chart" />
                  <DashboardCardLarge title="Visualizations" icon={PieChart} description="See charts and graphs of your data." href="/visualizations" isShielded={showFocusShieldAlert} data-ai-hint="data graph" />
                 
                  <Card className="bg-card hover:shadow-xl transition-shadow duration-300">
                     <CardHeader className="pb-3">
                         <CardTitle className="text-base font-semibold flex items-center gap-2">
                             <Mic className="h-5 w-5 text-primary"/>
                             AI Voice Companion
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                         <Button onClick={toggleListen} variant={isListening ? "destructive" : "outline"} className="w-full">
                             {isListening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                             {isListening ? 'Listening...' : 'Start Voice Input'}
                         </Button>
                         {interimTranscript && !finalTranscript && <p className="text-xs text-muted-foreground italic">Listening: {interimTranscript}</p>}
                         {voiceError && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3"/> {voiceError}</p>}
                         {!isListening && !voiceError && !interimTranscript && !finalTranscript && <p className="text-sm text-muted-foreground">Speak your thoughts, logs, or tasks.</p>}
                     </CardContent>
                 </Card>
            </div>
        </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  icon: React.ElementType;
  description: string;
  href: string;
  isShielded?: boolean;
  "data-ai-hint"?: string;
}

function DashboardCard({ title, icon: Icon, description, href, isShielded, "data-ai-hint": aiHint }: DashboardCardProps) {
  const cardContent = (
    <Card 
      className={cn(
        "hover:shadow-lg transition-shadow duration-300 h-full",
        isShielded 
          ? "opacity-60 pointer-events-none cursor-not-allowed bg-muted/50 border-muted/30 hover:shadow-none" 
          : "cursor-pointer hover:border-primary/30 bg-card"
      )}
      aria-disabled={isShielded}
      data-ai-hint={aiHint} // Pass data-ai-hint to the Card
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (isShielded) {
    return <div className="block h-full">{cardContent}</div>;
  }

  return (
    <Link href={href} className="block h-full">
      {cardContent}
    </Link>
  );
}

function DashboardCardLarge({ title, icon: Icon, description, href, isShielded, "data-ai-hint": aiHint }: DashboardCardProps) {
  const cardContent = (
    <Card 
      className={cn(
        "hover:shadow-xl transition-shadow duration-300 h-full",
        isShielded 
          ? "opacity-60 pointer-events-none cursor-not-allowed bg-muted/50 border-muted/30 hover:shadow-none" 
          : "cursor-pointer hover:border-primary/40 bg-card"
      )}
      aria-disabled={isShielded}
      data-ai-hint={aiHint} // Pass data-ai-hint to the Card
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
           <Icon className="h-5 w-5 text-primary" />
           {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (isShielded) {
    return <div className="block h-full">{cardContent}</div>;
  }
  
  return (
    <Link href={href} className="block h-full">
       {cardContent}
    </Link>
  );
}

// Placeholder for an image, replace with next/image if used
const ImagePlaceholder: React.FC<{ src: string; alt: string; width: number; height: number, 'data-ai-hint'?: string }> = ({ src, alt, width, height, ...props }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} width={width} height={height} className="rounded-md object-cover" {...props} />
);
    
