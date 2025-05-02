'use client'; // Need client component for useEffect and state

import React, { useState, useEffect } from 'react'; // Import hooks
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Calendar, CheckSquare, CreditCard, Lightbulb, ListChecks, PieChart, Settings, Smile, StickyNote, Target, TrendingUp, Zap, BrainCircuit, Loader2 } from 'lucide-react'; // Added BrainCircuit, Loader2
import Link from 'next/link';

import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Import AI Flow and services
import { generateDailyPlan, GenerateDailyPlanInput, GenerateDailyPlanOutput } from '@/ai/flows/generate-daily-plan';
import { getDailyLogs, type LogEntry } from '@/services/daily-log';
import { getTasks, type Task } from '@/services/task';
import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';
import { getGoals, type Goal } from '@/services/goal';
import { getHabits, type Habit } from '@/services/habit';
import { formatISO, startOfDay, endOfDay, subDays, format } from 'date-fns'; // Import date functions

export default function Home() {
    const [dailyPlan, setDailyPlan] = useState<GenerateDailyPlanOutput | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const { dataMode } = useDataMode();
    const { toast } = useToast();

     useEffect(() => {
        const fetchDailyPlan = async () => {
            setIsLoadingPlan(true);
            try {
                const today = new Date();
                const startDate = startOfDay(subDays(today, 2)); // Look back 2 days for context
                const endDate = endOfDay(today); // Plan for today

                // Fetch necessary data
                const [logs, tasks, events, goals, habits] = await Promise.all([
                    getDailyLogs(dataMode).then(d => d.filter(l => l.date >= startDate && l.date <= endDate)),
                    getTasks(dataMode).then(t => t.filter(task => task.dueDate && task.dueDate >= startOfDay(today) && task.dueDate <= endOfDay(today) || task.status !== 'Completed')), // Tasks due today or pending/in progress
                    getCalendarEvents(dataMode).then(e => e.filter(ev => ev.start >= startOfDay(today) && ev.start <= endOfDay(today))), // Events today
                    getGoals(dataMode).then(g => g.filter(goal => goal.status === 'In Progress')),
                    getHabits(dataMode), // Fetch all habits
                ]);

                 // Helper to format data for flows
                 const formatForFlow = <T extends Record<string, any>>(items: T[], dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate', 'lastCompleted', 'targetDate']): any[] => {
                    return items.map(item => {
                        const newItem: Record<string, any> = { ...item };
                        dateKeys.forEach(key => {
                            // Check if the key exists and the value is a Date object
                            if (item[key] && item[key] instanceof Date) {
                                newItem[key] = formatISO(item[key]);
                            } else if (item[key] === undefined || item[key] === null) {
                                // Explicitly handle undefined/null if necessary, or let it pass through
                                // newItem[key] = undefined; // Or handle as needed
                            }
                        });
                        return newItem;
                    });
                };


                 const input: GenerateDailyPlanInput = {
                     targetDate: formatISO(today),
                     recentLogs: formatForFlow(logs, ['date']),
                     tasksForDate: formatForFlow(tasks, ['createdAt', 'dueDate']),
                     eventsForDate: formatForFlow(events, ['start', 'end']),
                     activeGoals: formatForFlow(goals, ['createdAt', 'updatedAt', 'targetDate']),
                     activeHabits: formatForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                     // TODO: Fetch user preferences if implemented
                 };


                const result = await generateDailyPlan(input);
                setDailyPlan(result);

            } catch (error) {
                console.error("Failed to generate daily plan:", error);
                toast({ title: "Error", description: "Could not load daily plan suggestions.", variant: "destructive" });
                setDailyPlan(null);
            } finally {
                setIsLoadingPlan(false);
            }
        };

        fetchDailyPlan();
    }, [dataMode, toast]);


  return (
    <div className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-3">
             {/* Main Dashboard Area */}
             <div className="lg:col-span-2 flex flex-col gap-8">
                 <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

                 {/* Daily Plan Card - Replaces Today's Outlook */}
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


                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"> {/* Nested grid for other cards */}
                    <DashboardCard
                        title="Daily Log"
                        icon={Activity}
                        description="Log activities, mood & reflections."
                        href="/daily-log"
                    />
                    <DashboardCard
                        title="Tasks"
                        icon={ListChecks}
                        description="Manage your to-do list."
                        href="/tasks"
                    />
                     <DashboardCard
                        title="Goals & Habits"
                        icon={Target}
                        description="Track goals and build habits."
                        href="/goals-habits"
                    />
                    <DashboardCard
                        title="Reminders"
                        icon={StickyNote}
                        description="Set and view reminders."
                        href="/reminders"
                    />
                    <DashboardCard
                        title="Calendar"
                        icon={Calendar}
                        description="View your schedule."
                        href="/calendar"
                    />
                    <DashboardCard
                        title="Expenses"
                        icon={CreditCard}
                        description="Track your spending."
                        href="/expenses"
                    />
                     <DashboardCard
                        title="Notes"
                        icon={StickyNote}
                        description="Take and organize notes."
                        href="/notes"
                    />
                    <DashboardCard
                        title="Wellness"
                        icon={Smile}
                        description="Access self-care tools."
                        href="/wellness"
                    />
                     <DashboardCard
                        title="Settings"
                        icon={Settings}
                        description="Customize your experience."
                        href="/settings"
                    />
                </div>
            </div>

             {/* Sidebar-like area for Insights & Visualizations */}
             <div className="lg:col-span-1 flex flex-col gap-6 pt-12 lg:pt-[68px]"> {/* Adjust top padding */}
                  <DashboardCardLarge
                    title="Insights"
                    icon={Lightbulb}
                    description="Get AI-powered personal insights on productivity, mood, spending, and more."
                    href="/insights"
                  />
                 <DashboardCardLarge
                   title="Visualizations"
                   icon={PieChart}
                   description="See charts and graphs of your data trends over time."
                   href="/visualizations"
                 />
                 {/* Add other key stats or quick actions here */}
                 {/* Placeholder for Voice Companion Button */}
                  <Card className="hover:shadow-xl transition-shadow duration-300 h-full bg-card opacity-50 cursor-not-allowed">
                     <CardHeader className="pb-3">
                         <CardTitle className="text-base font-semibold flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic text-primary"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                             Voice Companion
                         </CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p className="text-sm text-muted-foreground">Speak your thoughts, logs, or tasks (Coming Soon).</p>
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
}

function DashboardCard({ title, icon: Icon, description, href }: DashboardCardProps) {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// Larger card variant for sidebar-like area
function DashboardCardLarge({ title, icon: Icon, description, href }: DashboardCardProps) {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full hover:border-primary/40 bg-card">
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
    </Link>
  );
}
