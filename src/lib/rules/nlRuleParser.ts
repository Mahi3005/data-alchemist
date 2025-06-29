import { Rule } from "@/types/rule";

export class NaturalLanguageRuleParser {
  static parse(nlText: string): Rule | null {
    const lowerText = nlText.toLowerCase();
    
    // Co-run rule detection
    if (lowerText.includes("run together") || 
        lowerText.includes("co-run") || 
        lowerText.includes("same time")) {
      const taskIds = this.extractTaskIds(nlText);
      if (taskIds.length > 0) {
        return {
          id: `cr-${Date.now()}`,
          type: 'coRun',
          description: nlText,
          taskIds
        };
      }
    }
    
    // Slot restriction detection
    if (lowerText.includes("slot restriction") || 
        lowerText.includes("common slots") || 
        lowerText.includes("minimum slots")) {
      const group = this.extractGroup(nlText);
      const minSlots = this.extractNumber(nlText);
      
      if (group && minSlots) {
        return {
          id: `sr-${Date.now()}`,
          type: 'slotRestriction',
          description: nlText,
          group,
          minCommonSlots: minSlots
        };
      }
    }
    
    // Load limit detection
    if (lowerText.includes("load limit") || 
        lowerText.includes("max slots") || 
        lowerText.includes("maximum slots")) {
      const workerGroup = this.extractGroup(nlText);
      const maxSlots = this.extractNumber(nlText);
      
      if (workerGroup && maxSlots) {
        return {
          id: `ll-${Date.now()}`,
          type: 'loadLimit',
          description: nlText,
          workerGroup,
          maxSlotsPerPhase: maxSlots
        };
      }
    }
    
    // Phase window detection
    if (lowerText.includes("phase window") || 
        lowerText.includes("allowed phases") || 
        lowerText.includes("only in phase")) {
      const taskId = this.extractTaskId(nlText);
      const phases = this.extractPhases(nlText);
      
      if (taskId && phases.length > 0) {
        return {
          id: `pw-${Date.now()}`,
          type: 'phaseWindow',
          description: nlText,
          taskId,
          allowedPhases: phases
        };
      }
    }
    
    return null;
  }

  private static extractTaskIds(text: string): string[] {
    const taskIdRegex = /T\d+/g;
    return text.match(taskIdRegex) || [];
  }

  private static extractTaskId(text: string): string | null {
    const taskIdRegex = /T\d+/;
    const match = text.match(taskIdRegex);
    return match ? match[0] : null;
  }

  private static extractGroup(text: string): string | null {
    const groupRegex = /(group|team|department)\s+(\w+)/i;
    const match = text.match(groupRegex);
    return match ? match[2] : null;
  }

  private static extractNumber(text: string): number | null {
    const numberRegex = /\d+/;
    const match = text.match(numberRegex);
    return match ? parseInt(match[0]) : null;
  }

  private static extractPhases(text: string): number[] {
    const phaseRegex = /phase\s+(\d+)/gi;
    const matches = [...text.matchAll(phaseRegex)];
    return matches.map(m => parseInt(m[1]));
  }
}