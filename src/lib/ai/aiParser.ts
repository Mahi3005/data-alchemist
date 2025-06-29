import OpenAI from 'openai';
import { DataType, AIParseResult } from '@/types';

// 🌐 Smart key selection for server + browser support
const getOpenAIClient = () => {
  const apiKey =
    typeof window === 'undefined'
      ? process.env.OPENROUTER_API_KEY
      : process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn(`
❌ OpenRouter API key is missing!

✅ To fix:
- For server: add OPENROUTER_API_KEY in your .env.local file
- For browser: add NEXT_PUBLIC_OPENROUTER_API_KEY in your .env.local file

Example .env.local:
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-your-key
OPENROUTER_API_KEY=sk-your-key
    `);
    throw new Error('API key not configured');
  }

  console.log('✅ OpenRouter API key loaded:', apiKey?.slice(0, 8) + '...');

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });
};

const EXPECTED_SCHEMAS = {
  clients: {
    ClientID: 'string - unique identifier',
    ClientName: 'string - client name',
    PriorityLevel: 'number 1-5 - priority level',
    RequestedTaskIDs: 'comma-separated task IDs',
    GroupTag: 'string - group classification',
    AttributesJSON: 'JSON object - additional attributes',
  },
  workers: {
    WorkerID: 'string - unique identifier',
    WorkerName: 'string - worker name',
    Skills: 'comma-separated skills',
    AvailableSlots: 'array of phase numbers [1,2,3]',
    MaxLoadPerPhase: 'number - max tasks per phase',
    WorkerGroup: 'string - worker group',
    QualificationLevel: 'number - qualification level',
  },
  tasks: {
    TaskID: 'string - unique identifier',
    TaskName: 'string - task name',
    Category: 'string - task category',
    Duration: 'number - duration in phases',
    RequiredSkills: 'comma-separated required skills',
    PreferredPhases: 'array or range like [1,2,3] or "1-3"',
    MaxConcurrent: 'number - max concurrent assignments',
  },
};

export async function parseWithAI(
  fileContent: string,
  dataType: DataType,
  originalHeaders: string[]
): Promise<AIParseResult> {
  let openai: OpenAI;

  try {
    openai = getOpenAIClient();
  } catch (e) {
    console.warn('⚠️ Falling back to basic parser:', e);
    return parseBasic(fileContent, dataType);
  }

  const expectedSchema = EXPECTED_SCHEMAS[dataType];

  const prompt = `
You are a data mapping expert. Map the provided CSV headers to the expected schema.

Expected Schema for ${dataType}:
${JSON.stringify(expectedSchema, null, 2)}

Original Headers from CSV:
${originalHeaders.join(', ')}

Task:
1. Map each original header to the most appropriate expected field
2. Handle variations like "Client_ID" → "ClientID"
3. Return ONLY a JSON object with the mapping

Example:
{
  "Client_ID": "ClientID",
  "Client Name": "ClientName"
}
`;

  const response = await openai.chat.completions.create({
    model: 'mistralai/mistral-7b-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });

  const mappingResult = response.choices[0]?.message?.content;

  if (!mappingResult) {
    console.warn('❌ No mapping result from AI. Falling back.');
    return parseBasic(fileContent, dataType);
  }

  let mapping: Record<string, string>;
  try {
    mapping = JSON.parse(mappingResult);
  } catch (error) {
    console.warn('⚠️ Failed to parse AI mapping JSON. Falling back.', error);
    mapping = createFallbackMapping(originalHeaders, dataType);
  }

  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/"/g, ''));

  const mappedData: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const mappedRow: any = {};

    headers.forEach((header, index) => {
      const mappedField = mapping[header] || header;
      let value = values[index] || '';
      mappedRow[mappedField] = transformValue(value, mappedField, dataType);
    });

    if (Object.values(mappedRow).some(v => v !== '')) {
      mappedData.push(mappedRow);
    }
  }

  return {
    mappedData,
    confidence: calculateConfidence(mapping, originalHeaders, dataType),
    suggestions: generateSuggestions(mapping, originalHeaders, dataType),
  };
}

// ------------------ Utility Functions ---------------------

function createFallbackMapping(
  headers: string[],
  dataType: DataType
): Record<string, string> {
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType]);
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const cleanHeader = header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const match = expectedFields.find(field =>
      field
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .includes(cleanHeader) ||
      cleanHeader.includes(
        field.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    );
    mapping[header] = match || header;
  });

  return mapping;
}

function transformValue(
  value: string,
  field: string,
  dataType: DataType
): any {
  if (!value || value === '') return '';

  if (['RequestedTaskIDs', 'Skills', 'RequiredSkills'].includes(field)) {
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(v => v.trim());
      }
    }
    return value.split(',').map(v => v.trim());
  }

  if (['AvailableSlots', 'PreferredPhases'].includes(field)) {
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value
          .replace(/[\[\]]/g, '')
          .split(',')
          .map(v => parseInt(v.trim()))
          .filter(n => !isNaN(n));
      }
    }
    if (value.includes('-')) {
      const [start, end] = value
        .split('-')
        .map(v => parseInt(v.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        return Array.from(
          { length: end - start + 1 },
          (_, i) => start + i
        );
      }
    }
    return value
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(n => !isNaN(n));
  }

  if (
    [
      'PriorityLevel',
      'Duration',
      'MaxConcurrent',
      'MaxLoadPerPhase',
      'QualificationLevel',
    ].includes(field)
  ) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
  }

  if (field === 'AttributesJSON') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  return value;
}

function parseBasic(
  fileContent: string,
  dataType: DataType
): AIParseResult {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/"/g, ''));
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v =>
      v.trim().replace(/"/g, '')
    );
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    if (Object.values(row).some(v => v !== '')) {
      data.push(row);
    }
  }

  return {
    mappedData: data,
    confidence: 0.5,
    suggestions: [
      'AI parsing unavailable - using basic parsing. Please check API key.',
    ],
  };
}

function calculateConfidence(
  mapping: Record<string, string>,
  originalHeaders: string[],
  dataType: DataType
): number {
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType]);
  const mappedFields = Object.values(mapping);
  const correctMappings = mappedFields.filter(field =>
    expectedFields.includes(field)
  ).length;
  return correctMappings / expectedFields.length;
}

function generateSuggestions(
  mapping: Record<string, string>,
  originalHeaders: string[],
  dataType: DataType
): string[] {
  const suggestions: string[] = [];
  const expectedFields = Object.keys(EXPECTED_SCHEMAS[dataType]);
  const mappedFields = Object.values(mapping);
  const missingFields = expectedFields.filter(
    field => !mappedFields.includes(field)
  );

  if (missingFields.length > 0) {
    suggestions.push(
      `Missing expected fields: ${missingFields.join(', ')}`
    );
  }

  const unmappedHeaders = originalHeaders.filter(
    header => !Object.values(mapping).includes(mapping[header])
  );
  if (unmappedHeaders.length > 0) {
    suggestions.push(
      `Unmapped headers: ${unmappedHeaders.join(', ')}`
    );
  }

  return suggestions;
}
