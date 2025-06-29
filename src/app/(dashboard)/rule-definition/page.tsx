  'use client';

  import { useEffect, useState } from 'react';
  import RuleBuilder from './components/RuleBuilder';
  import RuleList from './components/RuleList';
  import NaturalLanguageRuleInput from './components/NaturalLanguageRuleInput';
  import PrioritizationPanel from './components/PrioritizationPanel';
  import { RuleEngine } from '@/lib/rules/ruleEngine';
  import { AllocationWeight, Rule, AiRule } from '@/types/rule';
  import { Client, Worker, Task } from '@/types';
  import { saveAs } from 'file-saver';

  const ruleEngine = new RuleEngine();

  export default function Milestone2Page() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [aiRules, setAiRules] = useState<AiRule[]>([]);
    const [weights, setWeights] = useState<AllocationWeight>({
      priorityLevel: 5,
      fulfillment: 5,
      fairness: 5,
      cost: 5,
      efficiency: 5
    });
    const [isLoading, setIsLoading] = useState(false);

    const [clients, setClients] = useState<Client[] | null>(null);
    const [workers, setWorkers] = useState<Worker[] | null>(null);
    const [tasks, setTasks] = useState<Task[] | null>(null);

    useEffect(() => {
      const loadData = () => {
        try {
          setClients(JSON.parse(localStorage.getItem('clients') || '[]'));
          setWorkers(JSON.parse(localStorage.getItem('workers') || '[]'));
          setTasks(JSON.parse(localStorage.getItem('tasks') || '[]'));
        } catch (err) {
          console.error('Failed to load local data', err);
        }
      };
      loadData();
    }, []);

    const handleAddRule = (rule: Rule) => {
      ruleEngine.addRule(rule);
      setRules([...ruleEngine.getAllRules()]);
    };

    const handleRemoveRule = (id: string) => {
      ruleEngine.removeRule(id);
      setRules([...ruleEngine.getAllRules()]);
    };

    const handleReorder = (ids: string[]) => {
      ruleEngine.reorderRules(ids);
      setRules([...ruleEngine.getAllRules()]);
    };

    const handleAddAiRule = (rule: AiRule) => {
      setAiRules(prev => [...prev, rule]);
    };

    const handleExport = () => {
      const config = ruleEngine.generateRulesConfig(weights);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      saveAs(blob, 'rules.json');
    };

    const handleRecommendRules = async () => {
      setIsLoading(true);
      
      const prompt = `You are a rule engine expert. Recommend 3 optimized rules for task assignment considering priority, fairness, efficiency, and cost. 
      Return rules in JSON format: [{
        "name": "Rule name",
        "description": "Rule description",
        "condition": "condition expression",
        "action": "action expression"
      }]`;

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'YOUR_SITE_URL', // Optional but recommended
            'X-Title': 'Rule Alchemist'      // Optional but recommended
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free', // Free model that works
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';
        
        try {
          // Extract JSON from possible code block
          const jsonMatch = content.match(/```json([\s\S]*?)```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          
          // Parse JSON content
          const parsedContent = JSON.parse(jsonString);
          const recommendedRules = Array.isArray(parsedContent) 
            ? parsedContent 
            : parsedContent.rules || [];

          // Create valid AiRule objects
          const newAiRules: AiRule[] = recommendedRules.map((rule: any, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            name: rule.name || `AI Rule ${index + 1}`,
            description: rule.description || 'AI-generated rule',
            condition: rule.condition || 'true',
            action: rule.action || 'assignTask()',
            priority: 1
          }));

          setAiRules(prev => [...prev, ...newAiRules]);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback to single rule if parsing fails
          const newRule: AiRule = {
            id: `ai-${Date.now()}`,
            name: 'AI Recommended Rule',
            description: content,
            condition: 'true',
            action: 'assignTask()',
            priority: 1
          };
          setAiRules(prev => [...prev, newRule]);
        }
      } catch (error) {
        console.error('Failed to fetch rule recommendation:', error);
        // alert(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative text-gray-800">
        {/* background gradient blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse delay-2000"></div>
        </div>

        {/* content */}
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          {/* header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                🧪
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Rule Alchemist
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full animate-ping bg-indigo-500"></div>
                  <span className="text-gray-600 font-medium">Milestone 2: Rule Definition</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rule Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Add Custom Rule</h2>
              <RuleBuilder onAddRule={handleAddRule} />
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Natural Language Rule Input</h2>
              <NaturalLanguageRuleInput
                onAddRule={handleAddAiRule}
                clients={clients}
                workers={workers}
                tasks={tasks}
              />
            </div>
          </div>

          {/* AI Rules Display */}
          {aiRules.length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-10 border-l-4 border-green-500">
              <h2 className="text-xl font-bold mb-4 text-green-600">AI Generated Rules</h2>
              <div className="space-y-4">
                {aiRules.map(rule => (
                  <div key={rule.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-lg">{rule.name}</h3>
                    <p className="text-gray-700 mb-2">{rule.description}</p>
                    <div className="flex gap-4 text-sm">
                      <div><span className="font-semibold">Condition:</span> {rule.condition}</div>
                      <div><span className="font-semibold">Action:</span> {rule.action}</div>
                    </div>
                    {/* <button 
    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
    onClick={() => handleAddRule({
      id: rule.id.replace('ai-', 'custom-'),
      type: 'patternMatch',
      description: rule.description,
      regex: '.*', // Placeholder — you can parse regex from rule.condition if structured
      ruleTemplate: rule.condition,
      parameters: {
        action: rule.action,
        source: 'AI',
        priority: rule.priority
      }
    })}
  >
    Add to Rules
  </button> */}

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rule List + Prioritization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Current Rules</h2>
              <RuleList rules={rules} onRemoveRule={handleRemoveRule} onReorder={handleReorder} />
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Prioritization Weights</h2>
              <PrioritizationPanel weights={weights} onWeightsChange={setWeights} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mb-16">
            <button
              onClick={handleRecommendRules}
              disabled={isLoading}
              className={`px-6 py-3 text-white rounded-xl shadow-md font-medium transition-all flex items-center gap-2 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M5 5h9" />
                  </svg>
                  Recommend Rules
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-md font-medium hover:opacity-90 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Rule Config
            </button>
          </div>
        </div>
      </div>
    );
  }