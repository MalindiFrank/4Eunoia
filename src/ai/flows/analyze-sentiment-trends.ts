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
import { parseISO, isWithinInterval, formatISO } from 'date-fns';

// --- Data Loading (Adapting from other flows) ---
// Assume StoredLogEntry and Note structures from their respective pages/flows
interface StoredLogEntry {
  id: string;
  date: string; // ISO string
  diaryEntry?: string;
}
interface Note {
  id: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
interface TextEntry {
    date: Date; // Use Date object internally
    text: string;
    source: 'diary' | 'note';
}

const loadTextEntries = (startDate: Date, endDate: Date): TextEntry[] => {
    const entries: TextEntry[] = [];
    console.warn("Attempting to access localStorage in analyzeSentimentTrends flow. This is for demonstration and may not work in production.");

    // Load Diary Entries
    // const storedLogsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-daily-logs') : null;
    const storedLogsRaw = null; // Simulate server environment
    let storedLogs: StoredLogEntry[] = [];
    if (storedLogsRaw) {
        try { storedLogs = JSON.parse(storedLogsRaw); } catch (e) { console.error("Error parsing logs:", e); }
    } else {
        // Add mock diary data if none found
         storedLogs = [
            { id: 'log-mock-s1', date: subDays(new Date(), 1).toISOString(), diaryEntry: 'Great progress today, feeling very accomplished!' },
            { id: 'log-mock-s2', date: subDays(new Date(), 3).toISOString(), diaryEntry: 'Struggled with the bug again. Feeling frustrated and stuck.' },
            { id: 'log-mock-s3', date: subDays(new Date(), 5).toISOString(), diaryEntry: 'Had a relaxing weekend. Feeling refreshed.' },
        ];
    }

    storedLogs.forEach(log => {
        if (log.diaryEntry) {
            const logDate = parseISO(log.date);
            if (isWithinInterval(logDate, { start: startDate, end: endDate })) {
                entries.push({ date: logDate, text: log.diaryEntry, source: 'diary' });
            }
        }
    });

    // Load Notes
    // const storedNotesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-notes') : null;
    const storedNotesRaw = null; // Simulate server environment
    let storedNotes: Note[] = [];
     if (storedNotesRaw) {
         try { storedNotes = JSON.parse(storedNotesRaw); } catch (e) { console.error("Error parsing notes:", e); }
     } else {
          // Add mock notes data if none found
          storedNotes = [
              { id: 'note-mock-s1', title: 'Meeting Feedback', content: 'Received positive feedback on the presentation. Very encouraging.', createdAt: subDays(new Date(), 2).toISOString(), updatedAt: subDays(new Date(), 2).toISOString() },
              { id: 'note-mock-s2', title: 'Project Concerns', content: 'Worried about the upcoming deadline. Need to manage time better.', createdAt: subDays(new Date(), 4).toISOString(), updatedAt: subDays(new Date(), 4).toISOString() },
          ];
     }

    storedNotes.forEach(note => {
         const noteDate = parseISO(note.createdAt); // Use createdAt for sentiment analysis context
         if (isWithinInterval(noteDate, { start: startDate, end: endDate })) {
             // Combine title and content for better context, or just use content
             entries.push({ date: noteDate, text: `${note.title}: ${note.content}`, source: 'note' });
         }
    });

     return entries.sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort chronologically
};
// Helper imports (if needed for mock data)
import { subDays } from 'date-fns';

// --- Input/Output Schemas ---
const AnalyzeSentimentTrendsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing sentiment.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing sentiment.'),
});
export type AnalyzeSentimentTrendsInput = z.infer<typeof AnalyzeSentimentTrendsInputSchema>;

// Use string date for prompt input schema
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
  typeof AnalyzeSentimentTrendsInputSchema,
  typeof AnalyzeSentimentTrendsOutputSchema
>({
  name: 'analyzeSentimentTrendsFlow',
  inputSchema: AnalyzeSentimentTrendsInputSchema,
  outputSchema: AnalyzeSentimentTrendsOutputSchema,
}, async (input) => {
    const startDate = parseISO(input.startDate);
    const endDate = parseISO(input.endDate);

    // Load text entries (returns TextEntry[] with Date objects)
    const textEntries = loadTextEntries(startDate, endDate);

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

    // Prepare data for the prompt (convert dates back to ISO strings)
    const promptTextEntries = textEntries.map(entry => ({
        date: formatISO(entry.date),
        text: entry.text,
        source: entry.source,
    }));

    const promptInput: z.infer<typeof PromptInputSchema> = {
        textEntries: promptTextEntries,
        startDate: input.startDate, // Pass original ISO strings
        endDate: input.endDate,
    };

    const { output } = await analyzeSentimentPrompt(promptInput);

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
