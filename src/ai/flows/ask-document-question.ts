'use server';
/**
 * @fileOverview A Q&A and Scenario Simulation agent for legal documents.
 *
 * - askDocumentQuestion - A function that answers questions about a document based on retrieved passages.
 * - AskDocumentQuestionInput - The input type for the askDocumentQuestion function.
 * - AskDocumentQuestionOutput - The return type for the askDocumentQuestion function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

const AskDocumentQuestionInputSchema = z.object({
    fileAsBase64: z.string().describe("The file content as a Base64 encoded string."),
    mimeType: z.string().describe("The mime type of the file."),
    question: z.string().describe("The user's question or scenario to simulate about the document."),
});
export type AskDocumentQuestionInput = z.infer<typeof AskDocumentQuestionInputSchema>;

const AskDocumentQuestionOutputSchema = z.object({
    plainEnglish: z.string().describe("A plain-English rewrite of the clause in simple, everyday language (max 2 sentences)."),
    analysis: z.object({
        parties: z.array(z.string()).describe("The parties involved in the clause."),
        obligations: z.array(z.string()).describe("The key obligations mentioned in the clause."),
        deadlinesOrPenalties: z.array(z.string()).describe("Any deadlines or penalties mentioned."),
        rightsWaivedOrGained: z.array(z.string()).describe("Any rights waived or gained by the parties."),
        severity: z.enum(["Low", "Medium", "High"]).describe("The severity score of the clause."),
        severityJustification: z.string().describe("A one-sentence justification for the severity score."),
    }),
    riskHeatmapLabel: z.enum(["Safe", "Caution", "High-Risk"]).describe("A risk heatmap label for the clause."),
    riskJustification: z.string().describe("A short phrase justifying the risk label, tied to the source text."),
    negotiationHelper: z.object({
        alternativeClause: z.string().describe("A suggested fairer or safer alternative to the clause."),
        messageTemplate: z.string().describe("A polite negotiation message template the user could send."),
    }),
    sources: z.array(z.string()).describe("The exact source spans (verbatim copy) from the document that support the answer."),
    confidenceScore: z.number().min(0).max(100).describe("A confidence score (0-100) in the accuracy of the answer."),
});
export type AskDocumentQuestionOutput = z.infer<typeof AskDocumentQuestionOutputSchema>;

export async function askDocumentQuestion(input: AskDocumentQuestionInput): Promise<AskDocumentQuestionOutput | { error: string }> {
  try {
    return await askDocumentQuestionFlow(input);
  } catch (e: any) {
    console.error("Error in askDocumentQuestionFlow", e);
    return { error: 'Failed to get an answer from the AI. ' + e.message };
  }
}

const askDocumentQuestionFlow = ai.defineFlow(
    {
        name: 'askDocumentQuestionFlow',
        inputSchema: AskDocumentQuestionInputSchema,
        outputSchema: AskDocumentQuestionOutputSchema,
    },
    async (input) => {
        const { output } = await ai.generate({
            model: googleAI.model('gemini-1.5-flash-latest'),
            prompt: [
                {
                    text: `You are LegalIntel — an advanced legal-document AI assistant built to make complex legal agreements clear, safe, and actionable. Your mission is to simplify, detect risks, simulate scenarios, and guide users with negotiation-ready insights. Always operate within the bounds of the provided "context" (retrieved clauses) and NEVER invent facts beyond it. If insufficient info exists, say clearly: "This document does not provide enough detail; seek a lawyer review."

Core tasks (apply to every interaction):
1. **Plain-English Rewrite**
   - Rewrite the clause in simple, everyday language (max 2 sentences).
   - Tailor explanation to the user’s role if specified (tenant, borrower, freelancer, etc.).

2. **Clause Analysis**
   - List: 
     - Parties involved
     - Key obligations
     - Deadlines / penalties
     - Rights waived or gained
   - Provide a severity score (Low / Medium / High) with one-sentence justification.

3. **Risk Heatmap Label**
   - Tag clause as: Safe (Green), Caution (Yellow), or High-Risk (Red).
   - Justify with 1 short phrase tied to source text.

4. **Negotiation Helper**
   - Suggest a fairer or safer alternative clause (short but legally sound).
   - Provide a 2-sentence polite negotiation message template the user could send.

5. **Explainability + Confidence**
   - Show exact source spans (copy verbatim).
   - Output a confidence score (0-100).
   - End every answer with: “This is an AI-powered simplification, not legal advice.”

You MUST ONLY use information from the provided document context to answer the user's question. First, find the most relevant clause(s) to the user's question, and then perform the analysis based on those clauses.

User Question: "${input.question}"
`,
                },
                {
                    media: {
                        url: `data:${input.mimeType};base64,${input.fileAsBase64}`,
                    }
                }
            ],
            output: { schema: AskDocumentQuestionOutputSchema },
        });
        return output!;
    }
);
