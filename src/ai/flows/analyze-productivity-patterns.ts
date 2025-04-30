'use server';

/**
 * @fileOverview Analyzes user data to identify productivity patterns and suggests improvement strategies.
 *
 * - analyzeProductivityPatterns - A function that analyzes user data and provides insights.
 * - AnalyzeProductivityPatternsInput - The input type for the analyzeProductivityPatterns function.
 * - AnalyzeProductivityPatternsOutput - The return type for the analyzeProductivityPatterns function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { parseISO, isWithinInterval } from 'date-fns';

// Import types directly (assuming they are defined in respective files)
import type { CalendarEvent } from '@/services/calendar';
import type { Reminder } from '@/services/reminder';
import type { Task } from '@/services/task';
import type { Expense } from '@/services/expense';
// Assuming Note type is exported from notes page
interface Note { id: string; title: string; content: string; createdAt: Date; updatedAt: Date; }
// Assuming LogEntry type is exported from daily log page
interface LogEntry { id: string; date: Date; activity: string; notes?: string; diaryEntry?: string; }


// ----- Data Loading Functions (Placeholders - Replace with actual service calls) -----
// IMPORTANT: Direct localStorage access won't work reliably in Server Actions.
// These are illustrative and assume data is fetched/available server-side.

async function loadCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    console.warn("Using mock calendar events for productivity analysis.");
    // In a real app, fetch from DB/API filtered by date range
    const mockEvents = [
        { title: 'Daily Standup', start: new Date(new Date().setHours(9, 0, 0, 0)), end: new Date(new Date().setHours(9, 15, 0, 0)) },
        { title: 'Project Work', start: new Date(new Date().setHours(14, 0, 0, 0)), end: new Date(new Date().setHours(16, 0, 0, 0)) },
         { title: 'Client Meeting', start: new Date(addDays(new Date(), 2).setHours(11, 0, 0, 0)), end: new Date(addDays(new Date(), 2).setHours(12, 0, 0, 0)) },
         { title: 'Past Event', start: new Date(subDays(new Date(), 3).setHours(10, 0, 0, 0)), end: new Date(subDays(new Date(), 3).setHours(11, 0, 0, 0)) },
    ];
     return mockEvents.filter(event => isWithinInterval(event.start, { start: startDate, end: endDate }));
}

async function loadReminders(startDate: Date, endDate: Date): Promise<Reminder[]> {
     console.warn("Using mock reminders for productivity analysis.");
     // Fetch from localStorage or service
     const now = new Date();
      const mockReminders = [
        { id: 'rem-mock-1', title: 'Call Mom', dateTime: addHours(now, 2), description: 'Check in for the week' },
        { id: 'rem-mock-2', title: 'Doctor Appointment', dateTime: addDays(now, 3), description: 'Annual check-up at 10:00 AM' },
        { id: 'rem-mock-3', title: 'Project Deadline', dateTime: addDays(now, 7), description: 'Submit final version of Project Alpha' },
    ];
    return mockReminders.filter(r => isWithinInterval(r.dateTime, { start: startDate, end: endDate }));
}

async function loadTasks(startDate: Date, endDate: Date): Promise<Task[]> {
    console.log("Loading tasks from localStorage for productivity analysis.");
    const storedTasksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-tasks') : null;
    let allTasks: Task[] = [];
    if (storedTasksRaw) {
        try {
            allTasks = JSON.parse(storedTasksRaw).map((t: any) => ({
                ...t,
                dueDate: t.dueDate ? parseISO(t.dueDate) : undefined,
                createdAt: t.createdAt ? parseISO(t.createdAt) : new Date(0) // Handle potential missing createdAt
            }));
        } catch (e) { console.error("Error parsing tasks from storage:", e); }
    } else {
        console.warn("No tasks found in localStorage for analysis.");
    }
     // Filter tasks relevant to the period (e.g., due date or creation date within range)
    return allTasks.filter(task => {
        const relevantDate = task.dueDate || task.createdAt; // Prioritize due date
        return relevantDate ? isWithinInterval(relevantDate, { start: startDate, end: endDate }) : false;
    });
}

async function loadExpenses(startDate: Date, endDate: Date): Promise<Expense[]> {
    console.log("Loading expenses from localStorage for productivity analysis.");
    const storedExpensesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-expenses') : null;
     let allExpenses: Expense[] = [];
    if (storedExpensesRaw) {
         try {
            allExpenses = JSON.parse(storedExpensesRaw).map((e: any) => ({
                ...e,
                date: parseISO(e.date),
                amount: Number(e.amount) || 0
            }));
         } catch (e) { console.error("Error parsing expenses from storage:", e); }
    } else {
        console.warn("No expenses found in localStorage for analysis.");
    }
    return allExpenses.filter(expense => isWithinInterval(expense.date, { start: startDate, end: endDate }));
}

async function loadNotes(startDate: Date, endDate: Date): Promise<Note[]> {
     console.log("Loading notes from localStorage for productivity analysis.");
     const storedNotesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-notes') : null;
     let allNotes: Note[] = [];
     if (storedNotesRaw) {
          try {
             allNotes = JSON.parse(storedNotesRaw).map((n: any) => ({
                 ...n,
                 createdAt: parseISO(n.createdAt),
                 updatedAt: parseISO(n.updatedAt)
             }));
          } catch (e) { console.error("Error parsing notes from storage:", e); }
     } else {
         console.warn("No notes found in localStorage for analysis.");
     }
      return allNotes.filter(note => isWithinInterval(note.createdAt, { start: startDate, end: endDate })); // Filter by creation date
}

async function loadDailyLogs(startDate: Date, endDate: Date): Promise<LogEntry[]> {
    console.log("Loading daily logs from localStorage for productivity analysis.");
    const storedLogsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-daily-logs') : null;
     let allLogs: LogEntry[] = [];
    if (storedLogsRaw) {
         try {
            allLogs = JSON.parse(storedLogsRaw).map((l: any) => ({
                ...l,
                date: parseISO(l.date)
            }));
         } catch (e) { console.error("Error parsing daily logs from storage:", e); }
    } else {
        console.warn("No daily logs found in localStorage for analysis.");
    }
    return allLogs.filter(log => isWithinInterval(log.date, { start: startDate, end: endDate }));
}

// Helper functions (consider moving to utils if shared)
import { addDays, subDays, addHours } from 'date-fns'; // Make sure these are imported

// ----- End Data Loading -----


const AnalyzeProductivityPatternsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or information provided by the user (e.g., current goals, feelings).'),
});
export type AnalyzeProductivityPatternsInput = z.infer<
  typeof AnalyzeProductivityPatternsInputSchema
>;

const AnalyzeProductivityPatternsOutputSchema = z.object({
  peakPerformanceTimes: z
    .string()
    .describe('Identifies the times of day or days of the week when the user seems most productive or focused based on logs, task completion, and calendar events.'),
  commonDistractionsOrObstacles: z
    .string()
    .describe('Identifies potential recurring distractions, obstacles, or challenges mentioned in diary entries, or indicated by overdue tasks or low activity periods.'),
  suggestedStrategies: z
    .string()
    .describe('Provides 2-3 personalized, actionable strategies and recommendations for improving productivity, time management, or focus based on the analysis (e.g., time blocking, task batching, managing specific distractions).'),
  overallAssessment: z
    .string()
    .describe('A brief (1-2 sentence) overall assessment of the user’s productivity patterns during the period, highlighting strengths and areas for potential improvement.'),
});
export type AnalyzeProductivityPatternsOutput = z.infer<
  typeof AnalyzeProductivityPatternsOutputSchema
>;

export async function analyzeProductivityPatterns(
  input: AnalyzeProductivityPatternsInput
): Promise<AnalyzeProductivityPatternsOutput> {
  // Direct localStorage access attempt - see warning above.
  console.warn("Attempting localStorage access in analyzeProductivityPatterns flow. This relies on Server Action behavior and might fail in production.");
  return analyzeProductivityPatternsFlow(input);
}

// Define prompt input schema using strings for dates
const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
      calendarEvents: z
        .string()
        .describe('JSON string of calendar events within the specified date range. Structure: {title, start, end, description?}.'),
      tasks: z.string().describe('JSON string of tasks relevant to the period (due or created). Structure: {id, title, description?, dueDate?, status, createdAt?}.'),
      expenses: z.string().describe('JSON string of expenses within the range. Structure: {id, description, amount, date, category}.'),
      reminders: z.string().describe('JSON string of reminders within the range. Structure: {id, title, dateTime, description?}.'),
       notes: z.string().describe('JSON string of notes created within the range. Structure: {id, title, content, createdAt, updatedAt}.'),
       dailyLogs: z.string().describe('JSON string of daily logs within the range. Structure: {id, date, activity, notes?, diaryEntry?}. Pay close attention to diary entries for sentiments and challenges.'),
      additionalContext: z
        .string()
        .optional()
        .describe('Any additional context or information provided by the user.'),
});

const analyzeProductivityPatternsPrompt = ai.definePrompt({
  name: 'analyzeProductivityPatternsPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
    schema: AnalyzeProductivityPatternsOutputSchema,
  },
   prompt: `Analyze the user's productivity patterns based on the data provided for the period {{startDate}} to {{endDate}}.

Data:
Calendar Events: {{{calendarEvents}}}
Tasks: {{{tasks}}}
Expenses: {{{expenses}}}
Reminders: {{{reminders}}}
Notes Created: {{{notes}}}
Daily Logs: {{{dailyLogs}}}
User Context: {{{additionalContext}}}

Analysis Tasks:
1.  **Peak Performance Times:** Identify times/days the user appears most productive (e.g., frequent logs, task completions, focused work blocks in calendar).
2.  **Common Distractions/Obstacles:** Identify recurring challenges (e.g., mentions of procrastination in diary, types of overdue tasks, frequent context switching implied by short/scattered calendar events).
3.  **Suggested Strategies:** Based on the analysis, suggest 2-3 actionable strategies (e.g., if meetings interrupt flow, suggest time blocking; if tasks are often overdue, suggest breaking them down).
4.  **Overall Assessment:** Provide a brief summary of productivity strengths and areas for potential improvement during this period.

Generate the output in the specified JSON format. Be insightful and connect observations across different data sources where possible. For example, link diary entries about feeling overwhelmed to task statuses or calendar density.
`,
});

const analyzeProductivityPatternsFlow = ai.defineFlow<
  typeof AnalyzeProductivityPatternsInputSchema,
  typeof AnalyzeProductivityPatternsOutputSchema
>(
  {
    name: 'analyzeProductivityPatternsFlow',
    inputSchema: AnalyzeProductivityPatternsInputSchema,
    outputSchema: AnalyzeProductivityPatternsOutputSchema,
  },
  async (input) => {
    // Parse input date strings into Date objects
    const startDate = parseISO(input.startDate);
    const endDate = parseISO(input.endDate);

    // Fetch data using the placeholder functions with Date objects
    const [
        calendarEvents,
        reminders,
        tasks,
        expenses,
        notes,
        dailyLogs
    ] = await Promise.all([
        loadCalendarEvents(startDate, endDate),
        loadReminders(startDate, endDate),
        loadTasks(startDate, endDate),
        loadExpenses(startDate, endDate),
        loadNotes(startDate, endDate),
        loadDailyLogs(startDate, endDate),
    ]);

    // Format data for the prompt (limit size if necessary)
    const calendarEventsString = JSON.stringify(calendarEvents);
    const tasksString = JSON.stringify(tasks);
    const expensesString = JSON.stringify(expenses);
    const remindersString = JSON.stringify(reminders);
     const notesString = JSON.stringify(notes.map(n => ({ title: n.title, createdAt: n.createdAt }))); // Limit note content size
     const dailyLogsString = JSON.stringify(dailyLogs);

    // Check if any data was actually loaded
    const hasData = calendarEvents.length > 0 || tasks.length > 0 || expenses.length > 0 || reminders.length > 0 || notes.length > 0 || dailyLogs.length > 0;

     if (!hasData) {
       // Return a default message if no data is available
       return {
         peakPerformanceTimes: "Insufficient data to determine peak performance times.",
         commonDistractionsOrObstacles: "Insufficient data to identify common distractions or obstacles.",
         suggestedStrategies: "Unable to suggest strategies due to lack of data. Start logging activities, tasks, and reflections!",
         overallAssessment: "No data available for the selected period to assess productivity.",
       };
     }

    // Prepare input for the prompt using original string dates
    const promptInput: z.infer<typeof PromptInputSchema> = {
       startDate: input.startDate,
       endDate: input.endDate,
       calendarEvents: calendarEventsString,
       tasks: tasksString,
       expenses: expensesString,
       reminders: remindersString,
       notes: notesString,
       dailyLogs: dailyLogsString,
       additionalContext: input.additionalContext,
    };

    const { output } = await analyzeProductivityPatternsPrompt(promptInput);

    // Add fallback if AI output is missing
    if (!output) {
        console.error('AI analysis failed to return output for productivity patterns.');
        return {
            peakPerformanceTimes: "Analysis could not determine peak performance times.",
            commonDistractionsOrObstacles: "Analysis could not identify common distractions or obstacles.",
            suggestedStrategies: "Could not generate suggested strategies.",
            overallAssessment: "Productivity analysis failed to generate an assessment.",
        };
    }

    return output;
  }
);

