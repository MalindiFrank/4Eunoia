'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns'; // Removed addHours, addDays, subDays
import { Calendar as CalendarIcon, Edit, Plus, Trash2, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added Footer, Close
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Reminder } from '@/services/reminder'; // Import Reminder type
import { getUpcomingReminders, addUserReminder, updateUserReminder, deleteUserReminder } from '@/services/reminder'; // Import service functions
import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Added AlertDialog
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const reminderSchema = z.object({
  title: z.string().min(1, 'Reminder title cannot be empty.'),
  description: z.string().optional(),
  dateTime: z.date({
    required_error: 'A date and time is required for the reminder.',
  }).min(new Date(), { message: "Reminder date/time cannot be in the past." }), // Add validation for past dates
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

// Reminder Form Component
const ReminderForm: FC<{
    onClose: () => void;
    initialData?: Reminder | null;
    onSave: (reminder: Reminder) => void;
}> = ({ onClose, initialData, onSave }) => {
    const { dataMode } = useDataMode();
    const { toast } = useToast();

    const form = useForm<ReminderFormValues>({
        resolver: zodResolver(reminderSchema),
        defaultValues: initialData ? {
            title: initialData.title,
            description: initialData.description || '',
            dateTime: initialData.dateTime,
        } : {
            title: '',
            description: '',
            dateTime: new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), // Default to next hour
        },
    });

    const onSubmit = (data: ReminderFormValues) => {
         if (dataMode === 'mock') {
            toast({ title: "Read-only Mode", description: "Cannot add or edit reminders in mock data mode.", variant: "destructive"});
            onClose();
            return;
         }

        const reminderData: Omit<Reminder, 'id'> = data;

        try {
            let savedReminder: Reminder | undefined;
            if (initialData?.id) {
                savedReminder = updateUserReminder({ ...reminderData, id: initialData.id });
                if (savedReminder) {
                     toast({ title: "Reminder Updated", description: `Reminder "${data.title}" updated.` });
                } else {
                     throw new Error("Failed to find reminder to update.");
                }
            } else {
                savedReminder = addUserReminder(reminderData);
                 toast({ title: "Reminder Added", description: `Reminder "${data.title}" set.` });
            }
             if (savedReminder) {
                 onSave(savedReminder);
             }
        } catch (error) {
             console.error("Error saving reminder:", error);
             toast({ title: "Error", description: "Could not save reminder.", variant: "destructive"});
        } finally {
             onClose();
        }
    };

     const handleDateTimeChange = (date: Date | undefined, time: string) => {
        if (!date) return;
        const [hours, minutes] = time.split(':').map(Number);
        const newDateTime = new Date(date);
        if (!isNaN(hours) && !isNaN(minutes)) {
            newDateTime.setHours(hours, minutes, 0, 0);
            // Basic past check (schema handles more robustly on submit)
            if (newDateTime < new Date()) {
                 toast({ title: "Past Time", description: "Reminder time cannot be in the past.", variant: "destructive" });
            }
            form.setValue('dateTime', newDateTime, { shouldValidate: true });
        }
   };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl> <Input placeholder="Reminder title" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl> <Textarea placeholder="Add more details" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="dateTime" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date & Time</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, 'PPP p') : <span>Pick a date and time</span>}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={(date) => handleDateTimeChange(date, field.value ? format(field.value, 'HH:mm') : '09:00')} initialFocus disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                                <div className="p-3 border-t border-border">
                                    <Input type="time" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => handleDateTimeChange(field.value, e.target.value)} />
                                </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}/>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={dataMode === 'mock'}>{initialData ? 'Update Reminder' : 'Add Reminder'}</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};


const RemindersPage: FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { dataMode } = useDataMode(); // Use data mode context

  // Load reminders based on dataMode
  useEffect(() => {
    const loadReminders = async () => {
      setIsLoading(true);
      try {
        const fetchedReminders = await getUpcomingReminders(dataMode);
        setReminders(fetchedReminders); // Already sorted by service
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
        toast({ title: "Error", description: "Could not load reminders.", variant: "destructive"});
         setReminders([]); // Clear on error
      } finally {
        setIsLoading(false);
      }
    };
    loadReminders();
  }, [dataMode, toast]);

  const openDialog = (reminder: Reminder | null = null) => {
    setEditingReminder(reminder);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = (savedReminder: Reminder) => {
       setReminders(prev => {
           const existing = prev.find(r => r.id === savedReminder.id);
           let updated: Reminder[];
           if (existing) {
               updated = prev.map(r => r.id === savedReminder.id ? savedReminder : r);
           } else {
               updated = [savedReminder, ...prev];
           }
           // Re-filter past reminders (although saving should prevent past dates) and sort
           const now = new Date();
           return updated
               .filter(r => r.dateTime >= now)
               .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
       });
       closeDialog();
   };

   const handleDeleteReminder = (reminderId: string) => {
        if (dataMode === 'mock') {
           toast({ title: "Read-only Mode", description: "Cannot delete reminders in mock data mode.", variant: "destructive"});
           return;
        }
       const reminderToDelete = reminders.find(r => r.id === reminderId);
       try {
           const success = deleteUserReminder(reminderId);
            if (success) {
               setReminders(prev => prev.filter(r => r.id !== reminderId));
               toast({ title: "Reminder Deleted", description: `Reminder "${reminderToDelete?.title}" deleted.`, variant: "default" });
           } else {
                throw new Error("Failed to find reminder to delete.");
           }
       } catch (error) {
            console.error("Error deleting reminder:", error);
            toast({ title: "Error", description: "Could not delete reminder.", variant: "destructive"});
       }
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
                <ReminderForm
                     onClose={closeDialog}
                     initialData={editingReminder}
                     onSave={handleSaveReminder}
                 />
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
                <div className="space-y-4 p-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            ) : reminders.length === 0 ? (
              <p className="text-center text-muted-foreground pt-10">
                 {dataMode === 'mock' ? 'No mock reminders loaded.' : 'No upcoming reminders. Add one above!'}
              </p>
            ) : (
              reminders.map((reminder, index) => (
                <React.Fragment key={reminder.id}>
                  <div className="flex items-start justify-between py-3 px-2 rounded-lg hover:bg-accent group transition-colors"> {/* Added group */}
                    <div className="flex items-start gap-3 flex-grow overflow-hidden">
                       <Bell className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div className="grid gap-0.5 flex-grow">
                        <p className="text-sm font-medium leading-tight">
                          {reminder.title}
                        </p>
                         <p className="text-xs text-muted-foreground">
                           {format(reminder.dateTime, 'PPP p')} {/* Use imported Date object */}
                         </p>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground mt-1 break-words"> {/* Added break-words */}
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"> {/* Show on hover */}
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(reminder)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Reminder</span>
                       </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                   <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Reminder</span>
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Reminder?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the reminder "{reminder.title}"?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteReminder(reminder.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
