'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/classify-uploaded-document.ts';
import '@/ai/flows/ask-document-question.ts';
import '@/ai/flows/generate-speech.ts';
import '@/ai/flows/start-role-play.ts';
import '@/ai/flows/continue-role-play.ts';
