
'use server';

/**
 * @fileOverview Analyzes sentiment trends from diary entries and notes within a specified date range.
 *
 * - analyzeSentimentTrends - A function that analyzes text data for sentiment.
 * - AnalyzeSentimentTrendsInput - The input type for the analyzeSentimentTrends function.
 * - AnalyzeSentimentTrendsOutput - The return type for the analyzeSentimentTrends function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, parseISO, isValid } from 'date-fns'; // Added isValid
import type { LogEntry } from '@/services/daily-log'; // Use service types
import type { Note } from '@/services/note';

// Define structure for text entries passed into the flow (derived from LogEntry/Note)
const InputTextEntrySchema = z.object({
    id: z.string(),
    date: z.string().datetime(), // Expect ISO string
    text: z.string(),
    source: z.enum(['diary', 'note']),
});

// --- Input/Output Schemas ---
const AnalyzeSentimentTrendsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing sentiment.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing sentiment.'),
  // Add text entries as input
  textEntries: z.array(InputTextEntrySchema).describe('An array of text entry objects (from diary/notes) to analyze.'),
});
export type AnalyzeSentimentTrendsInput = z.infer<typeof AnalyzeSentimentTrendsInputSchema>;


// Use string date for prompt input schema (already matches InputTextEntrySchema)
const TextEntryPromptSchema = z.object({
      id: z.string(), // Include ID for potential future use
      date: z.string().datetime().describe('The date of the entry (ISO 8601 format).'),
      text: z.string().describe('The text content of the entry.'),
      source: z.enum(['diary', 'note']).describe('The source of the text entry.'),
});

const AnalyzeSentimentTrendsOutputSchema = z.object({
  overallSentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']).describe('The dominant sentiment detected across all entries in the period.'),
  sentimentScore: z.number().min(-1).max(1).describe('A numerical score representing the overall sentiment (-1: very negative, 0: neutral, 1: very positive).'),
  positiveKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases associated with positive sentiment.'),
  negativeKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases associated with negative sentiment.'),
  analysisSummary: z.string().describe('A brief (2-3 sentence) summary of the sentiment trends observed, noting shifts, recurring themes, or intensity.'),
  entryCount: z.number().describe('The number of text entries analyzed.'),
});
export type AnalyzeSentimentTrendsOutput = z.infer<typeof AnalyzeSentimentTrendsOutputSchema>;

// --- Exported Function ---
export async function analyzeSentimentTrends(
  input: AnalyzeSentimentTrendsInput
): Promise<AnalyzeSentimentTrendsOutput> {
     // Validate input dates
    if (!input.startDate || !isValid(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for sentiment analysis.");
    }
    if (!input.endDate || !isValid(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for sentiment analysis.");
    }
    return analyzeSentimentTrendsFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchema = z.object({
      textEntries: z.array(TextEntryPromptSchema).describe('An array of text entries (from diary and notes) to analyze, sorted chronologically.'),
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) of the period being analyzed.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) of the period being analyzed.'),
});

const analyzeSentimentPrompt = ai.definePrompt({
  name: 'analyzeSentimentTrendsPrompt',
  input: { schema: PromptInputSchema },
  output: {
     // AI calculates everything except entryCount
    schema: z.object({
        overallSentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']).describe('The dominant sentiment detected across all entries in the period.'),
        sentimentScore: z.number().min(-1).max(1).describe('Estimate a numerical score representing the overall sentiment (-1.0: very negative, 0: neutral, 1.0: very positive). Consider the balance and intensity of emotions expressed.'),
        positiveKeywords: z.array(z.string()).describe('List 3-5 keywords or short phrases strongly associated with positive sentiment (e.g., "accomplished," "grateful," "enjoyed").'),
        negativeKeywords: z.array(z.string()).describe('List 3-5 keywords or short phrases strongly associated with negative sentiment (e.g., "frustrated," "stressed," "difficult," "worried").'),
        analysisSummary: z.string().describe('Provide a concise **Analysis Summary** (2-3 sentences). Describe the overall emotional tone for the period. Mention any notable shifts in sentiment (e.g., "started positive but ended stressed") or recurring positive/negative themes. Comment on the intensity if apparent.'),
    }),
  },
  prompt: `You are an AI assistant specialized in analyzing text for sentiment trends. Analyze the following text entries from {{startDate}} to {{endDate}}.

Text Entries (Chronological):
{{#if textEntries}}
{{#each textEntries}}
Date: {{this.date}} (Source: {{this.source}})
Text: {{{this.text}}}
---
{{/each}}
{{else}}
No text entries found for this period.
{{/if}}

Analysis Tasks:
1.  Determine the **Overall Sentiment** (Positive, Negative, Neutral, or Mixed) for the period, considering the balance of emotions.
2.  Estimate a **Sentiment Score** between -1.0 (very negative) and +1.0 (very positive).
3.  Identify 3-5 key **Positive Keywords/Phrases** reflecting positive emotions.
4.  Identify 3-5 key **Negative Keywords/Phrases** reflecting negative emotions.
5.  Write a concise **Analysis Summary** (2-3 sentences) describing the overall tone, any significant shifts, recurring themes, and perceived intensity.

Generate the output in the specified JSON format. If no entries are found, return Neutral sentiment, score 0, empty keyword lists, and an appropriate summary.`,
});

// --- Flow Definition ---
const analyzeSentimentTrendsFlow = ai.defineFlow<
  typeof AnalyzeSentimentTrendsInputSchema, // Includes textEntries, startDate, endDate
  typeof AnalyzeSentimentTrendsOutputSchema
>({
  name: 'analyzeSentimentTrendsFlow',
  inputSchema: AnalyzeSentimentTrendsInputSchema,
  outputSchema: AnalyzeSentimentTrendsOutputSchema,
}, async (input) => {
    const { textEntries = [], startDate, endDate } = input;

    // Filter out entries with invalid dates before processing
    const validTextEntries = textEntries.filter(entry => {
        try {
            return isValid(parseISO(entry.date));
        } catch {
            return false;
        }
    });


    // Handle no entries case
    if (validTextEntries.length === 0) {
        return {
            overallSentiment: 'Neutral',
            sentimentScore: 0,
            positiveKeywords: [],
            negativeKeywords: [],
            analysisSummary: "No valid diary entries or notes found for sentiment analysis in this period.",
            entryCount: 0,
        };
    }

    // Prepare data for the prompt (dates are already ISO strings)
    // Sort chronologically for the prompt
    const promptTextEntries = [...validTextEntries]
        .sort((a, b) => {
             // Safely parse dates for sorting
             try {
                 const dateA = parseISO(a.date).getTime();
                 const dateB = parseISO(b.date).getTime();
                 if (!isNaN(dateA) && !isNaN(dateB)) {
                     return dateA - dateB;
                 }
             } catch { /* Ignore parsing errors during sort */ }
             return 0; // Keep original order if parsing fails
         })
        .map(entry => ({ // Ensure structure matches prompt schema
             id: entry.id,
             date: entry.date,
             text: entry.text,
             source: entry.source,
         }));

    const promptInputData: z.infer<typeof PromptInputSchema> = {
        textEntries: promptTextEntries, // Pass the sorted array
        startDate: startDate,
        endDate: endDate,
    };

    const { output } = await analyzeSentimentPrompt(promptInputData);

     // Handle potential null output from AI
     if (!output) {
         console.error('AI analysis failed to return output for sentiment trends.');
         // Return a default error state or throw an error
          return {
             overallSentiment: 'Neutral', // Default fallback
             sentimentScore: 0,
             positiveKeywords: [],
             negativeKeywords: [],
             analysisSummary: "Error: Could not analyze sentiment.",
             entryCount: validTextEntries.length, // Still know how many valid entries we had
         };
     }

    // Combine AI output with calculated entry count
    return {
        ...output, // Spread the AI-generated fields
        entryCount: validTextEntries.length,
    };
});

    