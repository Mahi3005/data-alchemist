// src/lib/aiClient.ts
import OpenAI from 'openai';

let aiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("OpenAI API key not found. AI parsing will be disabled.");
    throw new Error("API key not configured");
  }

  if (!aiClient) {
    aiClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  return aiClient;
}