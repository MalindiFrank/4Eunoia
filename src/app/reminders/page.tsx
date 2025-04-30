'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addHours, addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Edit, Plus, Trash2, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Reminder } from '@/services/reminder'; // Import Reminder type
import { getUpcomingReminders as fetchReminders } from '@/services/reminder'; // Import service function

const reminderSchema = z.object({
  title: z.string().min(1, 'Reminder title cannot be empty.'),
  description: z.string().optional(),
  dateTime: z.date({
    required_error: 'A date and time is required for the reminder.',
  }),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

// Mock Data Generation
const generateMockReminders = (): Reminder[] => {
    const now = new Date();
    return [
        { id: 'rem-mock-1', title: 'Call Mom', dateTime: addHours(now, 2), description: 'Check in for the week' },
        { id: 'rem-mock-2', title: 'Doctor Appointment', dateTime: addDays(now, 3), description: 'Annual check-up at 10:00 AM' },
        { id: 'rem-mock-3', title: 'Project Deadline', dateTime: addDays(now, 7), description: 'Submit final version of Project Alpha' },
        { id: 'rem-mock-4', title: 'Water Plants', dateTime: addDays(now, 1), description: '' },
        // Example of a past reminder (might not show depending on fetch logic)
        { id: 'rem-mock-5', title: 'Gym Session', dateTime: subDays(now, 1), description: 'Leg day' },
    ].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()); // Ensure sorted
};


const RemindersPage: FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      description: '',
      dateTime: new Date(),
    },
  });

  useEffect(() => {
    const loadReminders = async () => {
      try {
        setIsLoading(true);
        let fetchedReminders = await fetchReminders();
        // If fetchReminders returns empty (or fails silently), use mock data
        if (!fetchedReminders || fetchedReminders.length === 0) {
             console.log("No reminders fetched from service, using mock data.");
             fetchedReminders = generateMockReminders();
             // Optional: Save mock data if you intend to persist it later
             // await saveRemindersToLocalStorage(fetchedReminders); // Assuming a save function exists
        }
        // Sort reminders by date/time
        fetchedReminders.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        setReminders(fetchedReminders);
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
        toast({
          title: "Error",
          description: "Could not load reminders. Displaying mock data.",
          variant: "destructive",
        });
         // Use mock data on error
         setReminders(generateMockReminders());
      } finally {
        setIsLoading(false);
      }
    };
    loadReminders();
  }, [toast]);

  const openDialog = (reminder: Reminder | null = null) => {
    setEditingReminder(reminder);
    const now = new Date();
    if (reminder) {
      form.reset({
        title: reminder.title,
        description: reminder.description || '',
        dateTime: new Date(reminder.dateTime),
      });
    } else {
       // Default to 1 hour from now for new reminders
       now.setHours(now.getHours() + 1);
       now.setMinutes(0); // Set minutes to 0 for simplicity
      form.reset({
        title: '',
        description: '',
        dateTime: now,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingReminder(null);
    form.reset();
  };

  const onSubmit = (data: ReminderFormValues) => {
    let updatedReminders: Reminder[];
    if (editingReminder) {
      // Update existing reminder
      const updatedReminder: Reminder = { ...editingReminder, ...data };
      updatedReminders = reminders
          .map((r) => (r.id === editingReminder.id ? updatedReminder : r))
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()); // Re-sort after update
      setReminders(updatedReminders);
      toast({ title: "Reminder Updated", description: `Reminder "${data.title}" has been updated.` });
      // TODO: Call API to update reminder & Persist changes (e.g., localStorage)
      console.log('Updated Reminder:', updatedReminder);
    } else {
      // Add new reminder
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        ...data,
      };
       updatedReminders = [...reminders, newReminder]
           .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()); // Sort after adding
      setReminders(updatedReminders);
      toast({ title: "Reminder Added", description: `Reminder "${data.title}" has been set.` });
      // TODO: Call API to add reminder & Persist changes (e.g., localStorage)
      console.log('New Reminder:', newReminder);
    }
    closeDialog();
  };

  const deleteReminder = (reminderId: string) => {
    const reminderToDelete = reminders.find(r => r.id === reminderId);
    const updatedReminders = reminders.filter((r) => r.id !== reminderId);
    setReminders(updatedReminders);
    toast({ title: "Reminder Deleted", description: `Reminder "${reminderToDelete?.title}" has been deleted.`, variant: "destructive" });
    // TODO: Call API to delete reminder & Persist changes (e.g., localStorage)
     console.log('Deleted Reminder ID:', reminderId);
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reminders</h1>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => openDialog()}>
               <Plus className="mr-2 h-4 w-4" /> Add Reminder
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
             </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                     <FormField
                       control={form.control}
                       name="title"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Title</FormLabel>
                           <FormControl>
                             <Input placeholder="Reminder title" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                      <FormField
                         control={form.control}
                         name="description"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Description (Optional)</FormLabel>
                             <FormControl>
                               <Textarea placeholder="Add more details" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                    <FormField
                        control={form.control}
                        name="dateTime"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date & Time</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-[280px] justify-start text-left font-normal', // Increased width
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, 'PPP p') : <span>Pick a date and time</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                 <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
                                  />
                                 <div className="p-3 border-t border-border">
                                   <Input
                                        type="time"
                                        value={field.value ? format(field.value, 'HH:mm') : ''}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':').map(Number);
                                            const newDate = field.value ? new Date(field.value) : new Date();
                                            if (!isNaN(hours) && !isNaN(minutes)) {
                                               newDate.setHours(hours, minutes, 0, 0); // Set seconds/ms to 0
                                               // Ensure the selected time is not in the past today
                                               const now = new Date();
                                               if (newDate < now && format(newDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
                                                   toast({ title: "Invalid Time", description: "Cannot set reminder time in the past.", variant: "destructive" });
                                               } else {
                                                   field.onChange(newDate);
                                               }
                                            }
                                        }}
                                    />
                                 </div>
                              </PopoverContent>
                            </Popover>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                     <div className="flex justify-end gap-2 pt-4">
                         <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                         <Button type="submit">{editingReminder ? 'Update Reminder' : 'Add Reminder'}</Button>
                     </div>
                  </form>
                </Form>
           </DialogContent>
         </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Upcoming Reminders</CardTitle>
          <CardDescription>Stay on top of your upcoming reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading reminders...</p>
            ) : reminders.length === 0 ? (
              <p className="text-center text-muted-foreground">No upcoming reminders. Add one above!</p>
            ) : (
              reminders.map((reminder, index) => (
                <React.Fragment key={reminder.id}>
                  <div className="flex items-start justify-between py-3 px-2 rounded-lg hover:bg-accent">
                    <div className="flex items-start gap-3">
                       <Bell className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div className="grid gap-0.5">
                        <p className="text-sm font-medium leading-tight">
                          {reminder.title}
                        </p>
                         <p className="text-xs text-muted-foreground">
                           {format(new Date(reminder.dateTime), 'PPP p')} {/* Format with time */}
                         </p>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(reminder)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Reminder</span>
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteReminder(reminder.id)}>
                           <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Reminder</span>
                       </Button>
                    </div>
                  </div>
                  {index < reminders.length - 1 && <Separator />}
                </React.Fragment>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemindersPage;
