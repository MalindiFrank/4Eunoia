
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
import type { LogEntry } from '@/services/daily-log';
import type { Task } from '@/services/task';
import type { CalendarEvent } from '@/services/calendar';
import type { Note } from '@/services/note';

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
      // Removed expenses/reminders as they are less relevant to productivity patterns
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
Notes Created: {{{notesJson}}}
Daily Logs: {{{dailyLogsJson}}}
User Context: {{{additionalContext}}}

Analysis Tasks:
1.  **Peak Performance Times:** Based on logged activities, task completion times (if available), and calendar entries marked as 'focus' or 'work', identify specific times of day or days of the week when the user appears most productive or focused. Look for patterns like consistent morning activity or productive weekend logs.
2.  **Common Distractions/Obstacles:** Analyze diary entries for mentions of procrastination, feeling overwhelmed, specific distractions (e.g., social media, interruptions). Also, look for patterns of overdue tasks, many short calendar events indicating context switching, or periods with few logged activities despite pending tasks.
3.  **Suggested Strategies:** Provide 2-3 actionable, personalized strategies based on the findings. Examples:
    - If peak time is mornings: "Schedule your most important tasks in the morning."
    - If distractions are mentioned: "Try using a focus app or time blocking to minimize interruptions."
    - If tasks are often overdue: "Break down large tasks into smaller steps."
    - If diary mentions stress: "Consider scheduling short breaks or mindfulness exercises."
    - If context switching seems high: "Try batching similar tasks together (e.g., answering emails at specific times)."
4.  **Overall Assessment:** Provide a concise (1-2 sentences) summary of the user's productivity during this period. Highlight observed strengths (e.g., "consistent logging," "good task completion rate") and areas for potential improvement (e.g., "managing distractions," "evening productivity dip").

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
         // expenses = [], // Removed
         // reminders = [], // Removed
         notes = [],
         dailyLogs = [],
         additionalContext,
     } = input;

    // Create simplified JSON strings for the prompt to save tokens
    // Keep more context for logs and tasks, less for others
    const calendarEventsString = JSON.stringify(calendarEvents.map(e => ({ title: e.title, start: e.start, durationMinutes: (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000 })));
    const tasksString = JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, due: t.dueDate ? t.dueDate.substring(0,10) : null, created: t.createdAt?.substring(0,10) })));
    // const expensesString = JSON.stringify(expenses.map(e => ({ category: e.category, amount: e.amount }))); // Removed
    // const remindersString = JSON.stringify(reminders.map(r => ({ title: r.title }))); // Removed
    const notesString = JSON.stringify(notes.map(n => ({ title: n.title, createdAt: n.createdAt.substring(0,10) })));
    const dailyLogsString = JSON.stringify(dailyLogs.map(l => ({ date: l.date.substring(0,10), activity: l.activity, mood: l.mood, hasDiary: !!l.diaryEntry }))); // Keep diary entry brief for summary

    // Check if any meaningful data was actually passed
    const hasData = calendarEvents.length > 0 || tasks.length > 0 || notes.length > 0 || dailyLogs.length > 0;

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
       // expensesJson: expensesString, // Removed
       // remindersJson: remindersString, // Removed
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

    
