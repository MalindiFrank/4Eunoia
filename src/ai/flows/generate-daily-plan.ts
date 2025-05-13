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
    preferredWorkTimes: z.enum(['Morning', 'Afternoon', 'Evening', 'Flexible']).optional(),
    energyLevelPattern: z.string().optional().describe('Brief description of typical energy levels (e.g., "High energy mornings, dips mid-afternoon").'),
    growthPace: z.enum(['Slow', 'Moderate', 'Aggressive']).optional(),
});

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
    planRationale: z.string().describe('A brief overall explanation of the plan\'s structure, considering mood, energy, and schedule.'),
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
const PromptInputSchema = z.object({
    targetDate: z.string().datetime().describe('The date for which to generate the plan (ISO 8601 format).'),
    recentLogsJson: z.string().optional().describe('JSON string of daily logs from the past 1-3 days.'),
    tasksForDateJson: z.string().optional().describe('JSON string of tasks due on or relevant to the target date.'),
    eventsForDateJson: z.string().optional().describe('JSON string of calendar events scheduled for the target date.'),
    activeGoalsJson: z.string().optional().describe("JSON string of user's 'In Progress' goals."),
    activeHabitsJson: z.string().optional().describe("JSON string of user's active habits."),
    // Add pre-formatted preference strings
    preferencesDisplay: z.string().describe("A string summarizing user preferences, or 'Not specified.' if none.")
});


const generatePlanPrompt = ai.definePrompt({
  name: 'generateDailyPlanPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: GenerateDailyPlanOutputSchema },
  prompt: `You are an AI assistant creating a realistic and emotionally-informed daily plan for a user of the 4Eunoia app. The goal is to suggest a balanced schedule for {{targetDate}} that considers their recent mood/energy, upcoming commitments, tasks, goals, and habits.

User Context & Data:
- Target Date: {{targetDate}}
- Recent Logs (Mood, Activity, Focus): {{#if recentLogsJson}}{{{recentLogsJson}}}{{else}}None{{/if}}
- Tasks for Target Date: {{#if tasksForDateJson}}{{{tasksForDateJson}}}{{else}}None{{/if}}
- Events for Target Date: {{#if eventsForDateJson}}{{{eventsForDateJson}}}{{else}}None{{/if}}
- Active Goals: {{#if activeGoalsJson}}{{{activeGoalsJson}}}{{else}}None{{/if}}
- Active Habits: {{#if activeHabitsJson}}{{{activeHabitsJson}}}{{else}}None{{/if}}
- Preferences: {{preferencesDisplay}}

Planning Task:
1.  **Analyze:** Review the user's recent logs (especially mood and focus levels), their scheduled events, and pending tasks for the target date. Consider their active goals and habits and stated preferences.
2.  **Structure:** Create a **Suggested Plan** consisting of realistic time blocks or activities for the day.
    - **Integrate fixed events:** Include scheduled calendar events first.
    - **Allocate task time:** Suggest specific blocks for important or due tasks. Consider recent mood/focus – if low energy/focus recently, suggest starting with easier tasks or breaking down larger ones. If high energy, suggest tackling challenging tasks during preferred work times or typical peak energy periods (if known from preferences).
    - **Incorporate goals/habits:** Suggest time for a small step towards an active goal (based on growth pace preference) or remind them of daily/relevant habits.
    - **Suggest breaks:** Include short breaks, especially around long meetings or focus blocks.
    - **Consider mood/energy:** If recent logs show stress/tiredness, prioritize rest, self-care, or lower-intensity activities. If logs show positive mood/productivity, leverage that momentum.
    - **Use flexible timing:** Use general times like "Morning", "Afternoon", or specific times (e.g., "9:00 AM - 10:00 AM") where appropriate.
    - **Categorize activities:** Use categories like Work, Personal, Health, Learning, Break, Chore, Social, Goal, Habit, Event, Other.
    - **Add reasoning:** Briefly explain *why* certain activities are suggested at certain times (optional but helpful).
3.  **Rationale:** Provide a brief **Plan Rationale** explaining the overall approach (e.g., "Plan prioritizes [Task X] due to deadline and schedules breaks around meetings, considering recent low energy logs and preferred afternoon work time.").
4.  **Warnings (Optional):** List any potential **Warnings** like a very packed schedule, conflicting items, or suggestions based on potential low energy.

Generate the output in the specified JSON format. Be realistic, empathetic, and flexible. The plan is a suggestion, not a rigid schedule.`,
});


// --- Flow Definition ---
const generateDailyPlanFlow = ai.defineFlow<
  typeof GenerateDailyPlanInputSchema,
  typeof GenerateDailyPlanOutputSchema
>({
  name: 'generateDailyPlanFlow',
  inputSchema: GenerateDailyPlanInputSchema,
  outputSchema: GenerateDailyPlanOutputSchema
}, async (input) => {

    if (!input.tasksForDate?.length && !input.eventsForDate?.length && !input.recentLogs?.length) {
        return {
            suggestedPlan: [
                { startTime: "Morning", activity: "Review priorities & habits", category: "Habit", reasoning: "Start the day with intention." },
                { startTime: "Afternoon", activity: "Work on a goal or important task", category: "Goal", reasoning: "Allocate time for progress." },
                { startTime: "Evening", activity: "Relax and wind down", category: "Personal", reasoning: "Prepare for rest." },
            ],
            planRationale: "Generated a basic plan as limited data was available for the target date.",
            warnings: ["Limited data for planning. Add tasks, events, or logs for better suggestions."],
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
                             newItem[key] = null; // Explicitly nullify invalid date strings
                         }
                     } catch {
                         newItem[key] = null; // Explicitly nullify on parse error
                     }
                 } else if (dateValue === undefined || dateValue === null) {
                    newItem[key] = null; // Ensure undefined becomes null for consistency if needed by schema/prompt
                 }
            });
            return newItem;
        });
    };

    // Pre-calculate preferences display string
    let preferencesDisplay = "Not specified.";
    if (input.userPreferences) {
        const { preferredWorkTimes, energyLevelPattern, growthPace } = input.userPreferences;
        const parts: string[] = [];
        if (preferredWorkTimes) parts.push(`Preferred Work Times: ${preferredWorkTimes}`);
        if (energyLevelPattern) parts.push(`Energy Pattern: ${energyLevelPattern}`);
        if (growthPace) parts.push(`Growth Pace: ${growthPace}`);
        if (parts.length > 0) {
            preferencesDisplay = parts.join(', ') + ".";
        }
    }


    // Prepare data for the *new* PromptInputSchema
    const promptInputForAI: z.infer<typeof PromptInputSchema> = {
        targetDate: input.targetDate,
        recentLogsJson: input.recentLogs ? JSON.stringify(formatForPrompt(input.recentLogs, ['date'])) : undefined,
        tasksForDateJson: input.tasksForDate ? JSON.stringify(formatForPrompt(input.tasksForDate, ['dueDate'])) : undefined,
        eventsForDateJson: input.eventsForDate ? JSON.stringify(formatForPrompt(input.eventsForDate, ['start', 'end'])) : undefined,
        activeGoalsJson: input.activeGoals ? JSON.stringify(formatForPrompt(input.activeGoals, [])) : undefined,
        activeHabitsJson: input.activeHabits ? JSON.stringify(formatForPrompt(input.activeHabits, ['lastCompleted'])) : undefined,
        preferencesDisplay: preferencesDisplay,
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