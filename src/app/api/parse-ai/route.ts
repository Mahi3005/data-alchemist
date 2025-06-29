import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1', // OpenRouter base URL
});

const EXPECTED_SCHEMAS = {
  clients: {
    ClientID: 'string - unique identifier',
    ClientName: 'string - client name',
    PriorityLevel: 'number 1-5 - priority level',
    RequestedTaskIDs: 'comma-separated task IDs',
    GroupTag: 'string - group classification',
    AttributesJSON: 'JSON object - additional attributes'
  },
  workers: {
    WorkerID: 'string - unique identifier',
    WorkerName: 'string - worker name',
    Skills: 'comma-separated skills',
    AvailableSlots: 'array of phase numbers [1,2,3]',
    MaxLoadPerPhase: 'number - max tasks per phase',
    WorkerGroup: 'string - worker group',
    QualificationLevel: 'number - qualification level'
  },
  tasks: {
    TaskID: 'string - unique identifier',
    TaskName: 'string - task name',
    Category: 'string - task category',
    Duration: 'number - duration in phases',
    RequiredSkills: 'comma-separated required skills',
    PreferredPhases: 'array or range like [1,2,3] or "1-3"',
    MaxConcurrent: 'number - max concurrent assignments'
  }
};

export async function POST(request: NextRequest) {
  try {
    const { headers, dataType } = await request.json();

    // Validate input
    if (!headers || !Array.isArray(headers) || !dataType) {
      return NextResponse.json(
        { error: 'Invalid input: headers array and dataType are required' },
        { status: 400 }
      );
    }

    if (!EXPECTED_SCHEMAS[dataType as keyof typeof EXPECTED_SCHEMAS]) {
      return NextResponse.json(
        { error: `Invalid dataType: ${dataType}. Must be one of: ${Object.keys(EXPECTED_SCHEMAS).join(', ')}` },
        { status: 400 }
      );
    }

    let mapping: Record<string, string>;
    let confidence: number;
    let suggestions: string[] = [];
    let aiUsed = false;

    try {
      const expectedSchema = EXPECTED_SCHEMAS[dataType as keyof typeof EXPECTED_SCHEMAS];

      const prompt = `
You are a data mapping expert. Map the provided CSV headers to the expected schema.

Expected Schema for ${dataType}:
${JSON.stringify(expectedSchema, null, 2)}

Original Headers from CSV:
${headers.join(', ')}

Task:
1. Map each original header to the most appropriate expected field
2. Handle variations like "Client_ID" -> "ClientID", "Worker Name" -> "WorkerName"
3. If a header doesn't match any expected field, suggest the closest match
4. Return ONLY a JSON object with the mapping

Example output format:
{
  "Client_ID": "ClientID",
  "Client Name": "ClientName",
  "Priority": "PriorityLevel"
}
`;

      const response = await openai.chat.completions.create({
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const mappingResult = response.choices[0]?.message?.content;

      if (!mappingResult) {
        throw new Error('No mapping result from AI');
      }

      mapping = JSON.parse(mappingResult);
      aiUsed = true;

    } catch (aiError) {
      console.warn('AI parsing failed, falling back to basic mapping:', aiError);
      mapping = createFallbackMapping(headers, dataType);
      suggestions.push('AI parsing unavailable or failed — using basic mapping fallback.');
    }

    // Calculate confidence and suggestions
    confidence = calculateConfidence(mapping, headers, dataType);
    suggestions.push(...generateSuggestions(mapping, headers, dataType));

    return NextResponse.json({
      mapping,
      confidence,
      suggestions,
      aiUsed
    });

  } catch (error) {
    console.error('AI Parsing API error:', error);
    return NextResponse.json(
      { error: 'Failed to parse with AI' },
      { status: 500 }
    );
  }
}

// Fallback mapping logic
function createFallbackMapping(headers: string[], dataType: string): Record<string, string> {
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType as keyof typeof EXPECTED_SCHEMAS]);
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = expectedFields.find(field =>
      field.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanHeader) ||
      cleanHeader.includes(field.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    mapping[header] = match || header;
  });

  return mapping;
}

function calculateConfidence(mapping: Record<string, string>, originalHeaders: string[], dataType: string): number {
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType as keyof typeof EXPECTED_SCHEMAS]);
  const mappedFields = Object.values(mapping);
  const correctMappings = mappedFields.filter(field => expectedFields.includes(field)).length;
  return correctMappings / expectedFields.length;
}

function generateSuggestions(mapping: Record<string, string>, originalHeaders: string[], dataType: string): string[] {
  const suggestions: string[] = [];
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType as keyof typeof EXPECTED_SCHEMAS]);
  const mappedFields = Object.values(mapping);

  const missingFields = expectedFields.filter(field => !mappedFields.includes(field));
  if (missingFields.length > 0) {
    suggestions.push(`Missing expected fields: ${missingFields.join(', ')}`);
  }

  const unmappedHeaders = originalHeaders.filter(header => !Object.values(mapping).includes(mapping[header]));
  if (unmappedHeaders.length > 0) {
    suggestions.push(`Unmapped headers: ${unmappedHeaders.join(', ')}`);
  }

  return suggestions;
}
