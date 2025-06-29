import { Rule, AllocationWeight } from "@/types/rule";


export class RuleEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
  }

  removeRule(id: string) {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }

  updateRule(id: string, updatedRule: Rule) {
    this.rules = this.rules.map(rule => 
      rule.id === id ? updatedRule : rule
    );
  }

  reorderRules(ruleIds: string[]) {
    const orderedRules: Rule[] = [];
    ruleIds.forEach(id => {
      const rule = this.rules.find(r => r.id === id);
      if (rule) orderedRules.push(rule);
    });
    this.rules = orderedRules;
  }

  getAllRules() {
    return this.rules;
  }

  generateRulesConfig(weights: AllocationWeight) {
    return {
      rules: this.rules,
      allocationWeights: weights
    };
  }
}