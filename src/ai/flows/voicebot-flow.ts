'use server';

/**
 * @fileOverview A conversational AI flow for the VoiceBot.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceBotInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({text: z.string()})),
    })
  ),
  message: z.string(),
});

export async function voiceBot(input: z.infer<typeof VoiceBotInputSchema>): Promise<string> {
  const response = await voiceBotFlow(input);
  return response;
}

const voiceBotFlow = ai.defineFlow(
  {
    name: 'voiceBotFlow',
    inputSchema: VoiceBotInputSchema,
    outputSchema: z.string(),
  },
  async ({history, message}) => {
    const prompt = `You are VoiceBot, a friendly and helpful AI assistant. Your responses should be concise and helpful.

Here is the conversation history:
${history.map(h => `${h.role}: ${h.content[0].text}`).join('\n')}
user: ${message}
model: `;

    const response = await ai.generate({
      prompt: prompt,
      history,
    });

    return response.text;
  }
);
