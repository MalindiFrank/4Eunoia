/**
 * Represents an event in a calendar.
 */
export interface CalendarEvent {
  /**
   * The title of the event.
   */
  title: string;
  /**
   * The start date and time of the event.
   */
  start: Date;
  /**
   * The end date and time of the event.
   */
  end: Date;
  /**
   * A description of the event.
   */
  description?: string;
}

/**
 * Asynchronously retrieves calendar events for a given date range.
 *
 * @param startDate The start date of the range.
 * @param endDate The end date of the range.
 * @returns A promise that resolves to an array of CalendarEvent objects.
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      title: 'Sample Meeting',
      start: new Date(),
      end: new Date(new Date().getTime() + 60 * 60 * 1000),
      description: 'Discuss project progress'
    }
  ];
}
