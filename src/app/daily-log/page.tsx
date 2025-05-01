'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Smile } from 'lucide-react'; // Import Smile icon

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components

// Local storage key
const LOCAL_STORAGE_KEY = 'prodev-daily-logs';

// --- Types and Schemas ---
const moodOptions = ['😊 Happy', '😌 Calm', '😕 Neutral', '😟 Anxious', '😢 Sad', '😠 Stressed', '⚡ Productive', '😴 Tired', '❓ Other'] as const;
type Mood = typeof moodOptions[number]; // Type based on the actual values

const logEntrySchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  activity: z.string().min(1, 'Activity description cannot be empty.'),
  mood: z.enum(moodOptions).optional(), // Make mood optional or required as needed
  notes: z.string().optional(),
  diaryEntry: z.string().optional(),
});

type LogEntryFormValues = z.infer<typeof logEntrySchema>;

interface LogEntry {
  id: string;
  date: Date;
  activity: string;
  mood?: Mood; // Add mood to the LogEntry interface
  notes?: string;
  diaryEntry?: string;
}

// --- Mock Data Generation ---
const generateMockLogs = (): LogEntry[] => {
    const today = new Date();
    return [
        { id: 'log-mock-1', date: subDays(today, 1), activity: 'Completed project proposal draft', mood: '⚡ Productive', notes: 'Sent for review to Jane.', diaryEntry: 'Felt productive today. The proposal took longer than expected but happy with the result.' },
        { id: 'log-mock-2', date: subDays(today, 2), activity: 'Team meeting and brainstorming session', mood: '😊 Happy', notes: 'Discussed Q3 goals. Good ideas generated.', diaryEntry: 'Meeting was energizing. Need to follow up on action items.' },
        { id: 'log-mock-3', date: subDays(today, 3), activity: 'Worked on coding feature X', mood: '😠 Stressed', notes: 'Encountered a bug, spent time debugging.', diaryEntry: 'Frustrating day with the bug, but learned something new about the framework.' },
        { id: 'log-mock-4', date: subDays(today, 5), activity: 'Client call and presentation prep', mood: '😟 Anxious', notes: 'Call went well. Presentation needs more polishing.', diaryEntry: '' },
        { id: 'log-mock-5', date: subDays(today, 7), activity: 'Personal development - Read book on leadership', mood: '😌 Calm', notes: 'Chapter 3 finished.', diaryEntry: 'Interesting concepts on delegation. Need to apply them.' },
        { id: 'log-mock-6', date: subDays(today, 10), activity: 'Attended webinar on AI trends', mood: '😊 Happy', notes: '', diaryEntry: 'Mind-blowing advancements. Need to explore how we can leverage this.' },
    ].sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure sorted
};

// --- Local Storage Helpers ---
// Function to load logs from localStorage or generate mock data
const loadLogsFromLocalStorage = (): LogEntry[] => {
  if (typeof window === 'undefined') return [];
  const storedLogs = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedLogs) {
    try {
      // Parse and ensure dates are Date objects
      const parsedLogs = JSON.parse(storedLogs).map((log: any) => ({
        ...log,
        date: parseISO(log.date), // Convert string back to Date
      }));
       return parsedLogs.sort((a: LogEntry, b: LogEntry) => b.date.getTime() - a.date.getTime()); // Ensure sorted
    } catch (e) {
      console.error("Error parsing logs from localStorage:", e);
      // Fallback to mock data if parsing fails
       return generateMockLogs();
    }
  }
  // If no stored logs, generate mock data
  const mockLogs = generateMockLogs();
  saveLogsToLocalStorage(mockLogs); // Save mock data to localStorage initially
  return mockLogs;
};

// Function to save logs to localStorage
const saveLogsToLocalStorage = (logs: LogEntry[]) => {
   if (typeof window === 'undefined') return;
  try {
      // Store dates as ISO strings for JSON compatibility
      const logsToStore = logs.map(log => ({
          ...log,
          date: log.date.toISOString(),
      }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logsToStore));
  } catch (e) {
      console.error("Error saving logs to localStorage:", e);
  }
};

// --- Component ---
const DailyLogPage: FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const { toast } = useToast();

   // Load logs on initial render
   useEffect(() => {
       setLogEntries(loadLogsFromLocalStorage());
   }, []);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      date: new Date(),
      activity: '',
      mood: undefined, // Initialize mood as undefined
      notes: '',
      diaryEntry: '',
    },
  });

  const onSubmit = (data: LogEntryFormValues) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      ...data,
    };
    // Prepend new entry and save
     const updatedLogs = [newEntry, ...logEntries].sort((a, b) => b.date.getTime() - a.date.getTime()); // Keep sorted
     setLogEntries(updatedLogs);
     saveLogsToLocalStorage(updatedLogs);

    form.reset({ date: new Date(), activity: '', mood: undefined, notes: '', diaryEntry: '' }); // Reset form after submission
    toast({
      title: "Log Entry Added",
      description: "Your daily log has been updated.",
    });
    console.log('New Log Entry:', newEntry);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Daily Log</h1>

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle>Add New Log Entry</CardTitle>
          <CardDescription>Record your activities, mood, notes, and diary thoughts for the day.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal', // Use full width on smaller screens
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                        name="mood"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mood (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select your mood" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {moodOptions.map(mood => (
                                <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

              <FormField
                control={form.control}
                name="activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Activity / Highlight</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe the main activity or highlight of the day" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any relevant notes or details" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diaryEntry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diary Entry (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Record your thoughts, feelings, and reflections" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Log Entry
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-md">
         <CardHeader>
           <CardTitle>Past Entries</CardTitle>
           <CardDescription>Review your previous log entries.</CardDescription>
         </CardHeader>
         <CardContent>
           <ScrollArea className="h-[400px] w-full rounded-md border p-4">
             {logEntries.length === 0 ? (
               <p className="text-center text-muted-foreground">No entries yet. Add your first log above!</p>
             ) : (
               logEntries.map((entry, index) => (
                 <React.Fragment key={entry.id}>
                   <div className="mb-4 p-4 rounded-lg ">
                     <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-lg">{format(entry.date, 'PPP')}</h3>
                        {entry.mood && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary">{entry.mood}</span>}
                     </div>
                     <p className="text-sm font-medium text-primary mb-2">{entry.activity}</p>
                     {entry.notes && (
                        <>
                         <p className="text-sm font-semibold mt-2">Notes:</p>
                         <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>
                         </>
                     )}
                     {entry.diaryEntry && (
                        <>
                         <p className="text-sm font-semibold mt-2">Diary:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.diaryEntry}</p>
                         </>
                     )}
                   </div>
                   {index < logEntries.length - 1 && <Separator className="my-4" />}
                 </React.Fragment>
               ))
             )}
           </ScrollArea>
         </CardContent>
       </Card>
    </div>
  );
};

export default DailyLogPage;
