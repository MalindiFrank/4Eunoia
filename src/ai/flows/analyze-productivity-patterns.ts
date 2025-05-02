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
import type { LogEntry } from '@/services/daily-log'; // Uses focusLevel
import type { Task } from '@/services/task';
import type { CalendarEvent } from '@/services/calendar';
import type { Note } from '@/services/note';
import { formatISO, isValid, parseISO } from 'date-fns'; // Added isValid, parseISO

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
  dueDate: z.string().datetime().optional().nullable(), // Allow null
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  createdAt: z.string().datetime().optional().nullable(), // Allow null
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
  mood: z.string().optional(),
  focusLevel: z.number().min(1).max(5).optional().nullable(), // Added focusLevel, allow null
});


const AnalyzeProductivityPatternsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
  // Pass all relevant data directly into the flow
  calendarEvents: z.array(EventSchema).optional().describe('Calendar events within the specified date range.'),
  tasks: z.array(TaskSchema).optional().describe('Tasks relevant to the period (due or created).'),
  notes: z.array(NoteSchema).optional().describe('Notes created within the range.'),
  dailyLogs: z.array(LogEntrySchema).optional().describe('Daily logs within the range. Pay close attention to diary entries, mood, and focus levels for sentiments, challenges, and attention quality.'),
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
    .describe('Identifies the times of day or days of the week when the user seems most productive or focused based on logs (activity, mood, focusLevel), task completion, and calendar events.'),
  commonDistractionsOrObstacles: z
    .string()
    .describe('Identifies potential recurring distractions, obstacles (mentioned in diary), challenges (low focusLevel logs), or indicated by overdue tasks or low activity periods.'),
  attentionQualityAssessment: z
     .string()
     .optional()
     .describe("Brief assessment of attention quality based on focusLevel logs (e.g., 'Focus seems generally high during logged work periods', 'Attention appears to dip frequently'). Omit if insufficient focus data."),
  suggestedStrategies: z
    .string()
    .describe('Provides 2-3 personalized, actionable strategies and recommendations for improving productivity, time management, or focus based on the analysis (e.g., time blocking, task batching, managing specific distractions, improving attention quality).'),
  overallAssessment: z
    .string()
    .describe('A brief (1-2 sentence) overall assessment of the user’s productivity patterns during the period, highlighting strengths (e.g., high focus) and areas for potential improvement (e.g., managing distractions).'),
});
export type AnalyzeProductivityPatternsOutput = z.infer<
  typeof AnalyzeProductivityPatternsOutputSchema
>;

