'use client';

import { useState } from 'react';
import { convertNLToRule } from '@/lib/ai/nlRuleConverter';
import { Client, Worker, Task } from '@/types';
import { AiRule } from "@/types/rule";

interface NaturalLanguageRuleInputProps {
  onAddRule: (rule: AiRule) => void;
  clients: Client[] | null;
  workers: Worker[] | null;
  tasks: Task[] | null;
}

export default function NaturalLanguageRuleInput({ 
  onAddRule,
  clients,
  workers,
  tasks
}: NaturalLanguageRuleInputProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const { rule, error } = await convertNLToRule(
        input,
        clients,
        workers,
        tasks
      );
      
      if (error || !rule) {
        setError(error || "Failed to generate rule. Please try again.");
        return;
      }
      
      onAddRule(rule);
      setSuccess(true);
      setInput('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="nl-rule" className="font-medium text-gray-800">
          Describe your business rule in plain English
        </label>
        <textarea
          id="nl-rule"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., 'Prioritize high-priority clients for skilled workers'"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px]"
          disabled={isProcessing}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !input.trim()}
          className={`px-5 py-3 rounded-xl flex items-center justify-center gap-2 ${
            isProcessing || !input.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90'
          }`}
        >
          {isProcessing ? (
            <>
              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Converting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Convert to Rule
            </>
          )}
        </button>
        
        <button
          onClick={() => {
            setInput('');
            setError(null);
          }}
          className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
        >
          Clear
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">Rule Conversion Failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Rule Created Successfully</p>
              <p className="mt-1">Your rule has been added to the system</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <h3 className="font-medium text-indigo-800 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Examples of effective rule descriptions:
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-indigo-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>"Assign tasks with 'Urgent' category to workers with 'Critical' skill level"</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>"Prioritize clients with PriorityLevel 5 during business hours"</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>"Match workers and clients with the same GroupTag"</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>"Avoid assigning more than 3 critical tasks to a single worker"</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
