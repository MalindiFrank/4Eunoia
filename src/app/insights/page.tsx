
'use client';

import type { FC } from 'react';
import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, formatISO, parseISO, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval, isValid as isValidDate } from 'date-fns';
import { Lightbulb, BrainCircuit, Calendar as CalendarIcon, Activity, BarChartHorizontalBig, Wallet, ListTodo, AlertCircle, Smile, Scale, Flame, Zap, Loader2, Map, Mic, Eye, SlidersHorizontal, Send, UserCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';


import {
  analyzeProductivityPatterns,
  type AnalyzeProductivityPatternsInput,
  type AnalyzeProductivityPatternsOutput,
} from '@/ai/flows/analyze-productivity-patterns';
import {
  summarizeDiaryEntries,
  type SummarizeDiaryEntriesInput,
  type SummarizeDiaryEntriesOutput
} from '@/ai/flows/summarize-diary-entries';
import {
  analyzeExpenseTrends,
  type AnalyzeExpenseTrendsInput,
  type AnalyzeExpenseTrendsOutput,
} from '@/ai/flows/analyze-expense-trends';
import {
  analyzeTaskCompletion,
  type AnalyzeTaskCompletionInput,
  type AnalyzeTaskCompletionOutput,
} from '@/ai/flows/analyze-task-completion';
import {
    analyzeSentimentTrends,
    type AnalyzeSentimentTrendsInput,
    type AnalyzeSentimentTrendsOutput,
} from '@/ai/flows/analyze-sentiment-trends';
import {
    assessLifeBalance,
    type AssessLifeBalanceInput,
    type AssessLifeBalanceOutput,
} from '@/ai/flows/assess-life-balance';
import {
    estimateBurnoutRisk,
    type EstimateBurnoutRiskInput,
    type EstimateBurnoutRiskOutput,
} from '@/ai/flows/estimate-burnout-risk';
import { reflectOnWeek, type ReflectOnWeekInput, type ReflectOnWeekOutput } from '@/ai/flows/reflect-on-week';
import { generateDailySuggestions, type GenerateDailySuggestionsInput, type GenerateDailySuggestionsOutput } from '@/ai/flows/generate-daily-suggestions';
import { generateDailyPlan, type GenerateDailyPlanInput, type GenerateDailyPlanOutput, type UserPreferences } from '@/ai/flows/generate-daily-plan';
import { analyzeAttentionPatterns, type AnalyzeAttentionPatternsInput, type AnalyzeAttentionPatternsOutput } from '@/ai/flows/analyze-attention-patterns';


import { getTasks, type Task } from '@/services/task';
import { getDailyLogs, type LogEntry } from '@/services/daily-log';
import { getExpenses, type Expense } from '@/services/expense';
import { getNotes, type Note } from '@/services/note';
import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';
import { getGoals, type Goal } from '@/services/goal';
import { getHabits, type Habit } from '@/services/habit';
import { useAuth } from '@/context/auth-context';
import { SETTINGS_STORAGE_KEY } from '@/lib/theme-utils';


type DisplayTask = AnalyzeTaskCompletionOutput['overdueTasks'][number];

type InsightType = 'productivity' | 'diarySummary' | 'expenseTrends' | 'taskCompletion' | 'sentimentAnalysis' | 'lifeBalance' | 'burnoutRisk' | 'attentionPatterns';
type AIServiceType = InsightType | 'reflection' | 'dailySuggestion' | 'dailyPlan';


const insightsRequestSchema = z.object({
  insightType: z.enum(['productivity', 'diarySummary', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailySuggestion', 'dailyPlan', 'attentionPatterns']),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
}).refine(data => {
    const requiresDateRange: AIServiceType[] = ['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan', 'diarySummary', 'attentionPatterns'];
    if (requiresDateRange.includes(data.insightType) && (!data.startDate || !data.endDate || !isValidDate(data.startDate) || !isValidDate(data.endDate))) {
        return false;
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Valid date range required for this insight. End date cannot be before start date.",
    path: ["startDate"],
});

type InsightsRequestFormValues = z.infer<typeof insightsRequestSchema>;

const safeFormatISO = (date: Date | string | null | undefined): string | undefined | null => {
    if (date instanceof Date && isValidDate(date)) {
        return formatISO(date);
    }
    if (typeof date === 'string') {
        try {
            const parsedDate = parseISO(date);
            if (isValidDate(parsedDate)) {
                return formatISO(parsedDate);
            }
        } catch { /* Ignore parsing errors */ }
    }
    return date === null ? null : undefined;
};


const formatArrayForFlow = <T extends Record<string, any>>(
    items: T[] | undefined | null,
    dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate', 'lastCompleted', 'targetDate']
): any[] | undefined => {
    if (!items) return undefined;
    return items.map(item => {
        const newItem: Record<string, any> = { ...item };
        dateKeys.forEach(key => {
            if (key in item) {
                newItem[key] = safeFormatISO(item[key]);
            }
        });
        return newItem;
    });
};

const InsightsPageSkeleton: FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <Skeleton className="h-10 w-3/4 mb-6 rounded-md" />
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/2 rounded-md" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-3/4 rounded-md mt-1" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-full rounded-md" />
          <Skeleton className="h-5 w-5/6 rounded-md" />
          <Skeleton className="h-5 w-2/3 rounded-md" />
          <Skeleton className="h-8 w-1/4 mt-2 rounded-md" />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/2 rounded-md" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-3/4 rounded-md mt-1" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-1/3 rounded-md" />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-1/2 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
};


const InsightsPageClient: FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolParam = searchParams.get('tool') as AIServiceType | null;

  const [productivityInsights, setProductivityInsights] = useState<AnalyzeProductivityPatternsOutput | null>(null);
  const [diarySummary, setDiarySummary] = useState<SummarizeDiaryEntriesOutput | null>(null);
  const [expenseTrends, setExpenseTrends] = useState<AnalyzeExpenseTrendsOutput | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<AnalyzeTaskCompletionOutput | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<AnalyzeSentimentTrendsOutput | null>(null);
  const [lifeBalance, setLifeBalance] = useState<AssessLifeBalanceOutput | null>(null);
  const [burnoutRisk, setBurnoutRisk] = useState<EstimateBurnoutRiskOutput | null>(null);
  const [reflectionState, setReflectionState] = useState<{ conversation: { questions: string[], responses: string[] }, output: ReflectOnWeekOutput | null }>({ conversation: { questions: [], responses: [] }, output: null });
  const [dailySuggestions, setDailySuggestions] = useState<GenerateDailySuggestionsOutput | null>(null);
  const [dailyPlan, setDailyPlan] = useState<GenerateDailyPlanOutput | null>(null);
  const [attentionPatterns, setAttentionPatterns] = useState<AnalyzeAttentionPatternsOutput | null>(null);
  const [reflectionUserInput, setReflectionUserInput] = useState('');

  const [isLoading, setIsLoading] = useState<boolean | AIServiceType>(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const [aiPreferences, setAiPreferences] = useState<UserPreferences>({
    aiPersona: 'Supportive Coach',
    aiInsightVerbosity: 'Detailed Analysis',
    energyLevelPattern: 'Steady throughout day',
    growthPace: 'Moderate',
    preferredWorkTimes: 'Flexible',
    theme: 'system', 
    defaultView: '/',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          if (parsed.preferences) {
            setAiPreferences(prev => ({
              ...prev,
              aiPersona: parsed.preferences.aiPersona || prev.aiPersona,
              aiInsightVerbosity: parsed.preferences.aiInsightVerbosity || prev.aiInsightVerbosity,
              energyLevelPattern: parsed.preferences.energyPattern || prev.energyLevelPattern, // Corrected key
              growthPace: parsed.preferences.growthPace || prev.growthPace,
              preferredWorkTimes: parsed.preferences.preferredWorkTimes || prev.preferredWorkTimes,
            }));
          }
        } catch (e) {
          console.error("Error loading AI preferences for Insights page:", e);
        }
      }
    }
  }, []);


  const form = useForm<InsightsRequestFormValues>({
    resolver: zodResolver(insightsRequestSchema),
    defaultValues: {
      insightType: 'dailySuggestion', 
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
      frequency: 'weekly',
    },
  });

   const selectedInsightType = form.watch('insightType');


   const fetchDailySuggestions = useCallback(async () => {
        setIsLoading('dailySuggestion');
        try {
             const now = new Date();
             const yesterday = startOfDay(subDays(now, 1));
             const tomorrow = endOfDay(subDays(now, -1)); 
             const todayStart = startOfDay(now);
             const todayEnd = endOfDay(now);

             const [logs, tasks, events, habits, goals] = await Promise.all([
                getDailyLogs().then(d => d.filter(l => l.date >= yesterday)),
                getTasks().then(t => t.filter(task => task.status !== 'Completed' && (!task.dueDate || task.dueDate <= tomorrow))),
                getCalendarEvents().then(e => e.filter(ev => ev.start >= todayStart && ev.start <= todayEnd)),
                getHabits(),
                getGoals().then(g => g.filter(goal => goal.status === 'In Progress')),
             ]);

             const input: GenerateDailySuggestionsInput = {
                 currentDateTime: safeFormatISO(now)!,
                 recentLogs: formatArrayForFlow(logs, ['date']),
                 upcomingTasks: formatArrayForFlow(tasks, ['createdAt', 'dueDate']),
                 todaysEvents: formatArrayForFlow(events, ['start', 'end']),
                 activeHabits: formatArrayForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                 activeGoals: formatArrayForFlow(goals, ['createdAt', 'updatedAt', 'targetDate']),
                 userPreferences: aiPreferences,
             };

             const result = await generateDailySuggestions(input);
             setDailySuggestions(result);

        } catch (error) {
            console.error("Failed to generate daily suggestions:", error);
            let description = "Could not load daily suggestions.";
             if (error instanceof Error) {
                 if (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.toLowerCase().includes("overloaded")) {
                     description = "The AI assistant is temporarily overloaded. Please try again in a few moments.";
                 } else {
                     description = error.message;
                 }
             }
            toast({ title: "Error", description, variant: "destructive", duration: 5000 });
            setDailySuggestions(null);
        } finally {
            setIsLoading(false);
        }
    }, [toast, aiPreferences, user]); // Added user to dependency array

    useEffect(() => {
         if (!authLoading) {
            fetchDailySuggestions();
        }
    }, [fetchDailySuggestions, authLoading]);


   const clearResults = useCallback(() => {
     setProductivityInsights(null);
     setDiarySummary(null);
     setExpenseTrends(null);
     setTaskCompletion(null);
     setSentimentAnalysis(null);
     setLifeBalance(null);
     setBurnoutRisk(null);
     if (selectedInsightType !== 'reflection') {
       setReflectionState({ conversation: { questions: [], responses: [] }, output: null });
     }
     setDailyPlan(null);
     setAttentionPatterns(null);
   }, [selectedInsightType]);

   const onSubmit = useCallback(async (data: InsightsRequestFormValues | { insightType: AIServiceType, startDate?: Date, endDate?: Date }) => {
     setIsLoading(data.insightType);
      if (!['reflection', 'dailySuggestion'].includes(data.insightType)) {
          clearResults();
      }

     try {
       const { insightType } = data;

       let startDate = 'startDate' in data && data.startDate instanceof Date && isValidDate(data.startDate) ? data.startDate : subDays(new Date(), 7);
       let endDate = 'endDate' in data && data.endDate instanceof Date && isValidDate(data.endDate) ? data.endDate : new Date();
       
       if (insightType === 'reflection') {
           if (!toolParam || toolParam !== 'reflection') { 
                const today = new Date();
                startDate = startOfWeek(subDays(today, 7), { weekStartsOn: 1 }); 
                endDate = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });     
                form.setValue('startDate', startDate);
                form.setValue('endDate', endDate);
           }
       }


       const frequency = 'frequency' in data && data.frequency ? data.frequency : undefined;

        if (!(startDate instanceof Date && isValidDate(startDate)) || !(endDate instanceof Date && isValidDate(endDate))) {
            throw new Error("Invalid date objects provided for insights generation.");
        }
        const dateInput = { startDate: formatISO(startDate), endDate: formatISO(endDate) };

        const requiresLogs = ['productivity', 'diarySummary', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan', 'attentionPatterns'].includes(insightType);
        const requiresTasks = ['productivity', 'taskCompletion', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(insightType);
        const requiresEvents = ['productivity', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(insightType);
        const requiresExpenses = ['expenseTrends', 'lifeBalance'].includes(insightType);
        const requiresNotes = ['productivity', 'sentimentAnalysis'].includes(insightType);
        const requiresGoals = ['lifeBalance', 'reflection', 'dailyPlan'].includes(insightType);
        const requiresHabits = ['lifeBalance', 'reflection', 'dailyPlan'].includes(insightType);

        const fetchDataPromises: Promise<any>[] = [
            requiresLogs ? getDailyLogs() : Promise.resolve([]),
            requiresTasks ? getTasks() : Promise.resolve([]),
            requiresEvents ? getCalendarEvents() : Promise.resolve([]),
            requiresExpenses ? getExpenses() : Promise.resolve([]),
            requiresNotes ? getNotes() : Promise.resolve([]),
            requiresGoals ? getGoals() : Promise.resolve([]),
            requiresHabits ? getHabits() : Promise.resolve([]),
        ];

        const [allLogs, allTasks, allEvents, allExpenses, allNotes, allGoals, allHabits] = await Promise.all(fetchDataPromises);


         const dateRangeFilter = { start: startOfDay(startDate), end: endOfDay(endDate) };
         const filterByDate = <T extends { date?: Date; createdAt?: Date; updatedAt?: Date; start?: Date }>(item: T): boolean => {
             const itemDate = item.date || item.createdAt || item.updatedAt || item.start;
             return itemDate instanceof Date && isValidDate(itemDate) && isWithinInterval(itemDate, dateRangeFilter);
         };

         const logsInRange = requiresLogs ? allLogs.filter(filterByDate) : [];
         const tasksInRange = requiresTasks ? allTasks.filter((task: Task) => {
             const created = task.createdAt;
             const due = task.dueDate;
             const isCreatedInRange = created instanceof Date && isValidDate(created) && isWithinInterval(created, dateRangeFilter);
             const isDueInRange = due instanceof Date && isValidDate(due) && isWithinInterval(due, dateRangeFilter);
             return isCreatedInRange || isDueInRange || task.status !== 'Completed'; 
         }) : [];
         const eventsInRange = requiresEvents ? allEvents.filter(filterByDate) : [];
         const expensesInRange = requiresExpenses ? allExpenses.filter(filterByDate) : [];
         const notesInRange = requiresNotes ? allNotes.filter(filterByDate) : [];
         const goalsInRange = requiresGoals ? allGoals.filter((g: Goal) => g.updatedAt instanceof Date && isValidDate(g.updatedAt) && isWithinInterval(g.updatedAt, dateRangeFilter)) : [];
         const habitsInRange = requiresHabits ? allHabits.filter((h: Habit) => h.updatedAt instanceof Date && isValidDate(h.updatedAt) && isWithinInterval(h.updatedAt, dateRangeFilter)) : [];


        switch (insightType) {
             case 'productivity':
                 const prodInput: AnalyzeProductivityPatternsInput = {
                    ...dateInput,
                    dailyLogs: formatArrayForFlow(logsInRange, ['date']),
                    tasks: formatArrayForFlow(tasksInRange, ['createdAt', 'dueDate']),
                    calendarEvents: formatArrayForFlow(eventsInRange, ['start', 'end']),
                    notes: formatArrayForFlow(notesInRange, ['createdAt', 'updatedAt']),
                    userPreferences: aiPreferences,
                 };
                 const prodResult = await analyzeProductivityPatterns(prodInput);
                 setProductivityInsights(prodResult);
                 break;

             case 'diarySummary':
                  const diaryEntries = logsInRange
                       .filter(l => l.diaryEntry)
                       .map(l => ({ id: l.id, date: safeFormatISO(l.date), text: l.diaryEntry! }))
                       .filter(e => e.date);
                  const effectiveFrequency = frequency ?? 'weekly';
                  const diaryInput: SummarizeDiaryEntriesInput = { frequency: effectiveFrequency, diaryEntries: diaryEntries as any, ...dateInput };
                  const diaryResult = await summarizeDiaryEntries(diaryInput);
                  setDiarySummary(diaryResult);
                  break;

             case 'expenseTrends':
                 const expenseInput: AnalyzeExpenseTrendsInput = { ...dateInput, expenses: formatArrayForFlow(expensesInRange, ['date']) ?? [] };
                 const expenseResult = await analyzeExpenseTrends(expenseInput);
                 setExpenseTrends(expenseResult);
                 break;

             case 'taskCompletion':
                 const taskInput: AnalyzeTaskCompletionInput = { ...dateInput, tasks: formatArrayForFlow(allTasks, ['createdAt', 'dueDate']) ?? [] };
                 const taskResult = await analyzeTaskCompletion(taskInput);
                 setTaskCompletion(taskResult);
                 break;

             case 'sentimentAnalysis':
                  const diaryTexts = logsInRange.filter(l => l.diaryEntry).map(l => ({ id: l.id, date: safeFormatISO(l.date), text: l.diaryEntry!, source: 'diary' as const }));
                  const noteTexts = notesInRange.map(n => ({ id: n.id, date: safeFormatISO(n.createdAt), text: n.content, source: 'note' as const }));
                  const validTexts = [...diaryTexts, ...noteTexts].filter(t => t.date);
                  const sentimentInput: AnalyzeSentimentTrendsInput = { ...dateInput, textEntries: validTexts as any };
                  const sentimentResult = await analyzeSentimentTrends(sentimentInput);
                  setSentimentAnalysis(sentimentResult);
                  break;

             case 'lifeBalance':
                  const balanceInput: AssessLifeBalanceInput = {
                     ...dateInput,
                     dailyLogs: formatArrayForFlow(logsInRange, ['date']),
                     tasks: formatArrayForFlow(tasksInRange, ['createdAt', 'dueDate']),
                     calendarEvents: formatArrayForFlow(eventsInRange, ['start', 'end']),
                     expenses: formatArrayForFlow(expensesInRange, ['date']),
                     habits: formatArrayForFlow(habitsInRange, ['createdAt', 'updatedAt', 'lastCompleted']),
                     goals: formatArrayForFlow(goalsInRange, ['createdAt', 'updatedAt', 'targetDate']),
                  };
                  const balanceResult = await assessLifeBalance(balanceInput);
                  setLifeBalance(balanceResult);
                  break;

             case 'burnoutRisk':
                  const burnoutInput: EstimateBurnoutRiskInput = {
                     ...dateInput,
                     dailyLogs: formatArrayForFlow(logsInRange, ['date']),
                     tasks: formatArrayForFlow(allTasks, ['createdAt', 'dueDate']),
                     calendarEvents: formatArrayForFlow(eventsInRange, ['start', 'end']),
                  };
                  const burnoutResult = await estimateBurnoutRisk(burnoutInput);
                  setBurnoutRisk(burnoutResult);
                  break;
            
             case 'attentionPatterns':
                const attentionInput: AnalyzeAttentionPatternsInput = {
                    ...dateInput,
                    dailyLogs: formatArrayForFlow(logsInRange, ['date']) ?? [],
                };
                const attentionResult = await analyzeAttentionPatterns(attentionInput);
                setAttentionPatterns(attentionResult);
                break;

              case 'reflection':
                  const reflectionInput: ReflectOnWeekInput = {
                     ...dateInput,
                     logs: formatArrayForFlow(logsInRange, ['date']),
                     tasks: formatArrayForFlow(tasksInRange, ['createdAt', 'dueDate']),
                     goals: formatArrayForFlow(goalsInRange, ['createdAt', 'updatedAt', 'targetDate']),
                     habits: formatArrayForFlow(habitsInRange, ['createdAt', 'updatedAt', 'lastCompleted']),
                      previousReflection: reflectionState.output ? {
                          questionsAsked: [...reflectionState.conversation.questions, reflectionState.output.coachPrompt].slice(-5), 
                          userResponses: [...reflectionState.conversation.responses, reflectionUserInput].slice(-5), 
                          aiSummary: reflectionState.output.observation,
                      } : undefined,
                      userResponse: reflectionUserInput || undefined,
                      userPreferences: aiPreferences,
                  };
                  const reflectionResult = await reflectOnWeek(reflectionInput);
                  setReflectionState(prev => ({
                     conversation: {
                         questions: [...prev.conversation.questions, prev.output?.coachPrompt || (prev.conversation.questions.length === 0 ? reflectionResult.coachPrompt : "")].filter(q=>q),
                         responses: [...prev.conversation.responses, reflectionUserInput].filter(r=>r),
                     },
                     output: reflectionResult,
                 }));
                 setReflectionUserInput(''); 
                 break;

             case 'dailySuggestion':
                 await fetchDailySuggestions();
                 break;

             case 'dailyPlan':
                const targetDate = startDate; 
                const planContextStart = startOfDay(subDays(targetDate, 2)); 
                const planContextEnd = endOfDay(targetDate);
                const targetDayStart = startOfDay(targetDate);
                const targetDayEnd = endOfDay(targetDate);

                const logsForPlan = allLogs.filter((l: LogEntry) => l.date >= planContextStart && l.date <= planContextEnd);
                const tasksForPlan = allTasks.filter((task: Task) => (task.dueDate && task.dueDate >= targetDayStart && task.dueDate <= targetDayEnd) || task.status !== 'Completed');
                const eventsForPlan = allEvents.filter((ev: CalendarEvent) => ev.start >= targetDayStart && ev.start <= targetDayEnd);
                const activeGoalsPlan = allGoals.filter((goal: Goal) => goal.status === 'In Progress');
                const activeHabitsPlan = allHabits;

                const planInput: GenerateDailyPlanInput = {
                     targetDate: safeFormatISO(targetDate)!,
                     recentLogs: formatArrayForFlow(logsForPlan, ['date']),
                     tasksForDate: formatArrayForFlow(tasksForPlan, ['createdAt', 'dueDate']),
                     eventsForDate: formatArrayForFlow(eventsForPlan, ['start', 'end']),
                     activeGoals: formatArrayForFlow(activeGoalsPlan, ['createdAt', 'updatedAt', 'targetDate']),
                     activeHabits: formatArrayForFlow(activeHabitsPlan, ['createdAt', 'updatedAt', 'lastCompleted']),
                     userPreferences: aiPreferences,
                };
                const planResult = await generateDailyPlan(planInput);
                setDailyPlan(planResult);
                break;


             default:
                 const exhaustiveCheck: never = insightType;
                 throw new Error(`Unhandled insight type: ${exhaustiveCheck}`);
         }

        if (insightType !== 'reflection' && insightType !== 'dailySuggestion') {
           toast({ title: "Insights Generated", description: `Successfully generated ${insightType.replace(/([A-Z])/g, ' $1').trim()} insights.` });
        }

     } catch (error) {
       console.error("Failed to generate insights:", error);
       let description = 'An unknown error occurred. Please try again.';
       if (error instanceof Error) {
           if (error.message.includes("503") || error.message.includes("Service Unavailable") || error.message.toLowerCase().includes("overloaded")) {
               description = "The AI service is temporarily overloaded. Please try again in a few moments.";
           } else if (error.message.includes("Schema validation failed")){
               description = "There was an issue with the data sent to the AI. Please check your inputs or try a different date range.";
           }
            else {
               description = error.message;
           }
       }
       toast({
         title: "Error Generating Insights",
         description: description,
         variant: "destructive",
         duration: 5000,
       });
        if (!['reflection', 'dailySuggestion'].includes(data.insightType)) {
            clearResults();
        } else if (data.insightType === 'dailyPlan') {
            setDailyPlan(null);
        }
     } finally {
       setIsLoading(false);
     }
   }, [toast, reflectionState, reflectionUserInput, clearResults, fetchDailySuggestions, aiPreferences, form, toolParam, user]); // Added user to dependency array


   useEffect(() => {
        if (toolParam && !authLoading) { // Ensure auth state is resolved before processing toolParam
            form.setValue('insightType', toolParam);
            const now = new Date();
            let effectiveStartDate = subDays(now, 7);
            let effectiveEndDate = now;

            if (toolParam === 'reflection') {
                effectiveStartDate = startOfWeek(subDays(now, 7), { weekStartsOn: 1 }); 
                effectiveEndDate = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
            } else if (toolParam === 'dailyPlan') {
                effectiveStartDate = startOfDay(now);
                effectiveEndDate = endOfDay(now);
            } else if (toolParam === 'attentionPatterns') {
                 effectiveStartDate = subDays(now, 7);
                 effectiveEndDate = now;
            }
            
            form.setValue('startDate', effectiveStartDate);
            form.setValue('endDate', effectiveEndDate);
            
            if (toolParam === 'dailySuggestion') {
                fetchDailySuggestions();
            } else {
                 onSubmit({ insightType: toolParam, startDate: effectiveStartDate, endDate: effectiveEndDate });
            }
            router.replace('/insights', { scroll: false });
        }
    }, [toolParam, form, router, onSubmit, fetchDailySuggestions, authLoading]);


    const handleReflectionResponseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reflectionUserInput.trim() || isLoading === 'reflection') return;
        const currentFormValues = form.getValues();
        onSubmit({ 
            insightType: 'reflection', 
            startDate: currentFormValues.startDate, 
            endDate: currentFormValues.endDate 
        });
    };


   const renderDateRangePicker = () => (
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
               control={form.control} name="startDate"
               render={({ field }) => (
                   <FormItem className="flex flex-col">
                       <FormLabel>Start Date</FormLabel>
                       <Popover>
                           <PopoverTrigger asChild>
                               <FormControl>
                                   <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                       {field.value instanceof Date && isValidDate(field.value) ? format(field.value, 'PPP') : <span>Pick start date</span>}
                                       <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                   </Button>
                               </FormControl>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                               <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus />
                           </PopoverContent>
                       </Popover>
                       <FormMessage />
                   </FormItem>
               )}
           />
           <FormField
               control={form.control} name="endDate"
               render={({ field }) => (
                   <FormItem className="flex flex-col">
                       <FormLabel>End Date</FormLabel>
                       <Popover>
                           <PopoverTrigger asChild>
                               <FormControl>
                                   <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                       {field.value instanceof Date && isValidDate(field.value) ? format(field.value, 'PPP') : <span>Pick end date</span>}
                                       <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                   </Button>
                               </FormControl>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                               <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < (form.getValues("startDate") || new Date('1900-01-01'))} initialFocus />
                           </PopoverContent>
                       </Popover>
                       <FormMessage />
                   </FormItem>
               )}
           />
       </div>
   );

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8 text-primary" /> AI Insights & Coaching
        </h1>
         <Alert variant="default" className="w-full sm:w-auto text-xs p-2 bg-accent/50 border-accent">
             <UserCircle className="h-3 w-3" />
             <AlertTitle className="text-xs font-semibold">
                 {authLoading ? "Loading..." : user ? "Cloud Data" : "Local Data"}
             </AlertTitle>
             <AlertDescription>
                 {authLoading ? "Checking auth..." : user ? "Insights from synced data." : "Insights from local data."}
             </AlertDescription>
         </Alert>
      </div>

        <Card className="shadow-md bg-primary/10 border-primary/20">
            <CardHeader>
                 <CardTitle className="text-lg flex items-center gap-2">
                     <Zap className="h-5 w-5 text-primary" /> Daily Suggestions
                 </CardTitle>
                 <CardDescription>Context-aware suggestions for your day, influenced by your AI preferences.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading === 'dailySuggestion' && !dailySuggestions || authLoading && !dailySuggestions ? (
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-3/4 rounded-md"/>
                        <Skeleton className="h-5 w-1/2 rounded-md"/>
                        <Skeleton className="h-5 w-2/3 rounded-md"/>
                    </div>
                ) : dailySuggestions && dailySuggestions.suggestions.length > 0 ? (
                    <div className="space-y-3">
                         {dailySuggestions.dailyFocus && <p className="text-sm font-semibold italic mb-3">✨ Daily Focus: {dailySuggestions.dailyFocus}</p>}
                        <ul className="list-none space-y-2">
                            {dailySuggestions.suggestions.map((s, i) => (
                                <li key={i} className="flex flex-col text-sm p-2 border-l-2 border-primary/50 bg-background/50 rounded-r-md">
                                    <span>{s.suggestion} <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground ml-1">{s.category}</span></span>
                                    {s.reasoning && <span className="text-xs text-muted-foreground italic ml-1">({s.reasoning})</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                     <p className="text-sm text-muted-foreground">No suggestions available right now.</p>
                 )}
                 <Button variant="ghost" size="sm" onClick={() => onSubmit({ insightType: 'dailySuggestion'})} disabled={isLoading === 'dailySuggestion' || authLoading} className="mt-3 text-xs h-7">
                     {(isLoading === 'dailySuggestion' || authLoading) ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : null} Refresh Suggestions
                 </Button>
            </CardContent>
        </Card>


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Generate Specific Insights</CardTitle>
          <CardDescription>Select the type of insight and parameters to analyze your data. AI responses will reflect your preferences from Settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => onSubmit(data as AIServiceType))} className="space-y-6">
              <FormField
                control={form.control}
                name="insightType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analysis / Tool Type</FormLabel>
                    <Select onValueChange={(value: AIServiceType) => {
                        field.onChange(value);
                         if (!['reflection', 'dailySuggestion'].includes(value)) {
                             clearResults();
                         }

                         const now = new Date();
                         if (['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'attentionPatterns'].includes(value)) {
                             form.setValue('startDate', subDays(now, 7), { shouldValidate: true });
                             form.setValue('endDate', now, { shouldValidate: true });
                         } else if (value === 'diarySummary') {
                             form.setValue('frequency', 'weekly');
                             form.setValue('startDate', startOfWeek(now), { shouldValidate: true }); 
                             form.setValue('endDate', endOfWeek(now), { shouldValidate: true });
                         } else if (value === 'reflection') {
                             form.setValue('startDate', startOfWeek(subDays(now, 7),{weekStartsOn: 1}), { shouldValidate: true });
                             form.setValue('endDate', endOfWeek(subDays(now, 7),{weekStartsOn: 1}), { shouldValidate: true });
                         } else if (value === 'dailyPlan') {
                             form.setValue('startDate', startOfDay(now), { shouldValidate: true }); 
                             form.setValue('endDate', endOfDay(now), { shouldValidate: true });
                         } else {
                             form.setValue('startDate', undefined);
                             form.setValue('endDate', undefined);
                             form.setValue('frequency', undefined);
                         }


                    }} defaultValue={field.value} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select analysis/tool" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="dailySuggestion"><div className="flex items-center gap-2"><Zap className="h-4 w-4" /> Get Daily Suggestions</div></SelectItem>
                        <SelectItem value="dailyPlan"><div className="flex items-center gap-2"><Map className="h-4 w-4" /> Generate Daily Plan</div></SelectItem>
                        <SelectItem value="productivity"><div className="flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4" /> Productivity Patterns</div></SelectItem>
                        <SelectItem value="attentionPatterns"><div className="flex items-center gap-2"><Eye className="h-4 w-4" /> Attention Patterns</div></SelectItem>
                        <SelectItem value="expenseTrends"><div className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Expense Trends</div></SelectItem>
                        <SelectItem value="taskCompletion"><div className="flex items-center gap-2"><ListTodo className="h-4 w-4" /> Task Completion</div></SelectItem>
                        <SelectItem value="sentimentAnalysis"><div className="flex items-center gap-2"><Smile className="h-4 w-4" /> Sentiment Analysis</div></SelectItem>
                        <SelectItem value="diarySummary"><div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Diary Summary</div></SelectItem>
                        <SelectItem value="lifeBalance"><div className="flex items-center gap-2"><Scale className="h-4 w-4" /> Life Balance Assessment</div></SelectItem>
                        <SelectItem value="burnoutRisk"><div className="flex items-center gap-2"><Flame className="h-4 w-4" /> Burnout Risk Estimation</div></SelectItem>
                         <SelectItem value="reflection"><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Weekly Reflection Coach</div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

                 {['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan', 'diarySummary', 'attentionPatterns'].includes(selectedInsightType) && renderDateRangePicker()}

                {!['reflection', 'dailySuggestion'].includes(selectedInsightType) && (
                     <Button type="submit" disabled={!!isLoading || (isLoading !== false && isLoading !== selectedInsightType) || authLoading}>
                         {(isLoading === selectedInsightType || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                         {(isLoading === selectedInsightType || authLoading) ? 'Generating...' : 'Generate Insights'}
                     </Button>
                 )}
                 {form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>)}
                 {form.formState.errors.startDate && !form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.startDate.message}</p>)}
                 {form.formState.errors.frequency && !form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.frequency.message}</p>)}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isLoading && typeof isLoading === 'string' && !['dailySuggestion', 'reflection', 'dailyPlan'].includes(isLoading as AIServiceType) && (
           <Card>
               <CardHeader><Skeleton className="h-6 w-3/4 rounded-md" /></CardHeader>
               <CardContent className="space-y-4">
                   <Skeleton className="h-4 w-full rounded-md" />
                   <Skeleton className="h-4 w-5/6 rounded-md" />
                   <Skeleton className="h-4 w-full rounded-md" />
               </CardContent>
           </Card>
         )}
        
        {isLoading === 'attentionPatterns' ? (
            <Card><CardHeader><Skeleton className="h-6 w-1/2 rounded-md" /></CardHeader><CardContent><Skeleton className="h-48 w-full rounded-md" /></CardContent></Card>
        ) : attentionPatterns && selectedInsightType === 'attentionPatterns' && (
            <Card className="shadow-md bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-300"><Eye className="h-5 w-5" /> Attention Patterns Analysis</CardTitle>
                    <CardDescription>Based on data from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><h3 className="font-semibold text-lg mb-1">Overall Assessment</h3><p className="text-sm text-secondary-foreground">{attentionPatterns.overallAssessment}</p></div>
                    
                    {attentionPatterns.attentionQualityScore !== undefined && (<>
                        <Separator />
                        <div>
                            <h3 className="font-semibold text-lg mb-1">Attention Quality Score: {attentionPatterns.attentionQualityScore}/100</h3>
                            <Progress value={attentionPatterns.attentionQualityScore} className="h-2 my-2 [&>div]:bg-teal-500" />
                        </div>
                    </>)}

                    {attentionPatterns.highFocusPeriods && attentionPatterns.highFocusPeriods.length > 0 && (<>
                        <Separator />
                        <div>
                            <h3 className="font-semibold text-lg mb-1">High Focus Periods</h3>
                            {attentionPatterns.highFocusPeriods.map((period, i) => (
                                <div key={`high-${i}`} className="mb-2 p-2 border-l-2 border-teal-400 dark:border-teal-600 rounded-r-sm bg-teal-100/30 dark:bg-teal-800/30">
                                    <p className="text-sm font-medium">{period.periodDescription} (Avg. Focus: {period.avgFocusLevel.toFixed(1)})</p>
                                    <p className="text-xs text-muted-foreground">Activities: {period.activities.join(', ') || 'N/A'}</p>
                                    {period.contributingFactors && period.contributingFactors.length > 0 && <p className="text-xs text-muted-foreground">Factors: {period.contributingFactors.join(', ')}</p>}
                                </div>
                            ))}
                        </div>
                    </>)}
                    
                    {attentionPatterns.lowFocusPeriods && attentionPatterns.lowFocusPeriods.length > 0 && (<>
                        <Separator />
                        <div>
                            <h3 className="font-semibold text-lg mb-1">Low Focus Periods</h3>
                            {attentionPatterns.lowFocusPeriods.map((period, i) => (
                                <div key={`low-${i}`} className="mb-2 p-2 border-l-2 border-orange-400 dark:border-orange-600 rounded-r-sm bg-orange-100/30 dark:bg-orange-800/30">
                                    <p className="text-sm font-medium">{period.periodDescription} (Avg. Focus: {period.avgFocusLevel.toFixed(1)})</p>
                                    <p className="text-xs text-muted-foreground">Activities: {period.activities.join(', ') || 'N/A'}</p>
                                    {period.contributingFactors && period.contributingFactors.length > 0 && <p className="text-xs text-muted-foreground">Factors: {period.contributingFactors.join(', ')}</p>}
                                </div>
                            ))}
                        </div>
                    </>)}

                    {attentionPatterns.insights && attentionPatterns.insights.length > 0 && (<>
                        <Separator />
                        <div><h3 className="font-semibold text-lg mb-1">Key Insights</h3><ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{attentionPatterns.insights.map((insight, i) => <li key={`insight-${i}`}>{insight}</li>)}</ul></div>
                    </>)}

                    {attentionPatterns.suggestionsForImprovement && attentionPatterns.suggestionsForImprovement.length > 0 && (<>
                        <Separator />
                        <div><h3 className="font-semibold text-lg mb-1">Suggestions for Improvement</h3><ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{attentionPatterns.suggestionsForImprovement.map((sugg, i) => <li key={`sugg-${i}`}>{sugg}</li>)}</ul></div>
                    </>)}
                </CardContent>
            </Card>
        )}

        {isLoading === 'dailyPlan' ? (
             <Card><CardHeader><Skeleton className="h-6 w-1/2 rounded-md" /></CardHeader><CardContent><Skeleton className="h-32 w-full rounded-md" /></CardContent></Card>
         ) : dailyPlan && selectedInsightType === 'dailyPlan' && (
             <Card className="shadow-md bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Map className="h-5 w-5" /> Suggested Daily Plan</CardTitle>
                     <CardDescription>AI-generated plan for {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : 'today'}.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                      <p className="text-sm font-semibold italic text-blue-600 dark:text-blue-400">{dailyPlan.planRationale}</p>
                      {dailyPlan.warnings && dailyPlan.warnings.length > 0 && (
                          <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Potential Issues</AlertTitle>
                              <AlertDescription>
                                  <ul className="list-disc list-inside">
                                      {dailyPlan.warnings.map((w, i) => <li key={`plan-warn-${i}`}>{w}</li>)}
                                  </ul>
                              </AlertDescription>
                          </Alert>
                      )}
                      <ul className="list-none space-y-2">
                          {dailyPlan.suggestedPlan.map((block, i) => (
                              <li key={`plan-block-${i}`} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-sm p-2 border-l-2 border-blue-300 dark:border-blue-600 bg-background/70 rounded-r-md">
                                  <span className="font-semibold w-full sm:w-28 flex-shrink-0 text-blue-700 dark:text-blue-300">
                                      {block.startTime} {block.endTime ? `- ${block.endTime}` : ''}
                                  </span>
                                  <div className="flex-grow">
                                      <span>{block.activity}</span>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 ml-1.5">{block.category}</span>
                                      {block.reasoning && <p className="text-xs text-muted-foreground italic mt-0.5">({block.reasoning})</p>}
                                  </div>
                              </li>
                          ))}
                      </ul>
                 </CardContent>
             </Card>
         )}

         {selectedInsightType === 'reflection' && (
             <Card className="shadow-md bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300"><BrainCircuit className="h-5 w-5" /> Weekly Reflection Coach</CardTitle>
                      <CardDescription>Reflect on your week {form.getValues("startDate") instanceof Date && form.getValues("endDate") instanceof Date && `from ${format(form.getValues("startDate")!, 'PPP')} to ${format(form.getValues("endDate")!, 'PPP')}`}.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    {(isLoading === 'reflection' && reflectionState.conversation.questions.length === 0 && !reflectionState.output) || authLoading && reflectionState.conversation.questions.length === 0 && (
                        <Button onClick={() => onSubmit({ insightType: 'reflection', startDate: form.getValues('startDate'), endDate: form.getValues('endDate')})} disabled={isLoading === 'reflection' || authLoading}>
                             {(isLoading === 'reflection' || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4" />}
                             Start Reflection
                        </Button>
                     )}

                    {reflectionState.conversation.questions.length > 0 && (
                        <ScrollArea className="h-[300px] w-full rounded-md border p-3 space-y-3 bg-background/50">
                            {reflectionState.conversation.questions.map((q, index) => (
                                <React.Fragment key={`conv-${index}`}>
                                    { q && (
                                    <div className="mb-2 p-2 rounded-md bg-purple-100 dark:bg-purple-800/60 shadow-sm">
                                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Coach:</p>
                                        <p className="text-sm italic text-purple-700 dark:text-purple-200">{q}</p>
                                    </div>
                                    )}
                                    {reflectionState.conversation.responses[index] && (
                                        <div className="mb-3 p-2 rounded-md bg-background shadow-sm text-right">
                                        <p className="text-sm font-semibold text-primary">You:</p>
                                        <p className="text-sm text-foreground">{reflectionState.conversation.responses[index]}</p>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                             {isLoading === 'reflection' && reflectionState.output && !reflectionState.output.isComplete && (
                                <div className="flex items-center justify-start p-2"><Loader2 className="h-5 w-5 animate-spin text-purple-500 mr-2" /> <span className="text-xs italic text-purple-600 dark:text-purple-400">Coach is thinking...</span></div>
                            )}
                        </ScrollArea>
                    )}
                    

                     {reflectionState.output && !reflectionState.output.isComplete && reflectionState.conversation.questions.length > 0 && (
                         <form onSubmit={handleReflectionResponseSubmit} className="space-y-3 mt-4">
                             <Label htmlFor="reflection-response" className="font-medium text-purple-700 dark:text-purple-300">Your Response:</Label>
                             <Textarea
                                id="reflection-response"
                                placeholder="Share your thoughts..."
                                value={reflectionUserInput}
                                onChange={(e) => setReflectionUserInput(e.target.value)}
                                rows={3}
                                disabled={isLoading === 'reflection' || authLoading}
                                aria-label="Your reflection response"
                                className="bg-background"
                             />
                             <Button type="submit" disabled={isLoading === 'reflection' || !reflectionUserInput.trim() || authLoading} className="bg-purple-600 hover:bg-purple-700 text-purple-50">
                                {(isLoading === 'reflection' || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />} Send Response
                             </Button>
                         </form>
                     )}

                     {reflectionState.output?.isComplete && (
                        <div className="p-3 rounded-md bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700">
                             <p className="text-sm font-semibold text-green-700 dark:text-green-300">✅ Reflection complete!</p>
                             {reflectionState.output.coachPrompt && <p className="text-sm text-green-600 dark:text-green-400 mt-1">{reflectionState.output.coachPrompt}</p>}
                        </div>
                     )}
                      {reflectionState.output?.observation && (
                          <Alert variant="default" className="mt-4 bg-purple-100/50 dark:bg-purple-900/50 border-purple-200 dark:border-purple-700">
                              <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <AlertTitle className="text-purple-700 dark:text-purple-300">Coach's Observation</AlertTitle>
                              <AlertDescription className="text-purple-600 dark:text-purple-300">{reflectionState.output.observation}</AlertDescription>
                          </Alert>
                      )}
                 </CardContent>
             </Card>
         )}


        {productivityInsights && selectedInsightType === 'productivity' && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5" /> Productivity Patterns Analysis</CardTitle>
                    <CardDescription>Based on data from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><h3 className="font-semibold text-lg mb-1">Overall Assessment</h3><p className="text-sm text-secondary-foreground">{productivityInsights.overallAssessment}</p></div><Separator/>
                    <div><h3 className="font-semibold text-lg mb-1">Peak Performance Times</h3><p className="text-sm text-secondary-foreground">{productivityInsights.peakPerformanceTimes}</p></div><Separator/>
                    {productivityInsights.attentionQualityAssessment && (<><div><h3 className="font-semibold text-lg mb-1">Attention Quality</h3><p className="text-sm text-secondary-foreground">{productivityInsights.attentionQualityAssessment}</p></div><Separator/></>)}
                    <div><h3 className="font-semibold text-lg mb-1">Common Distractions/Obstacles</h3><p className="text-sm text-secondary-foreground">{productivityInsights.commonDistractionsOrObstacles}</p></div><Separator/>
                    <div><h3 className="font-semibold text-lg mb-1">Suggested Strategies</h3><p className="text-sm text-secondary-foreground">{productivityInsights.suggestedStrategies}</p></div>
                </CardContent>
            </Card>
        )}

        {expenseTrends && selectedInsightType === 'expenseTrends' && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Expense Trend Analysis</CardTitle>
                    <CardDescription>Based on data from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4"><p className="text-sm text-muted-foreground">Total Spending</p><p className="text-xl font-bold">${expenseTrends.totalSpending.toFixed(2)}</p></div>
                    <div className="grid grid-cols-2 gap-4"><p className="text-sm text-muted-foreground">Avg. Daily Spending</p><p className="text-xl font-bold">${expenseTrends.averageDailySpending.toFixed(2)}</p></div>
                     <Separator />
                    <div><h3 className="font-semibold text-lg mb-1">Spending Summary</h3><p className="text-sm text-secondary-foreground">{expenseTrends.spendingSummary}</p></div>
                    <Separator />
                    <div><h3 className="font-semibold text-lg mb-2">Top Spending Categories</h3>{expenseTrends.topSpendingCategories.length > 0 ? (<ul className="space-y-2">{expenseTrends.topSpendingCategories.map((cat) => (<li key={cat.category} className="flex justify-between items-center text-sm"><span>{cat.category}</span><span className="font-medium">${cat.amount.toFixed(2)} <span className="text-xs text-muted-foreground">({cat.percentage.toFixed(1)}%)</span></span></li>))}</ul>) : <p className="text-sm text-muted-foreground italic">No spending data.</p>}</div>
                     {expenseTrends.savingsSuggestions && expenseTrends.savingsSuggestions.length > 0 && (<> <Separator/> <div><h3 className="font-semibold text-lg mb-1">Savings Suggestions</h3><ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{expenseTrends.savingsSuggestions.map((s,i)=><li key={`sugg-${i}`}>{s}</li>)}</ul></div></>)}
                </CardContent>
            </Card>
        )}

        {taskCompletion && selectedInsightType === 'taskCompletion' && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> Task Completion Analysis</CardTitle>
                    <CardDescription>Tasks due between {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} and {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-sm text-muted-foreground">Tasks Due</p><p className="text-xl font-bold">{taskCompletion.totalTasksConsidered}</p></div><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-bold">{taskCompletion.completedTasks}</p></div><div><p className="text-sm text-muted-foreground">Rate</p><p className="text-xl font-bold">{taskCompletion.completionRate.toFixed(0)}%</p></div></div>
                    <Separator />
                     <div><h3 className="font-semibold text-lg mb-1">Completion Summary</h3><p className="text-sm text-secondary-foreground">{taskCompletion.completionSummary}</p></div>
                    <Separator />
                     <div><h3 className="font-semibold text-lg mb-2">Overdue Tasks</h3>{taskCompletion.overdueTasks.length > 0 ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{taskCompletion.overdueTasks.length} Overdue!</AlertTitle><AlertDescription><ul className="list-disc list-inside mt-2 space-y-1">{taskCompletion.overdueTasks.map((task: DisplayTask) => (<li key={task.id} className="text-sm">{task.title} {task.dueDate && isValidDate(parseISO(task.dueDate)) ? `(Due: ${format(parseISO(task.dueDate), 'PP')})` : ''}</li>))}</ul></AlertDescription></Alert>) : (<p className="text-sm text-muted-foreground italic">No overdue tasks. Keep it up!</p>)}</div>
                </CardContent>
            </Card>
        )}

        {diarySummary && selectedInsightType === 'diarySummary' && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Diary Summary</CardTitle>
                     <CardDescription>{`Summary for ${form.getValues("frequency") ?? 'period'} (${diarySummary.entryCount} entries)`} {diarySummary.dateRange && isValidDate(parseISO(diarySummary.dateRange.start)) && isValidDate(parseISO(diarySummary.dateRange.end)) && `(${format(parseISO(diarySummary.dateRange.start), 'PP')} - ${format(parseISO(diarySummary.dateRange.end), 'PP')})`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Summary</h3><p className="text-sm text-secondary-foreground whitespace-pre-wrap">{diarySummary.summary}</p></div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Key Events</h3>{diarySummary.keyEvents.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.keyEvents.map((event, i) => <li key={`event-${i}`}>{event}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No key events identified.</p>}</div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Dominant Emotions</h3>{diarySummary.emotions.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.emotions.map((emotion, i) => <li key={`emotion-${i}`}>{emotion}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No prominent emotions identified.</p>}</div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Key Reflections/Insights</h3>{diarySummary.reflections.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.reflections.map((reflection, i) => <li key={`reflection-${i}`}>{reflection}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No specific reflections identified.</p>}</div>
                </CardContent>
            </Card>
        )}

         {sentimentAnalysis && selectedInsightType === 'sentimentAnalysis' && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5" /> Sentiment Analysis</CardTitle>
                      <CardDescription>Sentiment trends from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'} ({sentimentAnalysis.entryCount} entries)</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div><p className="text-sm text-muted-foreground">Overall Sentiment</p><p className="text-xl font-bold">{sentimentAnalysis.overallSentiment}</p></div>
                         <div><p className="text-sm text-muted-foreground">Sentiment Score</p><p className="text-xl font-bold">{sentimentAnalysis.sentimentScore.toFixed(2)}</p></div>
                    </div>
                    <Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Key Positive Themes/Keywords</h3>{sentimentAnalysis.positiveKeywords.length > 0 ? <ul className="list-disc list-inside text-sm">{sentimentAnalysis.positiveKeywords.map(k=><li key={k}>{k}</li>)}</ul> : <p className="text-sm italic text-muted-foreground">None identified.</p>}</div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Key Negative Themes/Keywords</h3>{sentimentAnalysis.negativeKeywords.length > 0 ? <ul className="list-disc list-inside text-sm">{sentimentAnalysis.negativeKeywords.map(k=><li key={k}>{k}</li>)}</ul> : <p className="text-sm italic text-muted-foreground">None identified.</p>}</div>
                      <Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Analysis Summary</h3><p className="text-sm text-secondary-foreground">{sentimentAnalysis.analysisSummary}</p></div>
                 </CardContent>
             </Card>
         )}

          {lifeBalance && selectedInsightType === 'lifeBalance' && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Life Balance Assessment</CardTitle>
                     <CardDescription>Distribution of focus from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Balance Summary</h3><p className="text-sm text-secondary-foreground">{lifeBalance.balanceSummary}</p></div>
                     {lifeBalance.neglectedAreas.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Areas for Attention</AlertTitle>
                            <AlertDescription>Consider dedicating more time/energy to: {lifeBalance.neglectedAreas.join(', ')}.</AlertDescription>
                        </Alert>
                     )}
                      {lifeBalance.suggestions && lifeBalance.suggestions.length > 0 && (<> <Separator/> <div><h3 className="font-semibold text-lg mb-1">Suggestions for Balance</h3><ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{lifeBalance.suggestions.map((s,i)=><li key={`balance-sugg-${i}`}>{s}</li>)}</ul></div> </>)}
                     <Separator/>
                     <div><h3 className="font-semibold text-lg mb-2">Focus Distribution</h3>
                        <ul className="space-y-1 text-sm">
                             {lifeBalance.areaScores.sort((a,b) => b.score - a.score).map(area => (
                                <li key={area.area} className="flex justify-between items-center">
                                    <span>{area.area}</span>
                                    <div className="flex items-center gap-2">
                                         <Progress value={area.score} className="w-24 h-1.5" />
                                         <span className="font-medium w-10 text-right">{area.score}%</span>
                                         <span className="text-xs text-muted-foreground w-8 text-right">({area.rawCount})</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                     </div>
                 </CardContent>
             </Card>
         )}

         {burnoutRisk && selectedInsightType === 'burnoutRisk' && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Burnout Risk Estimation</CardTitle>
                     <CardDescription>Assessment from {form.getValues("startDate") instanceof Date ? format(form.getValues("startDate")!, 'PPP') : '?'} to {form.getValues("endDate") instanceof Date ? format(form.getValues("endDate")!, 'PPP') : '?'}.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Risk Level: {burnoutRisk.riskLevel}</h3>
                        <Progress value={burnoutRisk.riskScore} className="h-2 my-2" />
                        <p className="text-sm text-secondary-foreground">{burnoutRisk.assessmentSummary}</p>
                     </div>
                      <Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Contributing Factors</h3>{burnoutRisk.contributingFactors.length > 0 ? <ul className="list-disc list-inside text-sm">{burnoutRisk.contributingFactors.map(f=><li key={f}>{f}</li>)}</ul> : <p className="text-sm italic text-muted-foreground">No specific factors identified.</p>}</div>
                     <Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Recommendations</h3><ul className="list-disc list-inside text-sm">{burnoutRisk.recommendations.map(r=><li key={r}>{r}</li>)}</ul></div>
                 </CardContent>
             </Card>
         )}

      </div>
    </div>
  );
};

const InsightsPage: FC = () => {
  return (
    <Suspense fallback={<InsightsPageSkeleton />}>
      <InsightsPageClient />
    </Suspense>
  );
};

export default InsightsPage;
