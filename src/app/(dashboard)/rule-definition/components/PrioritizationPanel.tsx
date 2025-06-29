'use client';

import { AllocationWeight } from '@/types/rule';

export default function PrioritizationPanel({ 
  weights, 
  onWeightsChange 
}: {
  weights: AllocationWeight;
  onWeightsChange: (newWeights: AllocationWeight) => void;
}) {
  const handleWeightChange = (key: keyof AllocationWeight, value: number) => {
    onWeightsChange({
      ...weights,
      [key]: value
    });
  };

  const getWeightColor = (value: number) => {
    if (value >= 8) return 'from-red-500 to-orange-500';
    if (value >= 6) return 'from-orange-500 to-yellow-500';
    if (value >= 4) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-teal-500';
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Allocation Weights</h3>
      
      <div className="space-y-5">
        {Object.entries(weights).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <span className="text-sm font-medium">{value}/10</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                value={value}
                onChange={(e) => handleWeightChange(key as keyof AllocationWeight, parseInt(e.target.value))}
                className="flex-1"
              />
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getWeightColor(value)}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}