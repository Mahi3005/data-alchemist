'use client';

import { Rule } from '@/types/rule';

export default function RuleList({ 
  rules, 
  onRemoveRule,
  onReorder
}: {
  rules: Rule[];
  onRemoveRule: (id: string) => void;
  onReorder: (ruleIds: string[]) => void;
}) {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('index', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('index'));
    if (sourceIndex === targetIndex) return;

    const newRules = [...rules];
    const [movedRule] = newRules.splice(sourceIndex, 1);
    newRules.splice(targetIndex, 0, movedRule);
    
    onReorder(newRules.map(r => r.id));
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Defined Rules</h3>
        <span className="bg-gray-200 px-2 py-1 rounded text-sm">
          {rules.length} rules
        </span>
      </div>
      
      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2">No rules defined yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule, index) => (
            <li 
              key={rule.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <div className="mt-1">
                    <div className={`w-3 h-3 rounded-full ${
                      rule.type === 'coRun' ? 'bg-blue-500' :
                      rule.type === 'slotRestriction' ? 'bg-purple-500' :
                      rule.type === 'loadLimit' ? 'bg-green-500' :
                      rule.type === 'phaseWindow' ? 'bg-orange-500' :
                      rule.type === 'patternMatch' ? 'bg-pink-500' : 'bg-indigo-500'
                    }`}></div>
                  </div>
                  <div>
                    <div className="font-medium capitalize">{rule.type.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-sm text-gray-600 mt-1">{rule.description}</div>
                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-1">
                      {Object.entries(rule).filter(([key]) => 
                        !['id', 'type', 'description'].includes(key)
                      ).map(([key, value]) => (
                        <span key={key} className="bg-white border px-2 py-1 rounded">
                          {key}: {Array.isArray(value) ? value.join(', ') : value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveRule(rule.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Remove rule"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}