'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addHours, subDays, addDays } from 'date-fns'; // Import addDays and subDays
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'; // Import Input component
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/services/calendar'; // Import CalendarEvent type
import { getCalendarEvents as fetchEvents } from '@/services/calendar'; // Import service function
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Mock Data Generation
const generateMockEvents = (start: Date, end: Date): CalendarEvent[] => {
    const mockEvents: CalendarEvent[] = [];
    const today = new Date();
    const todayStart = new Date(today.setHours(10, 0, 0, 0));
    const tomorrowStart = addDays(today, 1);
    const yesterdayStart = subDays(today, 1);

    // Add events relative to today if within the requested range
     if (isSameMonth(todayStart, start) || isSameMonth(addDays(todayStart,7), start)) { // Check if current or next week might overlap
        mockEvents.push(
            { title: 'Daily Standup', start: new Date(new Date(today).setHours(9, 0, 0, 0)), end: new Date(new Date(today).setHours(9, 15, 0, 0)), description: 'Quick team sync' },
            { title: 'Project Work Block', start: new Date(new Date(today).setHours(14, 0, 0, 0)), end: new Date(new Date(today).setHours(16, 0, 0, 0)), description: 'Focus time on project X' },
            { title: 'Meeting with Client', start: new Date(addDays(today, 2).setHours(11, 0, 0, 0)), end: new Date(addDays(today, 2).setHours(12, 0, 0, 0)), description: 'Discuss project milestones' },
            { title: 'Lunch', start: new Date(new Date(today).setHours(12, 30, 0, 0)), end: new Date(new Date(today).setHours(13, 15, 0, 0)) },
            { title: 'Review Session', start: new Date(subDays(today, 1).setHours(15, 0, 0, 0)), end: new Date(subDays(today, 1).setHours(16, 30, 0, 0)) }, // Yesterday
            { title: 'Planning Session', start: new Date(addDays(today, 3).setHours(9, 30, 0, 0)), end: new Date(addDays(today, 3).setHours(10, 30, 0, 0)) }, // In 3 days
        );
    }

    // Add some generic events spread across the month for visual testing
    const monthStart = startOfMonth(start);
    mockEvents.push(
        { title: 'Generic Event 1', start: new Date(new Date(monthStart).setDate(5)), end: addHours(new Date(new Date(monthStart).setDate(5)), 1) },
        { title: 'Generic Event 2', start: new Date(new Date(monthStart).setDate(15)), end: addHours(new Date(new Date(monthStart).setDate(15)), 2) },
        { title: 'Generic Event 3', start: new Date(new Date(monthStart).setDate(25)), end: addHours(new Date(new Date(monthStart).setDate(25)), 1) }
    );


    // Filter events to only include those within the requested startDate and endDate
    return mockEvents.filter(event =>
        (event.start >= start && event.start <= end) ||
        (event.end >= start && event.end <= end) ||
        (event.start < start && event.end > end)
    );
};


// Basic Event Form (Placeholder - replace with a proper form component later)
const EventForm: FC<{ onClose: () => void; date: Date }> = ({ onClose, date }) => {
  const [title, setTitle] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
        toast({ title: "Error", description: "Event title is required.", variant: "destructive"});
        return;
    }
    // TODO: Implement event creation logic (call API/save to state/localStorage)
    const newEvent: CalendarEvent = {
        title,
        start: new Date(date.setHours(9, 0, 0, 0)), // Default to 9 AM for now
        end: new Date(date.setHours(10, 0, 0, 0)), // Default to 1 hour duration
        description: ''
    };
    console.log('New Event:', newEvent);
    toast({ title: "Event Added (Mock)", description: `Event "${title}" scheduled for ${format(newEvent.start, 'PPP p')}. (Not saved)`});
    // Call a function here to update the main event state if managing locally
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="eventTitle" className="block text-sm font-medium text-foreground">Event Title</label>
        <Input
          type="text"
          id="eventTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full"
          placeholder="Enter event title"
        />
      </div>
       <div>
           <p className="text-sm text-muted-foreground">Date: {format(date, 'PPP')}</p>
           {/* TODO: Add start/end time inputs here */}
       </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">Add Event</Button>
      </div>
    </form>
  );
};


const CalendarPage: FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Convert dates to primitive values (timestamps) for the dependency array
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  useEffect(() => {
    const loadEvents = async () => {
        // Recreate Date objects from timestamps inside the effect
        const currentStartDate = new Date(startTimestamp);
        const currentEndDate = new Date(endTimestamp);
      try {
        setIsLoading(true);
        // Fetch events using the Date objects derived from timestamps
        let fetchedEvents = await fetchEvents(currentStartDate, currentEndDate);

         // If fetchEvents returns empty (or fails silently), use mock data
         if (!fetchedEvents || fetchedEvents.length === 0) {
              console.log("No events fetched from service, using mock data for range:", format(currentStartDate, 'PP'), 'to', format(currentEndDate, 'PP'));
              fetchedEvents = generateMockEvents(currentStartDate, currentEndDate);
              // Optional: Save mock data if you intend to persist it later
         }

        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        toast({
          title: "Error Loading Events",
          description: "Could not load calendar events. Displaying mock data.",
          variant: "destructive",
        });
         // Use mock data on error
         setEvents(generateMockEvents(currentStartDate, currentEndDate));
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
    // Use stable primitive values in the dependency array
  }, [currentMonth, toast, startTimestamp, endTimestamp]); // Re-fetch when month or timestamps change

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate }); // Use original Date objects for rendering

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

   const openEventDialog = (date: Date) => {
     setSelectedDate(date);
     setIsEventDialogOpen(true);
   };

   const closeEventDialog = () => {
     setIsEventDialogOpen(false);
     setSelectedDate(null);
     // TODO: Potentially trigger a re-fetch or update local state if an event was added
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
              "relative border rounded-md min-h-[100px] p-1.5 flex flex-col group cursor-pointer", // Added flex-col, group, and cursor-pointer
              !isCurrentMonth && "bg-muted/50 text-muted-foreground",
              isToday && "bg-accent border-primary"
            )}
             onClick={() => openEventDialog(day)} // Open dialog on day click
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
                 <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); openEventDialog(day); }}>
                     <Plus className="h-3 w-3" />
                      <span className="sr-only">Add event</span>
                 </Button>
            </div>
            <div className="flex-grow overflow-y-auto text-[10px] leading-tight space-y-0.5">
               {isLoading && isCurrentMonth && (
                  <div className="animate-pulse bg-muted h-3 w-3/4 rounded-sm mb-1"></div>
               )}
              {dayEvents.sort((a,b) => a.start.getTime() - b.start.getTime()).map((event) => ( // Sort events within the day
                <div
                  key={`${event.title}-${event.start.toISOString()}`} // Use a more unique key if possible
                  className="bg-primary/20 text-primary-foreground p-0.5 rounded-sm truncate"
                   title={`${format(event.start, 'p')} - ${event.title}${event.description ? ` (${event.description})`: ''}`} // Tooltip for full info
                >
                   <span className="font-medium">{format(event.start, 'p')}</span> {event.title}
                </div>
              ))}
            </div>
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

       {/* Event Creation Dialog */}
       <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Add Event on {selectedDate ? format(selectedDate, 'PPP') : ''}</DialogTitle>
           </DialogHeader>
           {selectedDate && <EventForm onClose={closeEventDialog} date={selectedDate} />}
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default CalendarPage;
