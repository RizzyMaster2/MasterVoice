'use server';

/**
 * @fileOverview Suggests new connections to a user based on their profile information and activity.
 *
 * @remarks
 * This flow uses the user's profile information and activity to suggest new connections.
 * It takes a user ID as input and returns a list of user IDs as suggestions.
 *
 * @example
 * ```typescript
 * import { suggestNewConnections } from './suggest-new-connections';
 *
 * const userId = 'user123';
 * const suggestedConnections = await suggestNewConnections(userId);
 * console.log(suggestedConnections);
 * ```
 *
 * @exports suggestNewConnections - The function to suggest new connections.
 * @exports SuggestNewConnectionsInput - The input type for the suggestNewConnections function.
 * @exports SuggestNewConnectionsOutput - The return type for the suggestNewConnections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const SuggestNewConnectionsInputSchema = z.object({
  userId: z.string().describe('The ID of the user to suggest connections for.'),
  profileInformation: z.string().describe('The profile information of the user.'),
  activityHistory: z.string().describe('The activity history of the user.'),
});

export type SuggestNewConnectionsInput = z.infer<
  typeof SuggestNewConnectionsInputSchema
>;

// Define the output schema
const SuggestNewConnectionsOutputSchema = z.array(
  z.string().describe('A list of user IDs that are suggested connections.')
);

export type SuggestNewConnectionsOutput = z.infer<
  typeof SuggestNewConnectionsOutputSchema
>;

// Export the main function
export async function suggestNewConnections(
  input: SuggestNewConnectionsInput
): Promise<SuggestNewConnectionsOutput> {
  return suggestNewConnectionsFlow(input);
}

// Define the prompt
const suggestNewConnectionsPrompt = ai.definePrompt({
  name: 'suggestNewConnectionsPrompt',
  input: {schema: SuggestNewConnectionsInputSchema},
  output: {schema: SuggestNewConnectionsOutputSchema},
  prompt: `You are a social networking expert. Given a user's profile information and activity history, suggest a list of user IDs that they might want to connect with.

User Profile Information: {{{profileInformation}}}

User Activity History: {{{activityHistory}}}

Suggest a list of user IDs that this user might want to connect with:`,
});

// Define the flow
const suggestNewConnectionsFlow = ai.defineFlow(
  {
    name: 'suggestNewConnectionsFlow',
    inputSchema: SuggestNewConnectionsInputSchema,
    outputSchema: SuggestNewConnectionsOutputSchema,
  },
  async input => {
    const {output} = await suggestNewConnectionsPrompt(input);
    return output!;
  }
);
