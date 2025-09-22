'use server';

/**
 * @fileOverview A simple AI chat bot that echoes user messages with a twist.
 *
 * @remarks
 * This flow defines the behavior of an AI assistant named "Echo".
 * It takes the conversation history and the latest user message as input,
 * and returns a generated response from the AI model.
 *
 * @exports echo - The function to get a response from the Echo bot.
 * @exports EchoInput - The input type for the echo function.
 * @exports EchoOutput - The return type for the echo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the Echo flow
const EchoInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })
  ).describe('The conversation history.'),
  message: z.string().describe('The latest message from the user.'),
});

export type EchoInput = z.infer<typeof EchoInputSchema>;

// Define the output schema for the Echo flow
const EchoOutputSchema = z.string().describe('The AI-generated response.');

export type EchoOutput = z.infer<typeof EchoOutputSchema>;


// Export the main function that will be called by the client
export async function echo(
  input: EchoInput
): Promise<EchoOutput> {
  return echoFlow(input);
}


// Define the Genkit prompt
const echoPrompt = ai.definePrompt({
  name: 'echoPrompt',
  input: { schema: EchoInputSchema },
  output: { format: 'text' },
  prompt: `You are Echo, a friendly and slightly quirky AI assistant. Your primary function is to be a conversational partner.

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
const echoFlow = ai.defineFlow(
  {
    name: 'echoFlow',
    inputSchema: EchoInputSchema,
    outputSchema: EchoOutputSchema,
  },
  async (input) => {
    const { output } = await echoPrompt(input);
    return output!;
  }
);
