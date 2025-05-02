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
import { parseISO, isWithinInterval, formatISO, format, isValid as isValidDate, startOfDay, endOfDay } from 'date-fns'; // Added isValidDate, startOfDay, endOfDay

import type { Task } from '@/services/task'; // Use type from service

// Helper for safe date formatting
const safeFormatISO = (date: Date | null | undefined): string | null => {
    return date && isValidDate(date) ? formatISO(date) : null;
};

// Zod schema for tasks included *in the output*. Use string().datetime() for dueDate.
const TaskSchemaForOutput = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    // Ensure dueDate is optional and accepts string ISO format or null for the output
    dueDate: z.string().datetime().optional().nullable().describe("The task's due date (ISO 8601 format), if available."),
    status: z.enum(['Pending', 'In Progress', 'Completed']).describe("The task's current status."),
    createdAt: z.string().datetime().optional().nullable().describe("The task's creation date (ISO 8601 format), if available."),
});


const AnalyzeTaskCompletionInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing task completion.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing task completion.'),
  // Add tasks as input to the flow
  tasks: z.array(z.object({ // Define the expected structure of tasks passed in
      id: z.string(),
      title: z.string(),
      description: z.string().optional().nullable(),
      // Expect dates as ISO strings or null/undefined
      dueDate: z.string().datetime().optional().nullable(),
      status: z.enum(['Pending', 'In Progress', 'Completed']),
      createdAt: z.string().datetime().optional().nullable(),
    }).passthrough() // Allow other fields from the Task type if needed
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
  completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period, mentioning the rate and any overdue tasks.'),
});
export type AnalyzeTaskCompletionOutput = z.infer<
  typeof AnalyzeTaskCompletionOutputSchema
>;

// The exported function remains the same, calling the flow
export async function analyzeTaskCompletion(
  input: AnalyzeTaskCompletionInput
): Promise<AnalyzeTaskCompletionOutput> {
     // Validate input dates
    if (!input.startDate || !isValidDate(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for task analysis.");
    }
    if (!input.endDate || !isValidDate(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for task analysis.");
    }
    return analyzeTaskCompletionFlow(input);
}

// Define prompt input schema matching the data we will pass *to the prompt*
const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('Start date in ISO 8601 format.'),
      endDate: z.string().datetime().describe('End date in ISO 8601 format.'),
      todayDate: z.string().datetime().describe('The current date (ISO 8601 format), for determining overdue status accurately.'),
       // Pass calculated metrics to the prompt
       totalTasksConsidered: z.number(),
       completedTasks: z.number(),
       completionRate: z.number(),
       overdueTasksCount: z.number(),
       // Pass only titles/due dates of overdue tasks to save tokens
       overdueTasksJson: z.string().describe('A JSON string representing titles and human-readable due dates of overdue tasks (e.g., [{title, dueDate: "Apr 25th"}]).'),
    });

