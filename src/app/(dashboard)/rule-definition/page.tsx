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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative text-gray-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Add Custom Rule
              </h2>
            </div>
            <RuleBuilder onAddRule={handleAddRule} />
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Natural Language Rule Input
              </h2>
            </div>
            <NaturalLanguageRuleInput
              onAddRule={handleAddAiRule}
              clients={clients}
              workers={workers}
              tasks={tasks}
            />
          </div>
        </div>

        {aiRules.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-10 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                AI Generated Rules
              </h2>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(aiRules, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Current Rules
              </h2>
            </div>
            <RuleList rules={rules} onRemoveRule={handleRemoveRule} onReorder={handleReorder} />
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                Prioritization Weights
              </h2>
            </div>
            <PrioritizationPanel weights={weights} onWeightsChange={setWeights} />
          </div>
        </div>

        <div className="flex justify-end mb-16">
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

        <div className="text-center mt-16 pb-8">
          <p className="text-gray-500 text-sm">Advanced rule management • AI-powered suggestions • Secure export</p>
          <div className="mt-3 flex justify-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Rule Validation
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Natural Language
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Prioritization
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}