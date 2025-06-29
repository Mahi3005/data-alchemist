export type RuleType = 
  | 'coRun' 
  | 'slotRestriction' 
  | 'loadLimit' 
  | 'phaseWindow' 
  | 'patternMatch' 
  | 'precedenceOverride';

export type AllocationWeight = {
  priorityLevel: number;
  fulfillment: number;
  fairness: number;
  cost: number;
  efficiency: number;
};

export interface AiRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  
}


export interface BaseRule {
  id: string;
  type: RuleType;
  description: string;
}

export interface CoRunRule extends BaseRule {
  type: 'coRun';
  taskIds: string[];
}

export interface SlotRestrictionRule extends BaseRule {
  type: 'slotRestriction';
  group: string;
  minCommonSlots: number;
}

export interface LoadLimitRule extends BaseRule {
  type: 'loadLimit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BaseRule {
  type: 'phaseWindow';
  taskId: string;
  allowedPhases: number[];
}

export interface PatternMatchRule extends BaseRule {
  type: 'patternMatch';
  regex: string;
  ruleTemplate: string;
  parameters: Record<string, any>;
}

export interface PrecedenceOverrideRule extends BaseRule {
  type: 'precedenceOverride';
  ruleIds: string[];
  priority: number;
}

export type Rule = 
  | CoRunRule 
  | SlotRestrictionRule 
  | LoadLimitRule 
  | PhaseWindowRule 
  | PatternMatchRule 
  | PrecedenceOverrideRule;
  