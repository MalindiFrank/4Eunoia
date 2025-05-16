
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

// --- Input Data Schemas (Similar to other flows) ---
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    diaryEntry: z.string().optional()
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
    streak: z.number(),
    lastCompleted: z.string().datetime().optional().nullable()
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
    logsJson: z.string().optional().describe('JSON string of daily logs from the past week.'),
    tasksJson: z.string().optional().describe('JSON string of tasks from the week.'),
    goalsJson: z.string().optional().describe('JSON string of goals from the week.'),
    habitsJson: z.string().optional().describe('JSON string of habits from the week.'),
    previousReflection: ReflectOnWeekInputSchema.shape.previousReflection.optional(),
    userResponse: z.string().optional(),
});


const reflectOnWeekPrompt = ai.definePrompt({
  name: 'reflectOnWeekPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: ReflectOnWeekOutputSchema },
  prompt: `You are an AI Reflection Coach within the 4Eunoia app. Your role is to guide the user through a supportive and insightful weekly reflection based on their logged data from {{startDate}} to {{endDate}}. Be empathetic, curious, and focus on helping the user identify patterns, celebrate wins, learn from challenges, and set intentions.

Past Week's Data Summary (JSON Strings):
- Logs: {{#if logsJson}} {{{logsJson}}} {{else}} None {{/if}}
- Tasks: {{#if tasksJson}} {{{tasksJson}}} {{else}} None {{/if}}
- Goals: {{#if goalsJson}} {{{goalsJson}}} {{else}} None {{/if}}
- Habits: {{#if habitsJson}} {{{habitsJson}}} {{else}} None {{/if}}

Reflection Conversation History (if any):
{{#if previousReflection}}
  {{#each previousReflection.questionsAsked as |question index|}}
    AI Question {{index}}: {{question}}
    User Response {{index}}: {{lookup ../previousReflection.userResponses index}}
  {{/each}}
  {{#if previousReflection.aiSummary}}Previous AI Summary: {{previousReflection.aiSummary}}{{/if}}
{{else}}
This is the start of the reflection.
{{/if}}

{{#if userResponse}}User's latest response: {{{userResponse}}}{{/if}}

Your Task:
1.  **Analyze:** Review the provided data and conversation history (if any).
2.  **Respond:** Generate the *next* prompt or question ('coachPrompt') to continue the reflection.
    - If starting:
        - If data is rich (many logs/tasks): Ask an open-ended question referencing the data (e.g., "Looking back at your week, what stands out as a significant win or accomplishment based on your logs and completed tasks?", "I noticed you logged feeling '[mood]' several times and completed [X tasks]. Can you tell me more about how those connected for you?").
        - If data is sparse: Ask a more general opening question (e.g., "How did this past week feel for you overall?", "What's one word you'd use to describe your week?").
    - If continuing: Ask a follow-up question based on the user's last response and the data. Connect their response to patterns (e.g., "You mentioned feeling stressed about [task]. I see it's still 'In Progress'. What's the biggest obstacle there?", "It's great you made progress on [habit]! How did maintaining that streak feel?").
    - Keep questions open-ended and non-judgmental.
    - Aim for 3-5 turns in a typical reflection.
3.  **Observe (Optional):** If appropriate, provide a brief, encouraging 'observation' summarizing a key insight from the conversation so far (e.g., "It sounds like balancing [Area A] and [Area B] was a key theme this week, and you made good progress on [Task X] despite challenges.").
4.  **Complete?:** Set 'isComplete' to true if the conversation feels naturally concluding (e.g., user summarizes, you've covered key areas, or if the user gives very short, non-committal answers after 3-4 prompts).

Generate the output in the specified JSON format. Maintain a supportive and coaching tone.`,
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

     const promptInputForAI: z.infer<typeof PromptInputSchema> = {
         startDate: input.startDate,
         endDate: input.endDate,
         logsJson: input.logs ? JSON.stringify(formatForPrompt(input.logs, ['date'])) : undefined,
         tasksJson: input.tasks ? JSON.stringify(formatForPrompt(input.tasks, ['createdAt', 'dueDate'])) : undefined,
         goalsJson: input.goals ? JSON.stringify(formatForPrompt(input.goals, ['updatedAt', 'targetDate'])) : undefined,
         habitsJson: input.habits ? JSON.stringify(formatForPrompt(input.habits, ['lastCompleted'])) : undefined,
         previousReflection: input.previousReflection,
         userResponse: input.userResponse,
     };


    const { output } = await reflectOnWeekPrompt(promptInputForAI);

     if (!output) {
         console.error('AI coach failed to return output for weekly reflection.');
         return {
             coachPrompt: "Let's reflect on your past week. What was one highlight or accomplishment?",
             isComplete: false,
         };
     }

    return output;
});
