'use server';
/**
 * @fileOverview A simple chatbot that responds to messages.
 *
 * - chatBot - A function that handles the chatbot process.
 * - ChatBotInput - The input type for the chatBot function.
 * - ChatBotOutput - The return type for the chatBot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatBotInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ).describe('The chat history.'),
});
export type ChatBotInput = z.infer<typeof ChatBotInputSchema>;

const ChatBotOutputSchema = z.string().describe("The bot's response.");
export type ChatBotOutput = z.infer<typeof ChatBotOutputSchema>;


export async function chatBot(input: ChatBotInput): Promise<ChatBotOutput> {
  return chatBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatBotPrompt',
  input: {schema: ChatBotInputSchema},
  output: {schema: z.string()},
  prompt: `You are a friendly chatbot named "MasterVoice Bot". Your purpose is to help a user test their chat application. Be conversational and engaging.

Here is the chat history:
{{#each history}}
{{role}}: {{content}}
{{/each}}

Generate the next response as the model.`,
});

const chatBotFlow = ai.defineFlow(
  {
    name: 'chatBotFlow',
    inputSchema: ChatBotInputSchema,
    outputSchema: ChatBotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
