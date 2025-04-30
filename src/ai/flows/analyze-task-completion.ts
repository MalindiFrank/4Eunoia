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
// import { getTasks, Task } from '@/services/task'; // Import Task type - fetch directly now
import { parseISO, isWithinInterval, formatISO } from 'date-fns';

// Define Task structure consistent with localStorage data
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date; // Use Date object internally
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: Date; // Optional creation date
}


// Function to load tasks from localStorage (runs server-side context)
// IMPORTANT: See warning in other flows about localStorage access.
async function loadTasksFromStorage(): Promise<Task[]> {
    console.warn("Attempting localStorage access in analyzeTaskCompletion flow. This is for demonstration and may not work in production.");
    // const storedTasksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-tasks') : null;
    const storedTasksRaw = null; // Simulate server environment

    if (storedTasksRaw) {
        try {
            // Parse directly into Task with Date objects
            return JSON.parse(storedTasksRaw).map((t: any) => ({
                ...t,
                dueDate: t.dueDate ? parseISO(t.dueDate) : undefined,
                createdAt: t.createdAt ? parseISO(t.createdAt) : undefined, // Parse if exists
            }));
        } catch (e) {
            console.error("Error parsing tasks from storage in AI flow:", e);
             return generateMockTasks(); // Fallback to mock data
        }
    } else {
        console.log("No tasks found in localStorage, using mock data for analysis.");
        return generateMockTasks(); // Use mock data if none found
    }
}

// Mock Task Generation (for fallback) - Ensure date-fns is imported if used here
import { addDays, subDays } from 'date-fns';
const generateMockTasks = (): Task[] => {
    const today = new Date();
    return [
        { id: 'task-mock-1', title: 'Finalize Q3 report', description: 'Compile data and write summary', dueDate: addDays(today, 2), status: 'In Progress', createdAt: subDays(today, 1)},
        { id: 'task-mock-2', title: 'Schedule team sync meeting', description: 'Find a time that works for everyone', dueDate: addDays(today, 1), status: 'Pending', createdAt: today },
        { id: 'task-mock-3', title: 'Review design mockups', description: 'Provide feedback on the new UI', dueDate: subDays(today, 1), status: 'Completed', createdAt: subDays(today, 3) },
        { id: 'task-mock-4', title: 'Update project documentation', description: '', dueDate: addDays(today, 7), status: 'Pending', createdAt: subDays(today, 2) },
        { id: 'task-mock-5', title: 'Pay electricity bill', description: 'Due by the 15th', dueDate: addDays(today, 5), status: 'Pending', createdAt: subDays(today, 10) },
        { id: 'task-mock-8', title: 'Submit expense report', description: 'For last month\'s travel', dueDate: subDays(today, 3), status: 'Completed', createdAt: subDays(today, 5) },
         { id: 'task-mock-9', title: 'Overdue Task Example', description: '', dueDate: subDays(today, 5), status: 'Pending', createdAt: subDays(today, 10) },
    ];
};


const AnalyzeTaskCompletionInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing task completion.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing task completion.'),
});
export type AnalyzeTaskCompletionInput = z.infer<
  typeof AnalyzeTaskCompletionInputSchema
>;

// Define Task structure for the actual output of the flow
// Use string for date in the output type as well for consistency with the schema change
interface OutputTask {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // Use string for date in the final JS output
    status: 'Pending' | 'In Progress' | 'Completed';
}

// Zod schema for tasks included *in the output*. Use string().datetime() for dueDate.
const TaskSchemaForOutput = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().describe("The task's due date (ISO 8601 format), if available."),
    status: z.enum(['Pending', 'In Progress', 'Completed']).describe("The task's current status."),
});

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

export async function analyzeTaskCompletion(
  input: AnalyzeTaskCompletionInput
): Promise<AnalyzeTaskCompletionOutput> {
  return analyzeTaskCompletionFlow(input);
}

// Define prompt input schema matching the data we will pass
const PromptInputSchema = z.object({
      startDate: z.string().datetime().describe('Start date in ISO 8601 format.'),
      endDate: z.string().datetime().describe('End date in ISO 8601 format.'),
      tasksJson: z.string().describe('A JSON string representing the list of ALL tasks available.'),
      todayDate: z.string().datetime().describe('The current date (ISO 8601 format), for determining overdue status accurately.')
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
  prompt: `Analyze the user's task completion performance based on the provided task list and date range ({{startDate}} to {{endDate}}).

The analysis will focus ONLY on tasks with a due date falling within this range.

Calculated Data (provided for context, do not recalculate):
- Total Tasks Considered (Due in Range): {{totalTasksConsidered}}
- Completed Tasks (Among Considered): {{completedTasks}}
- Completion Rate: {{completionRate}}%
- Overdue Tasks (Due in Range, Not Completed by {{todayDate}}): {{overdueTasksCount}} tasks listed below.
Overdue Task List (JSON): {{{overdueTasksJson}}}

Based *only* on the calculated figures and the list of overdue tasks, provide a brief textual summary (1-2 sentences) of the user's task completion performance for the period. Highlight the completion rate and mention if there are significant overdue tasks.
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
    // Parse input date strings into Date objects
    const startDate = parseISO(input.startDate);
    const endDate = parseISO(input.endDate);
    const today = new Date(); // Use a fixed date for overdue comparison within the flow

    const allTasks = await loadTasksFromStorage();

    // Filter tasks considered for the period (must have a due date within the range)
    const tasksConsidered = allTasks.filter(task =>
        task.dueDate && // Must have a due date (which is now a Date object)
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
     }));

     // Format overdue tasks for prompt context (using string dates - already correct)
     const overdueTasksJsonForPrompt = JSON.stringify(
         overdueTasksRaw.map(t => ({
             title: t.title,
             dueDate: t.dueDate ? formatISO(t.dueDate) : undefined
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


    // Call the AI prompt with calculated data for summary generation
    // Pass original string dates and today's date as string to the prompt
    const promptInput: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate,
      endDate: input.endDate,
      tasksJson: JSON.stringify(allTasks.map(t => ({...t, dueDate: t.dueDate ? formatISO(t.dueDate) : undefined, createdAt: t.createdAt ? formatISO(t.createdAt) : undefined}))), // Stringify dates for prompt
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
        const { output } = await analyzeTaskCompletionPrompt(promptInput);
        if (output?.completionSummary) {
            summary = output.completionSummary;
        } else {
             console.warn("AnalyzeTaskCompletionPrompt did not return a summary.");
        }
     } catch (error) {
         console.error("Error calling analyzeTaskCompletionPrompt:", error);
         summary = "Error generating task completion summary.";
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