const analyzeTaskCompletionPrompt = ai.definePrompt({
  name: 'analyzeTaskCompletionPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
    // AI only needs to return the summary. Calculations and filtering are done outside.
    schema: z.object({
      completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period, considering the calculated numbers and overdue tasks. Mention the rate and highlight if there are overdue tasks.'),
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

Based *only* on the calculated figures and the list of overdue tasks, provide a concise **Completion Summary** (1-2 sentences). State the completion rate and mention the number of overdue tasks if any. Example: "Achieved a completion rate of {{completionRate}}% for tasks due in this period. However, {{overdueTasksCount}} task(s) remain overdue, including '[Example Title]'."
`,
});


const analyzeTaskCompletionFlow = ai.defineFlow<
  typeof AnalyzeTaskCompletionInputSchema, // Input includes tasks array now
  typeof AnalyzeTaskCompletionOutputSchema
>(
  {
    name: 'analyzeTaskCompletionFlow',
    inputSchema: AnalyzeTaskCompletionInputSchema,
    outputSchema: AnalyzeTaskCompletionOutputSchema,
  },
  async (input) => {
    // --- Data Parsing and Filtering ---
    const startDateObj = parseISO(input.startDate);
    const endDateObj = parseISO(input.endDate);
    const today = startOfDay(new Date()); // Use start of today for consistent overdue comparison

    // Use the tasks passed directly in the input, parsing dates safely
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
                    // Only assign date if it's valid
                    dueDate: dueDate && isValidDate(dueDate) ? dueDate : undefined,
                    createdAt: createdAt && isValidDate(createdAt) ? createdAt : undefined,
                };
            } catch {
                return null; // Handle potential errors during date parsing
            }
        })
        .filter((t): t is Task => t !== null); // Filter out nulls


    // Filter tasks considered for the period (must have a valid due date within the range)
    const tasksConsidered = allTasks.filter(task =>
        task.dueDate && // Must have a due date
        isWithinInterval(task.dueDate, { start: startOfDay(startDateObj), end: endOfDay(endDateObj) }) // Due date within range (inclusive)
    );

    // --- Calculations ---
    const totalConsidered = tasksConsidered.length;
    const completedInPeriod = tasksConsidered.filter(t => t.status === 'Completed').length;
    const completionRate = totalConsidered > 0 ? Math.round((completedInPeriod / totalConsidered) * 100) : 0;

    // Identify overdue tasks among those considered
    const overdueTasksRaw = tasksConsidered.filter(t =>
        t.status !== 'Completed' && t.dueDate && t.dueDate < today // Due date is valid (implicit from tasksConsidered filter), in the past, and not completed
    );

    // Format overdue tasks for the final output (using ISO strings for dates or null)
     const overdueTasksForOutput: z.infer<typeof TaskSchemaForOutput>[] = overdueTasksRaw.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        // Safely format dates as ISO string, pass null if undefined/invalid
        dueDate: safeFormatISO(t.dueDate), // Use helper here
        status: t.status,
        createdAt: safeFormatISO(t.createdAt), // Use helper here
     }));


     // Format overdue tasks for prompt context (using human-readable dates)
     const overdueTasksJsonForPrompt = JSON.stringify(
         overdueTasksRaw.map(t => ({
             title: t.title,
             // Use helper and format if valid
             dueDate: t.dueDate && isValidDate(t.dueDate) ? format(t.dueDate, 'PP') : 'No due date'
         }))
     );


    // Handle case with no relevant tasks before calling AI
     if (totalConsidered === 0) {
         return {
            totalTasksConsidered: 0,
            completedTasks: 0,
            completionRate: 0,
            overdueTasks: [],
            completionSummary: "No tasks with due dates found within the specified period.",
        };
     }


    // --- AI Call ---
    const promptInputData: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate,
      endDate: input.endDate,
      todayDate: formatISO(today), // Use the same 'today' reference
      totalTasksConsidered: totalConsidered,
      completedTasks: completedInPeriod,
      completionRate: completionRate,
      overdueTasksCount: overdueTasksRaw.length,
      overdueTasksJson: overdueTasksJsonForPrompt,
    };

    let summary = "Summary could not be generated."; // Default summary
     try {
        const { output } = await analyzeTaskCompletionPrompt(promptInputData);
        if (output?.completionSummary) {
            summary = output.completionSummary;
        } else {
             console.warn("AnalyzeTaskCompletionPrompt did not return a summary.");
             // Fallback summary based on calculated data
             summary = `Completion rate: ${completionRate}%. ${overdueTasksRaw.length} task(s) overdue.`;
        }
     } catch (error) {
         console.error("Error calling analyzeTaskCompletionPrompt:", error);
         summary = `Error generating summary. (${completionRate}% completion rate, ${overdueTasksRaw.length} overdue).`;
     }


    // --- Construct Final Output ---
    return {
        totalTasksConsidered: totalConsidered,
        completedTasks: completedInPeriod,
        completionRate: completionRate,
        overdueTasks: overdueTasksForOutput, // Use the array with potentially null ISO strings
        completionSummary: summary,
    };
  }
);
