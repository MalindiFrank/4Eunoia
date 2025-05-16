
'use server';

/**
 * @fileOverview Generates context-aware daily suggestions based on user data.
 *
 * - generateDailySuggestions - Generates suggestions for routines, focus, breaks, self-care.
 * - GenerateDailySuggestionsInput - The input type for the generateDailySuggestions function.
 * - GenerateDailySuggestionsOutput - The return type for the generateDailySuggestions function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, parseISO, isValid } from 'date-fns';
import type { UserPreferences } from './generate-daily-plan'; // Import UserPreferences type

// Define Zod schemas for input data types (expecting ISO strings)
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional().nullable(),
});
const InputTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['Pending', 'In Progress', 'Completed']),
    dueDate: z.string().datetime().optional().nullable(),
});
const InputEventSchema = z.object({
    title: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
});
const InputHabitSchema = z.object({
    id: z.string(),
    title: z.string(),
    frequency: z.string(),
    lastCompleted: z.string().datetime().optional().nullable(),
});
const InputGoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
});


// --- Input/Output Schemas ---
const GenerateDailySuggestionsInputSchema = z.object({
    currentDateTime: z.string().datetime().describe('The current date and time in ISO 8601 format.'),
    recentLogs: z.array(InputLogSchema).optional().describe('Daily logs from the last 1-2 days, including mood and focus levels.'),
    upcomingTasks: z.array(InputTaskSchema).optional().describe('Pending or In Progress tasks due soon (next 1-2 days).'),
    todaysEvents: z.array(InputEventSchema).optional().describe("Today's calendar events."),
    activeHabits: z.array(InputHabitSchema).optional().describe("User's active habits."),
    activeGoals: z.array(InputGoalSchema).optional().describe("User's 'In Progress' goals."),
    userLocation: z.string().optional().describe('User\'s current general location (e.g., "City, Country") for weather/context.'),
    weatherCondition: z.string().optional().describe('Brief description of current weather (e.g., "Rainy", "Sunny", "Cold").'),
    userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction and planning."),
});
export type GenerateDailySuggestionsInput = z.infer<typeof GenerateDailySuggestionsInputSchema>;

const SuggestionSchema = z.object({
    suggestion: z.string().describe("The specific suggestion text."),
    category: z.enum(['Routine', 'Focus', 'Break', 'Self-care', 'Goal', 'Habit', 'Other']).describe("The category of the suggestion."),
    reasoning: z.string().optional().describe("Brief explanation why this suggestion is relevant (e.g., 'Based on low mood/focus log', 'Upcoming deadline', 'Matches your Moderate growth pace for goals'). Adjust tone based on aiPersona."),
});

const GenerateDailySuggestionsOutputSchema = z.object({
    suggestions: z.array(SuggestionSchema).describe('A list of 2-4 context-aware suggestions for the user.'),
    dailyFocus: z.string().optional().describe("A brief motivational focus or theme for the day. Adjust tone based on aiPersona."),
});
export type GenerateDailySuggestionsOutput = z.infer<typeof GenerateDailySuggestionsOutputSchema>;

// --- Exported Function ---
export async function generateDailySuggestions(
  input: GenerateDailySuggestionsInput
): Promise<GenerateDailySuggestionsOutput> {
     if (!input.currentDateTime || !isValid(parseISO(input.currentDateTime))) {
         throw new Error("Invalid or missing currentDateTime provided for suggestions.");
     }
    return generateDailySuggestionsFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchemaInternal = z.object({ // Renamed to avoid export
    currentDateTime: z.string().datetime(),
    recentLogsJson: z.string().optional().describe('JSON string of recent daily logs.'),
    upcomingTasksJson: z.string().optional().describe('JSON string of upcoming tasks.'),
    todaysEventsJson: z.string().optional().describe('JSON string of today\'s calendar events.'),
    activeHabitsJson: z.string().optional().describe('JSON string of active habits.'),
    activeGoalsJson: z.string().optional().describe('JSON string of active goals.'),
    userLocation: z.string().optional(),
    weatherCondition: z.string().optional(),
    userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction and planning."),
});


const generateSuggestionsPrompt = ai.definePrompt({
  name: 'generateDailySuggestionsPrompt',
  input: { schema: PromptInputSchemaInternal },
  output: { schema: GenerateDailySuggestionsOutputSchema },
  prompt: `You are a helpful AI assistant for the 4Eunoia app. Your persona is '{{userPreferences.aiPersona | default "Supportive Coach"}}'.
Provide 2-4 context-aware, actionable suggestions for the user's day.
The verbosity of your reasoning should be '{{userPreferences.aiInsightVerbosity | default "Detailed Analysis"}}'.

Current Context:
- Time: {{currentDateTime}}
- Location: {{userLocation | default "Not provided"}}
- Weather: {{weatherCondition | default "Not provided"}}
- User Preferences:
  - Growth Pace: {{userPreferences.growthPace | default "Moderate"}}
  - Energy Pattern: {{userPreferences.energyLevelPattern | default "Not specified"}}

Recent Data Summary (JSON Strings):
- Recent Logs (Mood/Activity/Focus): {{#if recentLogsJson}} {{{recentLogsJson}}} {{else}} None {{/if}}
- Upcoming Tasks (Due Soon): {{#if upcomingTasksJson}} {{{upcomingTasksJson}}} {{else}} None {{/if}}
- Today's Events: {{#if todaysEventsJson}} {{{todaysEventsJson}}} {{else}} None {{/if}}
- Active Habits: {{#if activeHabitsJson}} {{{activeHabitsJson}}} {{else}} None {{/if}}
- Active Goals: {{#if activeGoalsJson}} {{{activeGoalsJson}}} {{else}} None {{/if}}

Generate 2-4 suggestions based on the *combination* of these factors. Consider:
- **Time of Day, Mood & Focus (from logs), Energy Pattern (from prefs):** If logs show stress/low energy/low focus, or if energy pattern indicates a low, suggest breaks, self-care, easier tasks. If productive/high focus, suggest tackling a challenging task or goal.
- **Schedule & Tasks:** If busy, suggest short breaks. If open, suggest focus blocks. If deadlines are near, suggest focusing on those tasks.
- **Habits & Goals:** Remind of habits. Suggest a small step towards a goal, aligning with '{{userPreferences.growthPace}}' preference.
- **Weather/Location (Optional):** If rainy, suggest indoor activities.

Suggestion Categories: Routine, Focus, Break, Self-care, Goal, Habit, Other. Include brief reasoning.
Optionally, provide a brief **Daily Focus** theme.

Example Suggestion Structure:
{ suggestion: "Schedule a 15-min walk outside.", category: "Break", reasoning: "Sunny weather and calendar looks open." }

Generate output in JSON. Be positive, supportive, and actionable, matching the '{{userPreferences.aiPersona}}' persona.`,
});

// --- Flow Definition ---
const generateDailySuggestionsFlow = ai.defineFlow<
  typeof GenerateDailySuggestionsInputSchema,
  typeof GenerateDailySuggestionsOutputSchema
>({
  name: 'generateDailySuggestionsFlow',
  inputSchema: GenerateDailySuggestionsInputSchema,
  outputSchema: GenerateDailySuggestionsOutputSchema,
}, async (input) => {

    const hasData = input.recentLogs?.length || input.upcomingTasks?.length || input.todaysEvents?.length || input.activeHabits?.length || input.activeGoals?.length;

    if (!hasData && !input.weatherCondition && !input.userPreferences?.growthPace) {
        return {
            suggestions: [
                { suggestion: "Plan your top 3 priorities for today.", category: "Routine", reasoning: "Setting intentions helps focus." },
                { suggestion: "Take a short break every hour to stretch or walk.", category: "Break", reasoning: "Regular breaks improve focus and well-being." },
                { suggestion: "Check in with your mood later today.", category: "Self-care" }
            ],
            dailyFocus: "Start fresh and focus on what matters most."
        };
    }

      const formatForPromptHelper = <T extends { [key: string]: any }>(items: T[] = [], dateKeys: (keyof T)[]) => {
        return items.map(item => {
            const newItem: Record<string, any> = { ...item };
            dateKeys.forEach(key => {
                const dateValue = item[key];
                 if (dateValue instanceof Date && isValid(dateValue)) {
                    newItem[key] = formatISO(dateValue);
                 } else if (typeof dateValue === 'string') {
                     try {
                         const parsedDate = parseISO(dateValue);
                         if (isValid(parsedDate)) {
                             newItem[key] = formatISO(parsedDate);
                         } else {
                             newItem[key] = null;
                         }
                     } catch {
                         newItem[key] = null;
                     }
                 } else {
                    newItem[key] = null;
                 }
            });
            return newItem;
        });
    };

     const promptInputForAI: z.infer<typeof PromptInputSchemaInternal> = {
        currentDateTime: input.currentDateTime,
        recentLogsJson: input.recentLogs ? JSON.stringify(formatForPromptHelper(input.recentLogs, ['date'])) : undefined,
        upcomingTasksJson: input.upcomingTasks ? JSON.stringify(formatForPromptHelper(input.upcomingTasks, ['dueDate'])) : undefined,
        todaysEventsJson: input.todaysEvents ? JSON.stringify(formatForPromptHelper(input.todaysEvents, ['start', 'end'])) : undefined,
        activeHabitsJson: input.activeHabits ? JSON.stringify(formatForPromptHelper(input.activeHabits, ['lastCompleted'])) : undefined,
        activeGoalsJson: input.activeGoals ? JSON.stringify(formatForPromptHelper(input.activeGoals, [])) : undefined,
        userLocation: input.userLocation,
        weatherCondition: input.weatherCondition,
        userPreferences: input.userPreferences || { // Provide default preferences if undefined
            aiPersona: 'Supportive Coach',
            aiInsightVerbosity: 'Detailed Analysis',
            energyLevelPattern: 'Not specified',
            preferredWorkTimes: 'Flexible',
            growthPace: 'Moderate',
        },
    };


    const { output } = await generateSuggestionsPrompt(promptInputForAI);

     if (!output) {
         console.error('AI analysis failed to return output for daily suggestions.');
         return {
             suggestions: [{ suggestion: "Review your tasks and schedule for the day.", category: "Routine" }],
             dailyFocus: "Focus on making steady progress today.",
         };
     }

    return output;
});
