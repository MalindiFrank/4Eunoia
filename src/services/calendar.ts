'use client'; // Mark as client component if using hooks like useDataMode or localStorage directly

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader'; // Assuming data-loader is accessible

// Define the localStorage key
const CALENDAR_EVENTS_STORAGE_KEY = 'prodev-calendar-events';

/**
 * Represents an event in a calendar.
 */
export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  // Add an optional ID for managing user events
  id?: string;
}


// Function to load events from localStorage
const loadUserEvents = (): CalendarEvent[] => {
  if (typeof window === 'undefined') return [];
  const storedEvents = localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY);
  if (storedEvents) {
    try {
      return JSON.parse(storedEvents).map((event: any) => ({
        ...event,
        start: parseISO(event.start),
        end: parseISO(event.end),
      }));
    } catch (e) {
      console.error("Error parsing calendar events from localStorage:", e);
      return [];
    }
  }
  return [];
};

// Function to save events to localStorage
export const saveUserEvents = (events: CalendarEvent[]) => {
   if (typeof window === 'undefined') return;
  try {
    const eventsToStore = events.map(event => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    }));
    localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(eventsToStore));
  } catch (e) { // Fix: Added opening curly brace
      console.error("Error saving calendar events to localStorage:", e);
  } // Fix: Added closing curly brace
};


// Function to fetch calendar events based on data mode
export async function getCalendarEvents(dataMode: 'mock' | 'user'): Promise<CalendarEvent[]> {
  if (dataMode === 'user') {
    // Load from localStorage in user mode
    return loadUserEvents();
  } else {
    // Load mock data from JSON file in mock mode
    const mockEventsRaw = await loadMockData<any>('calendar-events');
     // Parse dates from ISO strings in mock data
    return mockEventsRaw.map(event => ({
       ...event,
       start: parseISO(event.start),
       end: parseISO(event.end),
     }));
  }
}

// Function to add a new user event (only works in 'user' mode)
export const addUserEvent = (newEventData: Omit<CalendarEvent, 'id'>): CalendarEvent => {
    const userEvents = loadUserEvents();
    const newEvent: CalendarEvent = {
        ...newEventData,
        id: crypto.randomUUID(), // Generate unique ID for user events
    };
    const updatedEvents = [...userEvents, newEvent].sort((a, b) => a.start.getTime() - b.start.getTime());
    saveUserEvents(updatedEvents);
    return newEvent;
}

// Function to update a user event
export const updateUserEvent = (updatedEvent: CalendarEvent): CalendarEvent | undefined => {
    if (!updatedEvent.id) return undefined; // Need ID to update
    const userEvents = loadUserEvents();
    let found = false;
    const updatedEvents = userEvents.map(event => {
        if (event.id === updatedEvent.id) {
            found = true;
            return updatedEvent; // Replace with updated data
        }
        return event;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    if (found) {
        saveUserEvents(updatedEvents);
        return updatedEvent;
    }
    return undefined;
}

// Function to delete a user event
export const deleteUserEvent = (eventId: string): boolean => {
    const userEvents = loadUserEvents();
    const updatedEvents = userEvents.filter(event => event.id !== eventId);
    if (updatedEvents.length < userEvents.length) { // Check if an event was actually deleted
        saveUserEvents(updatedEvents);
        return true;
    }
    return false;
}
