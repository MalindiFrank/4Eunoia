'use server';

/**
 * @fileOverview Estimates the user's risk of burnout based on recent activity, mood, and task load.
 *
 * - estimateBurnoutRisk - A function that estimates burnout risk.
 * - EstimateBurnoutRiskInput - The input type for the estimateBurnoutRisk function.
 * - EstimateBurnoutRiskOutput - The return type for the estimateBurnoutRisk function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { parseISO, isWithinInterval, formatISO, subDays, startOfDay, endOfDay } from 'date-fns';

// --- Data Loading (Adapting from other flows) ---
// Define necessary data structures
interface StoredLogEntry {
  id: string;
  date: string; // ISO string
  mood?: string; // e.g., "😠 Stressed", "😴 Tired"
  activity?: string; // To gauge workload/activity level
}
interface Task {
  id: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate?: string; // ISO string
}
interface CalendarEvent {
    start: string; // ISO String
    end: string; // ISO String
    // Potentially duration or type (e.g., meeting, focus work)
}

interface BurnoutDataSource {
    recentLogs: StoredLogEntry[];
    recentTasks: Task[];
    recentEvents: CalendarEvent[];
    // Potentially add sleep data, screen time, etc. if tracked
}

// Function to load recent data (e.g., last 14-30 days)
const loadRecentData = (days: number = 14): BurnoutDataSource => {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));

    console.warn("Attempting to access localStorage in estimateBurnoutRisk flow. This is for demonstration.");

    // Load Logs
    // const storedLogsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-daily-logs') : null;
    const storedLogsRaw = null;
    let allLogs: StoredLogEntry[] = [];
    if (storedLogsRaw) {
        try { allLogs = JSON.parse(storedLogsRaw); } catch (e) { console.error("Error parsing logs:", e); }
    } else {
        // Mock logs with relevant moods
        allLogs = [
            { id: 'log-mock-b1', date: subDays(new Date(), 1).toISOString(), mood: '😠 Stressed', activity: 'Long day, many meetings' },
            { id: 'log-mock-b2', date: subDays(new Date(), 2).toISOString(), mood: '😴 Tired', activity: 'Worked late' },
            { id: 'log-mock-b3', date: subDays(new Date(), 4).toISOString(), mood: '😟 Anxious', activity: 'Deadline approaching' },
            { id: 'log-mock-b4', date: subDays(new Date(), 5).toISOString(), mood: '😠 Stressed' },
            { id: 'log-mock-b5', date: subDays(new Date(), 7).toISOString(), mood: '😊 Happy', activity: 'Weekend break' }, // Contrasting mood
            { id: 'log-mock-b6', date: subDays(new Date(), 8).toISOString(), mood: '😴 Tired' },
             { id: 'log-mock-b7', date: subDays(new Date(), 10).toISOString(), mood: '⚡ Productive' }, // Contrasting mood
             { id: 'log-mock-b8', date: subDays(new Date(), 12).toISOString(), mood: '😠 Stressed', activity: 'Unexpected issues arose' },
        ];
    }
    const recentLogs = allLogs.filter(log => isWithinInterval(parseISO(log.date), { start: startDate, end: endDate }));

    // Load Tasks
     // const storedTasksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-tasks') : null;
     const storedTasksRaw = null;
    let allTasks: Task[] = [];
     if (storedTasksRaw) {
        try { allTasks = JSON.parse(storedTasksRaw); } catch (e) { console.error("Error parsing tasks:", e); }
     } else {
         // Mock tasks with overdue/pending status
         allTasks = [
             { id: 'task-mock-b1', status: 'In Progress', dueDate: addDays(new Date(), 1).toISOString() },
             { id: 'task-mock-b2', status: 'Pending', dueDate: subDays(new Date(), 2).toISOString() }, // Overdue
             { id: 'task-mock-b3', status: 'Pending', dueDate: addDays(new Date(), 5).toISOString() },
             { id: 'task-mock-b4', status: 'Pending', dueDate: subDays(new Date(), 5).toISOString() }, // Overdue
             { id: 'task-mock-b5', status: 'In Progress' }, // No due date but in progress
             { id: 'task-mock-b6', status: 'Pending' },
             { id: 'task-mock-b7', status: 'Completed', dueDate: subDays(new Date(), 3).toISOString() }, // Completed
         ];
     }
     // Filter for tasks relevant to the period (e.g., created, due, or worked on recently)
     // Simple filter: include pending/in-progress tasks, especially overdue ones.
     const recentTasks = allTasks.filter(task =>
        task.status !== 'Completed' || (task.dueDate && parseISO(task.dueDate) >= startDate) // Include recently completed
     );

    // Load Calendar Events (Mock/Placeholder)
    const recentEvents: CalendarEvent[] = [
         { start: subDays(new Date(), 1).toISOString(), end: subDays(new Date(), 1).toISOString() }, // Assume events indicate activity
         { start: subDays(new Date(), 3).toISOString(), end: subDays(new Date(), 3).toISOString() },
         { start: subDays(new Date(), 5).toISOString(), end: subDays(new Date(), 5).toISOString() },
         { start: subDays(new Date(), 6).toISOString(), end: subDays(new Date(), 6).toISOString() },
          { start: subDays(new Date(), 8).toISOString(), end: subDays(new Date(), 8).toISOString() },
          { start: subDays(new Date(), 9).toISOString(), end: subDays(new Date(), 9).toISOString() },
           { start: subDays(new Date(), 10).toISOString(), end: subDays(new Date(), 10).toISOString() },
           { start: subDays(new Date(), 11).toISOString(), end: subDays(new Date(), 11).toISOString() },
            { start: subDays(new Date(), 13).toISOString(), end: subDays(new Date(), 13).toISOString() },
    ]; // Filter actual events by date range if available

    return { recentLogs, recentTasks, recentEvents };
};
// Helper imports
import { addDays } from 'date-fns';


// --- Input/Output Schemas ---
const EstimateBurnoutRiskInputSchema = z.object({
    // Could add user input like perceived stress level if desired
    // analysisPeriodDays: z.number().optional().default(14).describe('Number of past days to analyze.'),
}).describe("Input for estimating burnout risk. Analyzes recent user data.");
export type EstimateBurnoutRiskInput = z.infer<typeof EstimateBurnoutRiskInputSchema>;

// Keep data passed to prompt simple (counts and summaries)
const PromptDataSourceSchema = z.object({
     logSummary: z.object({
         totalLogs: z.number(),
         stressedAnxiousTiredCount: z.number().describe("Count of logs with moods like Stressed, Anxious, Tired."),
         positiveMoodCount: z.number().describe("Count of logs with moods like Happy, Calm, Productive.")
     }),
     taskSummary: z.object({
         pendingInProgressCount: z.number().describe("Total count of tasks currently Pending or In Progress."),
         overdueCount: z.number().describe("Count of tasks whose due date is in the past but are not Completed."),
     }),
     eventSummary: z.object({
         totalEvents: z.number().describe("Total count of calendar events in the period (proxy for busyness).")
     }),
     analysisPeriodDays: z.number(),
});

const EstimateBurnoutRiskOutputSchema = z.object({
  riskLevel: z.enum(['Low', 'Moderate', 'High', 'Very High']).describe('Estimated level of burnout risk.'),
  riskScore: z.number().min(0).max(100).describe('Numerical score representing the burnout risk (0-100).'),
  assessmentSummary: z.string().describe('A brief (2-3 sentence) explanation of the assessed risk level based on the data.'),
  contributingFactors: z.array(z.string()).describe('List of key factors identified from the data that contribute to the risk (e.g., high task load, frequent negative mood).'),
  recommendations: z.array(z.string()).describe('List of 2-3 actionable recommendations to mitigate the risk (e.g., take breaks, prioritize tasks, schedule relaxation).'),
});
export type EstimateBurnoutRiskOutput = z.infer<typeof EstimateBurnoutRiskOutputSchema>;

// --- Exported Function ---
export async function estimateBurnoutRisk(
  input: EstimateBurnoutRiskInput
): Promise<EstimateBurnoutRiskOutput> {
    return estimateBurnoutRiskFlow(input);
}

// --- Prompt Definition ---
const estimateBurnoutPrompt = ai.definePrompt({
  name: 'estimateBurnoutRiskPrompt',
  input: { schema: PromptDataSourceSchema },
  output: { schema: EstimateBurnoutRiskOutputSchema },
  prompt: `You are an AI assistant helping users understand their risk of burnout based on recent activity over the past {{analysisPeriodDays}} days.

Data Summary:
- Daily Logs: {{logSummary.totalLogs}} entries analyzed.
  - Negative Mood Logs (Stressed, Anxious, Tired): {{logSummary.stressedAnxiousTiredCount}}
  - Positive Mood Logs (Happy, Calm, Productive): {{logSummary.positiveMoodCount}}
- Tasks:
  - Pending / In Progress: {{taskSummary.pendingInProgressCount}}
  - Overdue: {{taskSummary.overdueCount}}
- Calendar Events: {{eventSummary.totalEvents}} (proxy for busyness)

Analysis Tasks:
1.  Estimate the **Risk Level** (Low, Moderate, High, Very High) based on the provided data summary. Consider high negative mood counts, high task load (pending/overdue), and high event counts as indicators of higher risk. Balance against positive moods.
2.  Assign a **Risk Score** (0-100) corresponding to the level. (e.g., Low: 0-25, Moderate: 26-50, High: 51-75, Very High: 76-100).
3.  Write a brief **Assessment Summary** (2-3 sentences) explaining the reasoning for the assigned risk level.
4.  List the key **Contributing Factors** observed in the summary data (e.g., "High number of overdue tasks", "Frequent logs of stress").
5.  Provide 2-3 actionable **Recommendations** to mitigate the identified risk (e.g., "Prioritize overdue tasks", "Schedule short breaks", "Practice mindfulness").

Generate the output in the specified JSON format. Be cautious and provide actionable advice.`,
});

// --- Flow Definition ---
const estimateBurnoutRiskFlow = ai.defineFlow<
  typeof EstimateBurnoutRiskInputSchema,
  typeof EstimateBurnoutRiskOutputSchema
>({
  name: 'estimateBurnoutRiskFlow',
  inputSchema: EstimateBurnoutRiskInputSchema,
  outputSchema: EstimateBurnoutRiskOutputSchema,
}, async (input) => {
    const analysisPeriodDays = 14; // Default analysis period
    const data = loadRecentData(analysisPeriodDays);
    const today = startOfDay(new Date());

    // Summarize data for the prompt
    const logSummary = {
        totalLogs: data.recentLogs.length,
        stressedAnxiousTiredCount: data.recentLogs.filter(l => l.mood?.includes('Stressed') || l.mood?.includes('Anxious') || l.mood?.includes('Tired')).length,
        positiveMoodCount: data.recentLogs.filter(l => l.mood?.includes('Happy') || l.mood?.includes('Calm') || l.mood?.includes('Productive')).length,
    };

    const taskSummary = {
        pendingInProgressCount: data.recentTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length,
        overdueCount: data.recentTasks.filter(t => t.status !== 'Completed' && t.dueDate && parseISO(t.dueDate) < today).length,
    };

    const eventSummary = {
        totalEvents: data.recentEvents.length,
    };

    // Handle case with very little data
    if (logSummary.totalLogs < 3 && taskSummary.pendingInProgressCount < 3 && eventSummary.totalEvents < 3) {
         return {
             riskLevel: 'Low',
             riskScore: 10, // Assign a low score due to lack of data
             assessmentSummary: "Insufficient recent data to provide a detailed burnout risk assessment. Risk assessed as Low by default.",
             contributingFactors: ["Lack of recent activity data."],
             recommendations: ["Continue logging activities and moods for a better assessment.", "Check in with how you're feeling regularly."],
         };
     }


    const promptInput: z.infer<typeof PromptDataSourceSchema> = {
        logSummary,
        taskSummary,
        eventSummary,
        analysisPeriodDays,
    };

    const { output } = await estimateBurnoutPrompt(promptInput);

     // Handle potential null output from AI
     if (!output) {
         console.error('AI analysis failed to return output for burnout risk.');
         // Provide a generic fallback
         return {
             riskLevel: 'Moderate', // Default fallback level
             riskScore: 50,
             assessmentSummary: "Could not generate AI assessment for burnout risk. Please monitor your well-being.",
             contributingFactors: ["AI analysis failed."],
             recommendations: ["Take regular breaks.", "Prioritize sleep.", "Reach out for support if needed."],
         };
     }

    return output;
});
