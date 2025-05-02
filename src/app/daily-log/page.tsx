'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataMode } from '@/context/data-mode-context';
import { getDailyLogs, addUserLog, deleteUserLog, type LogEntry, type Mood } from '@/services/daily-log'; // Removed updateUserLog temporarily
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from "@/components/ui/slider"; // Import Slider

// --- Types and Schemas ---
const moodOptions = ['😊 Happy', '😌 Calm', '😕 Neutral', '😟 Anxious', '😢 Sad', '😠 Stressed', '⚡ Productive', '😴 Tired', '❓ Other'] as const;

const logEntrySchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  activity: z.string().min(1, 'Activity description cannot be empty.'),
  mood: z.enum(moodOptions).optional(),
  focusLevel: z.number().min(1).max(5).optional(), // Added focusLevel schema
  notes: z.string().optional(),
  diaryEntry: z.string().optional(),
});

type LogEntryFormValues = z.infer<typeof logEntrySchema>;

// --- Component ---
const DailyLogPage: FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { dataMode } = useDataMode();

  // Load logs based on dataMode
  useEffect(() => {
    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const logs = await getDailyLogs(dataMode);
            setLogEntries(logs);
        } catch (error) {
             console.error("Failed to load daily logs:", error);
             toast({ title: "Error", description: "Could not load log entries.", variant: "destructive"});
             setLogEntries([]); // Clear on error
        } finally {
            setIsLoading(false);
        }
    };
    loadLogs();
  }, [dataMode, toast]);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      date: new Date(),
      activity: '',
      mood: undefined,
      focusLevel: undefined, // Default focus level
      notes: '',
      diaryEntry: '',
    },
  });

  const onSubmit = (data: LogEntryFormValues) => {
     if (dataMode === 'mock') {
        toast({ title: "Read-only Mode", description: "Cannot add log entries in mock data mode.", variant: "destructive"});
        return;
     }

    try {
        // Pass focusLevel from form data
        const newEntry = addUserLog({
            date: data.date,
            activity: data.activity,
            mood: data.mood,
            focusLevel: data.focusLevel,
            notes: data.notes,
            diaryEntry: data.diaryEntry,
        });
        setLogEntries(prevLogs => [newEntry, ...prevLogs].sort((a, b) => b.date.getTime() - a.date.getTime()));

        form.reset({ date: new Date(), activity: '', mood: undefined, focusLevel: undefined, notes: '', diaryEntry: '' }); // Reset form
        toast({
            title: "Log Entry Added",
            description: "Your daily log has been updated.",
        });
        console.log('New Log Entry:', newEntry);
    } catch (error) {
         console.error("Error adding log entry:", error);
         toast({ title: "Error", description: "Could not save log entry.", variant: "destructive"});
    }
  };

   const handleDeleteLog = (logId: string) => {
       if (dataMode === 'mock') {
           toast({ title: "Read-only Mode", description: "Cannot delete log entries in mock data mode.", variant: "destructive"});
           return;
       }
       const logToDelete = logEntries.find(l => l.id === logId);
       try {
           const success = deleteUserLog(logId);
           if (success) {
               setLogEntries(prev => prev.filter(l => l.id !== logId));
               toast({ title: "Log Deleted", description: `Log entry from ${logToDelete ? format(logToDelete.date, 'PPP') : ''} deleted.`, variant: "default" });
           } else {
                throw new Error("Failed to find log to delete.");
           }
       } catch (error) {
           console.error("Error deleting log:", error);
           toast({ title: "Error", description: "Could not delete log entry.", variant: "destructive"});
       }
   };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Daily Log</h1>
             {/* Add button can be here or inside the card */}
       </div>

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
                                  'w-full pl-3 text-left font-normal',
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

                {/* Focus Level Slider */}
                <FormField
                    control={form.control}
                    name="focusLevel"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Focus Level during Activity (Optional): {field.value ? `${field.value}/5` : 'Not set'}</FormLabel>
                        <FormControl>
                            <Slider
                                defaultValue={[3]} // Default visual position if no value
                                value={field.value ? [field.value] : undefined} // Controlled value
                                onValueChange={(value) => field.onChange(value[0])} // Update form state
                                max={5}
                                min={1}
                                step={1}
                                className="w-full"
                                aria-label="Focus level" // Accessibility
                            />
                        </FormControl>
                         <FormDescription>Rate your focus: 1 (Distracted) to 5 (Flow State).</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
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

              <Button type="submit" className="w-full md:w-auto" disabled={dataMode === 'mock'}>
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
             {isLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                 </div>
             ) : logEntries.length === 0 ? (
               <p className="text-center text-muted-foreground pt-10">
                  {dataMode === 'mock' ? 'No mock entries loaded.' : 'No entries yet. Add your first log above!'}
                </p>
             ) : (
               logEntries.map((entry, index) => (
                 <React.Fragment key={entry.id}>
                   <div className="mb-4 p-3 rounded-lg group hover:bg-accent transition-colors relative">
                     <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-lg">{format(entry.date, 'PPP')}</h3>
                        <div className="flex items-center gap-2">
                            {entry.mood && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary">{entry.mood}</span>}
                             {/* Display Focus Level */}
                             {entry.focusLevel && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Focus: {entry.focusLevel}/5</span>}
                        </div>
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
                      {dataMode === 'user' && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete log entry from ${format(entry.date, 'PPP')}`}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Log</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Log Entry?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete the log entry for {format(entry.date, 'PPP')}? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteLog(entry.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
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
