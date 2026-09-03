import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Single source of truth for the LLM used by both Bulgarian-generation call
// sites (daily horoscope and Oracle). Gemini 3.7 Flash is the production
// Bulgarian model. Keep the ID centralized so future evaluations do not
// create diverging route-level configuration.
export const AI_MODEL = 'gemini-3.7-flash'
export const ORACLE_FALLBACK_MODEL = 'gemini-3.6-flash'

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})
