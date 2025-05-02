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
import type { LogEntry } from '@/services/daily-log'; // Includes focusLevel
import type { Task } from '@/services/task';
import type { CalendarEvent } from '@/services/calendar';
import { parseISO, isWithinInterval, formatISO } from 'date-fns';

// Define Zod schemas for input data types (expecting ISO strings)
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    diaryEntry: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional(), // Added focusLevel
});
const InputTaskSchema = z.object({ id: z.string(), title: z.string(), status: z.enum(['Pending', 'In Progress', 'Completed']), createdAt: z.string().datetime().optional(), dueDate: z.string().datetime().optional() });
const InputEventSchema = z.object({ title: z.string(), start: z.string().datetime(), end: z.string().datetime() });


const EstimateBurnoutRiskInputSchema = z.object({
    startDate: z.string().datetime().describe('The start date (ISO 8601 format) for the analysis period.'),
    endDate: z.string().datetime().describe('The end date (ISO 8601 format) for the analysis period.'),
    dailyLogs: z.array(InputLogSchema).optional().describe('Daily logs within the period, including mood and focus level.'),
    tasks: z.array(InputTaskSchema).optional().describe('All tasks (used to calculate pending/overdue).'),
    calendarEvents: z.array(InputEventSchema).optional().describe('Calendar events within the period (proxy for busyness).'),
}).describe("Input for estimating burnout risk, requiring raw data arrays.");
export type EstimateBurnoutRiskInput = z.infer<typeof EstimateBurnoutRiskInputSchema>;


const EstimateBurnoutRiskOutputSchema = z.object({
  riskLevel: z.enum(['Low', 'Moderate', 'High', 'Very High']).describe('Estimated level of burnout risk.'),
  riskScore: z.number().min(0).max(100).describe('Numerical score representing the burnout risk (0-100).'),
  assessmentSummary: z.string().describe('A brief (2-3 sentence) explanation of the assessed risk level based on the data, highlighting key indicators.'),
  contributingFactors: z.array(z.string()).describe('List of key factors identified from the data that contribute to the risk (e.g., "High task load," "Frequent negative mood," "High event density," "Mentions of stress in diary", "Consistent low focus levels").'), // Added focus example
  recommendations: z.array(z.string()).describe('List of 2-3 actionable recommendations to mitigate the risk (e.g., "Prioritize overdue tasks," "Schedule relaxation/breaks," "Practice mindfulness," "Delegate tasks if possible", "Address consistent low focus").'), // Added focus example
});
export type EstimateBurnoutRiskOutput = z.infer<typeof EstimateBurnoutRiskOutputSchema>;


// --- Prompt Input Schema (Derived from processing raw data) ---
const PromptDataSourceSchema = z.object({
     logSummary: z.object({
         totalLogs: z.number().int().min(0),
         stressedAnxiousTiredCount: z.number().int().min(0).describe("Count of logs with explicit moods like Stressed, Anxious, Tired."),
         positiveMoodCount: z.number().int().min(0).describe("Count of logs with explicit moods like Happy, Calm, Productive."),
         negativeDiaryKeywordsCount: z.number().int().min(0).describe("Count of diary entries mentioning keywords like 'overwhelmed', 'exhausted', 'burnt out', 'struggling', 'frustrated'."),
         lowFocusLogCount: z.number().int().min(0).describe("Count of logs with low focus level (1 or 2)."), // New field
         averageFocusLevel: z.number().min(1).max(5).optional().describe("Average focus level reported in logs (if available)."), // New field
     }),
     taskSummary: z.object({
         pendingInProgressCount: z.number().int().min(0).describe("Total count of tasks currently Pending or In Progress."),
         overdueCount: z.number().int().min(0).describe("Count of tasks whose due date is in the past but are not Completed."),
     }),
     eventSummary: z.object({
         totalEvents: z.number().int().min(0).describe("Total count of calendar events in the period."),
         avgEventDurationMinutes: z.number().min(0).optional().describe("Average duration of events in minutes."),
         backToBackEventCount: z.number().int().min(0).describe("Count of events starting immediately after another ends."),
     }),
     analysisPeriodDays: z.number().int().positive(),
});


