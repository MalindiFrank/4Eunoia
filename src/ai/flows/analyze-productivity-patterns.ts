
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
import { formatISO, isValid, parseISO } from 'date-fns';
import type { UserPreferences } from './generate-daily-plan'; // Import UserPreferences

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
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  createdAt: z.string().datetime().optional().nullable(),
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
  focusLevel: z.number().min(1).max(5).optional().nullable(),
});


export const AnalyzeProductivityPatternsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
  calendarEvents: z.array(EventSchema).optional().describe('Calendar events within the specified date range.'),
  tasks: z.array(TaskSchema).optional().describe('Tasks relevant to the period (due or created).'),
  notes: z.array(NoteSchema).optional().describe('Notes created within the range.'),
  dailyLogs: z.array(LogEntrySchema).optional().describe('Daily logs within the range. Pay close attention to diary entries, mood, and focus levels for sentiments, challenges, and attention quality.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or information provided by the user (e.g., current goals, feelings).'),
  userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction and planning."),
});
export type AnalyzeProductivityPatternsInput = z.infer<
  typeof AnalyzeProductivityPatternsInputSchema
>;

export const AnalyzeProductivityPatternsOutputSchema = z.object({
  peakPerformanceTimes: z
    .string()
    .describe('Identifies the times of day or days of the week when the user seems most productive or focused based on logs (activity, mood, focusLevel), task completion, and calendar events. Should correlate this with types of activities logged if possible.'),
  commonDistractionsOrObstacles: z
    .string()
    .describe('Identifies potential recurring distractions, obstacles (mentioned in diary), challenges (low focusLevel logs), or indicated by overdue tasks or low activity periods. If diary entries are sparse, rely more on patterns of low focusLevel logs, overdue tasks, or high context switching.'),
  attentionQualityAssessment: z
     .string()
     .optional()
     .describe("Brief assessment of attention quality based on focusLevel logs (e.g., 'Focus seems generally high during logged work periods', 'Attention appears to dip frequently'). Omit if insufficient focus data."),
  suggestedStrategies: z
    .string()
    .describe('Provides 2-3 personalized, actionable and concrete strategies and recommendations for improving productivity, time management, or focus based on the analysis (e.g., "Block 1 hour for [Task Type] during your peak morning focus" instead of just "Manage your time better"). Adjust tone based on aiPersona and detail based on aiInsightVerbosity.'),
  overallAssessment: z
    .string()
    .describe('A brief (1-2 sentence) overall assessment of the user’s productivity patterns during the period, highlighting strengths (e.g., high focus) and areas for potential improvement (e.g., managing distractions). Adjust tone based on aiPersona and detail based on aiInsightVerbosity.'),
});
export type AnalyzeProductivityPatternsOutput = z.infer<
  typeof AnalyzeProductivityPatternsOutputSchema
>;

