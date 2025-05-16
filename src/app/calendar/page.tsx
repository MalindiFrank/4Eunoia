'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/services/calendar';
import { getCalendarEvents, addUserEvent, updateUserEvent, deleteUserEvent, CALENDAR_EVENTS_STORAGE_KEY } from '@/services/calendar';
import { useDataMode } from '@/context/data-mode-context';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';


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
    onSave: (event: CalendarEvent) => void; 
}> = ({ onClose, initialData, selectedDate, onSave }) => {
  const { toast } = useToast();
  const { dataMode } = useDataMode(); 

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
        title: initialData?.title || '',
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
        savedEvent = updateUserEvent({ ...eventData, id: initialData.id });
        if (savedEvent) {
            toast({ title: "Event Updated", description: `Event "${data.title}" updated.` });
        } else {
             throw new Error("Failed to find event to update.");
        }
      } else {
        savedEvent = addUserEvent(eventData);
         toast({ title: "Event Added", description: `Event "${data.title}" added.` });
      }
      if (savedEvent) {
          onSave(savedEvent); 
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
            form.setValue(field, newDateTime, { shouldValidate: true }); 
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
              <FormLabel htmlFor="event-title">Event Title</FormLabel>
              <FormControl>
                <Input id="event-title" placeholder="Enter event title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel htmlFor="start-date-time-trigger">Start Date & Time</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button id="start-date-time-trigger" variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')} aria-label="Select start date and time">
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
                                aria-label="Start time"
                             />
                         </div>
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel htmlFor="end-date-time-trigger">End Date & Time</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button id="end-date-time-trigger" variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')} aria-label="Select end date and time">
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
                                aria-label="End time"
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
                <FormLabel htmlFor="event-description">Description (Optional)</FormLabel>
                <FormControl>
                <Textarea id="event-description" placeholder="Add event details" {...field} />
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
   const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); 
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const { toast } = useToast();
  const { dataMode } = useDataMode(); 

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const fetchedEvents = await getCalendarEvents(dataMode); 
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
        setEvents([]); 
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [dataMode, currentMonth, toast, startDate, endDate]); 

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

   const handleSaveEvent = (savedEvent: CalendarEvent) => {
       const updatedEvents = events.filter(e => e.id !== savedEvent.id); 
       setEvents([...updatedEvents, savedEvent].sort((a, b) => a.start.getTime() - b.start.getTime()));
       closeEventDialog();
   };

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
      <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8" aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex flex-col items-center">
        <h2 className="text-lg font-semibold" aria-live="polite">
            {format(currentMonth, 'MMMM yyyy')}
        </h2>
         <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-6 px-2" aria-label="Go to today's date">
            Today
        </Button>
      </div>

      <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8" aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2 px-2" aria-hidden="true">
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
        const dayLabel = format(day, 'd');
        const fullDayLabel = format(day, 'PPP'); 

        return (
          <div
            key={day.toString()}
            className={cn(
              "relative border rounded-md min-h-[100px] sm:min-h-[120px] p-1 flex flex-col group cursor-pointer hover:bg-accent/50 focus-within:bg-accent/50 transition-colors", 
              !isCurrentMonth && "bg-muted/30 text-muted-foreground/70 pointer-events-none", 
              isToday && "bg-accent border-primary"
            )}
             onClick={() => isCurrentMonth && openEventDialog(day)} 
             role="button" 
             tabIndex={isCurrentMonth ? 0 : -1} 
             onKeyDown={(e) => { if (isCurrentMonth && (e.key === 'Enter' || e.key === ' ')) openEventDialog(day); }} 
             aria-label={`Date ${fullDayLabel}, ${dayEvents.length} event(s). Click to add event.`} 
          >
             <div className="flex justify-between items-center mb-1">
                 <span
                 className={cn(
                     "text-xs font-medium",
                     isToday && "text-primary font-bold"
                 )}
                 aria-hidden="true" 
                 >
                 {dayLabel}
                 </span>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 absolute top-1 right-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity z-10" 
                    onClick={(e) => { e.stopPropagation(); openEventDialog(day); }} 
                    aria-label={`Add event on ${fullDayLabel}`}
                 >
                     <Plus className="h-4 w-4" />
                      <span className="sr-only">Add event</span>
                 </Button>
            </div>
             <ScrollArea className="flex-grow text-[9px] sm:text-[10px] leading-tight space-y-0.5 pr-1"> 
               {isLoading && isCurrentMonth && (
                   <>
                    <Skeleton className="h-4 w-3/4 rounded-sm mb-1" />
                    <Skeleton className="h-4 w-1/2 rounded-sm mb-1" />
                   </>
               )}
              {!isLoading && dayEvents.sort((a,b) => a.start.getTime() - b.start.getTime()).map((event) => ( 
                <div
                  key={event.id || `${event.title}-${event.start.toISOString()}`} 
                  className="bg-primary/20 text-primary-foreground p-1 rounded-sm truncate relative mb-0.5 group/event cursor-pointer hover:bg-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" 
                   title={`${format(event.start, 'p')} - ${event.title}${event.description ? ` (${event.description})`: ''}`} 
                   onClick={(e) => { e.stopPropagation(); openEventDialog(day, event); }} 
                   tabIndex={0} 
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {e.stopPropagation(); openEventDialog(day, event);} }}
                   aria-label={`Event: ${event.title} at ${format(event.start, 'p')}. Click to edit.`} 
                >
                   <span className="font-medium">{format(event.start, 'p')}</span> {event.title}
                    {dataMode === 'user' && event.id && ( 
                         <div className="absolute top-0 right-0 flex opacity-0 group-hover/event:opacity-100 group-focus-within/event:opacity-100 transition-opacity"> 
                             <Button variant="ghost" size="icon" className="h-5 w-5 text-primary-foreground/70 hover:text-primary-foreground" onClick={(e) => { e.stopPropagation(); openEventDialog(day, event); }} aria-label={`Edit event "${event.title}"`}>
                                 <Edit className="h-3 w-3" />
                                 <span className="sr-only">Edit</span>
                             </Button>
                             <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/70 hover:text-destructive" onClick={(e) => e.stopPropagation()} aria-label={`Delete event "${event.title}"`}>
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
                   <div className="h-full flex items-center justify-center text-muted-foreground/50 text-[9px]" aria-hidden="true"></div>
               )}
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogTrigger asChild>
             <Button onClick={() => openEventDialog(new Date())} aria-label="Add new event"> 
               <Plus className="mr-2 h-4 w-4" /> Add Event
             </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]"> 
             <DialogHeader>
               <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
             </DialogHeader>
             <EventForm
                onClose={closeEventDialog}
                initialData={editingEvent}
                selectedDate={selectedDate || undefined} 
                onSave={handleSaveEvent}
              />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pt-4 pb-2 px-4">
             {renderHeader()}
             {renderDaysOfWeek()}
        </CardHeader>
        <CardContent className="p-2">
          {renderCells()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
