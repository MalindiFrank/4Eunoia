/**
 * Represents a reminder.
 */
export interface Reminder {
  /**
   * The unique identifier of the reminder.
   */
  id: string;
  /**
   * The title of the reminder.
   */
  title: string;
  /**
   * The date and time when the reminder should trigger.
   */
  dateTime: Date;
  /**
   * A description of the reminder.
   */
  description?: string;
}

/**
 * Asynchronously retrieves a list of upcoming reminders.
 *
 * @returns A promise that resolves to an array of Reminder objects.
 */
export async function getUpcomingReminders(): Promise<Reminder[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      title: 'Pay Bills',
      dateTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      description: 'Remember to pay all pending bills'
    }
  ];
}
