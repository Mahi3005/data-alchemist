// src/components/data-ingestion/FileUpload.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseWithAI } from '@/lib/ai/aiParser';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DataType, ValidationError, ParsedData, AIParseResult } from '@/types';

// Extended ParsedData interface for this component
interface ExtendedParsedData extends ParsedData {
  metadata?: {
    originalHeaders?: string[];
    mappedHeaders?: Record<string, string>;
    rowCount?: number;
    columnCount?: number;
  };
}

export interface FileUploadProps {
  dataType: DataType;
  onDataParsed: (data: ExtendedParsedData) => void;
  onParsingStart: () => void;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  currentFile: string;
}

// Data type configurations
const DATA_TYPE_CONFIG: Record<DataType, {
  label: string;
  description: string;
  expectedHeaders: string[];
}> = {
  clients: {
    label: 'Clients Data',
    description: 'Upload CSV/XLSX with ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag, AttributesJSON',
    expectedHeaders: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON']
  },
  workers: {
    label: 'Workers Data',
    description: 'Upload CSV/XLSX with WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel',
    expectedHeaders: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel']
  },
  tasks: {
    label: 'Tasks Data',
    description: 'Upload CSV/XLSX with TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent',
    expectedHeaders: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
  }
};

export default function FileUpload({ dataType, onDataParsed, onParsingStart }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    currentFile: ''
  });

  const processFile = useCallback(async (file: File): Promise<void> => {
    setUploadState({
      isUploading: true,
      progress: 20,
      currentFile: file.name
    });
    
    onParsingStart();

    try {
      let fileContent: string;
      let headers: string[] = [];

      // Progress update
      setUploadState(prev => ({ ...prev, progress: 40 }));

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel files
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to CSV string for consistent processing
        fileContent = XLSX.utils.sheet_to_csv(worksheet);
        headers = fileContent.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''));
      } else {
        // Handle CSV files
        fileContent = await file.text();
        headers = fileContent.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''));
      }

      // Progress update
      setUploadState(prev => ({ ...prev, progress: 60 }));

      // Use AI-powered parsing
      const aiResult: AIParseResult = await parseWithAI(fileContent, dataType, headers);

      // Progress update 
      setUploadState(prev => ({ ...prev, progress: 80 }));

      // Validate the parsed data structure
      const validationErrors: ValidationError[] = validateParsedData(aiResult.mappedData, dataType);

      const result: ExtendedParsedData = {
        data: aiResult.mappedData,
        errors: validationErrors,
        type: dataType,
        metadata: {
          originalHeaders: headers,
          mappedHeaders: {}, // Since headerMapping is not in the AIParseResult from index.ts
          rowCount: aiResult.mappedData.length,
          columnCount: headers.length
        }
      };

      // Final progress update
      setUploadState(prev => ({ ...prev, progress: 100 }));

      // Small delay to show completion
      setTimeout(() => {
        onDataParsed(result);
        setUploadState({
          isUploading: false,
          progress: 0,
          currentFile: ''
        });
      }, 500);

    } catch (error) {
      console.error('File processing error:', error);
      
      // Fallback to basic parsing
      try {
        const basicResult: ExtendedParsedData = await basicParse(file, dataType);
        onDataParsed(basicResult);
      } catch (fallbackError) {
        console.error('Fallback parsing failed:', fallbackError);
        const errorResult: ExtendedParsedData = {
          data: [],
          errors: [{
            id: 'parse-error',
            type: 'parsing-error',
            message: `Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          }],
          type: dataType
        };
        onDataParsed(errorResult);
      }
      
      setUploadState({
        isUploading: false,
        progress: 0,
        currentFile: ''
      });
    }
  }, [dataType, onDataParsed, onParsingStart]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: uploadState.isUploading
  });

  const getDataTypeLabel = (type: DataType): string => {
    return DATA_TYPE_CONFIG[type].label;
  };

  const getDataTypeDescription = (type: DataType): string => {
    return DATA_TYPE_CONFIG[type].description;
  };

  const getProgressMessage = (progress: number): string => {
    if (progress < 40) return "Reading file...";
    if (progress < 60) return "Parsing data...";
    if (progress < 80) return "AI processing...";
    return "Validating...";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">{getDataTypeLabel(dataType)}</h3>
      </div>
      
      <p className="text-sm text-gray-600">
        {getDataTypeDescription(dataType)}
      </p>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${uploadState.isUploading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploadState.isUploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Processing {uploadState.currentFile}...</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            
            <div className="text-xs text-gray-500">
              {getProgressMessage(uploadState.progress)}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium">
                  Drag & drop your {dataType} file here, or click to select
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports CSV and Excel files (.csv, .xlsx, .xls)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expected Headers Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900">Expected Headers</h4>
            <div className="text-sm text-gray-700 mt-1">
              <div className="flex flex-wrap gap-2 mt-2">
                {DATA_TYPE_CONFIG[dataType].expectedHeaders.map((header, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">AI-Powered Processing</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• Automatically maps misnamed headers</li>
              <li>• Handles rearranged columns</li>
              <li>• Validates data structure</li>
              <li>• Provides intelligent suggestions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
async function basicParse(file: File, dataType: DataType): Promise<ExtendedParsedData> {
  return new Promise((resolve, reject) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const result: ExtendedParsedData = {
            data: jsonData,
            errors: [],
            type: dataType,
            metadata: {
              rowCount: jsonData.length,
              columnCount: Object.keys(jsonData[0] || {}).length
            }
          };
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const errors: ValidationError[] = results.errors.map((err, index) => ({
            id: `parse-${index}`,
            type: 'parsing-error',
            message: err.message,
            severity: 'error' as const,
            rowIndex: err.row
          }));

          const result: ExtendedParsedData = {
            data: results.data,
            errors: errors,
            type: dataType,
            metadata: {
              rowCount: results.data.length,
              columnCount: results.meta.fields?.length || 0
            }
          };
          
          resolve(result);
        },
        error: (error) => {
          reject(error);
        }
      });
    }
  });
}

function validateParsedData(data: any[], dataType: DataType): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data || data.length === 0) {
    errors.push({
      id: `${dataType}-empty`,
      type: 'empty-data',
      message: `No ${dataType} data found in file`,
      severity: 'error'
    });
    return errors;
  }

  // Check for required headers based on data type
  const expectedHeaders = DATA_TYPE_CONFIG[dataType].expectedHeaders;
  const actualHeaders = Object.keys(data[0] || {});
  
  expectedHeaders.forEach((expectedHeader, index) => {
    if (!actualHeaders.some(actual => 
      actual.toLowerCase().includes(expectedHeader.toLowerCase()) ||
      expectedHeader.toLowerCase().includes(actual.toLowerCase())
    )) {
      errors.push({
        id: `missing-header-${index}`,
        type: 'missing-header',
        message: `Expected header '${expectedHeader}' not found`,
        severity: 'warning',
        suggestion: `Consider adding a column for ${expectedHeader}`
      });
    }
  });

  // Validate data integrity
  data.forEach((row, rowIndex) => {
    if (!row || typeof row !== 'object') {
      errors.push({
        id: `invalid-row-${rowIndex}`,
        type: 'invalid-data',
        message: `Row ${rowIndex + 1} contains invalid data`,
        severity: 'error',
        rowIndex
      });
    }
  });
  
  return errors;
}