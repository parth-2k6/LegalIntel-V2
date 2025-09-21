'use server';
/**
 * @fileOverview An AI agent for continuing a legal role-play session.
 *
 * - continueRolePlay - A function that continues the role-play conversation.
 * - ContinueRolePlayInput - The input type for the function.
 * - ContinueRolePlayOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';
import { Message, Part } from 'genkit/generate';

// Define the message structure we'll use for chat history
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});
type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ContinueRolePlayInputSchema = z.object({
  messages: z.array(ChatMessageSchema).describe('The history of the conversation so far, where the first message is the system prompt.'),
});
export type ContinueRolePlayInput = z.infer<typeof ContinueRolePlayInputSchema>;

const ContinueRolePlayOutputSchema = z.object({
  response: z.string().describe('The AI\'s next message in the role-play.'),
});
export type ContinueRolePlayOutput = z.infer<typeof ContinueRolePlayOutputSchema>;

export async function continueRolePlay(input: ContinueRolePlayInput): Promise<ContinueRolePlayOutput | { error: string }> {
  try {
    return await continueRolePlayFlow(input);
  } catch (e: any)
{
    console.error("Error in continueRolePlayFlow", e);
    return { error: 'Failed to continue role play. ' + e.message };
  }
}

// Convert our simple ChatMessage format to Genkit's Message format
const toGenkitMessages = (messages: ChatMessage[]): Message[] => {
    return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : (msg.role === 'system' ? 'system' : 'model'),
        content: [{ text: msg.content }]
    }));
}

const continueRolePlayFlow = ai.defineFlow(
  {
    name: 'continueRolePlayFlow',
    inputSchema: ContinueRolePlayInputSchema,
    outputSchema: ContinueRolePlayOutputSchema,
  },
  async (input) => {
    const genkitMessages = toGenkitMessages(input.messages);

    if (genkitMessages.length === 0 || genkitMessages[0].role !== 'system') {
        throw new Error("Conversation must start with a system message.");
    }

    const systemPrompt = genkitMessages[0].content[0].text as string;
    const history = genkitMessages.slice(1, -1);
    const lastMessage = genkitMessages.slice(-1)[0];

    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      system: systemPrompt,
      history: history,
      prompt: lastMessage.content[0] as Part,
      config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });
    
    if (!output?.text) {
      throw new Error("The AI failed to generate a response. This may be due to the content filter.");
    }
    
    return { response: output.text };
  }
);
