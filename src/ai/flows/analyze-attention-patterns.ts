
'use server';
/**
 * @fileOverview Analyzes daily logs to identify attention patterns and provide insights.
 *
 * - analyzeAttentionPatterns - Analyzes logs for attention quality.
 * - AnalyzeAttentionPatternsInput - Input for the analysis.
 * - AnalyzeAttentionPatternsOutput - Output of the analysis.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, parseISO, isValid as isValidDate } from 'date-fns';

// Schema for individual log entries passed to the flow
const InputLogEntrySchema = z.object({
    id: z.string(),
    date: z.string().datetime().describe('Date of the log entry (ISO 8601).'),
    activity: z.string().describe('Description of the activity.'),
    mood: z.string().optional().describe('Logged mood during the activity.'),
    focusLevel: z.number().min(1).max(5).optional().nullable().describe('Reported focus level (1=Low, 5=High).'),
    diaryEntry: z.string().optional().describe('Associated diary entry, if any.'),
});

const AnalyzeAttentionPatternsInputSchema = z.object({
    startDate: z.string().datetime().describe('The start date (ISO 8601 format) for the analysis period.'),
    endDate: z.string().datetime().describe('The end date (ISO 8601 format) for the analysis period.'),
    dailyLogs: z.array(InputLogEntrySchema).min(1, {message: "At least one daily log is required for analysis."})
        .describe('An array of daily log objects containing activity and focusLevel data.'),
});
export type AnalyzeAttentionPatternsInput = z.infer<typeof AnalyzeAttentionPatternsInputSchema>;

const FocusPeriodSchema = z.object({
    periodDescription: z.string().describe("General time or context of the focus period (e.g., 'Morning work blocks', 'Specific project X', 'Afternoon study sessions')."),
    avgFocusLevel: z.number().min(1).max(5).describe("Average focus level during this period."),
    activities: z.array(z.string()).describe("Common activities undertaken during these periods."),
    contributingFactors: z.array(z.string()).optional().describe("Potential factors (mood, environment mentioned in diary) contributing to this focus level.")
});

const AnalyzeAttentionPatternsOutputSchema = z.object({
    overallAssessment: z.string().describe("A brief (2-3 sentences) overall assessment of the user's attention patterns during the period, noting consistency or variability."),
    highFocusPeriods: z.array(FocusPeriodSchema).optional().describe("Identified periods or types of activities where focus is generally high (focusLevel 4-5)."),
    lowFocusPeriods: z.array(FocusPeriodSchema).optional().describe("Identified periods or types of activities where focus is generally low (focusLevel 1-2)."),
    attentionQualityScore: z.number().min(0).max(100).optional().describe("A numerical score (0-100) representing overall attention quality, derived from average focus and consistency. Higher is better."),
    insights: z.array(z.string()).optional().describe("Key insights or patterns observed (e.g., 'Focus tends to drop after lunch', 'Specific types of tasks correlate with higher focus')."),
    suggestionsForImprovement: z.array(z.string()).optional().describe("Actionable suggestions to improve focus or manage low-attention periods."),
});
export type AnalyzeAttentionPatternsOutput = z.infer<typeof AnalyzeAttentionPatternsOutputSchema>;


export async function analyzeAttentionPatterns(
  input: AnalyzeAttentionPatternsInput
): Promise<AnalyzeAttentionPatternsOutput> {
    if (!input.startDate || !isValidDate(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for attention analysis.");
    }
    if (!input.endDate || !isValidDate(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for attention analysis.");
    }
    // Check if dailyLogs itself is present and non-empty before filtering
    if (!input.dailyLogs || input.dailyLogs.length === 0) {
         return {
            overallAssessment: "No daily logs provided to analyze attention patterns for this period.",
            attentionQualityScore: 0,
            insights: ["Please log activities to get an analysis."],
            highFocusPeriods: [],
            lowFocusPeriods: [],
            suggestionsForImprovement: ["Try logging your focus level (1-5) with each activity to get insights."]
        };
    }
    
    const logsWithFocus = input.dailyLogs.filter(log => typeof log.focusLevel === 'number' && log.focusLevel >= 1 && log.focusLevel <=5);
    if (logsWithFocus.length === 0) {
        return {
            overallAssessment: "No logs with focus levels were found for this period. Please log your focus (1-5) with activities to get an analysis.",
            attentionQualityScore: 0,
            insights: ["Log focus levels to understand your attention patterns better."],
            highFocusPeriods: [],
            lowFocusPeriods: [],
            suggestionsForImprovement: ["Start by logging your focus level for different activities throughout the day."]
        };
    }
    // Pass the filtered logs to the flow
    return analyzeAttentionPatternsFlow({ ...input, dailyLogs: logsWithFocus });
}

const PromptInputSchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    logsSummaryJson: z.string().describe("JSON string summarizing daily logs, including date, activity, mood (if any), and focusLevel (1-5). Example: [{'date': '2023-01-15', 'activity': 'Coding', 'focusLevel': 4, 'mood': 'Productive'}]")
});

const analyzeAttentionPatternsPrompt = ai.definePrompt({
  name: 'analyzeAttentionPatternsPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: AnalyzeAttentionPatternsOutputSchema },
  prompt: `You are an AI assistant analyzing a user's reported attention and focus levels from their daily logs between {{startDate}} and {{endDate}}.
The user logs activities and optionally their focus level (1=Very Low/Distracted, 2=Low, 3=Moderate, 4=High, 5=Very High/Flow State) and mood.

Daily Logs Summary (JSON):
{{{logsSummaryJson}}}

Based on this data, provide an analysis of their attention patterns. Your response should be in JSON format.

1.  **Overall Assessment**: Write a brief (2-3 sentences) summary of their attention patterns. Is it consistent, variable? Are there general trends?
2.  **High Focus Periods**: Identify up to 3 types of activities or general time periods (e.g., "Morning Work", "Creative Tasks", "Exercise") where their focus level is consistently high (4 or 5). For each, provide a 'periodDescription', the 'avgFocusLevel' (calculate it from the provided logs), a list of common 'activities', and optionally 'contributingFactors' if deducible from mood or diary snippets (if provided in logsSummaryJson).
3.  **Low Focus Periods**: Identify up to 3 types of activities or general time periods where their focus level is consistently low (1 or 2). For each, provide a 'periodDescription', the 'avgFocusLevel' (calculate it), a list of common 'activities', and optionally 'contributingFactors'.
4.  **Attention Quality Score (Optional)**: Estimate an overall attention quality score (0-100). Consider both the average focus level reported and the consistency. If very few logs have focus levels, you can omit this or give a low confidence score. (e.g., 75 for mostly high focus, 40 for very variable or mostly low focus).
5.  **Insights (Optional)**: List 1-3 key insights. What patterns emerge? (e.g., "Focus seems higher on project-based tasks compared to administrative ones.", "User reports better focus in the mornings.", "Certain moods like 'Tired' strongly correlate with low focus.")
6.  **Suggestions for Improvement (Optional)**: Offer 2-3 actionable and specific suggestions to improve focus or manage low-attention periods (e.g., "Try time-blocking for tasks usually done during low-focus afternoons.", "Consider a short break before tackling [activity type with low focus].", "Experiment with minimizing distractions during [specific activity where focus is often low].").

Be empathetic and constructive. If data is sparse (e.g., few logs with focus levels), state that clearly in the assessment and provide more general advice.
If no focus levels are logged at all, the assessment should reflect that, and suggestions should be about starting to log focus.
`,
});

const analyzeAttentionPatternsFlow = ai.defineFlow<
  typeof AnalyzeAttentionPatternsInputSchema, // Input to the flow uses the exported schema
  typeof AnalyzeAttentionPatternsOutputSchema
>({
  name: 'analyzeAttentionPatternsFlow',
  inputSchema: AnalyzeAttentionPatternsInputSchema, // Use the main schema here
  outputSchema: AnalyzeAttentionPatternsOutputSchema,
}, async (input) => {
    const { startDate, endDate, dailyLogs } = input; // dailyLogs here are already filtered with focus levels

    // Prepare a summary for the prompt
    const logsSummary = dailyLogs.map(log => ({
        date: formatISO(parseISO(log.date), { representation: 'date' }),
        activity: log.activity,
        focusLevel: log.focusLevel,
        mood: log.mood,
        diarySnippet: log.diaryEntry ? log.diaryEntry.substring(0, 100) + (log.diaryEntry.length > 100 ? "..." : "") : undefined
    }));

    const promptInputForAI: z.infer<typeof PromptInputSchema> = {
        startDate: startDate,
        endDate: endDate,
        logsSummaryJson: JSON.stringify(logsSummary),
    };

    const { output } = await analyzeAttentionPatternsPrompt(promptInputForAI);

    if (!output) {
        console.error('AI analysis failed to return output for attention patterns.');
        const avgFocus = dailyLogs.reduce((sum, log) => sum + (log.focusLevel || 0), 0) / dailyLogs.length;
        return {
            overallAssessment: "Could not generate a full AI analysis for attention patterns. Please review your logged focus levels.",
            attentionQualityScore: Math.round(Math.min(100, Math.max(0, avgFocus * 20))), 
            insights: ["AI analysis failed. Check logs for consistency."],
            highFocusPeriods: [],
            lowFocusPeriods: [],
            suggestionsForImprovement: ["Ensure consistent logging of focus levels for better insights."],
        };
    }

    return output;
});

    