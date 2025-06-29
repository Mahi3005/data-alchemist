import { Client, Worker, Task } from '@/types';

export interface ValidationError {
  id: string;
  type: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  rowIndex?: number;
  entityType?: string;
  suggestion?: string;
}

export class CoreValidators {
  private static normalizeJSONData(data: any[]): void {
  data.forEach(item => {
    if (item.AttributesJSON !== undefined && 
        item.AttributesJSON !== null && 
        item.AttributesJSON !== '') {
      
      if (typeof item.AttributesJSON === 'string') {
        const str = item.AttributesJSON.trim();
        
        // Convert plain strings to valid JSON objects
        if (!str.startsWith('{') && !str.startsWith('[') && 
            !str.startsWith('"') && !str.endsWith('"') &&
            !str.startsWith("'") && !str.endsWith("'")) {
          item.AttributesJSON = JSON.stringify({ value: str });
        }
      }
    }
  });
}
  
  // a. Missing required columns
  static validateRequiredColumns(data: any[], requiredColumns: string[], dataType: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (data.length === 0) {
      return [{
        id: `${dataType}-empty`,
        type: 'missing-data',
        message: `No ${dataType} data found`,
        severity: 'error',
        entityType: dataType
      }];
    }

    const availableColumns = Object.keys(data[0] || {});
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    missingColumns.forEach(column => {
      errors.push({
        id: `${dataType}-missing-${column}`,
        type: 'missing-column',
        message: `Required column '${column}' is missing in ${dataType}`,
        severity: 'error',
        field: column,
        entityType: dataType,
        suggestion: `Add column '${column}' to your ${dataType} data`
      });
    });

    return errors;
  }

