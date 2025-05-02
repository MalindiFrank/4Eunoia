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
import { parseISO, isWithinInterval, formatISO, format } from 'date-fns'; // Removed addDays, subDays
// import { getTasks, Task } from '@/services/task'; // No longer load tasks internally

// Define Task structure consistent with what the component will pass
// IMPORTANT: Dates received from the component will likely be Date objects already
// If they are passed as strings, they'll need parsing. Assuming Date objects for now.
interface InputTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date; // Expect Date object from component
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: Date; // Expect Date object from component
}

// Define Task structure for the actual output of the flow
// Use string for date in the output type as well for consistency with the schema change
interface OutputTask {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // Use string for date in the final JS output
    status: 'Pending' | 'In Progress' | 'Completed';
    createdAt?: string; // Also use string for output consistency
}

// Zod schema for tasks included *in the output*. Use string().datetime() for dueDate.
const TaskSchemaForOutput = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().describe("The task's due date (ISO 8601 format), if available."),
    status: z.enum(['Pending', 'In Progress', 'Completed']).describe("The task's current status."),
    createdAt: z.string().datetime().optional().describe("The task's creation date (ISO 8601 format), if available."),
});


const AnalyzeTaskCompletionInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing task completion.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing task completion.'),
  // Add tasks as input to the flow
  tasks: z.array(z.object({ // Define the expected structure of tasks passed in
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      // Expect dates as ISO strings in the Zod schema for validation robustness
      dueDate: z.string().datetime().optional(),
      status: z.enum(['Pending', 'In Progress', 'Completed']),
      createdAt: z.string().datetime().optional(),
    })).describe('An array of task objects relevant to the user.'),
});
export type AnalyzeTaskCompletionInput = z.infer<
  typeof AnalyzeTaskCompletionInputSchema
>;


const AnalyzeTaskCompletionOutputSchema = z.object({
  totalTasksConsidered: z.number().describe('The total number of tasks with a due date within the specified date range.'),
  completedTasks: z.number().describe('The number of tasks marked as completed among those considered.'),
  completionRate: z.number().describe('The percentage of considered tasks that were completed (completedTasks / totalTasksConsidered * 100). Calculated as 0 if no tasks were considered.'),
  overdueTasks: z.array(TaskSchemaForOutput).describe('A list of tasks that were due within the date range but are not marked as "Completed" as of today.'),
  completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period.'),
});
export type AnalyzeTaskCompletionOutput = z.infer<
  typeof AnalyzeTaskCompletionOutputSchema
>;

// The exported function remains the same, calling the flow
export async function analyzeTaskCompletion(
  input: AnalyzeTaskCompletionInput
): Promise<AnalyzeTaskCompletionOutput> {
  // No need to fetch tasks here anymore, they are in the input
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
       overdueTasksJson: z.string().describe('A JSON string representing titles and due dates of overdue tasks.'),
       // Optional: Pass a summary of all tasks if needed, but metrics are usually sufficient
       // allTasksSummaryJson: z.string().describe('A brief JSON summary of all tasks provided (e.g., counts by status).')
    });

const analyzeTaskCompletionPrompt = ai.definePrompt({
  name: 'analyzeTaskCompletionPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
    // AI only needs to return the summary. Calculations and filtering are done outside.
    schema: z.object({
      completionSummary: z.string().describe('A brief textual summary (1-2 sentences) of the task completion performance during the period, considering the calculated numbers and overdue tasks.'),
    })
  },
  prompt: `Analyze the user's task completion performance based on the provided data for the period from {{startDate}} to {{endDate}}.

Calculated Data (provided for context, do not recalculate):
- Total Tasks Considered (Due in Range): {{totalTasksConsidered}}
- Completed Tasks (Among Considered): {{completedTasks}}
- Completion Rate: {{completionRate}}%
- Overdue Tasks (Due in Range, Not Completed by {{todayDate}}): {{overdueTasksCount}} tasks.
Overdue Task List (Summary JSON): {{{overdueTasksJson}}}

Based *only* on the calculated figures and the list of overdue tasks, provide a brief textual summary (1-2 sentences) of the user's task completion performance for the period. Highlight the completion rate and mention if there are significant overdue tasks.
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
    // Parse input date strings into Date objects
    const startDate = parseISO(input.startDate);
    const endDate = parseISO(input.endDate);
    const today = new Date(); // Use a fixed date for overdue comparison within the flow

    // Use the tasks passed directly in the input
    const allTasks: InputTask[] = input.tasks.map(t => ({ // Convert dates from ISO strings if needed
        ...t,
        dueDate: t.dueDate ? parseISO(t.dueDate) : undefined,
        createdAt: t.createdAt ? parseISO(t.createdAt) : undefined,
    }));

    // Filter tasks considered for the period (must have a due date within the range)
    const tasksConsidered = allTasks.filter(task =>
        task.dueDate && // Must have a due date
        isWithinInterval(task.dueDate, { start: startDate, end: endDate }) // Due date within range
    );

    // Calculate metrics based on the 'tasksConsidered'
    const totalConsidered = tasksConsidered.length;
    const completedInPeriod = tasksConsidered.filter(t => t.status === 'Completed').length;
    const completionRate = totalConsidered > 0 ? Math.round((completedInPeriod / totalConsidered) * 100) : 0;

    // Identify overdue tasks among those considered
    const overdueTasksRaw = tasksConsidered.filter(t =>
        t.status !== 'Completed' && t.dueDate && t.dueDate <= today // Due date is in the past or today, and not completed
    );

    // Format overdue tasks for the final output (using ISO strings for dates)
     const overdueTasksForOutput: OutputTask[] = overdueTasksRaw.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? formatISO(t.dueDate) : undefined, // Format as ISO string
        status: t.status,
        createdAt: t.createdAt ? formatISO(t.createdAt) : undefined,
     }));

     // Format overdue tasks for prompt context (using string dates - already correct)
     // Simplify for the prompt: just title and due date string
     const overdueTasksJsonForPrompt = JSON.stringify(
         overdueTasksRaw.map(t => ({
             title: t.title,
             dueDate: t.dueDate ? format(t.dueDate, 'PP') : 'No due date' // Human-readable date for prompt
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


    // Prepare input for the prompt
    const promptInputData: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate,
      endDate: input.endDate,
      todayDate: formatISO(today),
      // Add calculated context for the prompt
       totalTasksConsidered: totalConsidered,
       completedTasks: completedInPeriod,
       completionRate: completionRate,
       overdueTasksCount: overdueTasksRaw.length,
       overdueTasksJson: overdueTasksJsonForPrompt,
    };


    let summary = "Summary could not be generated."; // Default summary
     try {
        // Make sure promptInputData matches PromptInputSchema
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


    // Construct the final output object using ISO strings for dates in overdueTasks
    return {
        totalTasksConsidered: totalConsidered,
        completedTasks: completedInPeriod,
        completionRate: completionRate,
        overdueTasks: overdueTasksForOutput, // Use the array with ISO strings
        completionSummary: summary,
    };
  }
);

    