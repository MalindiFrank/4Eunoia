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
// No date-fns needed here as calculations are done in component

// --- Input/Output Schemas ---

// Define the structure of the summarized data passed into the flow
const InputDataSummarySchema = z.object({
     logSummary: z.object({
         totalLogs: z.number().int().min(0),
         stressedAnxiousTiredCount: z.number().int().min(0).describe("Count of logs with moods like Stressed, Anxious, Tired."),
         positiveMoodCount: z.number().int().min(0).describe("Count of logs with moods like Happy, Calm, Productive.")
     }),
     taskSummary: z.object({
         pendingInProgressCount: z.number().int().min(0).describe("Total count of tasks currently Pending or In Progress."),
         overdueCount: z.number().int().min(0).describe("Count of tasks whose due date is in the past but are not Completed."),
     }),
     eventSummary: z.object({
         totalEvents: z.number().int().min(0).describe("Total count of calendar events in the period (proxy for busyness).")
     }),
     analysisPeriodDays: z.number().int().positive(),
});


const EstimateBurnoutRiskInputSchema = z.object({
    // The input to the flow is now the pre-calculated summary
    dataSummary: InputDataSummarySchema.describe('Summarized data about recent logs, tasks, and events.'),
}).describe("Input for estimating burnout risk, requiring pre-summarized data.");
export type EstimateBurnoutRiskInput = z.infer<typeof EstimateBurnoutRiskInputSchema>;

// Output schema remains the same
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
    // Input contains the dataSummary object
    return estimateBurnoutRiskFlow(input);
}

// --- Prompt Definition ---
// Prompt input is exactly the structure of InputDataSummarySchema
const PromptDataSourceSchema = InputDataSummarySchema;

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
  typeof EstimateBurnoutRiskInputSchema, // Input is dataSummary object
  typeof EstimateBurnoutRiskOutputSchema
>({
  name: 'estimateBurnoutRiskFlow',
  inputSchema: EstimateBurnoutRiskInputSchema,
  outputSchema: EstimateBurnoutRiskOutputSchema,
}, async (input) => {
    const { dataSummary } = input;

    // Handle case with very little data based on summary counts
    if (dataSummary.logSummary.totalLogs < 3 && dataSummary.taskSummary.pendingInProgressCount < 3 && dataSummary.eventSummary.totalEvents < 3) {
         return {
             riskLevel: 'Low',
             riskScore: 10, // Assign a low score due to lack of data
             assessmentSummary: `Insufficient recent data over the past ${dataSummary.analysisPeriodDays} days to provide a detailed burnout risk assessment. Risk assessed as Low by default.`,
             contributingFactors: ["Lack of recent activity data."],
             recommendations: ["Continue logging activities and moods for a better assessment.", "Check in with how you're feeling regularly."],
         };
     }

    // Pass the summary data directly to the prompt
    const promptInputData: z.infer<typeof PromptDataSourceSchema> = dataSummary;

    const { output } = await estimateBurnoutPrompt(promptInputData);

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

    