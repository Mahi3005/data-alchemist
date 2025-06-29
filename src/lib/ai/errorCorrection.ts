import { ValidationError } from '@/lib/validators/core';

export class ErrorCorrection {
  static applyFix(row: any, error: ValidationError): any {
    const newRow = { ...row };
    
    switch (error.type) {
      case 'invalid-json-string':
        if (error.field === 'AttributesJSON') {
          try {
            JSON.parse(newRow.AttributesJSON);
          } catch {
            if (typeof newRow.AttributesJSON === 'string') {
              newRow.AttributesJSON = JSON.stringify({ 
                value: newRow.AttributesJSON 
              });
            }
          }
        }
        break;
      
      case 'out-of-range':
        if (error.field === 'PriorityLevel') {
          const numValue = Number(newRow.PriorityLevel);
          if (!isNaN(numValue)) {
            newRow.PriorityLevel = Math.min(Math.max(1, numValue), 5);
          }
        } 
        else if (error.field === 'QualificationLevel') {
          const numValue = Number(newRow.QualificationLevel);
          if (!isNaN(numValue)) {
            newRow.QualificationLevel = Math.min(Math.max(1, numValue), 3);
          }
        }
        break;
      
      case 'malformed-list':
        if (error.field === 'AvailableSlots') {
          const currentValue = newRow.AvailableSlots;
          if (typeof currentValue === 'string') {
            // Parse comma-separated numbers
            if (currentValue.includes(',')) {
              newRow.AvailableSlots = currentValue.split(',')
                .map((s: string) => parseInt(s.trim()))
                .filter((n: number) => !isNaN(n));
            } 
            // Parse range syntax (e.g., "1-3")
            else if (currentValue.includes('-')) {
              const [start, end] = currentValue.split('-').map(s => parseInt(s.trim()));
              if (!isNaN(start) && !isNaN(end) && start < end) {
                const slots = [];
                for (let i = start; i <= end; i++) slots.push(i);
                newRow.AvailableSlots = slots;
              }
            }
          }
        }
        break;
        
      default:
        break;
    }
    
    return newRow;
  }
}