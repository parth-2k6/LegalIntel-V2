'use server';
/**
 * @fileOverview An AI agent for starting a legal role-play session.
 *
 * - startRolePlay - A function that kicks off the role-play conversation.
 * - StartRolePlayInput - The input type for the function.
 * - StartRolePlayOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

const StartRolePlayInputSchema = z.object({
  role: z.string().describe('The role the user wants to play (e.g., Client, Judge, Lawyer).'),
  scenario: z.string().describe('The legal scenario provided by the user.'),
});
export type StartRolePlayInput = z.infer<typeof StartRolePlayInputSchema>;

const StartRolePlayOutputSchema = z.object({
  initialResponse: z.string().describe('The AI\'s first message to start the role-play, acting as the other party.'),
  conversationSummary: z.string().describe('A brief summary of the scenario for session history.'),
});
export type StartRolePlayOutput = z.infer<typeof StartRolePlayOutputSchema>;

export async function startRolePlay(input: StartRolePlayInput): Promise<StartRolePlayOutput | { error: string }> {
  try {
    return await startRolePlayFlow(input);
  } catch (e: any) {
    console.error("Error in startRolePlayFlow", e);
    return { error: 'Failed to start role play. ' + e.message };
  }
}

const startRolePlayPrompt = `You are an expert AI actor for legal role-playing simulations. Your task is to start a conversation based on the user's chosen role and scenario.
You will play the opposite role. For example, if the user is a "Client", you might be a "Lawyer". If the user is a "Judge", you might be a "Lawyer" or "Defendant".
Your goal is to create an immersive and realistic legal simulation.

Generate two things:
1.  **initialResponse**: Your first line of dialogue to kick off the role-play. It should be engaging and directly address the user's scenario from your assigned character's perspective.
2.  **conversationSummary**: A concise, one-sentence summary of the provided scenario. This summary should be in the third person. For example: "This is a simulation where the user, acting as a client, is seeking advice on a domestic violence case."

User's Role: "{{role}}"
Scenario: "{{scenario}}"
`;

const startRolePlayFlow = ai.defineFlow(
  {
    name: 'startRolePlayFlow',
    inputSchema: StartRolePlayInputSchema,
    outputSchema: StartRolePlayOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: startRolePlayPrompt,
      input: input,
      output: { schema: StartRolePlayOutputSchema },
      config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });
    return output!;
  }
);
