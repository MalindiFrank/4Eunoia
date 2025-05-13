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
    // Added growthPace from user preferences
    userPreferences: z.object({
        growthPace: z.enum(['Slow', 'Moderate', 'Aggressive']).optional().describe("User's preferred personal growth pace setting."),
        // Potentially add preferredWorkTimes, energyLevelPattern if useful for suggestions too
    }).optional(),
});
export type GenerateDailySuggestionsInput = z.infer<typeof GenerateDailySuggestionsInputSchema>;

const SuggestionSchema = z.object({
    suggestion: z.string().describe("The specific suggestion text."),
    category: z.enum(['Routine', 'Focus', 'Break', 'Self-care', 'Goal', 'Habit', 'Other']).describe("The category of the suggestion."),
    reasoning: z.string().optional().describe("Brief explanation why this suggestion is relevant (e.g., 'Based on low mood/focus log', 'Upcoming deadline', 'Matches your Moderate growth pace for goals')."),
});

const GenerateDailySuggestionsOutputSchema = z.object({
    suggestions: z.array(SuggestionSchema).describe('A list of 2-4 context-aware suggestions for the user.'),
    dailyFocus: z.string().optional().describe("A brief motivational focus or theme for the day."),
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
const PromptInputSchema = z.object({
    currentDateTime: z.string().datetime(),
    recentLogsJson: z.string().optional().describe('JSON string of recent daily logs.'),
    upcomingTasksJson: z.string().optional().describe('JSON string of upcoming tasks.'),
    todaysEventsJson: z.string().optional().describe('JSON string of today\'s calendar events.'),
    activeHabitsJson: z.string().optional().describe('JSON string of active habits.'),
    activeGoalsJson: z.string().optional().describe('JSON string of active goals.'),
    userLocation: z.string().optional(),
    weatherCondition: z.string().optional(),
    // Use a single string for preferences in the prompt
    preferencesDisplay: z.string().describe("A string summarizing user preferences, or 'Not specified.' if none.")
});


const generateSuggestionsPrompt = ai.definePrompt({
  name: 'generateDailySuggestionsPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: GenerateDailySuggestionsOutputSchema },
  prompt: `You are a helpful AI assistant integrated into a personal productivity and wellness app (4Eunoia). Your goal is to provide 2-4 context-aware, actionable suggestions to the user for their day, based on the provided data.

Current Context:
- Time: {{currentDateTime}}
- Location: {{userLocation | default "Not provided"}}
- Weather: {{weatherCondition | default "Not provided"}}
- Preferences: {{preferencesDisplay}}

Recent Data Summary (JSON Strings):
- Recent Logs (Mood/Activity/Focus): {{#if recentLogsJson}} {{{recentLogsJson}}} {{else}} None {{/if}}
- Upcoming Tasks (Due Soon): {{#if upcomingTasksJson}} {{{upcomingTasksJson}}} {{else}} None {{/if}}
- Today's Events: {{#if todaysEventsJson}} {{{todaysEventsJson}}} {{else}} None {{/if}}
- Active Habits: {{#if activeHabitsJson}} {{{activeHabitsJson}}} {{else}} None {{/if}}
- Active Goals: {{#if activeGoalsJson}} {{{activeGoalsJson}}} {{else}} None {{/if}}

Generate 2-4 suggestions based on the *combination* of these factors. Consider:
- **Time of Day:** Morning suggestions might focus on routines or planning; afternoon on focus/breaks; evening on winding down or self-care.
- **Mood & Focus:** If logs indicate stress/low energy/low focus, suggest breaks, self-care, easier tasks, or focus-enhancing activities. If productive/high focus, suggest tackling a challenging task or goal.
- **Schedule:** If the calendar is busy, suggest short breaks or quick wins. If open, suggest focus blocks or goal work.
- **Tasks:** If deadlines are near, suggest focusing on those tasks.
- **Habits:** Remind or suggest incorporating habits (e.g., "Time for your daily meditation?").
- **Goals:** Suggest a small step towards an active goal, especially if the schedule allows. The intensity/frequency of goal suggestions should align with the user's 'growthPace' preference (e.g., an 'Aggressive' pace might get more goal-oriented suggestions).
- **Weather/Location (Optional):** If rainy, suggest indoor activities. If sunny, suggest a walk.

Suggestion Categories: Routine, Focus, Break, Self-care, Goal, Habit, Other. Include brief reasoning where helpful.

Optionally, provide a brief **Daily Focus** theme for the day.

Example Suggestion Structure:
{ suggestion: "Schedule a 15-min walk outside.", category: "Break", reasoning: "Sunny weather and calendar looks open." }
{ suggestion: "Tackle the 'Report Draft' task.", category: "Focus", reasoning: "Upcoming deadline and logged 'Productive' mood earlier." }
{ suggestion: "Try a 5-minute breathing exercise.", category: "Self-care", reasoning: "Logged 'Anxious' mood and low focus recently." }
{ suggestion: "Work on '[Goal Title]' for 30 minutes.", category: "Goal", reasoning: "Aligns with your 'Moderate' growth pace and you have an open slot." }

Generate the output in the specified JSON format. Be positive, supportive, and actionable.`,
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

    if (!hasData && !input.weatherCondition && !input.userPreferences?.growthPace) { // Check if any contextual data exists
        return {
            suggestions: [
                { suggestion: "Plan your top 3 priorities for today.", category: "Routine", reasoning: "Setting intentions helps focus." },
                { suggestion: "Take a short break every hour to stretch or walk.", category: "Break", reasoning: "Regular breaks improve focus and well-being." },
                { suggestion: "Check in with your mood later today.", category: "Self-care" }
            ],
            dailyFocus: "Start fresh and focus on what matters most."
        };
    }

      const formatForPrompt = <T extends { [key: string]: any }>(items: T[] = [], dateKeys: (keyof T)[]) => {
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

    let preferencesDisplay = "Not specified.";
    if (input.userPreferences) {
        const { growthPace } = input.userPreferences; // Add other preferences here if needed
        const parts: string[] = [];
        if (growthPace) parts.push(`Growth Pace: ${growthPace}`);
        // if (preferredWorkTimes) parts.push(`Preferred Work Times: ${preferredWorkTimes}`);
        // if (energyLevelPattern) parts.push(`Energy Pattern: ${energyLevelPattern}`);
        if (parts.length > 0) {
            preferencesDisplay = parts.join(', ') + ".";
        }
    }

     const promptInputForAI: z.infer<typeof PromptInputSchema> = {
        currentDateTime: input.currentDateTime,
        recentLogsJson: input.recentLogs ? JSON.stringify(formatForPrompt(input.recentLogs, ['date'])) : undefined,
        upcomingTasksJson: input.upcomingTasks ? JSON.stringify(formatForPrompt(input.upcomingTasks, ['dueDate'])) : undefined,
        todaysEventsJson: input.todaysEvents ? JSON.stringify(formatForPrompt(input.todaysEvents, ['start', 'end'])) : undefined,
        activeHabitsJson: input.activeHabits ? JSON.stringify(formatForPrompt(input.activeHabits, ['lastCompleted'])) : undefined,
        activeGoalsJson: input.activeGoals ? JSON.stringify(formatForPrompt(input.activeGoals, [])) : undefined, 
        userLocation: input.userLocation,
        weatherCondition: input.weatherCondition,
        preferencesDisplay: preferencesDisplay, // Pass the generated string
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

    
