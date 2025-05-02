
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
import { formatISO, getDay, getHours } from 'date-fns';

// Define Zod schemas for input data types (expecting ISO strings)
const InputLogSchema = z.object({ id: z.string(), date: z.string().datetime(), activity: z.string(), mood: z.string().optional() });
const InputTaskSchema = z.object({ id: z.string(), title: z.string(), status: z.enum(['Pending', 'In Progress', 'Completed']), dueDate: z.string().datetime().optional() });
const InputEventSchema = z.object({ title: z.string(), start: z.string().datetime(), end: z.string().datetime() });
const InputHabitSchema = z.object({ id: z.string(), title: z.string(), frequency: z.string(), lastCompleted: z.string().datetime().optional() });
const InputGoalSchema = z.object({ id: z.string(), title: z.string(), status: z.string() });


// --- Input/Output Schemas ---
const GenerateDailySuggestionsInputSchema = z.object({
    currentDateTime: z.string().datetime().describe('The current date and time in ISO 8601 format.'),
    // Pass recent/relevant data summaries
    recentLogs: z.array(InputLogSchema).optional().describe('Daily logs from the last 1-2 days.'),
    upcomingTasks: z.array(InputTaskSchema).optional().describe('Pending or In Progress tasks due soon (next 1-2 days).'),
    todaysEvents: z.array(InputEventSchema).optional().describe("Today's calendar events."),
    activeHabits: z.array(InputHabitSchema).optional().describe("User's active habits."),
    activeGoals: z.array(InputGoalSchema).optional().describe("User's 'In Progress' goals."),
    // Optional context
    userLocation: z.string().optional().describe('User\'s current general location (e.g., "City, Country") for weather/context.'), // Placeholder
    weatherCondition: z.string().optional().describe('Brief description of current weather (e.g., "Rainy", "Sunny", "Cold").'), // Placeholder
    growthPace: z.enum(['Slow', 'Moderate', 'Aggressive']).optional().describe("User's preferred personal growth pace setting."),
});
export type GenerateDailySuggestionsInput = z.infer<typeof GenerateDailySuggestionsInputSchema>;

const SuggestionSchema = z.object({
    suggestion: z.string().describe("The specific suggestion text."),
    category: z.enum(['Routine', 'Focus', 'Break', 'Self-care', 'Goal', 'Habit', 'Other']).describe("The category of the suggestion."),
    reasoning: z.string().optional().describe("Brief explanation why this suggestion is relevant (e.g., 'Based on low mood log', 'Upcoming deadline')."),
});

const GenerateDailySuggestionsOutputSchema = z.object({
    suggestions: z.array(SuggestionSchema).describe('A list of 2-4 context-aware suggestions for the user.'),
    // Maybe add a general motivational quote or focus for the day
    dailyFocus: z.string().optional().describe("A brief motivational focus or theme for the day."),
});
export type GenerateDailySuggestionsOutput = z.infer<typeof GenerateDailySuggestionsOutputSchema>;

// --- Exported Function ---
export async function generateDailySuggestions(
  input: GenerateDailySuggestionsInput
): Promise<GenerateDailySuggestionsOutput> {
    return generateDailySuggestionsFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchema = GenerateDailySuggestionsInputSchema; // Use the same schema for simplicity

const generateSuggestionsPrompt = ai.definePrompt({
  name: 'generateDailySuggestionsPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: GenerateDailySuggestionsOutputSchema },
  prompt: `You are a helpful AI assistant integrated into a personal productivity and wellness app (4Eunoia). Your goal is to provide 2-4 context-aware, actionable suggestions to the user for their day, based on the provided data.

Current Context:
- Time: {{currentDateTime}}
- Location: {{userLocation | default "Not provided"}}
- Weather: {{weatherCondition | default "Not provided"}}
- Growth Pace Setting: {{growthPace | default "Moderate"}}

Recent Data Summary:
- Recent Logs (Mood/Activity): {{#if recentLogs}} {{jsonStringify recentLogs}} {{else}} None {{/if}}
- Upcoming Tasks (Due Soon): {{#if upcomingTasks}} {{jsonStringify upcomingTasks}} {{else}} None {{/if}}
- Today's Events: {{#if todaysEvents}} {{jsonStringify todaysEvents}} {{else}} None {{/if}}
- Active Habits: {{#if activeHabits}} {{jsonStringify activeHabits}} {{else}} None {{/if}}
- Active Goals: {{#if activeGoals}} {{jsonStringify activeGoals}} {{else}} None {{/if}}

Generate 2-4 suggestions based on the *combination* of these factors. Consider:
- **Time of Day:** Morning suggestions might focus on routines or planning, afternoon on focus/breaks, evening on winding down or self-care.
- **Mood:** If mood logs indicate stress/low energy, suggest breaks, self-care, or easier tasks. If productive, suggest tackling a challenging task or goal.
- **Schedule:** If the calendar is busy, suggest short breaks or quick wins. If open, suggest focus blocks or goal work.
- **Tasks:** If deadlines are near, suggest focusing on those tasks.
- **Habits:** Remind or suggest incorporating habits (e.g., "Time for your daily meditation?").
- **Goals:** Suggest a small step towards an active goal, especially if the schedule allows and growth pace is moderate/aggressive.
- **Weather/Location (Optional):** If rainy, suggest indoor activities. If sunny, suggest a walk.

Suggestion Categories: Routine, Focus, Break, Self-care, Goal, Habit, Other. Include brief reasoning where helpful.

Optionally, provide a brief **Daily Focus** theme.

Example Suggestion Structure:
{ suggestion: "Schedule a 15-min walk outside.", category: "Break", reasoning: "Sunny weather and calendar looks open." }
{ suggestion: "Tackle the 'Report Draft' task.", category: "Focus", reasoning: "Upcoming deadline and logged 'Productive' mood earlier." }
{ suggestion: "Try a 5-minute breathing exercise.", category: "Self-care", reasoning: "Logged 'Anxious' mood recently." }

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

    // Basic check for any data
    const hasData = input.recentLogs?.length || input.upcomingTasks?.length || input.todaysEvents?.length || input.activeHabits?.length || input.activeGoals?.length;

    if (!hasData) {
        // Provide generic suggestions if no specific data is available
        return {
            suggestions: [
                { suggestion: "Plan your top 3 priorities for today.", category: "Routine", reasoning: "Setting intentions helps focus." },
                { suggestion: "Take a short break every hour to stretch or walk.", category: "Break", reasoning: "Regular breaks improve focus and well-being." },
                { suggestion: "Check in with your mood later today.", category: "Self-care" }
            ],
            dailyFocus: "Start fresh and focus on what matters most."
        };
    }

    // The prompt expects the input directly, no major transformation needed here unless
    // we want to further summarize the lists passed to the prompt for token efficiency.
    // For now, pass the input as is.

    const { output } = await generateSuggestionsPrompt(input);

     // Handle potential null output from AI
     if (!output) {
         console.error('AI analysis failed to return output for daily suggestions.');
         // Provide a generic fallback
         return {
             suggestions: [{ suggestion: "Review your tasks and schedule for the day.", category: "Routine" }],
             dailyFocus: "Focus on making steady progress today.",
         };
     }

    return output;
});