// Exported function now just calls the flow
export async function analyzeProductivityPatterns(
  input: AnalyzeProductivityPatternsInput
): Promise<AnalyzeProductivityPatternsOutput> {
    // Validate input dates before passing to the flow
    if (!input.startDate || !isValid(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided.");
    }
    if (!input.endDate || !isValid(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided.");
    }
    return analyzeProductivityPatternsFlow(input);
}

// Define prompt input schema using simplified string versions of the data
const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
      calendarEventsJson: z.string().describe('JSON string summary of calendar events (e.g., [{title, start, durationMinutes}]).'),
      tasksJson: z.string().describe('JSON string summary of tasks (e.g., [{title, status, due, created}]).'),
      notesJson: z.string().describe('JSON string summary of notes created (e.g., [{title, createdAt}]).'),
      dailyLogsJson: z.string().describe('JSON string summary of daily logs (e.g., [{date, activity, mood, focusLevel, hasDiary}]). Pay attention to focusLevel (1=Low, 5=High).'), // Added focusLevel
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
1.  **Peak Performance Times:** Based on logged activities, mood, reported focus levels (1=Low, 5=High), task completion times (if available), and calendar entries marked as 'focus' or 'work', identify specific times of day or days of the week when the user appears most productive or focused. Look for patterns like consistent morning activity, high focus logs, or productive weekend logs.
2.  **Common Distractions/Obstacles:** Analyze diary entries for mentions of procrastination, feeling overwhelmed, specific distractions. Also, look for patterns of low focusLevel logs, overdue tasks, many short calendar events indicating context switching, or periods with few logged activities despite pending tasks.
3.  **Attention Quality Assessment (Optional):** Based on the `focusLevel` provided in daily logs, provide a brief assessment if enough data exists. Examples: "Focus seems generally high during logged work periods," "Attention appears to dip frequently, especially during [activity type] logs," "Focus data is sparse, difficult to assess." Omit if no `focusLevel` data is available.
4.  **Suggested Strategies:** Provide 2-3 actionable, personalized strategies based on the findings. Examples:
    - If peak time is mornings: "Schedule your most important tasks in the morning."
    - If distractions/low focus mentioned: "Try using a focus app or time blocking to minimize interruptions during low-focus periods."
    - If tasks are often overdue: "Break down large tasks into smaller steps."
    - If diary mentions stress: "Consider scheduling short breaks or mindfulness exercises."
    - If context switching seems high: "Try batching similar tasks together (e.g., answering emails at specific times)."
5.  **Overall Assessment:** Provide a concise (1-2 sentences) summary of the user's productivity during this period. Highlight observed strengths (e.g., "consistent logging," "high focus during X") and areas for potential improvement (e.g., "managing afternoon focus dips," "addressing overdue tasks").

Generate the output in the specified JSON format. Be insightful and connect observations across different data sources where possible. For example, link diary entries about feeling overwhelmed to task statuses or low focus logs.
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
     const {
         startDate,
         endDate,
         calendarEvents = [],
         tasks = [],
         notes = [],
         dailyLogs = [],
         additionalContext,
     } = input;

     // Helper function to safely format dates
     const safeFormatDate = (dateString: string | undefined | null, formatStr: string = 'yyyy-MM-dd'): string | null => {
         if (!dateString) return null;
         try {
            const date = parseISO(dateString);
            return isValid(date) ? formatISO(date, { representation: 'date' }) : null;
         } catch {
            return null;
         }
     };

     // Helper function to calculate duration safely
     const calculateDuration = (startStr: string | undefined | null, endStr: string | undefined | null): number | null => {
         if (!startStr || !endStr) return null;
         try {
             const start = parseISO(startStr);
             const end = parseISO(endStr);
             if (isValid(start) && isValid(end) && end >= start) {
                 return Math.round((end.getTime() - start.getTime()) / 60000);
             }
         } catch { /* Ignore parsing errors */ }
         return null;
     };


    // Create simplified JSON strings for the prompt
     const calendarEventsString = JSON.stringify(calendarEvents.map(e => ({
         title: e.title,
         start: safeFormatDate(e.start),
         durationMinutes: calculateDuration(e.start, e.end)
     })));
     const tasksString = JSON.stringify(tasks.map(t => ({
         title: t.title,
         status: t.status,
         due: safeFormatDate(t.dueDate),
         created: safeFormatDate(t.createdAt)
     })));
     const notesString = JSON.stringify(notes.map(n => ({
         title: n.title,
         createdAt: safeFormatDate(n.createdAt)
     })));
    // Include focusLevel and indication of diary entry presence in the log summary
     const dailyLogsString = JSON.stringify(dailyLogs.map(l => ({
         date: safeFormatDate(l.date),
         activity: l.activity,
         mood: l.mood,
         focusLevel: l.focusLevel, // Pass focusLevel directly
         hasDiary: !!l.diaryEntry
     })));

    const hasData = calendarEvents.length > 0 || tasks.length > 0 || notes.length > 0 || dailyLogs.length > 0;

     if (!hasData) {
       return {
         peakPerformanceTimes: "Insufficient data to determine peak performance times.",
         commonDistractionsOrObstacles: "Insufficient data to identify common distractions or obstacles.",
         suggestedStrategies: "Unable to suggest strategies due to lack of data. Start logging activities, tasks, and reflections!",
         overallAssessment: "No data available for the selected period to assess productivity.",
       };
     }

    // Prepare input for the prompt
    const promptInputData: z.infer<typeof PromptInputSchema> = {
       startDate: startDate, // These are validated before flow entry
       endDate: endDate,
       calendarEventsJson: calendarEventsString,
       tasksJson: tasksString,
       notesJson: notesString,
       dailyLogsJson: dailyLogsString,
       additionalContext: additionalContext,
    };

    const { output } = await analyzeProductivityPatternsPrompt(promptInputData);

    if (!output) {
        console.error('AI analysis failed to return output for productivity patterns.');
        // Provide a more informative fallback
        return {
            peakPerformanceTimes: "Analysis could not determine peak performance times.",
            commonDistractionsOrObstacles: "Analysis could not identify common distractions or obstacles.",
            suggestedStrategies: "Could not generate suggested strategies. Try logging more data.",
            overallAssessment: "Productivity analysis failed to generate an assessment.",
             attentionQualityAssessment: undefined, // Ensure all fields exist even in error
        };
    }

    return output;
  }
);

    