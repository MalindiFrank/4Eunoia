{'use client';

import type { FC } from 'react';
import React, { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, formatISO, parseISO } from 'date-fns';
import { Lightbulb, BrainCircuit, Calendar as CalendarIcon, Activity, BarChartHorizontalBig, Wallet, ListTodo, AlertCircle, Smile, Scale, Flame } from 'lucide-react'; // Added new icons

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
import { Progress } from '@/components/ui/progress'; // For Burnout Meter

// --- Import Existing AI Flows ---
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
  AnalyzeTaskCompletionOutputSchema, // Keep using schema to infer type
} from '@/ai/flows/analyze-task-completion';

// --- Import NEW AI Flows (Create these files next) ---
import {
    analyzeSentimentTrends,
    AnalyzeSentimentTrendsInput,
    AnalyzeSentimentTrendsOutput,
} from '@/ai/flows/analyze-sentiment-trends'; // New
import {
    assessLifeBalance,
    AssessLifeBalanceInput,
    AssessLifeBalanceOutput,
} from '@/ai/flows/assess-life-balance'; // New
import {
    estimateBurnoutRisk,
    EstimateBurnoutRiskInput,
    EstimateBurnoutRiskOutput,
} from '@/ai/flows/estimate-burnout-risk'; // New


// --- Types ---
type DisplayTask = z.infer<typeof AnalyzeTaskCompletionOutputSchema['shape']['overdueTasks']['element']>;
type InsightType = 'productivity' | 'diarySummary' | 'expenseTrends' | 'taskCompletion' | 'sentimentAnalysis' | 'lifeBalance' | 'burnoutRisk';

