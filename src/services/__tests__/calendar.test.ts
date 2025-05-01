import {
  getCalendarEvents,
  saveUserEvents,
  addUserEvent,
  updateUserEvent,
  deleteUserEvent,
  CalendarEvent
} from '@/services/calendar';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'calendar-events') {
      // Return structure similar to the JSON file
      return Promise.resolve([
        { title: 'Mock Event 1', start: new Date(2024, 5, 10, 9).toISOString(), end: new Date(2024, 5, 10, 10).toISOString() },
        { title: 'Mock Event 2', start: new Date(2024, 5, 11, 14).toISOString(), end: new Date(2024, 5, 11, 15).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Calendar Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getCalendarEvents', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const events = await getCalendarEvents('mock');
      expect(events.length).toBe(2);
      expect(events[0].title).toBe('Mock Event 1');
      expect(events[0].start).toBeInstanceOf(Date);
       expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('calendar-events');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userEvents: CalendarEvent[] = [
        { id: 'user1', title: 'User Event 1', start: new Date(2024, 5, 12, 10), end: new Date(2024, 5, 12, 11) },
      ];
      saveUserEvents(userEvents); // Save to mock localStorage

      const events = await getCalendarEvents('user');
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('User Event 1');
      expect(events[0].id).toBe('user1');
       expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

    it('should return empty array if localStorage is empty in "user" mode', async () => {
        const events = await getCalendarEvents('user');
        expect(events).toEqual([]);
    });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem('prodev-calendar-events', 'invalid json');
        const events = await getCalendarEvents('user');
        expect(events).toEqual([]);
    });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserEvent should add an event to localStorage', () => {
      const newEventData = { title: 'New User Event', start: new Date(), end: new Date(Date.now() + 3600000) };
      const addedEvent = addUserEvent(newEventData);

      expect(addedEvent.id).toBeDefined();
      expect(addedEvent.title).toBe('New User Event');

      const storedEvents = JSON.parse(localStorage.getItem('prodev-calendar-events') || '[]');
      expect(storedEvents.length).toBe(1);
      expect(storedEvents[0].title).toBe('New User Event');
       expect(storedEvents[0].id).toBe(addedEvent.id);
    });

    it('updateUserEvent should update an existing event in localStorage', () => {
       const initialEvent = addUserEvent({ title: 'Initial Event', start: new Date(), end: new Date() });
       const updatedData: CalendarEvent = { ...initialEvent, title: 'Updated Event Title' };

       const result = updateUserEvent(updatedData);
       expect(result).toBeDefined();
       expect(result?.title).toBe('Updated Event Title');

        const storedEvents = JSON.parse(localStorage.getItem('prodev-calendar-events') || '[]');
        expect(storedEvents.length).toBe(1);
        expect(storedEvents[0].title).toBe('Updated Event Title');
        expect(storedEvents[0].id).toBe(initialEvent.id);
    });

     it('updateUserEvent should return undefined if event ID not found', () => {
       addUserEvent({ title: 'Existing Event', start: new Date(), end: new Date() });
       const nonExistentUpdate: CalendarEvent = { id: 'non-existent-id', title: 'Wont Update', start: new Date(), end: new Date() };
       const result = updateUserEvent(nonExistentUpdate);
       expect(result).toBeUndefined();
       const storedEvents = JSON.parse(localStorage.getItem('prodev-calendar-events') || '[]');
       expect(storedEvents.length).toBe(1); // Should not have changed
       expect(storedEvents[0].title).toBe('Existing Event');
     });

     it('deleteUserEvent should remove an event from localStorage', () => {
        const event1 = addUserEvent({ title: 'Event 1', start: new Date(), end: new Date() });
        const event2 = addUserEvent({ title: 'Event 2', start: new Date(), end: new Date() });

        const success = deleteUserEvent(event1.id!);
        expect(success).toBe(true);

        const storedEvents = JSON.parse(localStorage.getItem('prodev-calendar-events') || '[]');
        expect(storedEvents.length).toBe(1);
        expect(storedEvents[0].id).toBe(event2.id);
     });

      it('deleteUserEvent should return false if event ID not found', () => {
         addUserEvent({ title: 'Existing Event', start: new Date(), end: new Date() });
         const success = deleteUserEvent('non-existent-id');
         expect(success).toBe(false);
          const storedEvents = JSON.parse(localStorage.getItem('prodev-calendar-events') || '[]');
         expect(storedEvents.length).toBe(1); // Should not have changed
      });
  });
});
