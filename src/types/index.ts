// src/types/index.ts

export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string[];
  GroupTag: string;
  AttributesJSON: any;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string[];
  AvailableSlots: number[];
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
}


export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string[];
  PreferredPhases: number[];
  MaxConcurrent: number;
}

export interface ValidationError {
  id: string;
  type: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  rowIndex?: number;
  suggestion?: string;
}

export interface DataState {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  validationErrors: ValidationError[];
  isValidating: boolean;
}

export type DataType = 'clients' | 'workers' | 'tasks';

export interface ParsedData {
  data: any[];
  errors: ValidationError[];
  type: DataType;
}

export interface AIParseResult {
  mappedData: any[];
  confidence: number;
  suggestions: string[];
}