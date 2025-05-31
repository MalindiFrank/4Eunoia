
'use client'; 

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader'; 

export const CALENDAR_EVENTS_STORAGE_KEY = 'prodev-calendar-events';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  id?: string;
}

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

export const saveUserEvents = (events: CalendarEvent[]) => {
   if (typeof window === 'undefined') return;
  try {
    const eventsToStore = events.map(event => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    }));
    localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(eventsToStore));
  } catch (e) {
      console.error("Error saving calendar events to localStorage:", e);
  }
};

// dataMode parameter is now ignored, always loads from user storage
export async function getCalendarEvents(dataMode?: 'mock' | 'user'): Promise<CalendarEvent[]> {
  return loadUserEvents();
}

export const addUserEvent = (newEventData: Omit<CalendarEvent, 'id'>): CalendarEvent => {
    const userEvents = loadUserEvents();
    const newEvent: CalendarEvent = {
        ...newEventData,
        id: crypto.randomUUID(), 
    };
    const updatedEvents = [...userEvents, newEvent].sort((a, b) => a.start.getTime() - b.start.getTime());
    saveUserEvents(updatedEvents);
    return newEvent;
}

export const updateUserEvent = (updatedEvent: CalendarEvent): CalendarEvent | undefined => {
    if (!updatedEvent.id) return undefined; 
    const userEvents = loadUserEvents();
    let found = false;
    const updatedEvents = userEvents.map(event => {
        if (event.id === updatedEvent.id) {
            found = true;
            return updatedEvent; 
        }
        return event;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    if (found) {
        saveUserEvents(updatedEvents);
        return updatedEvent;
    }
    return undefined;
}

export const deleteUserEvent = (eventId: string): boolean => {
    const userEvents = loadUserEvents();
    const updatedEvents = userEvents.filter(event => event.id !== eventId);
    if (updatedEvents.length < userEvents.length) { 
        saveUserEvents(updatedEvents);
        return true;
    }
    return false;
}
