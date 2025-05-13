'use server';

/**
 * @fileOverview Analyzes task data to calculate completion rates and identify patterns.
 *
 * - analyzeTaskCompletion - A function that analyzes task data and provides insights.
 * - AnalyzeTaskCompletionInput - The input type for the analyzeTaskCompletion function.
 * - AnalyzeTaskCompletionOutput - The return type for the analyzeTaskCompletion function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { parseISO, isWithinInterval, formatISO, format, isValid as isValidDate, startOfDay, endOfDay } from 'date-fns'; 

import type { Task } from '@/services/task'; 

const safeFormatISO = (date: Date | null | undefined): string | null => {
    return date && isValidDate(date) ? formatISO(date) : null;
};

const TaskSchemaForOutput = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable().describe("The task's due date (ISO 8601 format), if available."),
    status: z.enum(['Pending', 'In Progress', 'Completed']).describe("The task's current status."),
    createdAt: z.string().datetime().optional().nullable().describe("The task's creation date (ISO 8601 format), if available."),
});


const AnalyzeTaskCompletionInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing task completion.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing task completion.'),
  tasks: z.array(z.object({ 
      id: z.string(),
      title: z.string(),
      description: z.string().optional().nullable(),
      dueDate: z.string().datetime().optional().nullable(),
      status: z.enum(['Pending', 'In Progress', 'Completed']),
      createdAt: z.string().datetime().optional().nullable(),
    }).passthrough() 
    ).describe('An array of task objects relevant to the user.'),
});
export type AnalyzeTaskCompletionInput = z.infer<
  typeof AnalyzeTaskCompletionInputSchema
>;


const AnalyzeTaskCompletionOutputSchema = z.object({
  totalTasksConsidered: z.number().describe('The total number of tasks with a due date within the specified date range.'),
  completedTasks: z.number().describe('The number of tasks marked as completed among those considered.'),
  completionRate: z.number().describe('The percentage of considered tasks that were completed (completedTasks / totalTasksConsidered * 100). Calculated as 0 if no tasks were considered.'),
  overdueTasks: z.array(TaskSchemaForOutput).describe('A list of tasks that were due within the date range but are not marked as "Completed" as of today.'),
  completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period, mentioning the rate and any overdue tasks. If rate is low, suggest a general tip. If high, offer encouragement.'),
});
export type AnalyzeTaskCompletionOutput = z.infer<
  typeof AnalyzeTaskCompletionOutputSchema
>;

export async function analyzeTaskCompletion(
  input: AnalyzeTaskCompletionInput
): Promise<AnalyzeTaskCompletionOutput> {
    if (!input.startDate || !isValidDate(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for task analysis.");
    }
    if (!input.endDate || !isValidDate(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for task analysis.");
    }
    return analyzeTaskCompletionFlow(input);
}

const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('Start date in ISO 8601 format.'),
      endDate: z.string().datetime().describe('End date in ISO 8601 format.'),
      todayDate: z.string().datetime().describe('The current date (ISO 8601 format), for determining overdue status accurately.'),
       totalTasksConsidered: z.number(),
       completedTasks: z.number(),
       completionRate: z.number(),
       overdueTasksCount: z.number(),
       overdueTasksJson: z.string().describe('A JSON string representing titles and human-readable due dates of overdue tasks (e.g., [{title, dueDate: "Apr 25th"}]).'),
    });

const analyzeTaskCompletionPrompt = ai.definePrompt({
  name: 'analyzeTaskCompletionPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
    schema: z.object({
      completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period. State the completion rate. If there are overdue tasks, mention the count. If the rate is low (e.g., < 50%), suggest a general tip like "Consider breaking down larger tasks." If the rate is high (e.g., > 80%), offer encouragement like "Great job staying on top of your tasks!"'),
    })
  },
  prompt: `Analyze the user's task completion performance based on the provided data for the period from {{startDate}} to {{endDate}}. Today's date is {{todayDate}}.

Calculated Data (provided for context):
- Total Tasks Considered (Due in Range): {{totalTasksConsidered}}
- Completed Tasks (Among Considered): {{completedTasks}}
- Completion Rate: {{completionRate}}%
- Overdue Tasks (Due in Range, Not Completed): {{overdueTasksCount}} task(s).

Overdue Task List (Summary JSON):
{{{overdueTasksJson}}}

Based *only* on the calculated figures and the list of overdue tasks, provide a concise **Completion Summary** (1-2 sentences).
- State the completion rate.
- Mention the number of overdue tasks if any (e.g., "...with {{overdueTasksCount}} task(s) overdue.").
- If the completion rate is below 50%, add a general tip: "Consider breaking down larger tasks or reviewing priorities."
- If the completion rate is above 80% and overdue tasks are few (0-1), add encouragement: "Great job staying on top of your tasks!" or "Excellent work completing most of your tasks!"
Example: "Achieved a completion rate of {{completionRate}}% for tasks due in this period. However, {{overdueTasksCount}} task(s) remain overdue, including '[Example Title]'. Consider breaking down larger tasks."
`,
});


const analyzeTaskCompletionFlow = ai.defineFlow<
  typeof AnalyzeTaskCompletionInputSchema, 
  typeof AnalyzeTaskCompletionOutputSchema
>(
  {
    name: 'analyzeTaskCompletionFlow',
    inputSchema: AnalyzeTaskCompletionInputSchema,
    outputSchema: AnalyzeTaskCompletionOutputSchema,
  },
  async (input) => {
    const startDateObj = parseISO(input.startDate);
    const endDateObj = parseISO(input.endDate);
    const today = startOfDay(new Date()); 

    const allTasks: Task[] = input.tasks
        .map(t => {
            try {
                const dueDate = t.dueDate ? parseISO(t.dueDate) : undefined;
                const createdAt = t.createdAt ? parseISO(t.createdAt) : undefined;
                return {
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    dueDate: dueDate && isValidDate(dueDate) ? dueDate : undefined,
                    createdAt: createdAt && isValidDate(createdAt) ? createdAt : undefined,
                };
            } catch {
                return null; 
            }
        })
        .filter((t): t is Task => t !== null); 


    const tasksConsidered = allTasks.filter(task =>
        task.dueDate && 
        isWithinInterval(task.dueDate, { start: startOfDay(startDateObj), end: endOfDay(endDateObj) }) 
    );

    const totalConsidered = tasksConsidered.length;
    const completedInPeriod = tasksConsidered.filter(t => t.status === 'Completed').length;
    const completionRate = totalConsidered > 0 ? Math.round((completedInPeriod / totalConsidered) * 100) : 0;

    const overdueTasksRaw = tasksConsidered.filter(t =>
        t.status !== 'Completed' && t.dueDate && t.dueDate < today 
    );

     const overdueTasksForOutput: z.infer<typeof TaskSchemaForOutput>[] = overdueTasksRaw.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: safeFormatISO(t.dueDate), 
        status: t.status,
        createdAt: safeFormatISO(t.createdAt), 
     }));

     const overdueTasksJsonForPrompt = JSON.stringify(
         overdueTasksRaw.map(t => ({
             title: t.title,
             dueDate: t.dueDate && isValidDate(t.dueDate) ? format(t.dueDate, 'PP') : 'No due date'
         }))
     );

     if (totalConsidered === 0) {
         return {
            totalTasksConsidered: 0,
            completedTasks: 0,
            completionRate: 0,
            overdueTasks: [],
            completionSummary: "No tasks with due dates found within the specified period.",
        };
     }

    const promptInputData: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate,
      endDate: input.endDate,
      todayDate: formatISO(today), 
      totalTasksConsidered: totalConsidered,
      completedTasks: completedInPeriod,
      completionRate: completionRate,
      overdueTasksCount: overdueTasksRaw.length,
      overdueTasksJson: overdueTasksJsonForPrompt,
    };

    let summary = "Summary could not be generated."; 
     try {
        const { output } = await analyzeTaskCompletionPrompt(promptInputData);
        if (output?.completionSummary) {
            summary = output.completionSummary;
        } else {
             console.warn("AnalyzeTaskCompletionPrompt did not return a summary.");
             summary = `Completion rate: ${completionRate}%. ${overdueTasksRaw.length} task(s) overdue.`;
        }
     } catch (error) {
         console.error("Error calling analyzeTaskCompletionPrompt:", error);
         summary = `Error generating summary. (${completionRate}% completion rate, ${overdueTasksRaw.length} overdue).`;
     }

    return {
        totalTasksConsidered: totalConsidered,
        completedTasks: completedInPeriod,
        completionRate: completionRate,
        overdueTasks: overdueTasksForOutput, 
        completionSummary: summary,
    };
  }
);

