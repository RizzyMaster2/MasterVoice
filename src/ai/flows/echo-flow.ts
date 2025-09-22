'use server';

/**
 * @fileOverview A simple AI chat bot that echoes user messages with a twist.
 *
 * @remarks
 * This flow defines the behavior of an AI assistant named "VoiceBot".
 * It takes the conversation history and the latest user message as input,
 * and returns a generated response from the AI model.
 *
 * @exports voiceBot - The function to get a response from the VoiceBot bot.
 * @exports VoiceBotInput - The input type for the voiceBot function.
 * @exports VoiceBotOutput - The return type for the voiceBot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the VoiceBot flow
const VoiceBotInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })
  ).describe('The conversation history.'),
  message: z.string().describe('The latest message from the user.'),
});

export type VoiceBotInput = z.infer<typeof VoiceBotInputSchema>;

// Define the output schema for the VoiceBot flow
const VoiceBotOutputSchema = z.string().describe('The AI-generated response.');

export type VoiceBotOutput = z.infer<typeof VoiceBotOutputSchema>;


// Export the main function that will be called by the client
export async function voiceBot(
  input: VoiceBotInput
): Promise<VoiceBotOutput> {
  return voiceBotFlow(input);
}


// Define the Genkit prompt
const voiceBotPrompt = ai.definePrompt({
  name: 'voiceBotPrompt',
  input: { schema: VoiceBotInputSchema },
  output: { format: 'text' },
  prompt: `You are VoiceBot, a friendly and slightly quirky AI assistant. Your primary function is to be a conversational partner.

You should respond to the user's message in a helpful and engaging way. Keep your responses concise and friendly. You are built into a chat application as a demonstration of AI capabilities.

You can start the conversation by introducing yourself.

Here is the conversation history:
{{#each history}}
- {{role}}: {{#each content}}{{text}}{{/each}}
{{/each}}

User's latest message:
"{{{message}}}"

Your response:
`,
});

// Define the Genkit flow
const voiceBotFlow = ai.defineFlow(
  {
    name: 'voiceBotFlow',
    inputSchema: VoiceBotInputSchema,
    outputSchema: VoiceBotOutputSchema,
  },
  async (input) => {
    const { output } = await voiceBotPrompt(input);
    return output!;
  }
);
