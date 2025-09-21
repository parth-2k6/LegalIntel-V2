import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { serviceAccount } from '@/lib/firebase-admin';

if (!serviceAccount) {
  throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set for Genkit.');
}

export const ai = genkit({
  plugins: [
    googleAI({
      serviceAccount: serviceAccount as any,
    }),
  ],
});

export const proModel = googleAI.model('gemini-1.5-pro-latest');
