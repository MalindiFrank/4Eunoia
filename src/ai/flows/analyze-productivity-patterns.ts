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
import { parseISO, isWithinInterval, formatISO } from 'date-fns'; // Removed helpers not needed here


// Define expected input structure for Zod validation (ISO dates)
const EventSchema = z.object({
  title: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  description: z.string().optional(),
});
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  createdAt: z.string().datetime().optional(),
});
const ExpenseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string().datetime(),
  category: z.string(),
});
const ReminderSchema = z.object({
  id: z.string(),
  title: z.string(),
  dateTime: z.string().datetime(),
  description: z.string().optional(),
});
const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const LogEntrySchema = z.object({
  id: z.string(),
  date: z.string().datetime(),
  activity: z.string(),
  notes: z.string().optional(),
  diaryEntry: z.string().optional(),
  mood: z.string().optional(), // Added mood
});


const AnalyzeProductivityPatternsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
  // Pass all relevant data directly into the flow
  calendarEvents: z.array(EventSchema).optional().describe('Calendar events within the specified date range.'),
  tasks: z.array(TaskSchema).optional().describe('Tasks relevant to the period (due or created).'),
  expenses: z.array(ExpenseSchema).optional().describe('Expenses within the range.'),
  reminders: z.array(ReminderSchema).optional().describe('Reminders within the range.'),
  notes: z.array(NoteSchema).optional().describe('Notes created within the range.'),
  dailyLogs: z.array(LogEntrySchema).optional().describe('Daily logs within the range. Pay close attention to diary entries for sentiments and challenges.'),
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

// Exported function now just calls the flow
export async function analyzeProductivityPatterns(
  input: AnalyzeProductivityPatternsInput
): Promise<AnalyzeProductivityPatternsOutput> {
    // Data is already included in the input object
    return analyzeProductivityPatternsFlow(input);
}

// Define prompt input schema using simplified string versions of the data
const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
      calendarEventsJson: z.string().describe('JSON string summary of calendar events (e.g., [{title, start}]).'),
      tasksJson: z.string().describe('JSON string summary of tasks (e.g., [{title, status, dueDate}]).'),
      expensesJson: z.string().describe('JSON string summary of expenses (e.g., [{category, amount}]).'),
      remindersJson: z.string().describe('JSON string summary of reminders (e.g., [{title}]).'),
      notesJson: z.string().describe('JSON string summary of notes created (e.g., [{title}]).'),
      dailyLogsJson: z.string().describe('JSON string summary of daily logs (e.g., [{activity, mood, diaryEntry}]).'),
      additionalContext: z.string().optional().describe('Any additional context from the user.'),
});


const analyzeProductivityPatternsPrompt = ai.definePrompt({
  name: 'analyzeProductivityPatternsPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
    schema: AnalyzeProductivityPatternsOutputSchema,
  },
   prompt: `Analyze the user's productivity patterns based on the data summaries provided for the period {{startDate}} to {{endDate}}.

Data Summaries (JSON Strings):
Calendar Events: {{{calendarEventsJson}}}
Tasks: {{{tasksJson}}}
Expenses: {{{expensesJson}}}
Reminders: {{{remindersJson}}}
Notes Created: {{{notesJson}}}
Daily Logs: {{{dailyLogsJson}}}
User Context: {{{additionalContext}}}

Analysis Tasks:
1.  **Peak Performance Times:** Identify times/days the user appears most productive (e.g., frequent logs, task completions, focused work blocks in calendar). Look for patterns in the data provided.
2.  **Common Distractions/Obstacles:** Identify recurring challenges (e.g., mentions of procrastination in diary, types of overdue tasks, frequent context switching implied by short/scattered calendar events or many notes).
3.  **Suggested Strategies:** Based on the analysis, suggest 2-3 actionable strategies (e.g., if meetings interrupt flow, suggest time blocking; if tasks are often overdue, suggest breaking them down; if diary mentions stress, suggest mindfulness).
4.  **Overall Assessment:** Provide a brief summary (1-2 sentences) of productivity strengths and areas for potential improvement during this period.

Generate the output in the specified JSON format. Be insightful and connect observations across different data sources where possible. For example, link diary entries about feeling overwhelmed to task statuses or calendar density.
`,
});


const analyzeProductivityPatternsFlow = ai.defineFlow<
  typeof AnalyzeProductivityPatternsInputSchema, // Flow input includes full data
  typeof AnalyzeProductivityPatternsOutputSchema
>(
  {
    name: 'analyzeProductivityPatternsFlow',
    inputSchema: AnalyzeProductivityPatternsInputSchema,
    outputSchema: AnalyzeProductivityPatternsOutputSchema,
  },
  async (input) => {
    // Destructure the data passed in the input
     const {
         startDate,
         endDate,
         calendarEvents = [],
         tasks = [],
         expenses = [],
         reminders = [],
         notes = [],
         dailyLogs = [],
         additionalContext,
     } = input;

    // Create simplified JSON strings for the prompt to save tokens
    const calendarEventsString = JSON.stringify(calendarEvents.map(e => ({ title: e.title, start: e.start })));
    const tasksString = JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, dueDate: t.dueDate })));
    const expensesString = JSON.stringify(expenses.map(e => ({ category: e.category, amount: e.amount })));
    const remindersString = JSON.stringify(reminders.map(r => ({ title: r.title })));
    const notesString = JSON.stringify(notes.map(n => ({ title: n.title })));
    const dailyLogsString = JSON.stringify(dailyLogs.map(l => ({ activity: l.activity, mood: l.mood, diary: l.diaryEntry ? '...' : '' }))); // Keep diary brief

    // Check if any meaningful data was actually passed
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

    // Prepare input for the prompt
    const promptInputData: z.infer<typeof PromptInputSchema> = {
       startDate: startDate, // Already ISO string
       endDate: endDate,     // Already ISO string
       calendarEventsJson: calendarEventsString,
       tasksJson: tasksString,
       expensesJson: expensesString,
       remindersJson: remindersString,
       notesJson: notesString,
       dailyLogsJson: dailyLogsString,
       additionalContext: additionalContext,
    };

    const { output } = await analyzeProductivityPatternsPrompt(promptInputData);

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

    