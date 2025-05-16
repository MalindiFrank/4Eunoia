
'use server';
/**
 * @fileOverview Processes transcribed voice input to categorize and extract information.
 *
 * - processVoiceInput - Analyzes text to determine user intent (log, task, note).
 * - ProcessVoiceInput - Input for the voice processing.
 * - ProcessedVoiceOutput - Output of the voice processing.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ProcessVoiceInputSchema = z.object({
  transcribedText: z.string().min(1).describe('The text transcribed from user\'s voice input.'),
  currentDate: z.string().datetime().describe('The current date and time in ISO 8601 format, for context.'),
});
export type ProcessVoiceInput = z.infer<typeof ProcessVoiceInputSchema>;

const ProcessedVoiceOutputSchema = z.object({
  intent: z.enum(['log_activity', 'create_task', 'create_note', 'general_query', 'unclear'])
    .describe('The classified intent of the voice input.'),
  extractedDetails: z.object({
    title: z.string().optional().describe('Extracted title for a task or note, or main activity for a log.'),
    description: z.string().optional().describe('Extracted description or content.'),
    date: z.string().datetime().optional().describe('Extracted date for a task or log (ISO 8601).'),
    // Add more fields as needed, e.g., priority, mood
  }).optional().describe('Details extracted based on the intent.'),
  responseText: z.string().describe('A text response to the user, confirming understanding or asking for clarification.'),
});
export type ProcessedVoiceOutput = z.infer<typeof ProcessedVoiceOutputSchema>;

export async function processVoiceInput(
  input: ProcessVoiceInput
): Promise<ProcessedVoiceOutput> {
  return processVoiceInputFlow(input);
}

const processVoiceInputPrompt = ai.definePrompt({
  name: 'processVoiceInputPrompt',
  input: { schema: ProcessVoiceInputSchema },
  output: { schema: ProcessedVoiceOutputSchema },
  prompt: `You are an AI assistant helping a user manage their productivity and personal development app (4Eunoia) via voice.
The user has spoken, and their speech has been transcribed to: "{{transcribedText}}".
The current date and time is: {{currentDate}}.

Your tasks:
1.  **Determine Intent**: Classify the user's intent. Is it to:
    *   'log_activity': Log something they did or are doing (e.g., "I just finished a workout", "Log that I worked on the report").
    *   'create_task': Create a new task or to-do item (e.g., "Remind me to buy groceries", "Add 'call John' to my tasks").
    *   'create_note': Create a general note (e.g., "Note that the project deadline is next Friday", "Idea: new marketing strategy").
    *   'general_query': Ask a question or make a general statement not fitting other categories.
    *   'unclear': If the intent cannot be reasonably determined.
2.  **Extract Details (if applicable)**:
    *   For 'log_activity': Extract the 'title' (main activity). Try to infer a 'date' if mentioned (default to {{currentDate}} if not).
    *   For 'create_task': Extract 'title' (task name) and 'description' (if any). Try to infer a 'date' (due date, default to {{currentDate}} if relevant like "call John today").
    *   For 'create_note': Extract 'title' (if a clear subject is stated, otherwise use first few words of content) and 'description' (the main content of the note).
3.  **Formulate ResponseText**:
    *   If intent is clear and details extracted: Confirm the action (e.g., "Okay, logging '[activity title]' for today.", "Got it, adding task: '[task title]'.", "Noted: '[note title]'.").
    *   If intent is clear but details are missing: Ask for clarification (e.g., "Sure, I can log an activity. What did you do?", "What should I call this task?").
    *   If intent is 'general_query': Acknowledge and state you'll try to help (actual query processing is out of scope for this specific flow, but acknowledge it).
    *   If intent is 'unclear': Politely say you didn't understand and ask them to rephrase (e.g., "Sorry, I didn't quite catch that. Could you please rephrase?").

Consider common phrasing. For tasks, "remind me to..." or "add to tasks..." are common. For logs, past tense is common.

Output the result in the specified JSON format.
`,
});

const processVoiceInputFlow = ai.defineFlow<
  typeof ProcessVoiceInputSchema,
  typeof ProcessedVoiceOutputSchema
>({
  name: 'processVoiceInputFlow',
  inputSchema: ProcessVoiceInputSchema,
  outputSchema: ProcessedVoiceOutputSchema,
}, async (input) => {
  if (!input.transcribedText.trim()) {
    return {
      intent: 'unclear',
      responseText: 'I didn\'t hear anything. Please try speaking again.',
    };
  }

  try {
    const { output } = await processVoiceInputPrompt(input);
    if (!output) {
      console.error('AI voice processing failed to return output.');
      return {
        intent: 'unclear',
        responseText: "I'm having a little trouble understanding right now. Please try again.",
      };
    }
    return output;
  } catch (error) {
    console.error('Error in processVoiceInputFlow:', error);
    return {
      intent: 'unclear',
      responseText: "There was an issue processing your voice input. Please try again.",
    };
  }
});
