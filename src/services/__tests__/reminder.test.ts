import { getUpcomingReminders, Reminder } from '@/services/reminder'; // Adjust path as necessary

describe('Reminder Service', () => {
  describe('getUpcomingReminders', () => {
    it('should return an array of reminders', async () => {
      const reminders = await getUpcomingReminders();

      // Basic check: should return an array
      expect(Array.isArray(reminders)).toBe(true);

      // Check based on the mock implementation
      expect(reminders.length).toBeGreaterThanOrEqual(1); // Expecting at least the sample reminder
      expect(reminders[0]).toHaveProperty('id');
      expect(reminders[0]).toHaveProperty('title');
      expect(reminders[0]).toHaveProperty('dateTime');
      // description is optional
      expect(reminders[0].dateTime).toBeInstanceOf(Date);
    });

    // Add more tests if the function had filtering logic (e.g., only future reminders)
  });
});