export async function analyzeProductivityPatterns(
  input: AnalyzeProductivityPatternsInput
): Promise<AnalyzeProductivityPatternsOutput> {
    if (!input.startDate || !isValid(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided.");
    }
    if (!input.endDate || !isValid(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided.");
    }
    return analyzeProductivityPatternsFlow(input);
}

const PromptInputSchemaInternal = z.object({ // Renamed
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing productivity patterns.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing productivity patterns.'),
      calendarEventsJson: z.string().describe('JSON string summary of calendar events (e.g., [{title, start, durationMinutes}]).'),
      tasksJson: z.string().describe('JSON string summary of tasks (e.g., [{title, status, due, created}]).'),
      notesJson: z.string().describe('JSON string summary of notes created (e.g., [{title, createdAt}]).'),
      dailyLogsJson: z.string().describe('JSON string summary of daily logs (e.g., [{date, activity, mood, focusLevel, hasDiary}]). Pay attention to focusLevel (1=Low, 5=High).'),
      additionalContext: z.string().optional().describe('Any additional context from the user.'),
      userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction and planning."),
});


const analyzeProductivityPatternsPrompt = ai.definePrompt({
  name: 'analyzeProductivityPatternsPrompt',
  input: {
    schema: PromptInputSchemaInternal,
  },
  output: {
    schema: AnalyzeProductivityPatternsOutputSchema,
  },
   prompt: `You are an AI assistant analyzing a user's productivity patterns.
Your persona: {{userPreferences.aiPersona | default "Supportive Coach"}}.
Insight verbosity: {{userPreferences.aiInsightVerbosity | default "Detailed Analysis"}}.

Analyze data from {{startDate}} to {{endDate}}.
User's typical energy pattern: {{userPreferences.energyLevelPattern | default "Not specified"}}.
User's preferred work times: {{userPreferences.preferredWorkTimes | default "Flexible"}}.

Data Summaries (JSON Strings):
Calendar Events: {{{calendarEventsJson}}}
Tasks: {{{tasksJson}}}
Notes Created: {{{notesJson}}}
Daily Logs: {{{dailyLogsJson}}}
User Context: {{{additionalContext}}}

Analysis Tasks:
1.  **Peak Performance Times:** Based on logs (activity, mood, focusLevel 1-5), task completion, calendar entries, and user's stated 'preferredWorkTimes' and 'energyLevelPattern', identify when the user is most productive/focused. Correlate with activity types.
2.  **Common Distractions/Obstacles:** From diary entries, low focusLevel logs, overdue tasks, context switching (many short events), or low activity periods, identify recurring distractions/obstacles.
3.  **Attention Quality Assessment (Optional):** Based on \`focusLevel\` in daily logs, assess attention quality. Omit if insufficient data.
4.  **Suggested Strategies:** Provide 2-3 actionable, personalized, concrete strategies. Examples: "Schedule [Task Type] during your peak morning focus (as per your energy pattern: {{userPreferences.energyLevelPattern}})." or "Try time blocking for tasks during periods of logged low focus." Tailor suggestions to findings and preferences.
5.  **Overall Assessment:** Provide a concise (1-2 sentences, or more if 'Detailed Analysis' verbosity) summary of productivity patterns, strengths, and areas for improvement.

Generate output in JSON. Be insightful, connect observations, and maintain the specified persona and verbosity.`,
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
     const {
         startDate,
         endDate,
         calendarEvents = [],
         tasks = [],
         notes = [],
         dailyLogs = [],
         additionalContext,
         userPreferences,
     } = input;

     const safeFormatDateHelper = (dateString: string | undefined | null, formatStr: string = 'yyyy-MM-dd'): string | null => {
         if (!dateString) return null;
         try {
            const date = parseISO(dateString);
            return isValid(date) ? formatISO(date, { representation: 'date' }) : null;
         } catch {
            return null;
         }
     };

     const calculateDurationHelper = (startStr: string | undefined | null, endStr: string | undefined | null): number | null => {
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

     const calendarEventsString = JSON.stringify(calendarEvents.map(e => ({
         title: e.title,
         start: safeFormatDateHelper(e.start),
         durationMinutes: calculateDurationHelper(e.start, e.end)
     })));
     const tasksString = JSON.stringify(tasks.map(t => ({
         title: t.title,
         status: t.status,
         due: safeFormatDateHelper(t.dueDate),
         created: safeFormatDateHelper(t.createdAt)
     })));
     const notesString = JSON.stringify(notes.map(n => ({
         title: n.title,
         createdAt: safeFormatDateHelper(n.createdAt)
     })));
     const dailyLogsString = JSON.stringify(dailyLogs.map(l => ({
         date: safeFormatDateHelper(l.date),
         activity: l.activity,
         mood: l.mood,
         focusLevel: l.focusLevel,
         hasDiary: !!l.diaryEntry
     })));

    const hasData = calendarEvents.length > 0 || tasks.length > 0 || notes.length > 0 || dailyLogs.length > 0;

     if (!hasData) {
       return {
         peakPerformanceTimes: "Insufficient data to determine peak performance times.",
         commonDistractionsOrObstacles: "Insufficient data to identify common distractions or obstacles.",
         suggestedStrategies: "Unable to suggest strategies due to lack of data. Start logging activities, tasks, and reflections!",
         overallAssessment: "No data available for the selected period to assess productivity.",
         attentionQualityAssessment: "No focus level data available to assess attention quality.",
       };
     }

    const promptInputData: z.infer<typeof PromptInputSchemaInternal> = {
       startDate: startDate,
       endDate: endDate,
       calendarEventsJson: calendarEventsString,
       tasksJson: tasksString,
       notesJson: notesString,
       dailyLogsJson: dailyLogsString,
       additionalContext: additionalContext,
       userPreferences: userPreferences || { // Provide default preferences if undefined
            aiPersona: 'Supportive Coach',
            aiInsightVerbosity: 'Detailed Analysis',
            energyLevelPattern: 'Not specified',
            preferredWorkTimes: 'Flexible',
            growthPace: 'Moderate',
        },
    };

    const { output } = await analyzeProductivityPatternsPrompt(promptInputData);

    if (!output) {
        console.error('AI analysis failed to return output for productivity patterns.');
        return {
            peakPerformanceTimes: "Analysis could not determine peak performance times.",
            commonDistractionsOrObstacles: "Analysis could not identify common distractions or obstacles.",
            suggestedStrategies: "Could not generate suggested strategies. Try logging more data.",
            overallAssessment: "Productivity analysis failed to generate an assessment.",
            attentionQualityAssessment: "Attention quality assessment failed or data was insufficient.",
        };
    }

    return output;
  }
);
    