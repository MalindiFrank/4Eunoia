'use client';

import type { FC } from 'react';
import React, { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, formatISO, parseISO } from 'date-fns'; // Import formatISO and parseISO
import { Lightbulb, BrainCircuit, Calendar as CalendarIcon, Activity, BarChartHorizontalBig, Wallet, ListTodo, AlertCircle } from 'lucide-react';

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

// Import AI functions and types
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
  // Re-import the Zod schema to infer the correct output type including string dates
  AnalyzeTaskCompletionOutputSchema
} from '@/ai/flows/analyze-task-completion';

// Infer the DisplayTask type directly from the updated output schema
// which now correctly defines overdueTasks with dueDate as string().datetime().optional()
type DisplayTask = z.infer<typeof AnalyzeTaskCompletionOutputSchema['shape']['overdueTasks']['element']>;


const insightsRequestSchema = z.object({
  insightType: z.enum(['productivity', 'diarySummary', 'expenseTrends', 'taskCompletion']),
  startDate: z.date().optional(), // Use Date for form, convert before sending
  endDate: z.date().optional(), // Use Date for form, convert before sending
  frequency: z.enum(['weekly', 'monthly']).optional(), // For diary summary
}).refine(data => {
    // Require date range for productivity, expenses, and tasks
    if (['productivity', 'expenseTrends', 'taskCompletion'].includes(data.insightType) && (!data.startDate || !data.endDate)) {
        return false;
    }
    // Require frequency for diary summary
    if (data.insightType === 'diarySummary' && !data.frequency) {
        return false;
    }
    // Ensure end date is not before start date
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Valid date range is required for Productivity, Expense, and Task insights. Frequency is required for Diary summaries. End date cannot be before start date.",
    path: ["startDate"], // Attach error message generally or to a specific field
});


type InsightsRequestFormValues = z.infer<typeof insightsRequestSchema>;

