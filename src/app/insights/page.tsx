'use client';

import type { FC } from 'react';
import React, { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Lightbulb, BrainCircuit, Calendar as CalendarIcon, Activity, BarChartHorizontalBig } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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


const insightsRequestSchema = z.object({
  insightType: z.enum(['productivity', 'diarySummary']),
  startDate: z.date().optional(), // Optional for diary summary
  endDate: z.date().optional(), // Optional for diary summary
  frequency: z.enum(['weekly', 'monthly']).optional(), // For diary summary
}).refine(data => {
    // Require date range for productivity analysis
    if (data.insightType === 'productivity' && (!data.startDate || !data.endDate)) {
        return false;
    }
    // Require frequency for diary summary
    if (data.insightType === 'diarySummary' && !data.frequency) {
        return false;
    }
    return true;
}, {
    message: "Date range is required for productivity insights, and frequency is required for diary summaries.",
    path: ["startDate"], // Attach error message generally or to a specific field
});


type InsightsRequestFormValues = z.infer<typeof insightsRequestSchema>;

const InsightsPage: FC = () => {
  const [productivityInsights, setProductivityInsights] = useState<AnalyzeProductivityPatternsOutput | null>(null);
  const [diarySummary, setDiarySummary] = useState<SummarizeDiaryEntriesOutput | null>(null);
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

  const onSubmit = useCallback(async (data: InsightsRequestFormValues) => {
    setIsLoading(true);
    setProductivityInsights(null); // Clear previous insights
    setDiarySummary(null);

    try {
       if (data.insightType === 'productivity') {
           if (!data.startDate || !data.endDate) {
               toast({ title: "Error", description: "Please select a start and end date for productivity analysis.", variant: "destructive" });
               setIsLoading(false);
               return;
           }
            const input: AnalyzeProductivityPatternsInput = {
                startDate: data.startDate,
                endDate: data.endDate,
                // additionalContext: "Optional context here" // Add if needed
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
           // TODO: Fetch actual diary entries based on frequency/date range
            const mockDiaryEntries = [
                { date: new Date(new Date().setDate(new Date().getDate() - 2)), text: "Had a productive morning working on the project. Felt focused." },
                { date: new Date(new Date().setDate(new Date().getDate() - 1)), text: "Meeting went well, but felt drained afterwards. Need better energy management." },
                { date: new Date(), text: "Reflecting on the week. Good progress overall, but some distractions." }
            ];
           const input: SummarizeDiaryEntriesInput = {
                diaryEntries: mockDiaryEntries, // Replace with actual fetched entries
                frequency: data.frequency,
           };
            const result = await summarizeDiaryEntries(input);
            setDiarySummary(result);
            toast({ title: "Diary Summary Complete", description: "Summary generated successfully." });
       }

    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast({
        title: "Error Generating Insights",
        description: "An error occurred while processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insight type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="productivity">
                            <div className="flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4" /> Productivity Patterns</div>
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

             {selectedInsightType === 'productivity' && (
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
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

        {productivityInsights && !isLoading && (
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
                    <h3 className="font-semibold text-lg mb-1">Recurring Obstacles</h3>
                    <p className="text-sm text-secondary-foreground">{productivityInsights.recurringObstacles}</p>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg mb-1">Suggested Strategies</h3>
                    <p className="text-sm text-secondary-foreground">{productivityInsights.suggestedStrategies}</p>
                </div>
            </CardContent>
            </Card>
        )}

        {diarySummary && !isLoading && (
             <Card className="shadow-md bg-secondary/30">
             <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Diary Summary ({form.getValues("frequency")})</CardTitle>
                  <CardDescription>Insights from your recent diary entries.</CardDescription>
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
  );
};

export default InsightsPage;
