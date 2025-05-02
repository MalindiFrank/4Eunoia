'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'; // Removed addDays, subDays, addHours
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react'; // Added Edit, Trash2
import { zodResolver } from '@hookform/resolvers/zod'; // Added zodResolver
import { useForm } from 'react-hook-form'; // Added useForm
import { z } from 'zod'; // Added z

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added DialogFooter, DialogClose
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Added Form components
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon } from 'lucide-react'; // Renamed import
import { Calendar as ShadCalendar } from '@/components/ui/calendar'; // Renamed import
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/services/calendar'; // Import CalendarEvent type
import { getCalendarEvents, addUserEvent, updateUserEvent, deleteUserEvent } from '@/services/calendar'; // Import service functions
import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Added AlertDialog
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// Event Form Schema
const eventSchema = z.object({
  title: z.string().min(1, 'Event title cannot be empty.'),
  startDateTime: z.date({ required_error: 'Start date and time are required.' }),
  endDateTime: z.date({ required_error: 'End date and time are required.' }),
  description: z.string().optional(),
}).refine(data => data.endDateTime >= data.startDateTime, {
    message: "End time cannot be before start time.",
    path: ["endDateTime"],
});

type EventFormValues = z.infer<typeof eventSchema>;


// Event Form Component
const EventForm: FC<{
    onClose: () => void;
    initialData?: CalendarEvent | null;
    selectedDate?: Date;
    onSave: (event: CalendarEvent) => void; // Callback after save
}> = ({ onClose, initialData, selectedDate, onSave }) => {
  const { toast } = useToast();
  const { dataMode } = useDataMode(); // Get data mode

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
        title: initialData?.title || '',
        // Combine selected date with default time or existing event time
        startDateTime: initialData?.start || (selectedDate ? new Date(selectedDate.setHours(9, 0, 0, 0)) : new Date(new Date().setHours(9, 0, 0, 0))),
        endDateTime: initialData?.end || (selectedDate ? new Date(selectedDate.setHours(10, 0, 0, 0)) : new Date(new Date().setHours(10, 0, 0, 0))),
        description: initialData?.description || '',
    },
  });

  const onSubmit = (data: EventFormValues) => {
     if (dataMode === 'mock') {
         toast({ title: "Read-only Mode", description: "Cannot add or edit events in mock data mode.", variant: "destructive"});
         onClose();
         return;
     }

    const eventData: Omit<CalendarEvent, 'id'> = {
        title: data.title,
        start: data.startDateTime,
        end: data.endDateTime,
        description: data.description,
    };

    try {
      let savedEvent: CalendarEvent | undefined;
      if (initialData?.id) {
        // Update existing event
        savedEvent = updateUserEvent({ ...eventData, id: initialData.id });
        if (savedEvent) {
            toast({ title: "Event Updated", description: `Event "${data.title}" updated.` });
        } else {
             throw new Error("Failed to find event to update.");
        }
      } else {
        // Add new event
        savedEvent = addUserEvent(eventData);
         toast({ title: "Event Added", description: `Event "${data.title}" added.` });
      }
      if (savedEvent) {
          onSave(savedEvent); // Trigger callback to update parent state
      }
    } catch (error) {
        console.error("Error saving event:", error);
        toast({ title: "Error", description: "Could not save event.", variant: "destructive"});
    } finally {
        onClose();
    }
  };

   const handleDateTimeChange = (field: keyof EventFormValues, date: Date | undefined, time: string) => {
        if (!date) return;
        const [hours, minutes] = time.split(':').map(Number);
        const newDateTime = new Date(date);
        if (!isNaN(hours) && !isNaN(minutes)) {
            newDateTime.setHours(hours, minutes, 0, 0);
            form.setValue(field, newDateTime, { shouldValidate: true }); // Update form value and trigger validation
        }
   };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter event title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Start Date/Time */}
            <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Start Date & Time</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP p') : <span>Pick start date & time</span>}
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <ShadCalendar mode="single" selected={field.value} onSelect={(date) => handleDateTimeChange('startDateTime', date, format(field.value || new Date(), 'HH:mm'))} initialFocus />
                         <div className="p-3 border-t border-border">
                            <Input
                                type="time"
                                value={field.value ? format(field.value, 'HH:mm') : '09:00'}
                                onChange={(e) => handleDateTimeChange('startDateTime', field.value, e.target.value)}
                             />
                         </div>
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* End Date/Time */}
            <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>End Date & Time</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP p') : <span>Pick end date & time</span>}
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <ShadCalendar mode="single" selected={field.value} onSelect={(date) => handleDateTimeChange('endDateTime', date, format(field.value || new Date(), 'HH:mm'))} initialFocus fromDate={form.getValues('startDateTime')} />
                        <div className="p-3 border-t border-border">
                            <Input
                                type="time"
                                value={field.value ? format(field.value, 'HH:mm') : '10:00'}
                                onChange={(e) => handleDateTimeChange('endDateTime', field.value, e.target.value)}
                             />
                         </div>
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
         </div>

         <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                <Textarea placeholder="Add event details" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={dataMode === 'mock'}>{initialData ? 'Update Event' : 'Add Event'}</Button>
        </DialogFooter>
        </form>
    </Form>
  );
};


