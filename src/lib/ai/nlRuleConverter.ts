import OpenAI from "openai";
import { Client, Worker, Task } from "@/types";
import { Rule } from "@/types/rule";
import { AiRule } from "@/types/rule";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,  // Added to resolve browser environment error
});

function summarizeData(
  clients: Client[] | null,
  workers: Worker[] | null,
  tasks: Task[] | null
): string {
  const clientSummary = clients && clients.length > 0
    ? `Clients: ${clients.length} records with fields: ${Object.keys(clients[0]).join(", ")}`
    : "No client data";

  const workerSummary = workers && workers.length > 0
    ? `Workers: ${workers.length} records with fields: ${Object.keys(workers[0]).join(", ")}`
    : "No worker data";

  const taskSummary = tasks && tasks.length > 0
    ? `Tasks: ${tasks.length} records with fields: ${Object.keys(tasks[0]).join(", ")}`
    : "No task data";

  return `${clientSummary}\n${workerSummary}\n${taskSummary}`;
}

export async function convertNLToRule(
  naturalLanguageInput: string,
  clients: Client[] | null,
  workers: Worker[] | null,
  tasks: Task[] | null
): Promise<{ rule:  AiRule | null; error: string | null }> {
  try {
    const dataSummary = summarizeData(clients, workers, tasks);

    const prompt = `
You are an expert rule conversion system that translates natural language business rules into structured JSON rules. 
Use the following data context to understand available fields and relationships:

${dataSummary}

Rule Structure:
{
  "name": "Descriptive name",
  "description": "Natural language description",
  "condition": "JavaScript condition function",
  "action": "JavaScript action function",
  "priority": 1-10
}

Instructions:
1. Understand the natural language rule request
2. Identify relevant entities (clients, workers, tasks)
3. Create a JavaScript condition function that returns boolean
4. Create a JavaScript action function that modifies allocation
5. Set appropriate priority (1-10, 10=highest)
6. Validate the rule can be applied to current data
7. Return ONLY valid JSON

Example Input: "Prioritize high-priority clients for skilled workers"
Example Output:
{
  "name": "Priority Client Allocation",
  "description": "Allocate high-priority clients to skilled workers",
  "condition": "(client, worker) => client.PriorityLevel >= 4 && worker.Skills.includes('Advanced')",
  "action": "(allocation) => allocation.score += 20",
  "priority": 8
}

Current Request: "${naturalLanguageInput}"
`;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a business rule conversion expert. Return ONLY valid JSON without any additional text or explanations."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content || "";
    
    // Try to parse directly first
    let rawRule: any;
    try {
      rawRule = JSON.parse(content);
    } catch (parseError) {
      // Fallback extraction if not pure JSON
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      
      if (jsonStart === -1 || jsonEnd === -1) {
        return {
          rule: null,
          error: "No valid JSON found in AI response."
        };
      }
      
      const jsonString = content.slice(jsonStart, jsonEnd + 1);
      rawRule = JSON.parse(jsonString);
    }

    // Validate required fields
    const requiredFields = ["name", "condition", "action", "priority"];
    const missingFields = requiredFields.filter(field => !(field in rawRule));
    
    if (missingFields.length > 0) {
      return {
        rule: null,
        error: `AI response missing required fields: ${missingFields.join(", ")}`
      };
    }

    // Convert priority to number if needed
    let priorityValue = rawRule.priority;
    if (typeof priorityValue === "string") {
      priorityValue = Number(priorityValue);
    }

    // Validate priority
    if (typeof priorityValue !== "number" || isNaN(priorityValue)) {
      return {
        rule: null,
        error: `Priority must be a number. Received: ${rawRule.priority}`
      };
    }

    if (priorityValue < 1 || priorityValue > 10) {
      return {
        rule: null,
        error: `Invalid priority value: ${priorityValue}. Must be between 1-10.`
      };
    }

    // Create final rule object
    const rule: AiRule = {
      id: `rule_${Date.now()}`,
      name: rawRule.name,
      description: rawRule.description || "",
      condition: rawRule.condition,
      action: rawRule.action,
      priority: priorityValue
    };

    return { rule, error: null };
  } catch (error: any) {
    console.error("AI conversion error:", error);
    return {
      rule: null,
      error: error.message || "Failed to convert natural language to rule. Please try again with more specific wording."
    };
  }
}