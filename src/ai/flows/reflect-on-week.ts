
'use server';

/**
 * @fileOverview Provides AI-driven prompts and analysis for a weekly reflection session.
 *
 * - reflectOnWeek - Initiates or continues a weekly reflection conversation.
 * - ReflectOnWeekInput - The input type for the reflectOnWeek function.
 * - ReflectOnWeekOutput - The return type for the reflectOnWeek function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, parseISO, isValid } from 'date-fns';
import type { UserPreferences } from './generate-daily-plan'; // Import UserPreferences

// --- Input Data Schemas (Similar to other flows) ---
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    diaryEntry: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional().nullable(),
});
const InputTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['Pending', 'In Progress', 'Completed']),
    createdAt: z.string().datetime().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable()
});
const InputGoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    updatedAt: z.string().datetime(),
    targetDate: z.string().datetime().optional().nullable(),
});
const InputHabitSchema = z.object({
    id: z.string(),
    title: z.string(),
    frequency: z.string(),
    streak: z.number().optional().nullable(),
    lastCompleted: z.string().datetime().optional().nullable(),
    updatedAt: z.string().datetime(),
});

// --- Input/Output Schemas for the Flow ---
const ReflectOnWeekInputSchema = z.object({
    startDate: z.string().datetime().describe("The start date (ISO 8601 format) of the week being reflected upon."),
    endDate: z.string().datetime().describe("The end date (ISO 8601 format) of the week being reflected upon."),
    logs: z.array(InputLogSchema).optional().describe('Daily logs from the past week.'),
    tasks: z.array(InputTaskSchema).optional().describe('Tasks completed or worked on during the week.'),
    goals: z.array(InputGoalSchema).optional().describe('Goals updated during the week.'),
    habits: z.array(InputHabitSchema).optional().describe('Habit progress during the week.'),
    previousReflection: z.object({
        questionsAsked: z.array(z.string()),
        userResponses: z.array(z.string()),
        aiSummary: z.string().optional(),
    }).optional().describe("Context from the previous turn in this reflection session, if any."),
    userResponse: z.string().optional().describe("The user's response to the AI's previous question or prompt."),
    userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction."),
});
export type ReflectOnWeekInput = z.infer<typeof ReflectOnWeekInputSchema>;

const ReflectOnWeekOutputSchema = z.object({
    coachPrompt: z.string().describe("The AI coach's next question or prompt to guide the reflection."),
    observation: z.string().optional().describe("An insightful observation from the AI based on the data and conversation."),
    isComplete: z.boolean().default(false).describe("Indicates if the AI believes the reflection session is nearing completion (e.g., after 3-5 good exchanges or if user gives short answers)."),
});
export type ReflectOnWeekOutput = z.infer<typeof ReflectOnWeekOutputSchema>;

// --- Exported Function ---
export async function reflectOnWeek(
  input: ReflectOnWeekInput
): Promise<ReflectOnWeekOutput> {
     if (!input.startDate || !isValid(parseISO(input.startDate))) {
         throw new Error("Invalid or missing start date provided for reflection.");
     }
     if (!input.endDate || !isValid(parseISO(input.endDate))) {
         throw new Error("Invalid or missing end date provided for reflection.");
     }
    return reflectOnWeekFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    logsJson: z.string().optional().describe('JSON string of daily logs from the past week (activity, mood, focusLevel, diaryEntry).'),
    tasksJson: z.string().optional().describe('JSON string of tasks from the week (title, status, dueDate).'),
    goalsJson: z.string().optional().describe('JSON string of goals from the week (title, status, targetDate).'),
    habitsJson: z.string().optional().describe('JSON string of habits from the week (title, frequency, streak, lastCompleted).'),
    previousReflection: ReflectOnWeekInputSchema.shape.previousReflection.optional(),
    userResponse: z.string().optional(),
    userPreferences: z.custom<UserPreferences>().optional().describe("User's preferences for AI interaction."),
});


const reflectOnWeekPrompt = ai.definePrompt({
  name: 'reflectOnWeekPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: ReflectOnWeekOutputSchema },
  prompt: `You are an AI Reflection Coach for the 4Eunoia app. Your persona is '{{userPreferences.aiPersona}}'.
Your goal is to guide the user through a supportive and insightful weekly reflection based on their logged data from {{startDate}} to {{endDate}}.
Focus on helping the user identify patterns, celebrate wins, learn from challenges, and set intentions for the next week.
The desired verbosity for your observations/prompts is '{{userPreferences.aiInsightVerbosity}}'.

Past Week's Data Summary (JSON Strings - focus on content relevant to reflection):
- Logs: {{#if logsJson}} {{{logsJson}}} {{else}} None for this period. {{/if}}
- Tasks: {{#if tasksJson}} {{{tasksJson}}} {{else}} None for this period. {{/if}}
- Goals: {{#if goalsJson}} {{{goalsJson}}} {{else}} None for this period. {{/if}}
- Habits: {{#if habitsJson}} {{{habitsJson}}} {{else}} None for this period. {{/if}}

Reflection Conversation History (if any):
{{#if previousReflection}}
  {{#each previousReflection.questionsAsked as |question index|}}
    AI Question {{index}}: {{question}}
    User Response {{index}}: {{lookup ../previousReflection.userResponses index}}
  {{/each}}
  {{#if previousReflection.aiSummary}}Previous AI Observation: {{previousReflection.aiSummary}}{{/if}}
{{else}}
This is the start of the reflection.
{{/if}}

{{#if userResponse}}User's latest response: "{{{userResponse}}}"{{/if}}

Your Task:
1.  **Analyze:** Review the provided weekly data and the conversation history (if any). Look for significant events, mood patterns, task completion trends, goal progress, and habit consistency.
2.  **Respond with 'coachPrompt':** Generate the *next* question or prompt to continue the reflection.
    *   **If starting (no previousReflection):**
        *   If data is rich (many logs/tasks): Ask an open-ended question referencing the data (e.g., "Looking back at your week from {{startDate}} to {{endDate}}, what stands out as a significant win or accomplishment based on your logs and completed tasks?", "I noticed you logged feeling '[mood]' several times and completed [X tasks]. Can you tell me more about how those connected for you this week?").
        *   If data is sparse: Ask a more general opening question (e.g., "How did this past week feel for you overall?", "What's one word you'd use to describe your week from {{startDate}} to {{endDate}}?").
    *   **If continuing:** Ask a follow-up question based on the user's last response ('{{userResponse}}') and connect it to the data or previous parts of the conversation. Examples:
        *   "You mentioned feeling [emotion] about [topic]. I see in your logs/tasks that [related data point]. How did that influence things?"
        *   "That's interesting you found [activity] challenging. Your focus logs around that time show [focus level]. Was there a connection?"
        *   "It's great you made progress on [habit/goal]! How did maintaining that streak/working on that goal feel this week?"
        *   "You said [X]. Could you elaborate on what led to that feeling/outcome?"
    *   Keep questions open-ended, empathetic, and non-judgmental. Encourage deeper thought.
    *   Vary your questions. Cover areas like: achievements, challenges, lessons learned, energy levels, emotional state, alignment with goals.
3.  **Provide 'observation' (Optional):** If appropriate (especially if 'Detailed Analysis' verbosity is set), include a brief, encouraging 'observation' summarizing a key insight or pattern noticed from the conversation and data so far. (e.g., "It sounds like balancing [Area A] and [Area B] was a key theme this week, and you made good progress on [Task X] despite challenges."). Don't just repeat what the user said; synthesize or highlight something.
4.  **Determine 'isComplete':** Set 'isComplete' to true if the conversation feels naturally concluding. This might be:
    *   After 3-5 meaningful exchanges where key areas have been touched upon.
    *   If the user offers a summary statement or expresses readiness to conclude.
    *   If the user provides very short, non-committal answers for 2 consecutive turns, suggesting they might not be engaged.
    *   If 'isComplete' is true, the 'coachPrompt' should be a concluding remark or a gentle prompt for intentions for the next week (e.g., "Thanks for sharing your reflections! It sounds like a week of [summary]. What's one small intention you'd like to set for the upcoming week based on what you've learned?").

Generate the output in the specified JSON format. Maintain a '{{userPreferences.aiPersona}}' tone.
Be mindful of the '{{userPreferences.aiInsightVerbosity}}' when phrasing observations and prompts.
`,
});

// --- Flow Definition ---
const reflectOnWeekFlow = ai.defineFlow<
  typeof ReflectOnWeekInputSchema,
  typeof ReflectOnWeekOutputSchema
>({
  name: 'reflectOnWeekFlow',
  inputSchema: ReflectOnWeekInputSchema,
  outputSchema: ReflectOnWeekOutputSchema,
}, async (input) => {

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
                             newItem[key] = null; // Mark as null if unparseable
                         }
                     } catch {
                         newItem[key] = null; // Mark as null on error
                     }
                 } else {
                    newItem[key] = null; // Ensure undefined/null becomes null
                 }
            });
            // Select only a few relevant fields for brevity in prompt
            const slimItem: Record<string, any> = {};
            if (newItem.title) slimItem.title = newItem.title;
            else if (newItem.activity) slimItem.activity = newItem.activity;

            if (newItem.status) slimItem.status = newItem.status;
            if (newItem.mood) slimItem.mood = newItem.mood;
            if (newItem.focusLevel) slimItem.focusLevel = newItem.focusLevel;
            if (newItem.diaryEntry) slimItem.diarySnippet = newItem.diaryEntry.substring(0,50) + (newItem.diaryEntry.length > 50 ? '...' : '');


            if (newItem.date) slimItem.date = newItem.date;
            else if (newItem.createdAt) slimItem.date = newItem.createdAt; // Use createdAt as a general date if 'date' is missing
            else if (newItem.updatedAt) slimItem.date = newItem.updatedAt;

            if (newItem.dueDate) slimItem.dueDate = newItem.dueDate;
            if (newItem.frequency) slimItem.frequency = newItem.frequency;
            if (newItem.streak) slimItem.streak = newItem.streak;
            if (newItem.lastCompleted) slimItem.lastCompleted = newItem.lastCompleted;

            return slimItem;
        });
    };

    const effectiveUserPreferences = {
        aiPersona: input.userPreferences?.aiPersona ?? 'Supportive Coach',
        aiInsightVerbosity: input.userPreferences?.aiInsightVerbosity ?? 'Detailed Analysis',
        energyLevelPattern: input.userPreferences?.energyLevelPattern ?? 'Not specified',
        preferredWorkTimes: input.userPreferences?.preferredWorkTimes ?? 'Flexible',
        growthPace: input.userPreferences?.growthPace ?? 'Moderate',
    };

     const promptInputForAI: z.infer<typeof PromptInputSchema> = {
         startDate: input.startDate,
         endDate: input.endDate,
         logsJson: input.logs ? JSON.stringify(formatForPromptHelper(input.logs, ['date'])) : undefined,
         tasksJson: input.tasks ? JSON.stringify(formatForPromptHelper(input.tasks, ['createdAt', 'dueDate'])) : undefined,
         goalsJson: input.goals ? JSON.stringify(formatForPromptHelper(input.goals, ['updatedAt', 'targetDate'])) : undefined,
         habitsJson: input.habits ? JSON.stringify(formatForPromptHelper(input.habits, ['lastCompleted', 'updatedAt'])) : undefined,
         previousReflection: input.previousReflection,
         userResponse: input.userResponse,
         userPreferences: effectiveUserPreferences,
     };

    const { output } = await reflectOnWeekPrompt(promptInputForAI);

     if (!output) {
         console.error('AI coach failed to return output for weekly reflection.');
         return {
             coachPrompt: "I'm having a little trouble gathering my thoughts. Let's try reflecting on your past week. What was one highlight or accomplishment?",
             isComplete: false,
         };
     }

    return output;
});

