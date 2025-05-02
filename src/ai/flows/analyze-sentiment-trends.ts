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
import { formatISO } from 'date-fns'; // Keep necessary imports


// Define structure for text entries passed into the flow
const InputTextEntrySchema = z.object({
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
      date: z.string().datetime().describe('The date of the entry (ISO 8601 format).'),
      text: z.string().describe('The text content of the entry.'),
      source: z.enum(['diary', 'note']).describe('The source of the text entry.'),
});

const AnalyzeSentimentTrendsOutputSchema = z.object({
  overallSentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']).describe('The dominant sentiment detected across all entries in the period.'),
  sentimentScore: z.number().min(-1).max(1).describe('A numerical score representing the overall sentiment (-1: very negative, 0: neutral, 1: very positive).'),
  positiveKeywords: z.array(z.string()).describe('List of keywords associated with positive sentiment.'),
  negativeKeywords: z.array(z.string()).describe('List of keywords associated with negative sentiment.'),
  analysisSummary: z.string().describe('A brief (2-3 sentence) summary of the sentiment trends observed, potentially noting shifts or recurring themes.'),
  entryCount: z.number().describe('The number of text entries analyzed.'),
});
export type AnalyzeSentimentTrendsOutput = z.infer<typeof AnalyzeSentimentTrendsOutputSchema>;

// --- Exported Function ---
export async function analyzeSentimentTrends(
  input: AnalyzeSentimentTrendsInput
): Promise<AnalyzeSentimentTrendsOutput> {
    // Input already contains textEntries, startDate, endDate
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
        sentimentScore: z.number().min(-1).max(1).describe('A numerical score representing the overall sentiment (-1: very negative, 0: neutral, 1: very positive). Estimate based on the balance and intensity of emotions.'),
        positiveKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases strongly associated with positive sentiment in the entries.'),
        negativeKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases strongly associated with negative sentiment in the entries.'),
        analysisSummary: z.string().describe('A brief (2-3 sentence) summary of the sentiment trends observed. Mention the overall tone, any notable shifts, or recurring positive/negative themes.'),
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
1.  Determine the **Overall Sentiment** (Positive, Negative, Neutral, or Mixed) for the period.
2.  Estimate a **Sentiment Score** between -1.0 (very negative) and +1.0 (very positive).
3.  Identify 3-5 key **Positive Keywords/Phrases**.
4.  Identify 3-5 key **Negative Keywords/Phrases**.
5.  Provide a concise **Analysis Summary** (2-3 sentences) describing the trends, tone, and any significant observations.

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

    // Handle no entries case
    if (textEntries.length === 0) {
        return {
            overallSentiment: 'Neutral',
            sentimentScore: 0,
            positiveKeywords: [],
            negativeKeywords: [],
            analysisSummary: "No diary entries or notes found for sentiment analysis in this period.",
            entryCount: 0,
        };
    }

    // Prepare data for the prompt (dates are already ISO strings)
    // Sort chronologically for the prompt
    const promptTextEntries = [...textEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
             entryCount: textEntries.length, // Still know how many entries we had
         };
     }

    // Combine AI output with calculated entry count
    return {
        ...output, // Spread the AI-generated fields
        entryCount: textEntries.length,
    };
});

    