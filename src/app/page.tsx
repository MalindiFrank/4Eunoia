
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, Calendar, ListChecks, CreditCard, Lightbulb, PieChart, Settings, Smile, StickyNote, Target, BrainCircuit, Loader2, Mic, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { useDataMode } from '@/context/data-mode-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { generateDailyPlan, type GenerateDailyPlanInput, type GenerateDailyPlanOutput } from '@/ai/flows/generate-daily-plan';
import { processVoiceInput, type ProcessVoiceInput, type ProcessedVoiceOutput } from '@/ai/flows/process-voice-input';
import type { EstimateBurnoutRiskOutput } from '@/ai/flows/estimate-burnout-risk'; // For Digital Dopamine
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

    // Settings for AI and Digital Dopamine
    const [aiPreferences, setAiPreferences] = useState({ persona: 'Supportive Coach', verbosity: 'Detailed Analysis', energyPattern: 'Steady throughout day' });
    const [neuroSettings, setNeuroSettings] = useState({ focusShieldEnabled: false });
    const [burnoutRisk, setBurnoutRisk] = useState<EstimateBurnoutRiskOutput | null>(null); // Assuming this is fetched elsewhere or mock

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const storedSettings = localStorage.getItem('4eunoia-app-settings');
        if (storedSettings) {
          try {
            const parsed = JSON.parse(storedSettings);
            if (parsed.preferences) {
              setAiPreferences(prev => ({
                ...prev,
                persona: parsed.preferences.aiPersona || prev.persona,
                verbosity: parsed.preferences.aiInsightVerbosity || prev.verbosity,
                energyPattern: parsed.preferences.energyPattern || prev.energyPattern,
              }));
            }
            if (parsed.neurodivergent) {
              setNeuroSettings(prev => ({
                ...prev,
                focusShieldEnabled: parsed.neurodivergent.focusShieldEnabled || false,
              }));
            }
          } catch (e) {
            console.error("Error loading settings for Home page:", e);
          }
        }
        // Placeholder for fetching burnout risk data - in a real app, this would be fetched from Insights or a dedicated service
        // For now, we'll simulate it if focus shield is enabled to show the effect.
        if (neuroSettings.focusShieldEnabled) {
             // Simulate high burnout for demo
             // setBurnoutRisk({ riskLevel: 'High', riskScore: 75, assessmentSummary: "Simulated high risk", contributingFactors: [], recommendations: [] });
        }
      }
    }, [neuroSettings.focusShieldEnabled]); // Rerun if focus shield setting changes

    const fetchDailyPlan = useCallback(async () => {
        setIsLoadingPlan(true);
        try {
            const today = new Date();
            const startDate = startOfDay(subDays(today, 2));
            const endDate = endOfDay(today);

            const [logs, tasks, events, goals, habits] = await Promise.all([
                getDailyLogs(dataMode).then(d => d.filter(l => l.date >= startDate && l.date <= endDate)),
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
                userPreferences: { // Pass AI preferences
                    aiPersona: aiPreferences.persona as any, // Cast as Flow type might be different
                    aiInsightVerbosity: aiPreferences.verbosity as any,
                    energyLevelPattern: aiPreferences.energyPattern,
                    growthPace: 'Moderate', // Assuming default or fetch from settings
                }
            };

            const result = await generateDailyPlan(planInput);
            setDailyPlan(result);
        } catch (error) {
            console.error("Failed to generate daily plan:", error);
            toast({ title: "Error", description: "Could not load daily plan suggestions.", variant: "destructive" });
            setDailyPlan(null);
        } finally {
            setIsLoadingPlan(false);
        }
    }, [dataMode, toast, aiPreferences]);

    useEffect(() => {
        fetchDailyPlan();
    }, [fetchDailyPlan]);

    // Voice Input Logic
    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
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
                setFinalTranscript(final); // Store final as it comes
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setVoiceError(event.error === 'no-speech' ? 'No speech detected.' : event.error === 'network' ? 'Network error for speech service.' : 'Speech recognition error.');
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
      // Process final transcript when listening stops and there's a final transcript
      if (!isListening && finalTranscript.trim()) {
        handleVoiceInput(finalTranscript.trim());
        setFinalTranscript(''); // Clear after processing
      }
    }, [isListening, finalTranscript]);

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
                 toast({ title: "Voice Error", description: "Could not start voice recognition.", variant: "destructive" });
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
            toast({
                title: `Voice Command: ${result.intent.replace(/_/g, ' ')}`,
                description: `${result.responseText} ${result.extractedDetails?.title ? `(Details: ${result.extractedDetails.title})` : ''}`,
                duration: 7000,
            });
            // TODO: Further action based on result.intent and result.extractedDetails
            // e.g., router.push(`/daily-log?prefill_activity=${result.extractedDetails.title}`);
        } catch (error) {
            console.error("Error processing voice input with AI:", error);
            toast({ title: "AI Processing Error", description: "Could not process your voice command.", variant: "destructive" });
        }
    };
    
    const showFocusShieldAlert = neuroSettings.focusShieldEnabled && burnoutRisk && (burnoutRisk.riskLevel === 'High' || burnoutRisk.riskLevel === 'Very High');

  return (
    <div className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2 flex flex-col gap-8">
                 <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

                {showFocusShieldAlert && (
                    <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700">
                        <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertTitle className="text-yellow-700 dark:text-yellow-300">Focus Shield Suggestion</AlertTitle>
                        <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                            Your recent patterns suggest a high cognitive load. Consider taking a short break or engaging in a wellness activity. Some features might be less prominent to help you focus.
                        </AlertDescription>
                    </Alert>
                )}

                 <Card className="shadow-lg border-primary/20">
                     <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                             <BrainCircuit className="h-5 w-5 text-primary" /> Today's Suggested Plan
                         </CardTitle>
                         <CardDescription>An AI-suggested plan based on your schedule, tasks, and recent activity.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         {isLoadingPlan ? (
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-3/4"/>
                                <Skeleton className="h-4 w-1/2"/>
                                <Skeleton className="h-4 w-2/3"/>
                                <Skeleton className="h-4 w-3/4"/>
                            </div>
                         ) : dailyPlan && dailyPlan.suggestedPlan.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold italic text-primary/90">{dailyPlan.planRationale}</p>
                                {dailyPlan.warnings && dailyPlan.warnings.length > 0 && (
                                    <ul className="text-xs text-destructive list-disc list-inside">
                                        {dailyPlan.warnings.map((w, i) => <li key={`warn-${i}`}>{w}</li>)}
                                    </ul>
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
                    <DashboardCard title="Daily Log" icon={Activity} description="Log activities, mood & reflections." href="/daily-log" isShielded={showFocusShieldAlert} />
                    <DashboardCard title="Tasks" icon={ListChecks} description="Manage your to-do list." href="/tasks" />
                    <DashboardCard title="Goals & Habits" icon={Target} description="Track goals and build habits." href="/goals-habits" />
                    <DashboardCard title="Reminders" icon={StickyNote} description="Set and view reminders." href="/reminders" isShielded={showFocusShieldAlert} />
                    <DashboardCard title="Calendar" icon={Calendar} description="View your schedule." href="/calendar" />
                    <DashboardCard title="Expenses" icon={CreditCard} description="Track your spending." href="/expenses" isShielded={showFocusShieldAlert} />
                    <DashboardCard title="Notes" icon={StickyNote} description="Take and organize notes." href="/notes" isShielded={showFocusShieldAlert} />
                    <DashboardCard title="Wellness" icon={Smile} description="Access self-care tools." href="/wellness" />
                    <DashboardCard title="Settings" icon={Settings} description="Customize your experience." href="/settings" />
                </div>
            </div>

             <div className="lg:col-span-1 flex flex-col gap-6 pt-12 lg:pt-[68px]">
                  <DashboardCardLarge title="Insights" icon={Lightbulb} description="Get AI-powered personal insights." href="/insights" isShielded={showFocusShieldAlert} />
                  <DashboardCardLarge title="Visualizations" icon={PieChart} description="See charts and graphs of your data." href="/visualizations" isShielded={showFocusShieldAlert} />
                 
                  <Card className="bg-card hover:shadow-xl transition-shadow duration-300">
                     <CardHeader className="pb-3">
                         <CardTitle className="text-base font-semibold flex items-center gap-2">
                             <Mic className="h-5 w-5 text-primary"/>
                             Voice Companion
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                         <Button onClick={toggleListen} variant={isListening ? "destructive" : "outline"} className="w-full">
                             {isListening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                             {isListening ? 'Listening...' : 'Start Voice Input'}
                         </Button>
                         {interimTranscript && <p className="text-xs text-muted-foreground italic">Listening: {interimTranscript}</p>}
                         {voiceError && <p className="text-xs text-destructive">{voiceError}</p>}
                         <p className="text-sm text-muted-foreground">Speak your thoughts, logs, or tasks.</p>
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
  isShielded?: boolean; // For Digital Dopamine Manager
}

function DashboardCard({ title, icon: Icon, description, href, isShielded }: DashboardCardProps) {
  return (
    <Link href={href} passHref legacyBehavior={isShielded}>
      <a className={cn("block h-full", isShielded && "opacity-60 pointer-events-none cursor-not-allowed")}>
        <Card className={cn(
            "hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full hover:border-primary/30",
            isShielded && "bg-muted/50 border-muted/30 hover:shadow-none"
          )}
          aria-disabled={isShielded}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}

function DashboardCardLarge({ title, icon: Icon, description, href, isShielded }: DashboardCardProps) {
  return (
    <Link href={href} passHref legacyBehavior={isShielded}>
      <a className={cn("block h-full", isShielded && "opacity-60 pointer-events-none cursor-not-allowed")}>
        <Card className={cn(
            "hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full hover:border-primary/40 bg-card",
             isShielded && "bg-muted/50 border-muted/30 hover:shadow-none"
          )}
          aria-disabled={isShielded}
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
      </a>
    </Link>
  );
}

// Placeholder for an image, replace with next/image if used
const ImagePlaceholder: React.FC<{ src: string; alt: string; width: number; height: number, 'data-ai-hint'?: string }> = ({ src, alt, width, height, ...props }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} width={width} height={height} className="rounded-md object-cover" {...props} />
);
    