// --- Form Schema ---
const insightsRequestSchema = z.object({
  insightType: z.enum(['productivity', 'diarySummary', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis', 'lifeBalance', 'burnoutRisk']),
  startDate: z.date().optional(), // Use Date for form, convert before sending
  endDate: z.date().optional(), // Use Date for form, convert before sending
  frequency: z.enum(['weekly', 'monthly']).optional(), // For diary summary & sentiment
}).refine(data => {
    // Date range required for productivity, expenses, tasks, sentiment
    const requiresDateRange: InsightType[] = ['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis'];
    if (requiresDateRange.includes(data.insightType) && (!data.startDate || !data.endDate)) {
        return false;
    }
    // Frequency required for diary summary
    if (data.insightType === 'diarySummary' && !data.frequency) {
        return false;
    }
     // Life Balance and Burnout don't strictly need range/frequency from user (can use default like 'last 30 days')
    // Ensure end date is not before start date if both exist
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Valid date range required for Productivity, Expense, Task, and Sentiment insights. Frequency required for Diary summaries. End date cannot be before start date.",
    path: ["startDate"], // Attach error message generally or to a specific field
});

type InsightsRequestFormValues = z.infer<typeof insightsRequestSchema>;

// --- Component ---
const InsightsPage: FC = () => {
  // State for each insight type
  const [productivityInsights, setProductivityInsights] = useState<AnalyzeProductivityPatternsOutput | null>(null);
  const [diarySummary, setDiarySummary] = useState<SummarizeDiaryEntriesOutput | null>(null);
  const [expenseTrends, setExpenseTrends] = useState<AnalyzeExpenseTrendsOutput | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<z.infer<typeof AnalyzeTaskCompletionOutputSchema> | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<AnalyzeSentimentTrendsOutput | null>(null); // New
  const [lifeBalance, setLifeBalance] = useState<AssessLifeBalanceOutput | null>(null); // New
  const [burnoutRisk, setBurnoutRisk] = useState<EstimateBurnoutRiskOutput | null>(null); // New

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsightsRequestFormValues>({
    resolver: zodResolver(insightsRequestSchema),
    defaultValues: {
      insightType: 'productivity',
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
      endDate: new Date(),
      frequency: 'weekly',
    },
  });

   const selectedInsightType = form.watch('insightType');

   const clearResults = () => {
     setProductivityInsights(null);
     setDiarySummary(null);
     setExpenseTrends(null);
     setTaskCompletion(null);
     setSentimentAnalysis(null);
     setLifeBalance(null);
     setBurnoutRisk(null);
   };

   // --- API Call Logic ---
   const onSubmit = useCallback(async (data: InsightsRequestFormValues) => {
     setIsLoading(true);
     clearResults(); // Clear previous insights

     try {
       const { insightType, startDate, endDate, frequency } = data;

       // --- Input Validation ---
        const requiresDateRange: InsightType[] = ['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis'];
       if (requiresDateRange.includes(insightType) && (!startDate || !endDate)) {
           throw new Error("Please select a start and end date for this insight type.");
       }
       if (startDate && endDate && endDate < startDate) {
           throw new Error("End date cannot be before start date.");
       }
        if (insightType === 'diarySummary' && !frequency) {
            throw new Error("Please select a frequency for diary summary.");
        }
       // --- End Validation ---

       // Prepare common date inputs
       const dateInput = startDate && endDate ? { startDate: formatISO(startDate), endDate: formatISO(endDate) } : {};

        switch (insightType) {
             case 'productivity':
                 const prodResult = await analyzeProductivityPatterns(dateInput as AnalyzeProductivityPatternsInput);
                 setProductivityInsights(prodResult);
                 break;
             case 'diarySummary':
                 const diaryResult = await summarizeDiaryEntries({ frequency: frequency! } as SummarizeDiaryEntriesInput);
                 setDiarySummary(diaryResult);
                 break;
             case 'expenseTrends':
                 const expenseResult = await analyzeExpenseTrends(dateInput as AnalyzeExpenseTrendsInput);
                 setExpenseTrends(expenseResult);
                 break;
             case 'taskCompletion':
                 const taskResult = await analyzeTaskCompletion(dateInput as AnalyzeTaskCompletionInput);
                 setTaskCompletion(taskResult);
                 break;
             case 'sentimentAnalysis':
                  // Assume sentiment analysis also needs a date range for now
                  const sentimentResult = await analyzeSentimentTrends(dateInput as AnalyzeSentimentTrendsInput);
                  setSentimentAnalysis(sentimentResult);
                  break;
             case 'lifeBalance':
                  // Life balance might analyze overall data, or optionally take a range
                  const balanceResult = await assessLifeBalance({ /* Optionally pass date range if needed */ } as AssessLifeBalanceInput);
                  setLifeBalance(balanceResult);
                  break;
             case 'burnoutRisk':
                  // Burnout risk might analyze recent data (e.g., last 30 days)
                  const burnoutResult = await estimateBurnoutRisk({ /* Optionally pass configuration */ } as EstimateBurnoutRiskInput);
                  setBurnoutRisk(burnoutResult);
                  break;
             default:
                 // Should not happen with enum type
                 throw new Error("Invalid insight type selected.");
         }

        toast({ title: "Insights Generated", description: `Successfully generated ${insightType} insights.` });

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
   }, [toast]);

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
          <Lightbulb className="h-8 w-8 text-primary" /> AI Insights
        </h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Generate Insights</CardTitle>
          <CardDescription>Select the type of insight and parameters to analyze your data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="insightType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insight Type</FormLabel>
                    <Select onValueChange={(value: InsightType) => {
                        field.onChange(value);
                        clearResults(); // Clear results when type changes
                        const requiresRange: InsightType[] = ['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis'];
                        const requiresFreq: InsightType[] = ['diarySummary']; // Removed sentiment for now

                        // Reset dates if switching to a type needing them and they aren't set
                        if (requiresRange.includes(value) && (!form.getValues("startDate") || !form.getValues("endDate"))) {
                            form.setValue('startDate', new Date(new Date().setDate(new Date().getDate() - 30)));
                            form.setValue('endDate', new Date());
                        }
                        // Reset frequency if switching to a type needing it and it isn't set
                         if (requiresFreq.includes(value) && !form.getValues('frequency')){
                             form.setValue('frequency', 'weekly'); // Default frequency
                        }
                    }} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select insight type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="productivity"><div className="flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4" /> Productivity Patterns</div></SelectItem>
                        <SelectItem value="expenseTrends"><div className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Expense Trends</div></SelectItem>
                        <SelectItem value="taskCompletion"><div className="flex items-center gap-2"><ListTodo className="h-4 w-4" /> Task Completion</div></SelectItem>
                        <SelectItem value="sentimentAnalysis"><div className="flex items-center gap-2"><Smile className="h-4 w-4" /> Sentiment Analysis</div></SelectItem>
                        <SelectItem value="diarySummary"><div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Diary Summary</div></SelectItem>
                        <SelectItem value="lifeBalance"><div className="flex items-center gap-2"><Scale className="h-4 w-4" /> Life Balance Assessment</div></SelectItem>
                        <SelectItem value="burnoutRisk"><div className="flex items-center gap-2"><Flame className="h-4 w-4" /> Burnout Risk Estimation</div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

                {/* Conditionally render date/frequency pickers */}
                {['productivity', 'expenseTrends', 'taskCompletion', 'sentimentAnalysis'].includes(selectedInsightType) && renderDateRangePicker()}
                {selectedInsightType === 'diarySummary' && renderFrequencySelector()}


              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Insights'}
                {!isLoading && <BrainCircuit className="ml-2 h-4 w-4" />}
              </Button>
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
        {isLoading && ( // Show skeleton loaders while loading
           <Card>
               <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
               <CardContent className="space-y-4">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-5/6" />
                   <Skeleton className="h-4 w-full" />
               </CardContent>
           </Card>
         )}

        {/* Render specific insight cards based on state */}
        {!isLoading && productivityInsights && form.getValues("startDate") && form.getValues("endDate") && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5" /> Productivity Patterns Analysis</CardTitle>
                    <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* ... Productivity content ... */}
                    <div><h3 className="font-semibold text-lg mb-1">Overall Assessment</h3><p className="text-sm text-secondary-foreground">{productivityInsights.overallAssessment}</p></div>
                    <div><h3 className="font-semibold text-lg mb-1">Peak Performance Times</h3><p className="text-sm text-secondary-foreground">{productivityInsights.peakPerformanceTimes}</p></div>
                    <div><h3 className="font-semibold text-lg mb-1">Common Distractions/Obstacles</h3><p className="text-sm text-secondary-foreground">{productivityInsights.commonDistractionsOrObstacles}</p></div>
                    <div><h3 className="font-semibold text-lg mb-1">Suggested Strategies</h3><p className="text-sm text-secondary-foreground">{productivityInsights.suggestedStrategies}</p></div>
                </CardContent>
            </Card>
        )}

        {!isLoading && expenseTrends && form.getValues("startDate") && form.getValues("endDate") && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Expense Trend Analysis</CardTitle>
                    <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* ... Expense content ... */}
                    <div><h3 className="font-semibold text-lg mb-1">Spending Summary</h3><p className="text-sm text-secondary-foreground">{expenseTrends.spendingSummary}</p></div>
                    <div className="grid grid-cols-2 gap-4"><p className="text-sm text-muted-foreground">Total Spending</p><p className="text-xl font-bold">${expenseTrends.totalSpending.toFixed(2)}</p></div>
                    <div className="grid grid-cols-2 gap-4"><p className="text-sm text-muted-foreground">Avg. Daily Spending</p><p className="text-xl font-bold">${expenseTrends.averageDailySpending.toFixed(2)}</p></div>
                    <Separator />
                    <div><h3 className="font-semibold text-lg mb-2">Top Spending Categories</h3>{expenseTrends.topSpendingCategories.length > 0 ? (<ul className="space-y-2">{expenseTrends.topSpendingCategories.map((cat) => (<li key={cat.category} className="flex justify-between items-center text-sm"><span>{cat.category}</span><span className="font-medium">${cat.amount.toFixed(2)} <span className="text-xs text-muted-foreground">({cat.percentage.toFixed(1)}%)</span></span></li>))}</ul>) : <p className="text-sm text-muted-foreground italic">No spending data.</p>}</div>
                </CardContent>
            </Card>
        )}

        {!isLoading && taskCompletion && form.getValues("startDate") && form.getValues("endDate") && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> Task Completion Analysis</CardTitle>
                    <CardDescription>Tasks due between {format(form.getValues("startDate")!, 'PPP')} and {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* ... Task completion content ... */}
                     <div><h3 className="font-semibold text-lg mb-1">Completion Summary</h3><p className="text-sm text-secondary-foreground">{taskCompletion.completionSummary}</p></div>
                     <div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-sm text-muted-foreground">Tasks Due</p><p className="text-xl font-bold">{taskCompletion.totalTasksConsidered}</p></div><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-bold">{taskCompletion.completedTasks}</p></div><div><p className="text-sm text-muted-foreground">Rate</p><p className="text-xl font-bold">{taskCompletion.completionRate.toFixed(1)}%</p></div></div>
                    <Separator />
                    <div><h3 className="font-semibold text-lg mb-2">Overdue Tasks</h3>{taskCompletion.overdueTasks.length > 0 ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{taskCompletion.overdueTasks.length} Overdue!</AlertTitle><AlertDescription><ul className="list-disc list-inside mt-2 space-y-1">{taskCompletion.overdueTasks.map((task: DisplayTask) => (<li key={task.id} className="text-sm">{task.title} {task.dueDate && `(Due: ${format(parseISO(task.dueDate), 'PP')})`}</li>))}</ul></AlertDescription></Alert>) : (<p className="text-sm text-muted-foreground italic">No overdue tasks. Keep it up!</p>)}</div>
                </CardContent>
            </Card>
        )}

        {!isLoading && diarySummary && (
            <Card className="shadow-md bg-secondary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Diary Summary</CardTitle>
                    <CardDescription>{`Summary for ${form.getValues("frequency") === 'weekly' ? 'This Week' : 'This Month'} (${diarySummary.entryCount} entries)`} {diarySummary.dateRange && `(${format(parseISO(diarySummary.dateRange.start), 'PP')} - ${format(parseISO(diarySummary.dateRange.end), 'PP')})`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* ... Diary summary content ... */}
                     <div><h3 className="font-semibold text-lg mb-1">Summary</h3><p className="text-sm text-secondary-foreground">{diarySummary.summary}</p></div>
                     <div><h3 className="font-semibold text-lg mb-1">Key Events</h3>{diarySummary.keyEvents.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.keyEvents.map((event, i) => <li key={`event-${i}`}>{event}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No key events identified.</p>}</div>
                     <div><h3 className="font-semibold text-lg mb-1">Emotions</h3>{diarySummary.emotions.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.emotions.map((emotion, i) => <li key={`emotion-${i}`}>{emotion}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No prominent emotions identified.</p>}</div>
                     <div><h3 className="font-semibold text-lg mb-1">Reflections</h3>{diarySummary.reflections.length > 0 ? (<ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">{diarySummary.reflections.map((reflection, i) => <li key={`reflection-${i}`}>{reflection}</li>)}</ul>) : <p className="text-sm text-muted-foreground italic">No specific reflections identified.</p>}</div>
                </CardContent>
            </Card>
        )}

        {/* NEW Insight Cards */}
         {!isLoading && sentimentAnalysis && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5" /> Sentiment Analysis</CardTitle>
                      {/* Assume sentiment analysis used the same date range */}
                      {form.getValues("startDate") && form.getValues("endDate") && (
                         <CardDescription>Sentiment trends from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
                      )}
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Overall Sentiment</h3><p className="text-sm text-secondary-foreground">{sentimentAnalysis.overallSentiment}</p></div>
                     <div><h3 className="font-semibold text-lg mb-1">Key Positive Themes</h3><ul className="list-disc list-inside text-sm">{sentimentAnalysis.positiveKeywords.map(k=><li key={k}>{k}</li>)}</ul></div>
                     <div><h3 className="font-semibold text-lg mb-1">Key Negative Themes</h3><ul className="list-disc list-inside text-sm">{sentimentAnalysis.negativeKeywords.map(k=><li key={k}>{k}</li>)}</ul></div>
                     <div><h3 className="font-semibold text-lg mb-1">Analysis Summary</h3><p className="text-sm text-secondary-foreground">{sentimentAnalysis.analysisSummary}</p></div>
                     {/* TODO: Add sentiment chart */}
                 </CardContent>
             </Card>
         )}

          {!isLoading && lifeBalance && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Life Balance Assessment</CardTitle>
                     <CardDescription>Distribution of focus across life areas (based on recent data).</CardDescription>
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
                     <div><h3 className="font-semibold text-lg mb-2">Focus Distribution</h3>
                        {/* TODO: Replace with a Pie chart or similar visualization */}
                        <ul className="space-y-1 text-sm">
                             {lifeBalance.areaScores.map(area => (
                                <li key={area.area} className="flex justify-between"><span>{area.area}</span> <span className="font-medium">{area.score}%</span></li>
                            ))}
                        </ul>
                     </div>
                 </CardContent>
             </Card>
         )}

         {!isLoading && burnoutRisk && (
             <Card className="shadow-md bg-secondary/30">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Burnout Risk Estimation</CardTitle>
                     <CardDescription>Assessment based on recent activity, mood, and task load.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div><h3 className="font-semibold text-lg mb-1">Risk Level: {burnoutRisk.riskLevel}</h3>
                        <Progress value={burnoutRisk.riskScore} className="h-2 my-2" />
                        <p className="text-sm text-secondary-foreground">{burnoutRisk.assessmentSummary}</p>
                     </div>
                     <div><h3 className="font-semibold text-lg mb-1">Contributing Factors</h3><ul className="list-disc list-inside text-sm">{burnoutRisk.contributingFactors.map(f=><li key={f}>{f}</li>)}</ul></div>
                     <div><h3 className="font-semibold text-lg mb-1">Recommendations</h3><ul className="list-disc list-inside text-sm">{burnoutRisk.recommendations.map(r=><li key={r}>{r}</li>)}</ul></div>
                 </CardContent>
             </Card>
         )}

      </div> {/* End Display Insights Area */}
    </div> // End Container
  );
};

export default InsightsPage;
