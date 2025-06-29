// src/lib/ai/nlSearch.ts

import { Client, Worker, Task, DataType } from '@/types';

export interface NLSearchResult {
  filteredData: any[];
  explanation: string;
  confidence: number;
  aiUsed?: boolean;
  patternUsed?: boolean;
}

export class NaturalLanguageSearch {
  
  static async search(
    query: string,
    data: any[],
    dataType: DataType
  ): Promise<NLSearchResult> {
    try {
      // Call the API route for AI-powered search
      const response = await fetch('/api/nl-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          data,
          dataType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const result = await response.json();
      return {
        filteredData: result.filteredData || [],
        explanation: result.explanation || 'Search completed',
        confidence: result.confidence || 0.6,
        aiUsed: result.aiUsed
      };

    } catch (error) {
      console.error('NL Search error:', error);
      // Fallback to local basic search
      return this.fallbackSearch(query, data, dataType);
    }
  }

  // Advanced search with specific patterns
  static async searchWithPatterns(
    query: string,
    data: any[],
    dataType: DataType
  ): Promise<NLSearchResult> {
    try {
      // Call the API route for pattern-based search
      const response = await fetch('/api/nl-search', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          data,
          dataType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Pattern search failed');
      }

      const result = await response.json();
      return {
        filteredData: result.filteredData || [],
        explanation: result.explanation || 'Pattern search completed',
        confidence: result.confidence || 0.6,
        aiUsed: result.aiUsed,
        patternUsed: result.patternUsed
      };

    } catch (error) {
      console.error('Pattern search error:', error);
      // Try local pattern matching as fallback
      const localResult = this.localPatternSearch(query, data, dataType);
      if (localResult.filteredData.length > 0) {
        return localResult;
      }
      // Final fallback to basic search
      return this.fallbackSearch(query, data, dataType);
    }
  }

  // Local pattern matching (client-side fallback)
  private static localPatternSearch(query: string, data: any[], dataType: DataType): NLSearchResult {
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
        }
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
        }
      },
      {
        pattern: /skill[s]?\s+(?:includes?|contains?|has?|have)\s+['"]?([^'"]+)['"]?/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          const skillName = match[1].trim();
          return data.filter(item => {
            if (item.Skills && Array.isArray(item.Skills)) {
              return item.Skills.some((skill: string) => 
                skill.toLowerCase().includes(skillName.toLowerCase())
              );
            }
            if (item.RequiredSkills && Array.isArray(item.RequiredSkills)) {
              return item.RequiredSkills.some((skill: string) => 
                skill.toLowerCase().includes(skillName.toLowerCase())
              );
            }
            return false;
          });
        }
      },
      {
        pattern: /phases?\s+(?:includes?|contains?)\s+(\d+)/i,
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
        }
      },
      {
        pattern: /high\s+priority/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          return data.filter(item => {
            const priority = parseInt(item.PriorityLevel);
            return priority >= 4;
          });
        }
      },
      {
        pattern: /low\s+priority/i,
        handler: (match: RegExpMatchArray, data: any[]) => {
          return data.filter(item => {
            const priority = parseInt(item.PriorityLevel);
            return priority <= 2;
          });
        }
      }
    ];

    // Try pattern matching
    for (const pattern of patterns) {
      const match = query.match(pattern.pattern);
      if (match) {
        const filteredData = pattern.handler(match, data);
        return {
          filteredData,
          explanation: `Found ${filteredData.length} records matching pattern: ${query} (local pattern matching)`,
          confidence: 0.85,
          patternUsed: true
        };
      }
    }

    return {
      filteredData: [],
      explanation: 'No patterns matched',
      confidence: 0
    };
  }

  private static fallbackSearch(query: string, data: any[], dataType: DataType): NLSearchResult {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const filteredData = data.filter(item => {
      const itemString = JSON.stringify(item).toLowerCase();
      return searchTerms.some(term => itemString.includes(term));
    });

    return {
      filteredData,
      explanation: `Found ${filteredData.length} records matching search terms (basic fallback search)`,
      confidence: 0.6,
      aiUsed: false
    };
  }

  // Search suggestions based on data
  static generateSearchSuggestions(data: any[], dataType: DataType): string[] {
    const suggestions: string[] = [];

    if (dataType === 'tasks') {
      suggestions.push(
        'Tasks with duration > 2',
        'Tasks requiring JavaScript',
        'Tasks with phase 2',
        'High priority tasks',
        'Tasks with duration >= 3'
      );
    } else if (dataType === 'workers') {
      suggestions.push(
        'Workers available in phase 1',
        'Workers with Python skills',
        'Workers with qualification > 3',
        'Workers in development group',
        'Workers with load < 5'
      );
    } else if (dataType === 'clients') {
      suggestions.push(
        'High priority clients',
        'Clients with priority > 3',
        'Clients in premium group',
        'Clients with priority = 5'
      );
    }

    return suggestions;
  }

  // Quick search without AI (for instant results)
  static quickSearch(query: string, data: any[], dataType: DataType): NLSearchResult {
    // First try local patterns
    const patternResult = this.localPatternSearch(query, data, dataType);
    if (patternResult.filteredData.length > 0) {
      return patternResult;
    }

    // Fall back to basic search
    return this.fallbackSearch(query, data, dataType);
  }

  // Get field descriptions for help text
  static getFieldDescriptions(dataType: DataType): string {
    const descriptions = {
      clients: `Available fields: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON`,
      workers: `Available fields: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel`,
      tasks: `Available fields: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent`
    };

    return descriptions[dataType] || '';
  }

  // Get example queries
  static getExampleQueries(dataType: DataType): string[] {
    const examples = {
      clients: [
        'High priority clients',
        'Clients with priority > 3',
        'Premium group clients'
      ],
      workers: [
        'Workers with JavaScript skills',
        'Workers available in phase 1',
        'Workers with qualification > 3'
      ],
      tasks: [
        'Tasks with duration > 2',
        'High priority tasks',
        'Tasks requiring Python'
      ]
    };

    return examples[dataType] || [];
  }
}