'use server';

/**
 * @fileOverview Classifies uploaded documents with an advanced AI persona, LexiAI.
 *
 * - classifyDocument - A function that takes document content and classifies it.
 * - ClassifyDocumentInput - The input type for the classifyDocument function.
 * - ClassifyDocumentOutput - The return type for the classifyDocument function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

const ClassifyDocumentInputSchema = z.object({
  fileAsBase64: z.string().describe('The file content as a Base64 encoded string.'),
  mimeType: z.string().describe('The mime type of the file.'),
});
export type ClassifyDocumentInput = z.infer<typeof ClassifyDocumentInputSchema>;

const ClassifyDocumentOutputSchema = z.object({
  executiveSummary: z.object({
    overview: z.string().describe('A 5-7 sentence plain-English overview of the entire document.'),
    balanceOfPower: z.string().describe('Which party benefits more overall (e.g., "Party A Favored (70/30)", "Balanced").'),
  }),
  clauseByClause: z.array(z.object({
    clause: z.string().describe('The clause reference (page/section number).'),
    simplification: z.string().describe('A 1-3 sentence plain-English rewrite of the clause.'),
    riskLevel: z.enum(['Low', 'Medium', 'High']).describe('The risk level of the clause.'),
    riskReason: z.string().optional().describe('Why the clause is risky (if applicable).'),
    suggestions: z.array(z.string()).describe('2-3 suggested user actions.'),
    clarityScore: z.number().min(1).max(10).describe('A score from 1-10 on how easy the clause is to understand.'),
  })).describe('A clause-by-clause simplification of the document.'),
  riskRadar: z.array(z.object({
    clause: z.string().describe('The clause reference of the high-risk item.'),
    risk: z.string().describe('An explanation of what the risk means in everyday language.'),
    suggestion: z.string().describe('A practical next step or precaution, with user-specific guidance.'),
  })).describe('The top 3-5 clauses that pose the highest risk.'),
  hiddenTraps: z.array(z.object({
    clause: z.string().describe('The clause reference where a hidden trap was found.'),
    trap: z.string().describe('An explanation of the hidden fee, renewal, or extra duty.'),
  })).describe('Clauses that bury fees, renewals, or extra duties.'),
  jargonBuster: z.array(z.object({
    term: z.string().describe('The legal term.'),
    explanation: z.string().describe('A plain-English explanation of the term.'),
    clause: z.string().describe('Where the term appears in the document.'),
  })).describe('A glossary of legal terms found in the document.'),
  timeBombDetector: z.array(z.object({
    action: z.string().describe('The action or event.'),
    deadline: z.string().describe('The deadline for the action.'),
    consequence: z.string().describe('The consequence of missing the deadline.'),
  })).describe('A timeline of important deadlines, renewals, or penalty escalations.'),
  privacyDataUse: z.array(z.object({
    clause: z.string().describe('The clause reference for the privacy policy.'),
    dataShared: z.string().describe('What data is shared.'),
    sharedWith: z.string().describe('With whom the data is shared.'),
    duration: z.string().describe('For how long the data is used or stored.'),
  })).describe('An explanation of privacy and data use clauses.'),
  consumerChecklist: z.array(z.string()).describe('A simple checklist of key things the user must confirm before signing.'),
  negotiationPlaybook: z.array(z.object({
    clause: z.string().describe('The clause to negotiate.'),
    strategy: z.string().describe('A suggested negotiation strategy.'),
  })).describe('Negotiation strategies for risky clauses.'),
  costBenefitSnapshot: z.object({
    summary: z.string().describe('A summary of whether potential costs outweigh benefits (e.g., "Potential Costs > Benefits", "Balanced").'),
    costs: z.array(z.string()).describe('List of potential financial exposures.'),
    benefits: z.array(z.string()).describe('List of benefits and rights.'),
  }),
  fairnessScoreJurisdiction: z.object({
    fairnessScore: z.number().min(1).max(10).describe('An overall fairness score from 1-10.'),
    fairnessReasoning: z.string().describe('A 2-3 sentence explanation for the fairness score.'),
    jurisdiction: z.string().describe('The governing law/jurisdiction.'),
    jurisdictionImpact: z.string().describe('The potential impact of the jurisdiction.'),
  }),
  complianceEthicalNote: z.object({
    complianceWarning: z.string().optional().describe('A warning if a clause may conflict with common consumer protection laws.'),
    ethicalNote: z.string().optional().describe('A short note on potential ethical or human impact.'),
  }),
  actionPrioritizer: z.object({
    critical: z.array(z.string()).describe('Critical priority actions.'),
    important: z.array(z.string()).describe('Important priority actions.'),
    optional: z.array(z.string()).describe('Optional priority actions.'),
  }),
  expenditureAnalysis: z.object({
    proceedingType: z.string().describe("The most likely type of legal proceeding (e.g., 'Small Claims Court', 'Civil Litigation', 'Arbitration')."),
    estimatedHearings: z.number().describe("An estimated number of hearings or sessions required for the proceeding."),
    costFactors: z.array(z.string()).describe("A list of the primary factors influencing the cost (e.g., 'Lawyer fees', 'Court filing fees', 'Expert witness costs')."),
    disclaimer: z.string().describe("A standard disclaimer that this is a rough estimate and not a guarantee."),
  }).describe("An analysis of potential legal expenditures."),
  lawyerCategory: z.string().describe("The specific category of lawyer that would be best suited for this document (e.g., 'Contract Law', 'Family Law', 'Tenant Law', 'Intellectual Property'). DO NOT invent a lawyer's name or contact information."),
});

export type ClassifyDocumentOutput = z.infer<typeof ClassifyDocumentOutputSchema>;

export async function classifyDocument(input: ClassifyDocumentInput): Promise<ClassifyDocumentOutput | { error: string }> {
  try {
    return await classifyDocumentFlow(input);
  } catch (e: any) {
    console.error("Error in classifyDocumentFlow", e);
    return { error: 'Failed to get a response from the AI. ' + e.message };
  }
}

const classifyDocumentFlow = ai.defineFlow(
  {
    name: 'classifyDocumentFlow',
    inputSchema: ClassifyDocumentInputSchema,
    outputSchema: ClassifyDocumentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: [
        {
          text: `You are LexiAI, the expert AI assistant powering the project "LegalIntel."
Your mission is to demystify legal documents for everyday users in a private, safe, and empowering way.
You are not a lawyer and do not give legal advice. Instead, you provide accessible explanations, highlight risks, simulate scenarios, surface hidden traps, and generate actionable strategies.
Your entire response MUST be a single, valid JSON object that strictly follows the output schema. Do not add any extra text or explanations outside the JSON structure.

Analyze the document provided and generate the JSON output.`
        },
        {
          media: {
            url: `data:${input.mimeType};base64,${input.fileAsBase64}`,
          }
        }
      ],
      output: { schema: ClassifyDocumentOutputSchema },
    });
    return output!;
  }
);
