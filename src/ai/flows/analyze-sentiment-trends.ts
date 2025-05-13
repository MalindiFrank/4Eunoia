
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
import { formatISO, parseISO, isValid } from 'date-fns'; 
import type { LogEntry } from '@/services/daily-log'; 
import type { Note } from '@/services/note';

const InputTextEntrySchema = z.object({
    id: z.string(),
    date: z.string().datetime(), 
    text: z.string(),
    source: z.enum(['diary', 'note']),
});

const AnalyzeSentimentTrendsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing sentiment.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing sentiment.'),
  textEntries: z.array(InputTextEntrySchema).describe('An array of text entry objects (from diary/notes) to analyze.'),
});
export type AnalyzeSentimentTrendsInput = z.infer<typeof AnalyzeSentimentTrendsInputSchema>;


const TextEntryPromptSchema = z.object({
      id: z.string(), 
      date: z.string().datetime().describe('The date of the entry (ISO 8601 format).'),
      text: z.string().describe('The text content of the entry.'),
      source: z.enum(['diary', 'note']).describe('The source of the text entry.'),
});

const AnalyzeSentimentTrendsOutputSchema = z.object({
  overallSentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']).describe('The dominant sentiment detected across all entries in the period.'),
  sentimentScore: z.number().min(-1).max(1).describe('A numerical score representing the overall sentiment (-1: very negative, 0: neutral, 1: very positive).'),
  positiveKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases associated with positive sentiment.'),
  negativeKeywords: z.array(z.string()).describe('List of 3-5 keywords or short phrases associated with negative sentiment.'),
  analysisSummary: z.string().describe('A brief (2-3 sentence) summary of the sentiment trends observed, noting shifts, recurring themes, or intensity. If possible, try to link recurring themes or shifts to specific dates or types of entries if a strong pattern emerges.'),
  entryCount: z.number().describe('The number of text entries analyzed.'),
});
export type AnalyzeSentimentTrendsOutput = z.infer<typeof AnalyzeSentimentTrendsOutputSchema>;

export async function analyzeSentimentTrends(
  input: AnalyzeSentimentTrendsInput
): Promise<AnalyzeSentimentTrendsOutput> {
    if (!input.startDate || !isValid(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for sentiment analysis.");
    }
    if (!input.endDate || !isValid(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for sentiment analysis.");
    }
    return analyzeSentimentTrendsFlow(input);
}

const PromptInputSchema = z.object({
      textEntries: z.array(TextEntryPromptSchema).describe('An array of text entries (from diary and notes) to analyze, sorted chronologically.'),
      startDate: z.string().datetime().describe('The start date (ISO 8601 format) of the period being analyzed.'),
      endDate: z.string().datetime().describe('The end date (ISO 8601 format) of the period being analyzed.'),
});

const analyzeSentimentPrompt = ai.definePrompt({
  name: 'analyzeSentimentTrendsPrompt',
  input: { schema: PromptInputSchema },
  output: {
    schema: z.object({
        overallSentiment: z.enum(['Positive', 'Negative', 'Neutral', 'Mixed']).describe('The dominant sentiment detected across all entries in the period.'),
        sentimentScore: z.number().min(-1).max(1).describe('Estimate a numerical score representing the overall sentiment (-1.0: very negative, 0: neutral, 1.0: very positive). Consider the balance and intensity of emotions expressed.'),
        positiveKeywords: z.array(z.string()).describe('List 3-5 keywords or short phrases strongly associated with positive sentiment (e.g., "accomplished," "grateful," "enjoyed").'),
        negativeKeywords: z.array(z.string()).describe('List 3-5 keywords or short phrases strongly associated with negative sentiment (e.g., "frustrated," "stressed," "difficult," "worried").'),
        analysisSummary: z.string().describe('Provide a concise **Analysis Summary** (2-3 sentences). Describe the overall emotional tone for the period. Mention any notable shifts in sentiment (e.g., "started positive but ended stressed") or recurring positive/negative themes. Comment on the intensity if apparent. If possible, try to link recurring themes or shifts to specific dates (e.g., "a noticeable dip in mood around {{date}}") or types of entries (e.g., "notes about work tended to be more negative") if a strong pattern emerges from the provided text and dates.'),
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
5.  Write a concise **Analysis Summary** (2-3 sentences) describing the overall tone, any significant shifts, recurring themes, and perceived intensity. If possible, try to link recurring themes or shifts to specific dates or types of entries if a strong pattern emerges.

Generate the output in the specified JSON format. If no entries are found, return Neutral sentiment, score 0, empty keyword lists, and an appropriate summary.`,
});

const analyzeSentimentTrendsFlow = ai.defineFlow<
  typeof AnalyzeSentimentTrendsInputSchema, 
  typeof AnalyzeSentimentTrendsOutputSchema
>({
  name: 'analyzeSentimentTrendsFlow',
  inputSchema: AnalyzeSentimentTrendsInputSchema,
  outputSchema: AnalyzeSentimentTrendsOutputSchema,
}, async (input) => {
    const { textEntries = [], startDate, endDate } = input;

    const validTextEntries = textEntries.filter(entry => {
        try {
            return isValid(parseISO(entry.date));
        } catch {
            return false;
        }
    });


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

    const promptTextEntries = [...validTextEntries]
        .sort((a, b) => {
             try {
                 const dateA = parseISO(a.date).getTime();
                 const dateB = parseISO(b.date).getTime();
                 if (!isNaN(dateA) && !isNaN(dateB)) {
                     return dateA - dateB;
                 }
             } catch { /* Ignore parsing errors during sort */ }
             return 0; 
         })
        .map(entry => ({ 
             id: entry.id,
             date: entry.date,
             text: entry.text,
             source: entry.source,
         }));

    const promptInputData: z.infer<typeof PromptInputSchema> = {
        textEntries: promptTextEntries, 
        startDate: startDate,
        endDate: endDate,
    };

    const { output } = await analyzeSentimentPrompt(promptInputData);

     if (!output) {
         console.error('AI analysis failed to return output for sentiment trends.');
          return {
             overallSentiment: 'Neutral', 
             sentimentScore: 0,
             positiveKeywords: [],
             negativeKeywords: [],
             analysisSummary: "Error: Could not analyze sentiment.",
             entryCount: validTextEntries.length, 
         };
     }

    return {
        ...output, 
        entryCount: validTextEntries.length,
    };
});

    
