import { createOpenAI } from '@ai-sdk/openai'

// Single source of truth for the LLM used by both Bulgarian-generation call
// sites (daily horoscope, Oracle) — was previously duplicated as a local
// `const LLAMA_MODEL` in each route file, so swapping models meant hunting
// down every call site individually. A model swap (e.g. once the Bulgarian-
// coverage research lands) is now a one-line change here, not a hunt.
//
// Currently Llama 3.3 70B — a known-weak-Bulgarian placeholder per the
// founder's explicit instruction, not a considered choice. Do not add
// prompt workarounds, retries, or post-processing to compensate for its
// output quality; that work becomes dead weight the moment this constant
// changes, and would mask whether a new model actually fixes anything.
export const AI_MODEL = 'meta-llama/llama-3.3-70b-instruct'

export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})
