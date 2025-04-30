'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/services/calendar'; // Import CalendarEvent type
import { getCalendarEvents as fetchEvents } from '@/services/calendar'; // Import service function
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
    // TODO: Implement event creation logic (call API)
    console.log('New Event:', { title, date });
    toast({ title: "Event Added", description: `Event "${title}" scheduled for ${format(date, 'PPP')}.`});
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700">Event Title</label>
        <input
          type="text"
          id="eventTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Enter event title"
        />
      </div>
       <div>
           <p className="text-sm text-muted-foreground">Date: {format(date, 'PPP')}</p>
           {/* Add start/end time inputs here */}
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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        // Fetch events for a slightly wider range to cover edge cases if needed
        const fetchedEvents = await fetchEvents(startDate, endDate);
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        toast({
          title: "Error",
          description: "Could not load calendar events.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [currentMonth, toast, startDate, endDate]); // Re-fetch when month changes

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

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
              "relative border rounded-md min-h-[100px] p-1.5 flex flex-col", // Added flex-col
              !isCurrentMonth && "bg-muted/50 text-muted-foreground",
              isToday && "bg-accent border-primary"
            )}
             onClick={() => openEventDialog(day)} // Open dialog on day click
             style={{ cursor: 'pointer' }} // Add pointer cursor
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
                  {/* Optional: Add button inside cell to trigger dialog */}
                 {/* <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); openEventDialog(day); }}>
                     <Plus className="h-3 w-3" />
                 </Button> */}
            </div>
            <div className="flex-grow overflow-y-auto text-[10px] leading-tight space-y-0.5">
               {isLoading && isCurrentMonth && (
                  <div className="animate-pulse bg-muted h-3 w-3/4 rounded-sm"></div>
               )}
              {dayEvents.map((event) => (
                <div
                  key={`${event.title}-${event.start.toISOString()}`} // Use a more unique key if possible
                  className="bg-primary/20 text-primary-foreground p-0.5 rounded-sm truncate"
                   title={`${format(event.start, 'p')} - ${event.title}`} // Tooltip for full info
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
