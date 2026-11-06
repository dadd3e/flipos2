import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

export const ai = genkit({
  plugins: [
    ...(googleApiKey.trim() !== '' ? [googleAI()] : []),
  ],
  model: 'gemini-2.5-flash',
});

if (googleApiKey.trim() === '') {
  console.warn('[AI Studio] GEMINI_API_KEY / GOOGLE_API_KEY is not set. AI features will require an API key.');
}