const estimateBurnoutPrompt = ai.definePrompt({
  name: 'estimateBurnoutRiskPrompt',
  input: { schema: PromptDataSourceSchema },
  output: { schema: EstimateBurnoutRiskOutputSchema },
  prompt: `You are an AI assistant helping users understand their risk of burnout based on activity over the past {{analysisPeriodDays}} days.

Data Summary:
- Daily Logs: {{logSummary.totalLogs}} entries analyzed.
  - Negative Mood Logs (Stressed, Anxious, Tired): {{logSummary.stressedAnxiousTiredCount}}
  - Positive Mood Logs (Happy, Calm, Productive): {{logSummary.positiveMoodCount}}
  - Diary Mentions (Overwhelmed, Exhausted, etc.): {{logSummary.negativeDiaryKeywordsCount}}
  - Low Focus Logs (Level 1-2): {{logSummary.lowFocusLogCount}}
  - Average Focus Level: {{#if logSummary.averageFocusLevel}}{{logSummary.averageFocusLevel}}/5{{else}}N/A{{/if}}
- Tasks:
  - Pending / In Progress: {{taskSummary.pendingInProgressCount}}
  - Overdue: {{taskSummary.overdueCount}}
- Calendar Events:
  - Total Events: {{eventSummary.totalEvents}}
  - Avg. Duration: {{#if eventSummary.avgEventDurationMinutes}}{{eventSummary.avgEventDurationMinutes}} mins{{else}}N/A{{/if}}
  - Back-to-Back Events: {{eventSummary.backToBackEventCount}}

Analysis Tasks:
1.  Estimate the **Risk Level** (Low, Moderate, High, Very High). Consider these factors:
    - High risk indicators: Frequent negative moods, diary mentions of stress/overwhelm, high number of pending/overdue tasks, high total event count, many back-to-back events, *frequent low focus logs, or consistently low average focus*.
    - Moderate risk: A mix of positive/negative indicators, moderate task load, mixed focus levels.
    - Low risk: Predominantly positive moods, low task load, manageable event schedule, generally good focus levels.
2.  Assign a **Risk Score** (0-100) corresponding to the level (e.g., Low: 0-25, Moderate: 26-50, High: 51-75, Very High: 76-100). Be sensitive to multiple high-risk indicators.
3.  Write a brief **Assessment Summary** (2-3 sentences) explaining the reasoning for the assigned risk level, referencing specific data points (e.g., "Risk is High due to frequent negative mood logs, a high number of overdue tasks, and several reports of low focus.").
4.  List the key **Contributing Factors** observed in the summary data (e.g., "High number of overdue tasks", "Frequent logs of stress", "High meeting density", "Diary mentions of exhaustion", "Consistent low focus reported").
5.  Provide 2-3 actionable and empathetic **Recommendations** tailored to the contributing factors (e.g., "Focus on prioritizing or delegating overdue tasks," "Schedule non-negotiable breaks between meetings," "Practice a brief mindfulness exercise when feeling stressed," "Consider reviewing workload or strategies to improve focus").

Generate the output in the specified JSON format. Be cautious and provide constructive advice.`,
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
    const { startDate, endDate, dailyLogs = [], tasks = [], calendarEvents = [] } = input;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const now = new Date();
    const analysisPeriodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // --- Data Processing & Summarization ---

    // Log Summary
    const logsInPeriod = dailyLogs.filter(log => isWithinInterval(parseISO(log.date), { start, end }));
    let totalFocusLevel = 0;
    let focusLogCount = 0;
    const logSummary = logsInPeriod.reduce((acc, log) => {
        acc.totalLogs++;
        const mood = log.mood?.toLowerCase();
        if (mood?.includes('stressed') || mood?.includes('anxious') || mood?.includes('tired') || mood?.includes('sad') || mood?.includes('angry')) {
            acc.stressedAnxiousTiredCount++;
        } else if (mood?.includes('happy') || mood?.includes('calm') || mood?.includes('productive')) {
            acc.positiveMoodCount++;
        }
        const diary = log.diaryEntry?.toLowerCase() || '';
        if (diary.includes('overwhelmed') || diary.includes('exhausted') || diary.includes('burnt out') || diary.includes('struggling') || diary.includes('frustrated') || diary.includes('too much')) {
             acc.negativeDiaryKeywordsCount++;
        }
        if (log.focusLevel) {
            if (log.focusLevel <= 2) {
                acc.lowFocusLogCount++;
            }
            totalFocusLevel += log.focusLevel;
            focusLogCount++;
        }
        return acc;
    }, { totalLogs: 0, stressedAnxiousTiredCount: 0, positiveMoodCount: 0, negativeDiaryKeywordsCount: 0, lowFocusLogCount: 0 });

    const averageFocusLevel = focusLogCount > 0 ? parseFloat((totalFocusLevel / focusLogCount).toFixed(1)) : undefined;
    (logSummary as any).averageFocusLevel = averageFocusLevel; // Add calculated average focus


    // Task Summary
    const pendingInProgressCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    const overdueCount = tasks.filter(t => t.status !== 'Completed' && t.dueDate && parseISO(t.dueDate) < now).length;
    const taskSummary = { pendingInProgressCount, overdueCount };

    // Event Summary
    const eventsInPeriod = calendarEvents
        .map(e => ({ ...e, start: parseISO(e.start), end: parseISO(e.end) }))
        .filter(event => isWithinInterval(event.start, { start, end }));

    let totalEventDuration = 0;
    let backToBackEventCount = 0;
    const sortedEvents = eventsInPeriod.sort((a,b) => a.start.getTime() - b.start.getTime());
    for(let i = 0; i < sortedEvents.length; i++){
        const duration = (sortedEvents[i].end.getTime() - sortedEvents[i].start.getTime()) / (1000 * 60);
        totalEventDuration += duration > 0 ? duration : 0;
        if (i > 0 && sortedEvents[i].start.getTime() === sortedEvents[i-1].end.getTime()){
            backToBackEventCount++;
        }
    }
    const avgEventDurationMinutes = eventsInPeriod.length > 0 ? Math.round(totalEventDuration / eventsInPeriod.length) : undefined;
    const eventSummary = { totalEvents: eventsInPeriod.length, avgEventDurationMinutes, backToBackEventCount };


    // --- Handle Insufficient Data ---
    const totalActivityPoints = logSummary.totalLogs + tasks.length + eventSummary.totalEvents;
    if (totalActivityPoints < 5) {
         return {
             riskLevel: 'Low',
             riskScore: 10,
             assessmentSummary: `Insufficient data (only ${totalActivityPoints} activities logged) over the past ${analysisPeriodDays} days to provide a detailed burnout risk assessment. Risk assessed as Low by default.`,
             contributingFactors: ["Insufficient activity data."],
             recommendations: ["Continue logging activities, tasks, and moods for a better assessment.", "Check in with how you're feeling regularly."],
         };
     }

    // --- AI Call ---
    const promptInputData: z.infer<typeof PromptDataSourceSchema> = {
        logSummary: logSummary as any, // Cast because we added averageFocusLevel dynamically
        taskSummary,
        eventSummary,
        analysisPeriodDays,
    };

    const { output } = await estimateBurnoutPrompt(promptInputData);

     if (!output) {
         console.error('AI analysis failed to return output for burnout risk.');
         return {
             riskLevel: 'Moderate',
             riskScore: 50,
             assessmentSummary: "Could not generate AI assessment for burnout risk. Please monitor your well-being based on the data.",
             contributingFactors: ["AI analysis failed."],
             recommendations: ["Take regular breaks.", "Prioritize sleep.", "Reach out for support if needed."],
         };
      }

    return output;
});
