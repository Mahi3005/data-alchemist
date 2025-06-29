// src/app/api/nl-search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DataType } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

export async function POST(request: NextRequest) {
  try {
    const { query, data, dataType } = await request.json();

    if (!query || !data || !Array.isArray(data) || !dataType) {
      return NextResponse.json(
        { error: 'Invalid input: query, data array, and dataType are required' },
        { status: 400 }
      );
    }

    try {
      const sampleData = data.slice(0, 3);

      const prompt = `
You are a data filtering expert. Given a natural language query, filter the provided data and return matching results.

Data Type: ${dataType}
Sample Data Structure:
${JSON.stringify(sampleData, null, 2)}

Query: "${query}"

Available Fields:
${getFieldDescriptions(dataType)}

Instructions:
1. Analyze the query and identify filtering criteria
2. Apply filters to find matching records
3. Return results as JSON array
4. Provide explanation of what was filtered

Return format:
{
  "filteredData": [...],
  "explanation": "Found X records where...",
  "confidence": 0.95
}

Full Data to Filter:
${JSON.stringify(data, null, 2)}
`;

      const response = await openai.chat.completions.create({
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const result = response.choices[0]?.message?.content;

      if (!result) throw new Error('No response from AI');

      try {
        const parsed = JSON.parse(result);
        return NextResponse.json({
          filteredData: parsed.filteredData || [],
          explanation: parsed.explanation || 'Results filtered by AI',
          confidence: parsed.confidence || 0.8,
          aiUsed: true,
        });
      } catch (parseError) {
        const fallbackResult = fallbackSearch(query, data, dataType);
        return NextResponse.json({
          ...fallbackResult,
          aiUsed: false,
          explanation: fallbackResult.explanation + ' (AI parsing failed, used fallback)',
        });
      }
    } catch (aiError) {
      console.warn('AI search failed, falling back to basic search:', aiError);
      const fallbackResult = fallbackSearch(query, data, dataType);
      return NextResponse.json({
        ...fallbackResult,
        aiUsed: false,
        explanation: fallbackResult.explanation + ' (AI unavailable, used fallback)',
      });
    }
  } catch (error) {
    console.error('NL Search API error:', error);
    return NextResponse.json({ error: 'Failed to process search request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { query, data, dataType } = await request.json();

    if (!query || !data || !Array.isArray(data) || !dataType) {
      return NextResponse.json(
        { error: 'Invalid input: query, data array, and dataType are required' },
        { status: 400 }
      );
    }

    const patterns = [
      {
        pattern: /duration\s*(>|>=|<|<=)\s*(\d+)/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          const operator = match[1];
          const value = parseInt(match[2]);
          return data.filter(item => {
            const duration = parseInt(item.Duration);
            switch (operator) {
              case '>': return duration > value;
              case '>=': return duration >= value;
              case '<': return duration < value;
              case '<=': return duration <= value;
              default: return false;
            }
          });
        },
      },
      {
        pattern: /priority\s*(>|>=|<|<=)\s*(\d+)/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          const operator = match[1];
          const value = parseInt(match[2]);
          return data.filter(item => {
            const priority = parseInt(item.PriorityLevel);
            switch (operator) {
              case '>': return priority > value;
              case '>=': return priority >= value;
              case '<': return priority < value;
              case '<=': return priority <= value;
              default: return false;
            }
          });
        },
      },
      {
        pattern: /skill[s]?\s+(?:include[s]?|contain[s]?|ha[s|ve])\s+['"]?([^'"]+)['"]?/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          const skillName = match[1].trim();
          return data.filter(item => {
            if (item.Skills && Array.isArray(item.Skills)) {
              return item.Skills.some((skill: string) => skill.toLowerCase().includes(skillName.toLowerCase()));
            }
            if (item.RequiredSkills && Array.isArray(item.RequiredSkills)) {
              return item.RequiredSkills.some((skill: string) => skill.toLowerCase().includes(skillName.toLowerCase()));
            }
            return false;
          });
        },
      },
      {
        pattern: /phase[s]?\s+(?:include[s]?|contain[s]?)\s+(\d+)/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          const phaseNumber = parseInt(match[1]);
          return data.filter(item => {
            if (item.PreferredPhases && Array.isArray(item.PreferredPhases)) {
              return item.PreferredPhases.includes(phaseNumber);
            }
            if (item.AvailableSlots && Array.isArray(item.AvailableSlots)) {
              return item.AvailableSlots.includes(phaseNumber);
            }
            return false;
          });
        },
      },
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern.pattern);
      if (match) {
        const filteredData = pattern.handler(match, data);
        return NextResponse.json({
          filteredData,
          explanation: `Found ${filteredData.length} records matching pattern: ${query}`,
          confidence: 0.9,
          patternUsed: true,
        });
      }
    }

    const aiResponse = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, data, dataType }),
    });

    return aiResponse;
  } catch (error) {
    console.error('Pattern search error:', error);
    return NextResponse.json(
      { error: 'Failed to process pattern search' },
      { status: 500 }
    );
  }
}

function fallbackSearch(query: string, data: any[], dataType: DataType) {
  const searchTerms = query.toLowerCase().split(' ');
  const filteredData = data.filter(item => {
    const itemString = JSON.stringify(item).toLowerCase();
    return searchTerms.some(term => itemString.includes(term));
  });

  return {
    filteredData,
    explanation: `Found ${filteredData.length} records matching search terms (basic search)`,
    confidence: 0.6,
  };
}

function getFieldDescriptions(dataType: DataType): string {
  const descriptions = {
    clients: `
- ClientID: Unique client identifier
- ClientName: Name of the client
- PriorityLevel: Priority from 1-5 (higher = more important)
- RequestedTaskIDs: Array of task IDs requested by client
- GroupTag: Client group classification
- AttributesJSON: Additional client attributes
    `,
    workers: `
- WorkerID: Unique worker identifier
- WorkerName: Name of the worker
- Skills: Array of worker skills
- AvailableSlots: Array of phase numbers when worker is available
- MaxLoadPerPhase: Maximum tasks per phase
- WorkerGroup: Worker group classification
- QualificationLevel: Worker qualification level
    `,
    tasks: `
- TaskID: Unique task identifier
- TaskName: Name of the task
- Category: Task category
- Duration: Duration in phases
- RequiredSkills: Array of skills required for task
- PreferredPhases: Array of preferred phase numbers
- MaxConcurrent: Maximum concurrent assignments
    `,
  };

  return descriptions[dataType] || '';
}