  // b. Duplicate IDs
  static validateDuplicateIDs(data: any[], idField: string, dataType: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const idCounts = new Map<string, number[]>();
    
    data.forEach((item, index) => {
      const id = item[idField];
      if (id) {
        if (!idCounts.has(id)) {
          idCounts.set(id, []);
        }
        idCounts.get(id)!.push(index);
      }
    });

    idCounts.forEach((indices, id) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          errors.push({
            id: `${dataType}-duplicate-${id}-${index}`,
            type: 'duplicate-id',
            message: `Duplicate ${idField}: '${id}' found at row ${index + 1}`,
            severity: 'error',
            field: idField,
            rowIndex: index,
            entityType: dataType,
            suggestion: `Make ${idField} '${id}' unique`
          });
        });
      }
    });

    return errors;
  }

  // c. Malformed lists
  static validateMalformedLists(data: any[], listFields: string[], dataType: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    data.forEach((item, index) => {
      listFields.forEach(field => {
        if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
          // Check if AvailableSlots contains only numbers
          if (field === 'AvailableSlots' && Array.isArray(item[field])) {
            const hasNonNumeric = item[field].some((slot: any) => typeof slot !== 'number' || isNaN(slot));
            if (hasNonNumeric) {
              errors.push({
                id: `${dataType}-malformed-${field}-${index}`,
                type: 'malformed-list',
                message: `${field} at row ${index + 1} contains non-numeric values`,
                severity: 'error',
                field: field,
                rowIndex: index,
                entityType: dataType,
                suggestion: `Ensure ${field} contains only numeric phase numbers`
              });
            }
          }
          
          // Validate PreferredPhases
          if (field === 'PreferredPhases' && Array.isArray(item[field])) {
            const hasInvalidPhases = item[field].some((phase: any) => typeof phase !== 'number' || isNaN(phase) || phase < 1);
            if (hasInvalidPhases) {
              errors.push({
                id: `${dataType}-malformed-${field}-${index}`,
                type: 'malformed-list',
                message: `${field} at row ${index + 1} contains invalid phase numbers`,
                severity: 'error',
                field: field,
                rowIndex: index,
                entityType: dataType,
                suggestion: `Ensure ${field} contains only positive integers`
              });
            }
          }

          // Validate RequestedTaskIDs
          if (field === 'RequestedTaskIDs' && Array.isArray(item[field])) {
            const hasInvalidTaskIDs = item[field].some((taskId: any) => typeof taskId !== 'string' && typeof taskId !== 'number');
            if (hasInvalidTaskIDs) {
              errors.push({
                id: `${dataType}-malformed-${field}-${index}`,
                type: 'malformed-list',
                message: `${field} at row ${index + 1} contains invalid task IDs`,
                severity: 'error',
                field: field,
                rowIndex: index,
                entityType: dataType,
                suggestion: `Ensure ${field} contains only valid task ID strings or numbers`
              });
            }
          }
        }
      });
    });

    return errors;
  }

  // d. Out-of-range values
  static validateOutOfRange(data: any[], dataType: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    data.forEach((item, index) => {
      // PriorityLevel should be 1-5
      if (item.PriorityLevel !== undefined) {
        const priority = Number(item.PriorityLevel);
        if (isNaN(priority) || priority < 1 || priority > 5) {
          errors.push({
            id: `${dataType}-range-priority-${index}`,
            type: 'out-of-range',
            message: `PriorityLevel '${item.PriorityLevel}' at row ${index + 1} must be between 1-5`,
            severity: 'error',
            field: 'PriorityLevel',
            rowIndex: index,
            entityType: dataType,
            suggestion: `Set PriorityLevel to a value between 1 and 5`
          });
        }
      }

      // Duration should be >= 1
      if (item.Duration !== undefined) {
        const duration = Number(item.Duration);
        if (isNaN(duration) || duration < 1) {
          errors.push({
            id: `${dataType}-range-duration-${index}`,
            type: 'out-of-range',
            message: `Duration '${item.Duration}' at row ${index + 1} must be >= 1`,
            severity: 'error',
            field: 'Duration',
            rowIndex: index,
            entityType: dataType,
            suggestion: `Set Duration to a positive number >= 1`
          });
        }
      }

      // MaxConcurrent should be >= 1
      if (item.MaxConcurrent !== undefined) {
        const maxConcurrent = Number(item.MaxConcurrent);
        if (isNaN(maxConcurrent) || maxConcurrent < 1) {
          errors.push({
            id: `${dataType}-range-maxconcurrent-${index}`,
            type: 'out-of-range',
            message: `MaxConcurrent '${item.MaxConcurrent}' at row ${index + 1} must be >= 1`,
            severity: 'error',
            field: 'MaxConcurrent',
            rowIndex: index,
            entityType: dataType,
            suggestion: `Set MaxConcurrent to a positive number >= 1`
          });
        }
      }

      // MaxLoadPerPhase should be >= 1
      if (item.MaxLoadPerPhase !== undefined) {
        const maxLoad = Number(item.MaxLoadPerPhase);
        if (isNaN(maxLoad) || maxLoad < 1) {
          errors.push({
            id: `${dataType}-range-maxload-${index}`,
            type: 'out-of-range',
            message: `MaxLoadPerPhase '${item.MaxLoadPerPhase}' at row ${index + 1} must be >= 1`,
            severity: 'error',
            field: 'MaxLoadPerPhase',
            rowIndex: index,
            entityType: dataType,
            suggestion: `Set MaxLoadPerPhase to a positive number >= 1`
          });
        }
      }

      // QualificationLevel should be 1-3
      if (item.QualificationLevel !== undefined) {
        const qualLevel = Number(item.QualificationLevel);
        if (isNaN(qualLevel) || qualLevel < 1 || qualLevel > 3) {
          errors.push({
            id: `${dataType}-range-quallevel-${index}`,
            type: 'out-of-range',
            message: `QualificationLevel '${item.QualificationLevel}' at row ${index + 1} must be between 1-3`,
            severity: 'error',
            field: 'QualificationLevel',
            rowIndex: index,
            entityType: dataType,
            suggestion: `Set QualificationLevel to a value between 1 and 3`
          });
        }
      }
    });

    return errors;
  }

  // e. Enhanced JSON validation with plain string handling
  static validateBrokenJSON(data: any[], dataType: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    data.forEach((item, index) => {
      if (item.AttributesJSON !== undefined && 
          item.AttributesJSON !== null && 
          item.AttributesJSON !== '') {
        
        // If it's already an object, it's valid
        if (typeof item.AttributesJSON === 'object') {
          return;
        }
        
        // Handle plain strings like "T33"
        if (typeof item.AttributesJSON === 'string') {
          const str = item.AttributesJSON.trim();
          
          // Check if it's a plain string without JSON structure
          if (!str.startsWith('{') && !str.startsWith('[') && 
              !str.startsWith('"') && !str.endsWith('"') &&
              !str.startsWith("'") && !str.endsWith("'")) {
            errors.push({
              id: `${dataType}-json-plain-string-${index}`,
              type: 'invalid-json-string',
              message: `AttributesJSON at row ${index + 1} is a plain string ("${str}") but should be valid JSON`,
              severity: 'error',
              field: 'AttributesJSON',
              rowIndex: index,
              entityType: dataType,
              suggestion: `Convert to JSON format: ${JSON.stringify(str)} or use {"value":"${str}"}`
            });
            return;
          }
          
          // Now try to parse it
          try {
            // Attempt to parse as JSON
            JSON.parse(str);
          } catch (e) {
            let errorMsg = 'Invalid JSON syntax';
            let detailedSuggestion = 'Fix JSON syntax';
            
            if (e instanceof SyntaxError) {
              errorMsg = e.message;
              
              if (e.message.includes("Unexpected token")) {
                detailedSuggestion = "Check for missing commas or colons, or remove trailing commas";
              } else if (e.message.includes("Unterminated string")) {
                detailedSuggestion = "Check for missing quotes or improper escaping of quotes";
              } else if (e.message.includes("Unexpected end of JSON input")) {
                detailedSuggestion = "JSON is incomplete - check for missing closing braces or brackets";
              }
            }
            
            // Check for common formatting issues
            if (str.startsWith("{") && !str.endsWith("}")) {
              detailedSuggestion = "JSON object must end with a closing brace '}'";
            } else if (str.startsWith("[") && !str.endsWith("]")) {
              detailedSuggestion = "JSON array must end with a closing bracket ']'";
            } else if (str.includes("'")) {
              detailedSuggestion = "Use double quotes (\") instead of single quotes (') for JSON strings";
            } else if ((str.match(/{/g) || []).length !== (str.match(/}/g) || []).length) {
              detailedSuggestion = "Mismatched curly braces { } - check opening/closing pairs";
            } else if ((str.match(/\[/g) || []).length !== (str.match(/\]/g) || []).length) {
              detailedSuggestion = "Mismatched square brackets [ ] - check opening/closing pairs";
            }
            
            errors.push({
              id: `${dataType}-json-${index}`,
              type: 'broken-json',
              message: `Invalid JSON in AttributesJSON at row ${index + 1}: ${errorMsg}`,
              severity: 'error',
              field: 'AttributesJSON',
              rowIndex: index,
              entityType: dataType,
              suggestion: detailedSuggestion
            });
          }
        } else {
          // Handle non-string, non-object values
          errors.push({
            id: `${dataType}-json-type-${index}`,
            type: 'invalid-json-type',
            message: `AttributesJSON must be a valid JSON string or object at row ${index + 1}`,
            severity: 'error',
            field: 'AttributesJSON',
            rowIndex: index,
            entityType: dataType,
            suggestion: "Convert to valid JSON string or object"
          });
        }
      }
    });

    return errors;
  }

  // f. Unknown references (RequestedTaskIDs not in tasks)
  static validateUnknownReferences(clients: Client[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const taskIds = new Set(tasks.map(task => task.TaskID));
    
    clients.forEach((client, index) => {
      if (client.RequestedTaskIDs && Array.isArray(client.RequestedTaskIDs)) {
        client.RequestedTaskIDs.forEach(taskId => {
          if (!taskIds.has(taskId)) {
            errors.push({
              id: `client-unknown-task-${index}-${taskId}`,
              type: 'unknown-reference',
              message: `Client '${client.ClientID}' references unknown TaskID '${taskId}'`,
              severity: 'error',
              field: 'RequestedTaskIDs',
              rowIndex: index,
              entityType: 'clients',
              suggestion: `Remove '${taskId}' or add corresponding task to tasks data`
            });
          }
        });
      }
    });

    return errors;
  }

  // g. Circular co-run groups (A+B+C+A)
  static validateCircularCoRunGroups(tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Implementation would depend on how co-run groups are defined
    return errors;
  }

  // h. Conflicting rules vs. phase-window constraints
  static validatePhaseWindowConstraints(tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Implementation would depend on specific rules
    return errors;
  }

  // i. Overloaded workers (AvailableSlots.length < MaxLoadPerPhase)
  static validateOverloadedWorkers(workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    workers.forEach((worker, index) => {
      if (worker.AvailableSlots && worker.MaxLoadPerPhase) {
        const availableSlots = Array.isArray(worker.AvailableSlots) ? worker.AvailableSlots.length : 0;
        const maxLoad = Number(worker.MaxLoadPerPhase);
        
        if (availableSlots < maxLoad) {
          errors.push({
            id: `worker-overloaded-${index}`,
            type: 'overloaded-worker',
            message: `Worker '${worker.WorkerID}' has MaxLoadPerPhase (${maxLoad}) > AvailableSlots (${availableSlots})`,
            severity: 'warning',
            field: 'MaxLoadPerPhase',
            rowIndex: index,
            entityType: 'workers',
            suggestion: `Reduce MaxLoadPerPhase to ${availableSlots} or increase AvailableSlots`
          });
        }
      }
    });

    return errors;
  }

  // j. Phase-slot saturation: sum of task durations per Phase ≤ total worker slots
  static validatePhaseSlotSaturation(tasks: Task[], workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Implementation would analyze phase capacity
    return errors;
  }

  // k. Skill-coverage matrix: every RequiredSkill maps to ≥1 worker
  static validateSkillCoverage(tasks: Task[], workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const workerSkills = new Set<string>();
    
    workers.forEach(worker => {
      if (worker.Skills && Array.isArray(worker.Skills)) {
        worker.Skills.forEach(skill => workerSkills.add(skill));
      }
    });
    
    tasks.forEach((task, index) => {
      if (task.RequiredSkills && Array.isArray(task.RequiredSkills)) {
        task.RequiredSkills.forEach(skill => {
          if (!workerSkills.has(skill)) {
            errors.push({
              id: `task-skill-coverage-${index}-${skill}`,
              type: 'skill-coverage',
              message: `Task '${task.TaskID}' requires skill '${skill}' but no worker has this skill`,
              severity: 'error',
              field: 'RequiredSkills',
              rowIndex: index,
              entityType: 'tasks',
              suggestion: `Add skill '${skill}' to at least one worker or remove from task requirements`
            });
          }
        });
      }
    });

    return errors;
  }

 

  // l. Max-concurrency feasibility: MaxConcurrent ≤ count of qualified, available workers
  static validateMaxConcurrencyFeasibility(tasks: Task[], workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    tasks.forEach((task, index) => {
      if (task.RequiredSkills && task.MaxConcurrent && Array.isArray(task.RequiredSkills)) {
        // Count workers who have all required skills
        const qualifiedWorkers = workers.filter(worker => {
          if (!worker.Skills || !Array.isArray(worker.Skills)) return false;
          return task.RequiredSkills!.every(skill => worker.Skills.includes(skill));
        });
        
        const maxConcurrent = Number(task.MaxConcurrent);
        
        if (qualifiedWorkers.length < maxConcurrent) {
          errors.push({
            id: `task-concurrency-${index}`,
            type: 'max-concurrency',
            message: `Task '${task.TaskID}' has MaxConcurrent (${maxConcurrent}) > qualified workers (${qualifiedWorkers.length})`,
            severity: 'warning',
            field: 'MaxConcurrent',
            rowIndex: index,
            entityType: 'tasks',
            suggestion: `Reduce MaxConcurrent to ${qualifiedWorkers.length} or add more qualified workers`
          });
        }
      }
    });

    return errors;
  }

    // Individual validators
  static validateClients(clients: Client[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Add client-specific validations
    return errors;
  }

  static validateWorkers(workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Add worker-specific validations
    return errors;
  }

  static validateTasks(tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    // Add task-specific validations
    return errors;
  }

  // Cross-reference validator
  static validateCrossReferences(
    clients: Client[],
    workers: Worker[],
    tasks: Task[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    // Add cross-validation logic
    return errors;
  }

// Main validation function
static validateAll(clients: Client[], workers: Worker[], tasks: Task[]): ValidationError[] {
  // Normalize data first
  const normalizedClients = this.normalizeData(clients);
  const normalizedWorkers = this.normalizeData(workers);
  const normalizedTasks = this.normalizeData(tasks);

  const errors: ValidationError[] = [];

  // Validate basic structure and required fields
  errors.push(...this.validateBasicStructure(
    normalizedClients,
    normalizedWorkers,
    normalizedTasks
  ));

  // Validate entity-specific rules
  errors.push(...this.validateEntityRules(
    normalizedClients,
    normalizedWorkers,
    normalizedTasks
  ));

  // Validate cross-entity relationships
  errors.push(...this.validateCrossEntityRelationships(
    normalizedClients,
    normalizedWorkers,
    normalizedTasks
  ));

  return errors;
}

// Helper method for data normalization
private static normalizeData<T extends Record<string, any>>(data: T[]): T[] {
  return data.map(item => {
    const normalizedItem = {...item}; // Create a copy to avoid direct mutation

    // Type-safe JSON field normalization
    if ('AttributesJSON' in normalizedItem && typeof normalizedItem.AttributesJSON === 'string') {
      try {
        // Test if it's valid JSON
        JSON.parse(normalizedItem.AttributesJSON);
      } catch {
        // If not valid, convert to proper JSON
        (normalizedItem as any).AttributesJSON = JSON.stringify({ 
          value: normalizedItem.AttributesJSON 
        });
      }
    }

    // Type-safe array field normalization
    if ('RequestedTaskIDs' in normalizedItem) {
      if (typeof normalizedItem.RequestedTaskIDs === 'string') {
        (normalizedItem as any).RequestedTaskIDs = 
          normalizedItem.RequestedTaskIDs.split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
      } else if (!Array.isArray(normalizedItem.RequestedTaskIDs)) {
        (normalizedItem as any).RequestedTaskIDs = [];
      }
    }

    // Add additional normalizations as needed with proper type checks
    if ('Skills' in normalizedItem && typeof normalizedItem.Skills === 'string') {
      (normalizedItem as any).Skills = 
        normalizedItem.Skills.split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
    }

    if ('AvailableSlots' in normalizedItem && typeof normalizedItem.AvailableSlots === 'string') {
      try {
        (normalizedItem as any).AvailableSlots = JSON.parse(normalizedItem.AvailableSlots);
      } catch {
        (normalizedItem as any).AvailableSlots = [];
      }
    }

    return normalizedItem;
  });
}

// Validate basic data structure
private static validateBasicStructure(
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const clientRequired = ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
  const workerRequired = ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
  const taskRequired = ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];

  // Required columns
  errors.push(...this.validateRequiredColumns(clients, clientRequired, 'clients'));
  errors.push(...this.validateRequiredColumns(workers, workerRequired, 'workers'));
  errors.push(...this.validateRequiredColumns(tasks, taskRequired, 'tasks'));

  // Duplicate IDs
  errors.push(...this.validateDuplicateIDs(clients, 'ClientID', 'clients'));
  errors.push(...this.validateDuplicateIDs(workers, 'WorkerID', 'workers'));
  errors.push(...this.validateDuplicateIDs(tasks, 'TaskID', 'tasks'));

  return errors;
}

// Validate entity-specific rules
private static validateEntityRules(
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Clients specific
  errors.push(...this.validateMalformedLists(clients, ['RequestedTaskIDs'], 'clients'));
  errors.push(...this.validateOutOfRange(clients, 'clients'));
  errors.push(...this.validateBrokenJSON(clients, 'clients'));

  // Workers specific
  errors.push(...this.validateMalformedLists(workers, ['AvailableSlots', 'Skills'], 'workers'));
  errors.push(...this.validateOutOfRange(workers, 'workers'));
  errors.push(...this.validateOverloadedWorkers(workers));

  // Tasks specific
  errors.push(...this.validateMalformedLists(tasks, ['PreferredPhases', 'RequiredSkills'], 'tasks'));
  errors.push(...this.validateOutOfRange(tasks, 'tasks'));
  errors.push(...this.validateCircularCoRunGroups(tasks));
  errors.push(...this.validatePhaseWindowConstraints(tasks));

  return errors;
}

// Validate cross-entity relationships
private static validateCrossEntityRelationships(
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...this.validateUnknownReferences(clients, tasks));
  errors.push(...this.validateSkillCoverage(tasks, workers));
  errors.push(...this.validateMaxConcurrencyFeasibility(tasks, workers));
  errors.push(...this.validatePhaseSlotSaturation(tasks, workers));

  return errors;
}
}