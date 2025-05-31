
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

export const CALENDAR_EVENTS_STORAGE_KEY = 'prodev-calendar-events';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  id?: string; // id is optional for new events, but required for existing ones in Firebase
}

const firebaseDataToEventsArray = (data: any): CalendarEvent[] => {
  if (!data) return [];
  return Object.entries(data).map(([id, eventData]: [string, any]) => ({
    id,
    ...(eventData as Omit<CalendarEvent, 'id' | 'start' | 'end'>),
    start: parseISO(eventData.start),
    end: parseISO(eventData.end),
  })).sort((a,b) => a.start.getTime() - b.start.getTime());
};

const loadUserEventsFromLocalStorage = (): CalendarEvent[] => {
  if (typeof window === 'undefined') return [];
  const storedEvents = localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY);
  if (storedEvents) {
    try {
      return JSON.parse(storedEvents).map((event: any) => ({
        ...event,
        start: parseISO(event.start),
        end: parseISO(event.end),
      })).sort((a,b) => a.start.getTime() - b.start.getTime());
    } catch (e) {
      console.error("Error parsing calendar events from localStorage:", e);
      return [];
    }
  }
  return [];
};

const saveUserEventsToLocalStorage = (events: CalendarEvent[]) => {
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

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const eventsRef = ref(db, `users/${currentUser.uid}/calendarEvents`);
      const snapshot = await get(eventsRef);
      if (snapshot.exists()) {
        return firebaseDataToEventsArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching calendar events from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserEventsFromLocalStorage();
  }
}

export const addUserEvent = async (newEventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const eventsRef = ref(db, `users/${currentUser.uid}/calendarEvents`);
        const newEventRef = push(eventsRef);
        const newEvent: CalendarEvent = {
            ...newEventData,
            id: newEventRef.key!,
        };
        const dataToSave = {
            title: newEventData.title,
            start: newEventData.start.toISOString(),
            end: newEventData.end.toISOString(),
            description: newEventData.description,
        };
        await set(newEventRef, dataToSave);
        return newEvent;
    } else {
        const userEvents = loadUserEventsFromLocalStorage();
        const newLocalEvent: CalendarEvent = {
            ...newEventData,
            id: crypto.randomUUID(),
        };
        const updatedEvents = [...userEvents, newLocalEvent].sort((a, b) => a.start.getTime() - b.start.getTime());
        saveUserEventsToLocalStorage(updatedEvents);
        return newLocalEvent;
    }
};

export const updateUserEvent = async (updatedEventData: CalendarEvent): Promise<CalendarEvent | undefined> => {
    if (!updatedEventData.id) return undefined;
    const currentUser = auth.currentUser;

    const dataToSave = {
        title: updatedEventData.title,
        start: updatedEventData.start.toISOString(),
        end: updatedEventData.end.toISOString(),
        description: updatedEventData.description,
    };

    if (currentUser) {
        const eventRef = ref(db, `users/${currentUser.uid}/calendarEvents/${updatedEventData.id}`);
        await set(eventRef, dataToSave);
        return updatedEventData; // Return the original object with Date instances
    } else {
        const userEvents = loadUserEventsFromLocalStorage();
        let found = false;
        const updatedEvents = userEvents.map(event => {
            if (event.id === updatedEventData.id) {
                found = true;
                return updatedEventData;
            }
            return event;
        }).sort((a, b) => a.start.getTime() - b.start.getTime());

        if (found) {
            saveUserEventsToLocalStorage(updatedEvents);
            return updatedEventData;
        }
        return undefined;
    }
};

export const deleteUserEvent = async (eventId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const eventRef = ref(db, `users/${currentUser.uid}/calendarEvents/${eventId}`);
        await remove(eventRef);
        return true;
    } else {
        const userEvents = loadUserEventsFromLocalStorage();
        const updatedEvents = userEvents.filter(event => event.id !== eventId);
        if (updatedEvents.length < userEvents.length) {
            saveUserEventsToLocalStorage(updatedEvents);
            return true;
        }
        return false;
    }
};

export { saveUserEventsToLocalStorage as saveUserEvents };
