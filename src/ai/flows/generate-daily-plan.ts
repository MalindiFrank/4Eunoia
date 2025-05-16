
'use server';
/**
 * @fileOverview Generates a suggested daily plan based on mood, past activities, and upcoming schedule.
 *
 * - generateDailyPlan - Generates a daily plan suggestion.
 * - GenerateDailyPlanInput - The input type for the generateDailyPlan function.
 * - GenerateDailyPlanOutput - The return type for the generateDailyPlan function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

// --- Input Data Schemas ---
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional().nullable(),
    diaryEntry: z.string().optional(),
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
const InputGoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
});
const InputHabitSchema = z.object({
    id: z.string(),
    title: z.string(),
    frequency: z.string(),
    lastCompleted: z.string().datetime().optional().nullable(),
});

// --- Flow Input/Output Schemas ---
const UserPreferencesSchema = z.object({
    preferredWorkTimes: z.enum(['Morning', 'Afternoon', 'Evening', 'Flexible']).optional().describe("User's preferred time for focused work."),
    energyLevelPattern: z.string().optional().describe('Brief description of typical energy levels (e.g., "High energy mornings, dips mid-afternoon").'),
    growthPace: z.enum(['Slow', 'Moderate', 'Aggressive']).optional().describe("User's desired pace for personal growth activities (e.g., tackling goals)."),
    aiPersona: z.enum(['Supportive Coach', 'Neutral Assistant', 'Direct Analyst']).optional().default('Supportive Coach').describe("The desired tone for AI responses."),
    aiInsightVerbosity: z.enum(['Brief Summary', 'Detailed Analysis']).optional().default('Detailed Analysis').describe("The desired level of detail for AI insights and plan rationale."),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;


const GenerateDailyPlanInputSchema = z.object({
    targetDate: z.string().datetime().describe('The date for which to generate the plan (ISO 8601 format).'),
    recentLogs: z.array(InputLogSchema).optional().describe('Daily logs from the past 1-3 days.'),
    tasksForDate: z.array(InputTaskSchema).optional().describe('Tasks due on or relevant to the target date.'),
    eventsForDate: z.array(InputEventSchema).optional().describe('Calendar events scheduled for the target date.'),
    activeGoals: z.array(InputGoalSchema).optional().describe("User's 'In Progress' goals."),
    activeHabits: z.array(InputHabitSchema).optional().describe("User's active habits."),
    userPreferences: UserPreferencesSchema.optional(),
});
export type GenerateDailyPlanInput = z.infer<typeof GenerateDailyPlanInputSchema>;

const TimeBlockSchema = z.object({
    startTime: z.string().describe('Suggested start time (e.g., "9:00 AM", "Morning").'),
    endTime: z.string().optional().describe('Suggested end time (e.g., "11:00 AM", "Late Morning").'),
    activity: z.string().describe('The suggested activity, task, or event.'),
    category: z.enum(['Work', 'Personal', 'Health', 'Learning', 'Break', 'Chore', 'Social', 'Goal', 'Habit', 'Event', 'Other']).describe('Category of the activity.'),
    reasoning: z.string().optional().describe('Brief rationale for the suggestion (e.g., "Leverage morning energy", "Fit between meetings").'),
});

const GenerateDailyPlanOutputSchema = z.object({
    suggestedPlan: z.array(TimeBlockSchema).describe('A list of suggested time blocks or activities for the day.'),
    planRationale: z.string().describe('A brief overall explanation of the plan\'s structure, considering mood, energy, and schedule. Adjust detail based on aiInsightVerbosity preference.'),
    warnings: z.array(z.string()).optional().describe('Any potential conflicts or areas of concern (e.g., "Overloaded afternoon", "Low energy forecast").'),
});
export type GenerateDailyPlanOutput = z.infer<typeof GenerateDailyPlanOutputSchema>;

// --- Exported Function ---
export async function generateDailyPlan(
  input: GenerateDailyPlanInput
): Promise<GenerateDailyPlanOutput> {
     if (!input.targetDate || !isValid(parseISO(input.targetDate))) {
         throw new Error("Invalid or missing target date provided for daily plan generation.");
     }
    return generateDailyPlanFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchemaInternal = z.object({
    targetDate: z.string().datetime().describe('The date for which to generate the plan (ISO 8601 format).'),
    recentLogsJson: z.string().optional().describe('JSON string of daily logs from the past 1-3 days (mood, activity, focusLevel). Focus levels are 1=Low, 5=High.'),
    tasksForDateJson: z.string().optional().describe('JSON string of tasks due on or relevant to the target date (title, status, dueDate).'),
    eventsForDateJson: z.string().optional().describe('JSON string of calendar events scheduled for the target date (title, start, end).'),
    activeGoalsJson: z.string().optional().describe("JSON string of user's 'In Progress' goals (title, status)."),
    activeHabitsJson: z.string().optional().describe("JSON string of user's active habits (title, frequency)."),
    userPreferences: UserPreferencesSchema.optional().describe("User's preferences for AI interaction and planning."),
});


const generatePlanPrompt = ai.definePrompt({
  name: 'generateDailyPlanPrompt',
  input: { schema: PromptInputSchemaInternal },
  output: { schema: GenerateDailyPlanOutputSchema },
  prompt: `You are an AI assistant creating a realistic and emotionally-informed daily plan for a user of the 4Eunoia app.
Your persona should be: {{userPreferences.aiPersona}}.
The desired verbosity for the plan rationale is: {{userPreferences.aiInsightVerbosity}}.
User Context & Data:
- Target Date: {{targetDate}}
- Recent Logs (Mood, Activity, Focus Level 1-5): {{#if recentLogsJson}}{{{recentLogsJson}}}{{else}}None{{/if}}
- Tasks for Target Date: {{#if tasksForDateJson}}{{{tasksForDateJson}}}{{else}}None{{/if}}
- Events for Target Date: {{#if eventsForDateJson}}{{{eventsForDateJson}}}{{else}}None{{/if}}
- Active Goals: {{#if activeGoalsJson}}{{{activeGoalsJson}}}{{else}}None{{/if}}
- Active Habits: {{#if activeHabitsJson}}{{{activeHabitsJson}}}{{else}}None{{/if}}
- User Preferences:
  - Preferred Work Times: {{userPreferences.preferredWorkTimes}}
  - Typical Energy Pattern: {{userPreferences.energyLevelPattern}}
  - Growth Pace: {{userPreferences.growthPace}}

Planning Task:
1.  **Analyze:** Review recent logs (mood, focus levels), scheduled events, and pending tasks for {{targetDate}}.
    Consider mood trends over the past 2-3 days. If a pattern of low mood/energy is observed, acknowledge it.
    Consider the user's stated 'Typical Energy Pattern' (e.g., "{{userPreferences.energyLevelPattern}}") and 'Preferred Work Times' (e.g., "{{userPreferences.preferredWorkTimes}}").
2.  **Structure:** Create a **Suggested Plan** with time blocks.
    - Integrate fixed calendar events first.
    - Allocate task time:
        - If recent logs show **low focus/negative moods OR if 'Typical Energy Pattern' suggests a low energy period**: Start with easier, shorter tasks, or break down larger ones. Schedule more frequent short breaks.
        - If recent logs show **high focus/positive moods OR 'Typical Energy Pattern'/'Preferred Work Times' align**: Suggest challenging tasks during these periods.
    - Incorporate goals/habits: Suggest a small step towards an active goal, considering the '{{userPreferences.growthPace}}' pace. Remind of daily/relevant habits.
    - Suggest breaks (5-15 mins) after focus blocks or long meetings.
    - **If recent \`mood\` logs indicate 'Stressed', 'Tired', or 'Anxious', OR if 'Typical Energy Pattern' indicates a current low**: Explicitly prioritize rest, self-care (e.g., short walk, mindfulness), or lower-intensity activities.
    - Use general ("Morning") or specific times ("9:00 AM - 10:00 AM").
    - Categorize activities (Work, Personal, Health, Learning, Break, Chore, Social, Goal, Habit, Event, Other).
    - Add brief reasoning for suggestions (e.g., "Leverage {{userPreferences.preferredWorkTimes}} focus for [Goal]", "Fit [Task] between meetings", "Short break after [Event]", "Based on recent low focus and {{userPreferences.energyLevelPattern}}, starting with a smaller task").
3.  **Rationale:** Provide a **Plan Rationale**. Explain the plan's structure, considering mood, energy (from logs and preferences), and schedule. Adjust length based on '{{userPreferences.aiInsightVerbosity}}' preference.
4.  **Warnings (Optional):** List potential **Warnings** like a packed schedule or low energy forecast.

Generate output in JSON. Be realistic, empathetic, and flexible. Maintain the persona: {{userPreferences.aiPersona}}.`,
});


// --- Flow Definition ---
const generateDailyPlanFlow = ai.defineFlow<
  typeof GenerateDailyPlanInputSchema, 
  typeof GenerateDailyPlanOutputSchema 
>({
  name: 'generateDailyPlanFlow',
  inputSchema: GenerateDailyPlanInputSchema,
  outputSchema: GenerateDailyPlanOutputSchema,
}, async (input) => {

    if (!input.tasksForDate?.length && !input.eventsForDate?.length && !input.recentLogs?.length && !input.activeGoals?.length && !input.activeHabits?.length) {
        return {
            suggestedPlan: [
                { startTime: "Morning", activity: "Review priorities & habits", category: "Habit", reasoning: "Start the day with intention." },
                { startTime: "Afternoon", activity: "Work on a goal or important task", category: "Goal", reasoning: "Allocate time for progress." },
                { startTime: "Evening", activity: "Relax and wind down", category: "Personal", reasoning: "Prepare for rest." },
            ],
            planRationale: "Generated a basic plan as limited data was available for the target date. Add tasks, events, or logs for better suggestions, and set your AI preferences in Settings!",
            warnings: ["Limited data for planning."],
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
                 } else if (dateValue === undefined || dateValue === null) {
                    newItem[key] = null;
                 }
            });
            return newItem;
        });
    };

    // Ensure userPreferences has default values if not provided
    const effectiveUserPreferences = {
        aiPersona: input.userPreferences?.aiPersona ?? 'Supportive Coach',
        aiInsightVerbosity: input.userPreferences?.aiInsightVerbosity ?? 'Detailed Analysis',
        energyLevelPattern: input.userPreferences?.energyLevelPattern ?? 'Not specified',
        preferredWorkTimes: input.userPreferences?.preferredWorkTimes ?? 'Flexible',
        growthPace: input.userPreferences?.growthPace ?? 'Moderate',
    };


    const promptInputForAI: z.infer<typeof PromptInputSchemaInternal> = {
        targetDate: input.targetDate,
        recentLogsJson: input.recentLogs ? JSON.stringify(formatForPromptHelper(input.recentLogs, ['date'])) : undefined,
        tasksForDateJson: input.tasksForDate ? JSON.stringify(formatForPromptHelper(input.tasksForDate, ['dueDate'])) : undefined,
        eventsForDateJson: input.eventsForDate ? JSON.stringify(formatForPromptHelper(input.eventsForDate, ['start', 'end'])) : undefined,
        activeGoalsJson: input.activeGoals ? JSON.stringify(formatForPromptHelper(input.activeGoals, [])) : undefined,
        activeHabitsJson: input.activeHabits ? JSON.stringify(formatForPromptHelper(input.activeHabits, ['lastCompleted'])) : undefined,
        userPreferences: effectiveUserPreferences,
    };


    const { output } = await generatePlanPrompt(promptInputForAI);

     if (!output) {
         console.error('AI analysis failed to return output for daily plan.');
         return {
             suggestedPlan: [{ startTime: "Full Day", activity: "Plan could not be generated.", category: "Other" }],
             planRationale: "Error: AI failed to generate a plan.",
             warnings: ["Plan generation failed."],
         };
     }

    return output;
});