const InsightsPage: FC = () => {
  const [productivityInsights, setProductivityInsights] = useState<AnalyzeProductivityPatternsOutput | null>(null);
  const [diarySummary, setDiarySummary] = useState<SummarizeDiaryEntriesOutput | null>(null);
  const [expenseTrends, setExpenseTrends] = useState<AnalyzeExpenseTrendsOutput | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<AnalyzeTaskCompletionOutput | null>(null);
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
   };

  const onSubmit = useCallback(async (data: InsightsRequestFormValues) => {
    setIsLoading(true);
    clearResults(); // Clear previous insights

    try {
       const requiresDateRange = ['productivity', 'expenseTrends', 'taskCompletion'].includes(data.insightType);
       if (requiresDateRange && (!data.startDate || !data.endDate)) {
           toast({ title: "Error", description: "Please select a start and end date for this insight type.", variant: "destructive" });
           setIsLoading(false);
           return;
       }

       if (data.startDate && data.endDate && data.endDate < data.startDate) {
            toast({ title: "Error", description: "End date cannot be before start date.", variant: "destructive" });
            setIsLoading(false);
            return;
       }


       if (data.insightType === 'productivity') {
            // Convert Date objects to ISO strings before sending
            const input: AnalyzeProductivityPatternsInput = {
                startDate: formatISO(data.startDate!),
                endDate: formatISO(data.endDate!),
            };
            const result = await analyzeProductivityPatterns(input);
            setProductivityInsights(result);
            toast({ title: "Productivity Analysis Complete", description: "Insights generated successfully." });

       } else if (data.insightType === 'diarySummary') {
           if (!data.frequency) {
                toast({ title: "Error", description: "Please select a frequency for diary summary.", variant: "destructive" });
                setIsLoading(false);
                return;
           }
           // Fetch actual diary entries based on frequency/date range is now handled *inside* the flow
           const input: SummarizeDiaryEntriesInput = {
                frequency: data.frequency,
           };
            const result = await summarizeDiaryEntries(input);
            setDiarySummary(result);
            toast({ title: "Diary Summary Complete", description: "Summary generated successfully." });
       } else if (data.insightType === 'expenseTrends') {
             // Convert Date objects to ISO strings before sending
            const input: AnalyzeExpenseTrendsInput = {
                startDate: formatISO(data.startDate!),
                endDate: formatISO(data.endDate!),
            };
            const result = await analyzeExpenseTrends(input);
            setExpenseTrends(result);
            toast({ title: "Expense Trend Analysis Complete", description: "Insights generated successfully." });
       } else if (data.insightType === 'taskCompletion') {
             // Convert Date objects to ISO strings before sending
            const input: AnalyzeTaskCompletionInput = {
                startDate: formatISO(data.startDate!),
                endDate: formatISO(data.endDate!),
            };
            const result = await analyzeTaskCompletion(input);
            setTaskCompletion(result);
             toast({ title: "Task Completion Analysis Complete", description: "Insights generated successfully." });
       }

    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast({
        title: "Error Generating Insights",
        description: `An error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Added toast dependency

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
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        clearResults(); // Clear results when type changes
                        // Reset dates if switching away from diary summary to a date-based one
                        if (value !== 'diarySummary' && (!form.getValues("startDate") || !form.getValues("endDate"))) {
                             form.setValue('startDate', new Date(new Date().setDate(new Date().getDate() - 30)));
                             form.setValue('endDate', new Date());
                        }
                         // Reset frequency if switching away from diary summary
                        if (value !== 'diarySummary') {
                            form.setValue('frequency', undefined);
                        } else if (!form.getValues('frequency')){
                             form.setValue('frequency', 'weekly'); // Default frequency if switching to diary
                        }
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insight type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="productivity">
                            <div className="flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4" /> Productivity Patterns</div>
                        </SelectItem>
                         <SelectItem value="expenseTrends">
                             <div className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Expense Trends</div>
                         </SelectItem>
                         <SelectItem value="taskCompletion">
                              <div className="flex items-center gap-2"><ListTodo className="h-4 w-4" /> Task Completion</div>
                          </SelectItem>
                        <SelectItem value="diarySummary">
                             <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Diary Summary</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

             {['productivity', 'expenseTrends', 'taskCompletion'].includes(selectedInsightType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? format(field.value, 'PPP') : <span>Pick a start date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? format(field.value, 'PPP') : <span>Pick an end date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date() || date < (form.getValues("startDate") || new Date('1900-01-01'))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </div>
             )}

              {selectedInsightType === 'diarySummary' && (
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summarization Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">This Week</SelectItem>
                            <SelectItem value="monthly">This Month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}


              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Insights'}
                {!isLoading && <BrainCircuit className="ml-2 h-4 w-4" />}
              </Button>
                 {form.formState.errors.root && (
                      <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
                 )}
                 {form.formState.errors.startDate && !form.formState.errors.root && ( // Show field specific if root error not present
                     <p className="text-sm font-medium text-destructive">{form.formState.errors.startDate.message}</p>
                 )}
                 {form.formState.errors.frequency && !form.formState.errors.root && (
                      <p className="text-sm font-medium text-destructive">{form.formState.errors.frequency.message}</p>
                  )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Display Insights */}
      <div className="space-y-6">
        {isLoading && (
           <Card>
               <CardHeader>
                   <Skeleton className="h-6 w-3/4" />
               </CardHeader>
               <CardContent className="space-y-4">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-5/6" />
                   <Skeleton className="h-4 w-full" />
               </CardContent>
           </Card>
         )}

          {productivityInsights && !isLoading && form.getValues("startDate") && form.getValues("endDate") && ( // Ensure dates exist
              <Card className="shadow-md bg-secondary/30">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5" /> Productivity Patterns Analysis</CardTitle>
                   <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div>
                      <h3 className="font-semibold text-lg mb-1">Overall Assessment</h3>
                      <p className="text-sm text-secondary-foreground">{productivityInsights.overallAssessment}</p>
                  </div>
                   <div>
                      <h3 className="font-semibold text-lg mb-1">Peak Performance Times</h3>
                      <p className="text-sm text-secondary-foreground">{productivityInsights.peakPerformanceTimes}</p>
                  </div>
                   <div>
                      <h3 className="font-semibold text-lg mb-1">Common Distractions/Obstacles</h3> {/* Updated field name */}
                      <p className="text-sm text-secondary-foreground">{productivityInsights.commonDistractionsOrObstacles}</p>
                  </div>
                   <div>
                      <h3 className="font-semibold text-lg mb-1">Suggested Strategies</h3>
                      <p className="text-sm text-secondary-foreground">{productivityInsights.suggestedStrategies}</p>
                  </div>
              </CardContent>
              </Card>
          )}

          {expenseTrends && !isLoading && form.getValues("startDate") && form.getValues("endDate") && ( // Ensure dates exist
             <Card className="shadow-md bg-secondary/30">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Expense Trend Analysis</CardTitle>
                 <CardDescription>Based on data from {format(form.getValues("startDate")!, 'PPP')} to {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div>
                      <h3 className="font-semibold text-lg mb-1">Spending Summary</h3>
                      <p className="text-sm text-secondary-foreground">{expenseTrends.spendingSummary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                         <p className="text-sm text-muted-foreground">Total Spending</p>
                         <p className="text-xl font-bold">${expenseTrends.totalSpending.toFixed(2)}</p>
                     </div>
                      <div>
                         <p className="text-sm text-muted-foreground">Avg. Daily Spending</p>
                          <p className="text-xl font-bold">${expenseTrends.averageDailySpending.toFixed(2)}</p>
                      </div>
                  </div>
                  <Separator />
                   <div>
                     <h3 className="font-semibold text-lg mb-2">Top Spending Categories</h3>
                      {expenseTrends.topSpendingCategories.length > 0 ? (
                         <ul className="space-y-2">
                             {expenseTrends.topSpendingCategories.map((cat) => (
                                <li key={cat.category} className="flex justify-between items-center text-sm">
                                    <span>{cat.category}</span>
                                    <span className="font-medium">${cat.amount.toFixed(2)} <span className="text-xs text-muted-foreground">({cat.percentage.toFixed(1)}%)</span></span>
                                </li>
                             ))}
                         </ul>
                      ) : <p className="text-sm text-muted-foreground italic">No spending data found for this period.</p>}
                 </div>
               </CardContent>
             </Card>
          )}

          {taskCompletion && !isLoading && form.getValues("startDate") && form.getValues("endDate") && ( // Ensure dates exist
              <Card className="shadow-md bg-secondary/30">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> Task Completion Analysis</CardTitle>
                  <CardDescription>Based on tasks due between {format(form.getValues("startDate")!, 'PPP')} and {format(form.getValues("endDate")!, 'PPP')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div>
                      <h3 className="font-semibold text-lg mb-1">Completion Summary</h3>
                      <p className="text-sm text-secondary-foreground">{taskCompletion.completionSummary}</p>
                  </div>
                   <div className="grid grid-cols-3 gap-4 text-center">
                     <div>
                         <p className="text-sm text-muted-foreground">Tasks Due</p>
                         <p className="text-xl font-bold">{taskCompletion.totalTasksConsidered}</p>
                     </div>
                      <div>
                         <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-xl font-bold">{taskCompletion.completedTasks}</p>
                      </div>
                      <div>
                         <p className="text-sm text-muted-foreground">Completion Rate</p>
                          <p className="text-xl font-bold">{taskCompletion.completionRate.toFixed(1)}%</p>
                      </div>
                  </div>
                  <Separator />
                  <div>
                       <h3 className="font-semibold text-lg mb-2">Overdue Tasks (from this period)</h3>
                       {taskCompletion.overdueTasks.length > 0 ? (
                           <Alert variant="destructive">
                               <AlertCircle className="h-4 w-4" />
                               <AlertTitle>{taskCompletion.overdueTasks.length} Overdue Task{taskCompletion.overdueTasks.length > 1 ? 's' : ''}!</AlertTitle>
                               <AlertDescription>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        {taskCompletion.overdueTasks.map((task: DisplayTask) => ( // Use DisplayTask type
                                            <li key={task.id} className="text-sm">
                                                {task.title} {task.dueDate && `(Due: ${format(parseISO(task.dueDate), 'PP')})`} {/* Parse ISO string before formatting */}
                                            </li>
                                        ))}
                                    </ul>
                               </AlertDescription>
                           </Alert>
                       ) : (
                           <p className="text-sm text-muted-foreground italic">No overdue tasks found for tasks due in this period. Keep it up!</p>
                       )}
                   </div>
              </CardContent>
              </Card>
          )}


          {diarySummary && !isLoading && (
               <Card className="shadow-md bg-secondary/30">
               <CardHeader>
                   <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Diary Summary</CardTitle>
                    <CardDescription>
                        {`Summary for ${form.getValues("frequency") === 'weekly' ? 'This Week' : 'This Month'} (${diarySummary.entryCount} ${diarySummary.entryCount === 1 ? 'entry' : 'entries'})`}
                        {diarySummary.dateRange && ` from ${format(parseISO(diarySummary.dateRange.start as unknown as string), 'PPP')} to ${format(parseISO(diarySummary.dateRange.end as unknown as string), 'PPP')}`} {/* Parse dates before formatting */}
                    </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                   <div>
                       <h3 className="font-semibold text-lg mb-1">Summary</h3>
                       <p className="text-sm text-secondary-foreground">{diarySummary.summary}</p>
                   </div>
                    <div>
                       <h3 className="font-semibold text-lg mb-1">Key Events</h3>
                        {diarySummary.keyEvents.length > 0 ? (
                           <ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">
                               {diarySummary.keyEvents.map((event, i) => <li key={`event-${i}`}>{event}</li>)}
                           </ul>
                        ) : <p className="text-sm text-muted-foreground italic">No specific key events identified.</p>}
                   </div>
                    <div>
                       <h3 className="font-semibold text-lg mb-1">Emotions</h3>
                       {diarySummary.emotions.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">
                              {diarySummary.emotions.map((emotion, i) => <li key={`emotion-${i}`}>{emotion}</li>)}
                          </ul>
                       ) : <p className="text-sm text-muted-foreground italic">No prominent emotions identified.</p>}
                   </div>
                    <div>
                       <h3 className="font-semibold text-lg mb-1">Reflections</h3>
                       {diarySummary.reflections.length > 0 ? (
                           <ul className="list-disc list-inside text-sm text-secondary-foreground space-y-1">
                               {diarySummary.reflections.map((reflection, i) => <li key={`reflection-${i}`}>{reflection}</li>)}
                           </ul>
                       ) : <p className="text-sm text-muted-foreground italic">No specific reflections identified.</p>}
                   </div>
               </CardContent>
               </Card>
          )}
      </div>

    </div>
  );
};

export default InsightsPage;
