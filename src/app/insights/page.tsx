'use client';

 import type { FC } from 'react';
 import React, { useState, useCallback, useEffect } from 'react';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { useForm } from 'react-hook-form';
 import { z } from 'zod';
 import { format, formatISO, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
 import { Lightbulb, BrainCircuit, Calendar as CalendarIcon, Activity, BarChartHorizontalBig, Wallet, ListTodo, AlertCircle, Smile, Scale, Flame, Zap, Loader2, Map } from 'lucide-react'; // Added Loader2, Map

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
 import { Textarea } from '@/components/ui/textarea'; // Import Textarea
 import { Label } from '@/components/ui/label'; // Import Label


 // --- Import AI Flows ---
 import {
   analyzeProductivityPatterns,
   AnalyzeProductivityPatternsInput,
   AnalyzeProductivityPatternsOutput,
 } from '@/ai/flows/analyze-productivity-patterns';
 import {
   summarizeDiaryEntries,
   SummarizeDiaryEntriesInput,
   SummarizeDiaryEntriesOutput
 } from '@/ai/flows/summarize-diary-entries';
 import {
   analyzeExpenseTrends,
   AnalyzeExpenseTrendsInput,
   AnalyzeExpenseTrendsOutput,
 } from '@/ai/flows/analyze-expense-trends';
 import {
   analyzeTaskCompletion,
   AnalyzeTaskCompletionInput,
   AnalyzeTaskCompletionOutput,
 } from '@/ai/flows/analyze-task-completion';
 import {
     analyzeSentimentTrends,
     AnalyzeSentimentTrendsInput,
     AnalyzeSentimentTrendsOutput,
 } from '@/ai/flows/analyze-sentiment-trends';
 import {
     assessLifeBalance,
     AssessLifeBalanceInput,
     AssessLifeBalanceOutput,
 } from '@/ai/flows/assess-life-balance';
 import {
     estimateBurnoutRisk,
     EstimateBurnoutRiskInput,
     EstimateBurnoutRiskOutput,
 } from '@/ai/flows/estimate-burnout-risk';
 // Import reflection and suggestion flows
 import { reflectOnWeek, ReflectOnWeekInput, ReflectOnWeekOutput } from '@/ai/flows/reflect-on-week';
 import { generateDailySuggestions, GenerateDailySuggestionsInput, GenerateDailySuggestionsOutput } from '@/ai/flows/generate-daily-suggestions';
 import { generateDailyPlan, GenerateDailyPlanInput, GenerateDailyPlanOutput } from '@/ai/flows/generate-daily-plan'; // Import Daily Plan flow


 // --- Import Services ---
 import { getTasks, type Task } from '@/services/task';
 import { getDailyLogs, type LogEntry } from '@/services/daily-log';
 import { getExpenses, type Expense } from '@/services/expense';
 import { getNotes, type Note } from '@/services/note';
 import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';
 import { getGoals, type Goal } from '@/services/goal';
 import { getHabits, type Habit } from '@/services/habit';
 import { useDataMode } from '@/context/data-mode-context';


 // --- Types ---
 type DisplayTask = AnalyzeTaskCompletionOutput['overdueTasks'][number];

 type InsightType = 'productivity' | 'diarySummary' | 'expenseTrends' | 'taskCompletion' | 'sentimentAnalysis' | 'lifeBalance' | 'burnoutRisk';
 type AIServiceType = InsightType | 'reflection' | 'dailySuggestion' | 'dailyPlan'; // Add 'dailyPlan'


 // --- Form Schema ---
 const insightsRequestSchema = z.object({
   insightType: z.enum(['productivity', 'diarySummary', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailySuggestion', 'dailyPlan']), // Added dailyPlan
   startDate: z.date().optional(),
   endDate: z.date().optional(),
   frequency: z.enum(['weekly', 'monthly']).optional(),
 }).refine(data => {
     const requiresDateRange: AIServiceType[] = ['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan']; // Added dailyPlan
     if (requiresDateRange.includes(data.insightType) && (!data.startDate || !data.endDate)) {
         return false;
     }
      if (data.insightType === 'diarySummary' && !data.frequency) {
          return false;
      }
     if (data.startDate && data.endDate && data.endDate < data.startDate) {
         return false;
     }
     return true;
 }, {
     message: "Valid date range required for most insights. Frequency required for Diary summaries. End date cannot be before start date.",
     path: ["startDate"],
 });

 type InsightsRequestFormValues = z.infer<typeof insightsRequestSchema>;

 // --- Component ---
 const InsightsPage: FC = () => {
   // State for each insight type
   const [productivityInsights, setProductivityInsights] = useState<AnalyzeProductivityPatternsOutput | null>(null);
   const [diarySummary, setDiarySummary] = useState<SummarizeDiaryEntriesOutput | null>(null);
   const [expenseTrends, setExpenseTrends] = useState<AnalyzeExpenseTrendsOutput | null>(null);
   const [taskCompletion, setTaskCompletion] = useState<AnalyzeTaskCompletionOutput | null>(null);
   const [sentimentAnalysis, setSentimentAnalysis] = useState<AnalyzeSentimentTrendsOutput | null>(null);
   const [lifeBalance, setLifeBalance] = useState<AssessLifeBalanceOutput | null>(null);
   const [burnoutRisk, setBurnoutRisk] = useState<EstimateBurnoutRiskOutput | null>(null);
   const [reflectionState, setReflectionState] = useState<{ conversation: { questions: string[], responses: string[] }, output: ReflectOnWeekOutput | null }>({ conversation: { questions: [], responses: [] }, output: null });
   const [dailySuggestions, setDailySuggestions] = useState<GenerateDailySuggestionsOutput | null>(null);
   const [dailyPlan, setDailyPlan] = useState<GenerateDailyPlanOutput | null>(null); // Added state for daily plan
   const [reflectionUserInput, setReflectionUserInput] = useState('');


   const [isLoading, setIsLoading] = useState<boolean | AIServiceType>(false);
   const { toast } = useToast();
   const { dataMode } = useDataMode();

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

    // Fetch Daily Suggestions on initial load or when data mode changes
    useEffect(() => {
         const fetchDailySuggestions = async () => {
             setIsLoading('dailySuggestion');
             try {
                  const now = new Date();
                  const yesterday = subDays(now, 1);
                  const tomorrow = subDays(now, -1);

                  const [logs, tasks, events, habits, goals] = await Promise.all([
                     getDailyLogs(dataMode).then(d => d.filter(l => l.date >= yesterday)),
                     getTasks(dataMode).then(t => t.filter(task => task.status !== 'Completed' && task.dueDate && task.dueDate <= tomorrow)),
                     getCalendarEvents(dataMode).then(e => e.filter(ev => ev.start >= now && ev.start <= endOfWeek(now))),
                     getHabits(dataMode),
                     getGoals(dataMode).then(g => g.filter(goal => goal.status === 'In Progress')),
                  ]);

                  // Helper to format data for flows
                  const formatForFlow = <T extends Record<string, any>>(items: T[], dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate', 'lastCompleted', 'targetDate']): any[] => {
                    return items.map(item => {
                        const newItem: Record<string, any> = { ...item };
                        dateKeys.forEach(key => {
                            if (item[key] && item[key] instanceof Date) {
                                newItem[key] = formatISO(item[key]);
                            } else if (item[key] === undefined || item[key] === null) {
                                // Handle undefined/null if necessary
                            }
                        });
                        return newItem;
                    });
                 };


                  const input: GenerateDailySuggestionsInput = {
                      currentDateTime: formatISO(now),
                      recentLogs: formatForFlow(logs, ['date']),
                      upcomingTasks: formatForFlow(tasks, ['createdAt', 'dueDate']),
                      todaysEvents: formatForFlow(events, ['start', 'end']),
                      activeHabits: formatForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                      activeGoals: formatForFlow(goals, ['createdAt', 'updatedAt', 'targetDate']),
                  };

                  const result = await generateDailySuggestions(input);
                  setDailySuggestions(result);

             } catch (error) {
                 console.error("Failed to generate daily suggestions:", error);
                 toast({ title: "Error", description: "Could not load daily suggestions.", variant: "destructive" });
                 setDailySuggestions(null);
             } finally {
                 setIsLoading(false);
             }
         };
         fetchDailySuggestions();
    }, [dataMode, toast]);


    const clearResults = () => {
      setProductivityInsights(null);
      setDiarySummary(null);
      setExpenseTrends(null);
      setTaskCompletion(null);
      setSentimentAnalysis(null);
      setLifeBalance(null);
      setBurnoutRisk(null);
      setReflectionState({ conversation: { questions: [], responses: [] }, output: null });
      setDailyPlan(null); // Clear daily plan
      // Keep daily suggestions
    };

    // --- API Call Logic ---
    const onSubmit = useCallback(async (data: InsightsRequestFormValues | { insightType: 'reflection' | 'dailyPlan' | 'dailySuggestion' }) => { // Allow dailyPlan/suggestion type here
      setIsLoading(data.insightType);
      if (!['reflection', 'dailySuggestion', 'dailyPlan'].includes(data.insightType)) { // Keep results for these types
          clearResults();
      }

      try {
        const { insightType } = data;

        // Use form values if not a reflection/plan/suggestion turn or provide defaults
        const startDate = 'startDate' in data && data.startDate ? data.startDate : subDays(new Date(), 7); // Default start date
        const endDate = 'endDate' in data && data.endDate ? data.endDate : new Date(); // Default end date
        const frequency = 'frequency' in data ? data.frequency : undefined;


        // Common date input (ISO strings)
        const dateInput = { startDate: formatISO(startDate), endDate: formatISO(endDate) };

         // Fetch necessary data based on insight type
         let logs: LogEntry[] = [], tasks: Task[] = [], events: CalendarEvent[] = [], expenses: Expense[] = [], notes: Note[] = [], goals: Goal[] = [], habits: Habit[] = [];

         const requiresLogs = ['productivity', 'diarySummary', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(insightType);
         const requiresTasks = ['productivity', 'taskCompletion', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(insightType);
         const requiresEvents = ['productivity', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(insightType);
         const requiresExpenses = ['expenseTrends', 'lifeBalance'].includes(insightType);
         const requiresNotes = ['productivity', 'sentimentAnalysis'].includes(insightType);
         const requiresGoals = ['lifeBalance', 'reflection', 'dailyPlan'].includes(insightType);
         const requiresHabits = ['lifeBalance', 'reflection', 'dailyPlan'].includes(insightType);


         // Optimize fetching
         const fetchDataPromises: Promise<any>[] = [];
         if (requiresLogs) fetchDataPromises.push(getDailyLogs(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresTasks) fetchDataPromises.push(getTasks(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresEvents) fetchDataPromises.push(getCalendarEvents(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresExpenses) fetchDataPromises.push(getExpenses(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresNotes) fetchDataPromises.push(getNotes(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresGoals) fetchDataPromises.push(getGoals(dataMode)); else fetchDataPromises.push(Promise.resolve([]));
         if (requiresHabits) fetchDataPromises.push(getHabits(dataMode)); else fetchDataPromises.push(Promise.resolve([]));


         [logs, tasks, events, expenses, notes, goals, habits] = await Promise.all(fetchDataPromises);


          // Filter data by date range *after* fetching
          const filterByDate = <T extends { date?: Date; createdAt?: Date; updatedAt?: Date; start?: Date }>(item: T): boolean => {
              const itemDate = item.date || item.createdAt || item.updatedAt || item.start;
              return itemDate ? itemDate >= startDate && itemDate <= endDate : false;
          };

          // Specific filtering logic based on insight type needs
          let logsInRange = logs;
          let tasksInRange = tasks;
          let eventsInRange = events;
          let expensesInRange = expenses;
          let notesInRange = notes;
          let goalsInRange = goals;
          let habitsInRange = habits;

          // Apply date filtering where needed
           if (['productivity', 'diarySummary', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection'].includes(insightType)) {
               logsInRange = logs.filter(filterByDate);
               notesInRange = notes.filter(filterByDate);
               goalsInRange = goals.filter(filterByDate);
               habitsInRange = habits.filter(filterByDate);
               eventsInRange = events.filter(filterByDate);
           }
           if (['expenseTrends', 'lifeBalance'].includes(insightType)) {
               expensesInRange = expenses.filter(filterByDate);
           }
           if (['productivity', 'taskCompletion', 'lifeBalance', 'burnoutRisk', 'reflection'].includes(insightType)) {
               // Filter tasks relevant to the date range (due or created within)
                tasksInRange = tasks.filter(task => {
                    const created = task.createdAt;
                    const due = task.dueDate;
                    return (created && created >= startDate && created <= endDate) || (due && due >= startDate && due <= endDate);
                });
           }


          // Helper to format data for flows
          const formatForFlow = <T extends Record<string, any>>(items: T[], dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate', 'lastCompleted', 'targetDate']): any[] => {
              return items.map(item => {
                  const newItem: Record<string, any> = { ...item };
                  dateKeys.forEach(key => {
                      if (item[key] && item[key] instanceof Date) {
                          newItem[key] = formatISO(item[key]);
                      } else if (item[key] === undefined || item[key] === null) {
                          // Handle undefined/null
                      }
                  });
                  return newItem;
              });
          };


         switch (insightType) {
              case 'productivity':
                  const prodInput: AnalyzeProductivityPatternsInput = {
                     ...dateInput,
                     dailyLogs: formatForFlow(logsInRange, ['date']),
                     tasks: formatForFlow(tasksInRange, ['createdAt', 'dueDate']),
                     calendarEvents: formatForFlow(eventsInRange, ['start', 'end']),
                     notes: formatForFlow(notesInRange, ['createdAt', 'updatedAt']),
                  };
                  const prodResult = await analyzeProductivityPatterns(prodInput);
                  setProductivityInsights(prodResult);
                  break;

              case 'diarySummary':
                   const diaryEntries = logsInRange.filter(l => l.diaryEntry).map(l => ({ id: l.id, date: formatISO(l.date), text: l.diaryEntry! }));
                   if (!frequency) throw new Error("Frequency is required for diary summary.");
                   const diaryInput: SummarizeDiaryEntriesInput = { frequency, diaryEntries, ...dateInput };
                   const diaryResult = await summarizeDiaryEntries(diaryInput);
                   setDiarySummary(diaryResult);
                   break;

              case 'expenseTrends':
                  const expenseInput: AnalyzeExpenseTrendsInput = { ...dateInput, expenses: formatForFlow(expensesInRange, ['date']) };
                  const expenseResult = await analyzeExpenseTrends(expenseInput);
                  setExpenseTrends(expenseResult);
                  break;

              case 'taskCompletion':
                  // Pass ALL tasks to the flow for accurate completion calculation
                  const taskInput: AnalyzeTaskCompletionInput = { ...dateInput, tasks: formatForFlow(tasks, ['createdAt', 'dueDate']) };
                  const taskResult = await analyzeTaskCompletion(taskInput);
                  setTaskCompletion(taskResult);
                  break;

              case 'sentimentAnalysis':
                   const diaryTexts = logsInRange.filter(l => l.diaryEntry).map(l => ({ id: l.id, date: formatISO(l.date), text: l.diaryEntry!, source: 'diary' as const }));
                   const noteTexts = notesInRange.map(n => ({ id: n.id, date: formatISO(n.createdAt), text: n.content, source: 'note' as const }));
                   const sentimentInput: AnalyzeSentimentTrendsInput = { ...dateInput, textEntries: [...diaryTexts, ...noteTexts] };
                   const sentimentResult = await analyzeSentimentTrends(sentimentInput);
                   setSentimentAnalysis(sentimentResult);
                   break;

              case 'lifeBalance':
                   const balanceInput: AssessLifeBalanceInput = {
                      ...dateInput,
                      dailyLogs: formatForFlow(logsInRange, ['date']),
                      tasks: formatForFlow(tasksInRange, ['createdAt', 'dueDate']),
                      calendarEvents: formatForFlow(eventsInRange, ['start', 'end']),
                      expenses: formatForFlow(expensesInRange, ['date']),
                      habits: formatForFlow(habitsInRange, ['createdAt', 'updatedAt', 'lastCompleted']),
                      goals: formatForFlow(goalsInRange, ['createdAt', 'updatedAt', 'targetDate']),
                   };
                   const balanceResult = await assessLifeBalance(balanceInput);
                   setLifeBalance(balanceResult);
                   break;

              case 'burnoutRisk':
                   const burnoutInput: EstimateBurnoutRiskInput = {
                      ...dateInput,
                      dailyLogs: formatForFlow(logsInRange, ['date']),
                      tasks: formatForFlow(tasks, ['createdAt', 'dueDate']), // Pass all tasks
                      calendarEvents: formatForFlow(eventsInRange, ['start', 'end']),
                   };
                   const burnoutResult = await estimateBurnoutRisk(burnoutInput);
                   setBurnoutRisk(burnoutResult);
                   break;

               case 'reflection':
                   const reflectionInput: ReflectOnWeekInput = {
                      ...dateInput,
                      logs: formatForFlow(logsInRange, ['date']),
                      tasks: formatForFlow(tasksInRange, ['createdAt', 'dueDate']),
                      goals: formatForFlow(goalsInRange, ['createdAt', 'updatedAt', 'targetDate']),
                      habits: formatForFlow(habitsInRange, ['createdAt', 'updatedAt', 'lastCompleted']),
                       previousReflection: reflectionState.output ? {
                           questionsAsked: [...reflectionState.conversation.questions],
                           userResponses: [...reflectionState.conversation.responses],
                           aiSummary: reflectionState.output.observation,
                       } : undefined,
                       userResponse: reflectionUserInput || undefined,
                   };
                   const reflectionResult = await reflectOnWeek(reflectionInput);
                   setReflectionState(prev => ({
                      conversation: {
                          questions: [...prev.conversation.questions, reflectionResult.coachPrompt],
                          responses: [...prev.conversation.responses, reflectionUserInput],
                      },
                      output: reflectionResult,
                  }));
                  setReflectionUserInput('');
                  break;


              case 'dailySuggestion':
                  // Use current data for suggestions
                 const now = new Date();
                 const yesterday = subDays(now, 1);
                 const tomorrow = subDays(now, -1);
                 const suggestionInput: GenerateDailySuggestionsInput = {
                     currentDateTime: formatISO(now),
                     recentLogs: formatForFlow(logs.filter(l => l.date >= yesterday), ['date']),
                     upcomingTasks: formatForFlow(tasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate <= tomorrow), ['createdAt', 'dueDate']),
                     todaysEvents: formatForFlow(events.filter(e => e.start >= now && e.start <= endOfWeek(now)), ['start', 'end']),
                     activeHabits: formatForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                     activeGoals: formatForFlow(goals.filter(g => g.status === 'In Progress'), ['createdAt', 'updatedAt', 'targetDate']),
                  };
                  const suggestionResult = await generateDailySuggestions(suggestionInput);
                  setDailySuggestions(suggestionResult);
                  break;

              case 'dailyPlan':
                 // Use data relevant to the target date (defaulting to today)
                 const targetDate = 'startDate' in data && data.startDate ? data.startDate : new Date(); // Use start date as target if provided, else today
                 const planStartDate = startOfDay(subDays(targetDate, 2)); // Context from last few days
                 const planEndDate = endOfDay(targetDate);

                 const planInput: GenerateDailyPlanInput = {
                      targetDate: formatISO(targetDate),
                      recentLogs: formatForFlow(logs.filter(l => l.date >= planStartDate && l.date <= planEndDate), ['date']),
                      tasksForDate: formatForFlow(tasks.filter(t => (t.dueDate && t.dueDate >= startOfDay(targetDate) && t.dueDate <= endOfDay(targetDate)) || t.status !== 'Completed'), ['createdAt', 'dueDate']),
                      eventsForDate: formatForFlow(events.filter(e => e.start >= startOfDay(targetDate) && e.start <= endOfDay(targetDate)), ['start', 'end']),
                      activeGoals: formatForFlow(goals.filter(g => g.status === 'In Progress'), ['createdAt', 'updatedAt', 'targetDate']),
                      activeHabits: formatForFlow(habits, ['createdAt', 'updatedAt', 'lastCompleted']),
                 };
                 const planResult = await generateDailyPlan(planInput);
                 setDailyPlan(planResult);
                 break;


              default:
                  throw new Error("Invalid insight type selected.");
          }

         if (insightType !== 'reflection') {
            toast({ title: "Insights Generated", description: `Successfully generated ${insightType.replace(/([A-Z])/g, ' $1').trim()} insights.` });
         }

      } catch (error) {
        console.error("Failed to generate insights:", error);
        toast({
          title: "Error Generating Insights",
          description: error instanceof Error ? error.message : 'An unknown error occurred. Please try again.',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }, [toast, dataMode, reflectionState, reflectionUserInput]);


     // --- Reflection Input Handler ---
     const handleReflectionResponse = (e: React.FormEvent) => {
         e.preventDefault();
         if (!reflectionUserInput.trim() || isLoading === 'reflection') return;
         onSubmit({ insightType: 'reflection' });
     };


    // --- Dynamic Form Rendering ---
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
                                        {field.value ? format(field.value, 'PPP') : <span>Pick start date</span>}
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
                                        {field.value ? format(field.value, 'PPP') : <span>Pick end date</span>}
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

     const renderFrequencySelector = () => (
         <FormField
             control={form.control} name="frequency"
             render={({ field }) => (
                 <FormItem>
                     <FormLabel>Summarization Period</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                         <FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl>
                         <SelectContent>
                             <SelectItem value="weekly">This Week</SelectItem>
                             <SelectItem value="monthly">This Month</SelectItem>
                         </SelectContent>
                     </Select>
                     <FormMessage />
                 </FormItem>
             )}
         />
     );

   // --- Main Render ---
   return (
     <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold flex items-center gap-2">
           <Lightbulb className="h-8 w-8 text-primary" /> AI Insights & Coaching
         </h1>
       </div>

       {/* Daily Suggestions */}
         <Card className="shadow-md bg-primary/10 border-primary/20">
             <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" /> Daily Suggestions
                  </CardTitle>
                  <CardDescription>Context-aware suggestions for your day.</CardDescription>
             </CardHeader>
             <CardContent>
                 {isLoading === 'dailySuggestion' && !dailySuggestions ? ( // Show skeleton only initially
                     <div className="space-y-3">
                         <Skeleton className="h-5 w-3/4"/>
                         <Skeleton className="h-5 w-1/2"/>
                         <Skeleton className="h-5 w-2/3"/>
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
                  <Button variant="ghost" size="sm" onClick={() => onSubmit({ insightType: 'dailySuggestion'})} disabled={isLoading === 'dailySuggestion'} className="mt-3 text-xs h-7">
                      {isLoading === 'dailySuggestion' ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : null} Refresh Suggestions
                  </Button>
             </CardContent>
         </Card>


       <Card className="shadow-md">
         <CardHeader>
           <CardTitle>Generate Specific Insights</CardTitle>
           <CardDescription>Select the type of insight and parameters to analyze your data ({dataMode === 'mock' ? 'using Mock Data' : 'using Your Data'}).</CardDescription>
         </CardHeader>
         <CardContent>
           <Form {...form}>
             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                 control={form.control}
                 name="insightType"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Analysis / Tool Type</FormLabel>
                     <Select onValueChange={(value: AIServiceType) => {
                         field.onChange(value);
                         if (!['reflection', 'dailySuggestion', 'dailyPlan'].includes(value)) { // Don't clear results for these
                             clearResults();
                         }
                          // Set default dates based on type
                         if (['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk'].includes(value)) {
                              form.setValue('startDate', subDays(new Date(), 7));
                              form.setValue('endDate', new Date());
                          }
                          if (value === 'diarySummary') {
                              form.setValue('frequency', 'weekly');
                              const now = new Date();
                              form.setValue('startDate', startOfWeek(now));
                              form.setValue('endDate', endOfWeek(now));
                          } else if (value === 'reflection') {
                              const now = new Date();
                              form.setValue('startDate', startOfWeek(subDays(now, 7)));
                              form.setValue('endDate', endOfWeek(subDays(now, 7)));
                          } else if (value === 'dailyPlan') {
                             // Default to today for daily plan
                             form.setValue('startDate', startOfDay(new Date()));
                             form.setValue('endDate', endOfDay(new Date()));
                         }

                     }} defaultValue={field.value} value={field.value}>
                       <FormControl><SelectTrigger><SelectValue placeholder="Select analysis/tool" /></SelectTrigger></FormControl>
                       <SelectContent>
                         <SelectItem value="dailySuggestion"><div className="flex items-center gap-2"><Zap className="h-4 w-4" /> Get Daily Suggestions</div></SelectItem>
                         <SelectItem value="dailyPlan"><div className="flex items-center gap-2"><Map className="h-4 w-4" /> Generate Daily Plan</div></SelectItem> {/* Added Daily Plan */}
                         <SelectItem value="productivity"><div className="flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4" /> Productivity Patterns</div></SelectItem>
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

                 {/* Conditionally render date/frequency pickers */}
                 {['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk', 'reflection', 'dailyPlan'].includes(selectedInsightType) && renderDateRangePicker()}
                 {selectedInsightType === 'diarySummary' && renderFrequencySelector()}


                 {!['reflection', 'dailySuggestion'].includes(selectedInsightType) && ( // Exclude button for suggestion/reflection (handled elsewhere)
                      <Button type="submit" disabled={!!isLoading}>
                          {isLoading === selectedInsightType ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                          {isLoading === selectedInsightType ? 'Generating...' : 'Generate Insights'}
                      </Button>
                  )}
                  {/* Display form validation errors */}
                  {form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>)}
                  {form.formState.errors.startDate && !form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.startDate.message}</p>)}
                  {form.formState.errors.frequency && !form.formState.errors.root && (<p className="text-sm font-medium text-destructive">{form.formState.errors.frequency.message}</p>)}
             </form>
           </Form>
         </CardContent>
       </Card>

       {/* Display Insights Area */}
       <div className="space-y-6">
         {isLoading && !['dailySuggestion', 'reflection'].includes(isLoading as AIServiceType) && ( // General loading skeleton for main insights
            <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
          )}

         {/* ----- Render specific insight cards based on state ----- */}

         {/* Daily Plan */}
         {!isLoading && dailyPlan && (
              <Card className="shadow-md bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Map className="h-5 w-5" /> Suggested Daily Plan</CardTitle>
                      <CardDescription>AI-generated plan for {form.getValues("startDate") ? format(form.getValues("startDate")!, 'PPP') : 'today'}.</CardDescription>
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

         {/* Reflection Coach */}
         {selectedInsightType === 'reflection' && (
             <Card className="shadow-md bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300"><BrainCircuit className="h-5 w-5" /> Weekly Reflection Coach</CardTitle>
                      <CardDescription>Reflect on your week {form.getValues("startDate") && form.getValues("endDate") && `from ${format(form.getValues("startDate")!, 'PPP')} to ${format(form.getValues("endDate")!, 'PPP')}`}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                       {isLoading === 'reflection' && !reflectionState.output && (
                          <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
                      )}
                      {/* Display Conversation History */}
                      {reflectionState.conversation.questions.map((q, index) => (
                          <div key={`conv-${index}`} className="space-y-2 mb-3 pb-3 border-b border-purple-100 dark:border-purple-800 last:border-b-0">
                              <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Coach: <span className="font-normal italic">{q}</span></p>
                              {reflectionState.conversation.responses[index] && (
                                  <p className="text-sm pl-4 text-gray-700 dark:text-gray-300">You: <span className="font-normal">{reflectionState.conversation.responses[index]}</span></p>
                              )}
                          </div>
                       ))}

                      {/* Display current AI prompt if reflection is ongoing */}
                      {reflectionState.output && !reflectionState.output.isComplete && (
                          <form onSubmit={handleReflectionResponse} className="space-y-3 mt-4">
                              <Label htmlFor="reflection-response" className="sr-only">Your Response:</Label>
                              <Textarea
                                 id="reflection-response"
                                 placeholder="Your thoughts..."
                                 value={reflectionUserInput}
                                 onChange={(e) => setReflectionUserInput(e.target.value)}
                                 rows={4}
                                 disabled={isLoading === 'reflection'}
                              />
                              <Button type="submit" disabled={isLoading === 'reflection' || !reflectionUserInput.trim()}>
                                 {isLoading === 'reflection' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Send Response
                              </Button>
                          </form>
                      )}

                      {/* Display completion message */}
                      {reflectionState.output?.isComplete && (
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-4">✅ Reflection complete! Great job taking the time to reflect.</p>
                      )}
                       {/* Display AI observation */}
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


         {/* Productivity Insights */}
         {!isLoading && productivityInsights && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5" /> Productivity Patterns Analysis</CardTitle>
                     <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Overall Assessment</h3><p className="text-sm text-secondary-foreground">{productivityInsights.overallAssessment}</p></div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Peak Performance Times</h3><p className="text-sm text-secondary-foreground">{productivityInsights.peakPerformanceTimes}</p></div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Common Distractions/Obstacles</h3><p className="text-sm text-secondary-foreground">{productivityInsights.commonDistractionsOrObstacles}</p></div><Separator/>
                     <div><h3 className="font-semibold text-lg mb-1">Suggested Strategies</h3><p className="text-sm text-secondary-foreground">{productivityInsights.suggestedStrategies}</p></div>
                 </CardContent>
             </Card>
         )}

         {/* Expense Trends */}
         {!isLoading && expenseTrends && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Expense Trend Analysis</CardTitle>
                     <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
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

         {/* Task Completion */}
         {!isLoading && taskCompletion && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> Task Completion Analysis</CardTitle>
                     <CardDescription>Tasks due between {format(form.getValues("startDate")!, 'PPP')} and {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-sm text-muted-foreground">Tasks Due</p><p className="text-xl font-bold">{taskCompletion.totalTasksConsidered}</p></div><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-bold">{taskCompletion.completedTasks}</p></div><div><p className="text-sm text-muted-foreground">Rate</p><p className="text-xl font-bold">{taskCompletion.completionRate.toFixed(0)}%</p></div></div>
                     <Separator />
                      <div><h3 className="font-semibold text-lg mb-1">Completion Summary</h3><p className="text-sm text-secondary-foreground">{taskCompletion.completionSummary}</p></div>
                     <Separator />
                     <div><h3 className="font-semibold text-lg mb-2">Overdue Tasks</h3>{taskCompletion.overdueTasks.length > 0 ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{taskCompletion.overdueTasks.length} Overdue!</AlertTitle><AlertDescription><ul className="list-disc list-inside mt-2 space-y-1">{taskCompletion.overdueTasks.map((task: DisplayTask) => (<li key={task.id} className="text-sm">{task.title} {task.dueDate && `(Due: ${format(parseISO(task.dueDate), 'PP')})`}</li>))}</ul></AlertDescription></Alert>) : (<p className="text-sm text-muted-foreground italic">No overdue tasks. Keep it up!</p>)}</div>
                 </CardContent>
             </Card>
         )}

         {/* Diary Summary */}
         {!isLoading && diarySummary && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Diary Summary</CardTitle>
                     <CardDescription>{`Summary for ${form.getValues("frequency") === 'weekly' ? 'This Week' : 'This Month'} (${diarySummary.entryCount} entries)`} {diarySummary.dateRange && `(${format(parseISO(diarySummary.dateRange.start), 'PP')} - ${format(parseISO(diarySummary.dateRange.end), 'PP')})`}</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                      <div><h3 className="font-semibold text-lg mb-1">Summary</h3><p className="text-sm text-secondary-foreground whitespace-pre-wrap">{diarySummary.summary}</p></div><Separator/>
                      <div><h3 className="font-semibold text-lg mb-1">Key Events</h3>{diarySummary.keyEvents.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.keyEvents.map((event, i) => <li key={`event-${i}`}>{event}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No key events identified.</p>}</div><Separator/>
                      <div><h3 className="font-semibold text-lg mb-1">Dominant Emotions</h3>{diarySummary.emotions.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.emotions.map((emotion, i) => <li key={`emotion-${i}`}>{emotion}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No prominent emotions identified.</p>}</div><Separator/>
                      <div><h3 className="font-semibold text-lg mb-1">Key Reflections/Insights</h3>{diarySummary.reflections.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.reflections.map((reflection, i) => <li key={`reflection-${i}`}>{reflection}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No specific reflections identified.</p>}</div>
                 </CardContent>
             </Card>
         )}

         {/* Sentiment Analysis */}
          {!isLoading && sentimentAnalysis && (
              <Card className="shadow-md bg-secondary/30">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5" /> Sentiment Analysis</CardTitle>
                       <CardDescription>Sentiment trends from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')} ({sentimentAnalysis.entryCount} entries)</CardDescription>
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

          {/* Life Balance */}
           {!isLoading && lifeBalance && (
              <Card className="shadow-md bg-secondary/30">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Life Balance Assessment</CardTitle>
                      <CardDescription>Distribution of focus from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}.</CardDescription>
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

          {/* Burnout Risk */}
          {!isLoading && burnoutRisk && (
              <Card className="shadow-md bg-secondary/30">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Burnout Risk Estimation</CardTitle>
                      <CardDescription>Assessment from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}.</CardDescription>
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

       </div> {/* End Display Insights Area */}
     </div> // End Container
   );
 };

 export default InsightsPage;