const CalendarPage: FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
   const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); // State for editing
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const { toast } = useToast();
  const { dataMode } = useDataMode(); // Use the data mode context

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Fetch events when dataMode or currentMonth changes
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const fetchedEvents = await getCalendarEvents(dataMode); // Pass dataMode
        // Filter events for the current view (optional, depends on API/storage logic)
        const filteredEvents = fetchedEvents.filter(event =>
            (event.start >= startDate && event.start <= endDate) ||
            (event.end >= startDate && event.end <= endDate) ||
            (event.start < startDate && event.end > endDate)
        );
        setEvents(filteredEvents);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        toast({
          title: "Error Loading Events",
          description: "Could not load calendar events.",
          variant: "destructive",
        });
        setEvents([]); // Clear events on error
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [dataMode, currentMonth, toast, startDate, endDate]); // Add dataMode dependency

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

   const openEventDialog = (date: Date | null, eventToEdit: CalendarEvent | null = null) => {
     setSelectedDate(date);
     setEditingEvent(eventToEdit);
     setIsEventDialogOpen(true);
   };

   const closeEventDialog = () => {
     setIsEventDialogOpen(false);
     setSelectedDate(null);
     setEditingEvent(null);
   };

   // Refresh events after saving
   const handleSaveEvent = (savedEvent: CalendarEvent) => {
       // Simple refresh: re-fetch all events for the current view
       const updatedEvents = events.filter(e => e.id !== savedEvent.id); // Remove old if exists
       setEvents([...updatedEvents, savedEvent].sort((a, b) => a.start.getTime() - b.start.getTime()));
       // More robust: call getCalendarEvents again, but this works for local updates
       closeEventDialog();
   };

    // Handle event deletion
    const handleDeleteEvent = (eventId: string) => {
         if (dataMode === 'mock') {
            toast({ title: "Read-only Mode", description: "Cannot delete events in mock data mode.", variant: "destructive"});
            return;
         }
        try {
             const success = deleteUserEvent(eventId);
             if (success) {
                 setEvents(prev => prev.filter(e => e.id !== eventId));
                 toast({ title: "Event Deleted", description: "The event has been removed." });
             } else {
                 throw new Error("Failed to find event to delete.");
             }
        } catch (error) {
             console.error("Error deleting event:", error);
             toast({ title: "Error", description: "Could not delete event.", variant: "destructive"});
        }
     };


  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex flex-col items-center">
        <h2 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
        </h2>
         <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-6 px-2">
            Today
        </Button>
      </div>

      <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2 px-2">
        {days.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => (
    <div className="grid grid-cols-7 gap-1">
      {daysInMonth.map((day) => {
        const dayEvents = events.filter((event) => isSameDay(event.start, day));
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toString()}
            className={cn(
              "relative border rounded-md min-h-[120px] p-1 flex flex-col group cursor-pointer hover:bg-accent/50 transition-colors", // Adjusted min-height
              !isCurrentMonth && "bg-muted/30 text-muted-foreground/70", // Dimmed non-month days
              isToday && "bg-accent border-primary"
            )}
             onClick={() => openEventDialog(day)} // Open dialog on day click to add
             role="button" // Add role for accessibility
             tabIndex={0} // Make it focusable
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEventDialog(day); }} // Trigger on key press
          >
             <div className="flex justify-between items-center mb-1">
                 <span
                 className={cn(
                     "text-xs font-medium",
                     isToday && "text-primary font-bold"
                 )}
                 >
                 {format(day, 'd')}
                 </span>
                 {/* Add button inside cell to trigger dialog - appears on hover */}
                 <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10" onClick={(e) => { e.stopPropagation(); openEventDialog(day); }}>
                     <Plus className="h-3 w-3" />
                      <span className="sr-only">Add event</span>
                 </Button>
            </div>
             <ScrollArea className="flex-grow text-[10px] leading-tight space-y-0.5 pr-1"> {/* Added ScrollArea */}
               {isLoading && isCurrentMonth && (
                   <>
                    <Skeleton className="h-4 w-3/4 rounded-sm mb-1" />
                    <Skeleton className="h-4 w-1/2 rounded-sm mb-1" />
                   </>
               )}
              {!isLoading && dayEvents.sort((a,b) => a.start.getTime() - b.start.getTime()).map((event) => ( // Sort events within the day
                <div
                  key={event.id || `${event.title}-${event.start.toISOString()}`} // Use ID if available
                  className="bg-primary/20 text-primary-foreground p-1 rounded-sm truncate relative mb-0.5 group/event cursor-default hover:bg-primary/40" // Added group/event
                   title={`${format(event.start, 'p')} - ${event.title}${event.description ? ` (${event.description})`: ''}`} // Tooltip for full info
                   onClick={(e) => { e.stopPropagation(); openEventDialog(day, event); }} // Edit on click
                   tabIndex={0} // Make event focusable
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {e.stopPropagation(); openEventDialog(day, event);} }}
                >
                   <span className="font-medium">{format(event.start, 'p')}</span> {event.title}
                    {/* Edit/Delete Buttons for events */}
                    {dataMode === 'user' && event.id && ( // Only show if user mode and event has ID
                         <div className="absolute top-0 right-0 flex opacity-0 group-hover/event:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-5 w-5 text-primary-foreground/70 hover:text-primary-foreground" onClick={(e) => { e.stopPropagation(); openEventDialog(day, event); }}>
                                 <Edit className="h-3 w-3" />
                                 <span className="sr-only">Edit</span>
                             </Button>
                             <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/70 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                         <Trash2 className="h-3 w-3" />
                                         <span className="sr-only">Delete</span>
                                     </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                     <AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{event.title}"?</AlertDialogDescription></AlertDialogHeader>
                                     <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEvent(event.id!)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                                 </AlertDialogContent>
                             </AlertDialog>
                         </div>
                    )}
                </div>
              ))}
               {!isLoading && dayEvents.length === 0 && !isCurrentMonth && (
                   <div className="h-full flex items-center justify-center text-muted-foreground/50 text-[9px]"></div>
               )}
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Calendar</h1>

      <Card className="shadow-md">
         <CardHeader>
           <CardTitle>Monthly View</CardTitle>
            {/* Optional: Add view switcher (Week, Day) here */}
         </CardHeader>
        <CardContent>
          {renderHeader()}
           <Separator className="mb-2" />
          {renderDaysOfWeek()}
          {renderCells()}
        </CardContent>
      </Card>

       {/* Event Creation/Editing Dialog */}
       <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
         <DialogContent className="sm:max-w-[480px]"> {/* Slightly wider */}
           <DialogHeader>
             <DialogTitle>{editingEvent ? 'Edit Event' : `Add Event on ${selectedDate ? format(selectedDate, 'PPP') : ''}`}</DialogTitle>
           </DialogHeader>
           <EventForm
             onClose={closeEventDialog}
             initialData={editingEvent}
             selectedDate={selectedDate ?? undefined} // Pass selectedDate if not editing
             onSave={handleSaveEvent} // Pass save handler
            />
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default CalendarPage;
