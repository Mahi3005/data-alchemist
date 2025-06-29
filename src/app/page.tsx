'use client';

import { useState, useEffect, useRef } from 'react';
import FileUpload from '@/app/(dashboard)/data-ingestion/FileUpload';
import { DataType, Client, Worker, Task } from '@/types';
import { NaturalLanguageSearch, NLSearchResult } from '@/lib/ai/nlSearch';
import { CoreValidators, ValidationError } from '@/lib/validators/core';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';

type EntityData = {
  clients: Client[] | null;
  workers: Worker[] | null;
  tasks: Task[] | null;
};

type ValidationState = {
  clients: ValidationError[];
  workers: ValidationError[];
  tasks: ValidationError[];
};

export default function HomePage() {
  const router = useRouter();
  const [entityData, setEntityData] = useState<EntityData>({
    clients: null,
    workers: null,
    tasks: null
  });
  const [isParsing, setIsParsing] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NLSearchResult | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationState>({
    clients: [],
    workers: [],
    tasks: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState({
    clients: false,
    workers: false,
    tasks: false
  });

  // NEW: Track if all data types are uploaded
  const [allDataUploaded, setAllDataUploaded] = useState(false);
  
  // Column definitions for each data type
  const dataColumns = {
    clients: [
      { key: 'ClientID', name: 'Client ID', width: 120 },
      { key: 'ClientName', name: 'Name', width: 200, editable: true },
      { key: 'PriorityLevel', name: 'Priority', width: 100, editable: true },
      { key: 'RequestedTaskIDs', name: 'Task IDs', width: 200, editable: true },
      { key: 'GroupTag', name: 'Group', width: 150, editable: true },
      { key: 'AttributesJSON', name: 'Attributes', width: 250, editable: true },
    ],
    workers: [
      { key: 'WorkerID', name: 'Worker ID', width: 120 },
      { key: 'WorkerName', name: 'Name', width: 200, editable: true },
      { key: 'Skills', name: 'Skills', width: 200, editable: true },
      { key: 'AvailableSlots', name: 'Available Slots', width: 150, editable: true },
      { key: 'MaxLoadPerPhase', name: 'Max Load', width: 120, editable: true },
      { key: 'WorkerGroup', name: 'Group', width: 150, editable: true },
      { key: 'QualificationLevel', name: 'Qualification', width: 150, editable: true },
    ],
    tasks: [
      { key: 'TaskID', name: 'Task ID', width: 120 },
      { key: 'TaskName', name: 'Name', width: 200, editable: true },
      { key: 'Category', name: 'Category', width: 150, editable: true },
      { key: 'Duration', name: 'Duration', width: 120, editable: true },
      { key: 'RequiredSkills', name: 'Required Skills', width: 200, editable: true },
      { key: 'PreferredPhases', name: 'Preferred Phases', width: 180, editable: true },
      { key: 'MaxConcurrent', name: 'Max Concurrent', width: 150, editable: true },
    ],
  };

  const dataTypeInfo = {
    clients: { icon: '👥', color: 'bg-gradient-to-br from-blue-600 to-purple-600', description: 'Manage client information and contacts' },
    workers: { icon: '🔧', color: 'bg-gradient-to-br from-green-600 to-teal-600', description: 'Track worker assignments and schedules' },
    tasks: { icon: '📋', color: 'bg-gradient-to-br from-orange-600 to-red-600', description: 'Organize tasks and project workflows' }
  };

  const currentInfo = dataTypeInfo[selectedDataType];
  const currentData = entityData[selectedDataType] || [];
  const currentErrors = validationErrors[selectedDataType] || [];

  // Add this useEffect hook to your existing page.tsx


  // NEW: Check if all data types are uploaded
  useEffect(() => {
    setAllDataUploaded(
      uploadedFiles.clients && 
      uploadedFiles.workers && 
      uploadedFiles.tasks
    );
  }, [uploadedFiles]);

  const handleCellEdit = (rowIndex: number, columnKey: string, value: any) => {
    setEntityData(prev => {
      const newData = [...(prev[selectedDataType] || [])] as any[];
      newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
      
      return {
        ...prev,
        [selectedDataType]: newData
      };
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentData.length) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const result = await NaturalLanguageSearch.search(
        searchQuery,
        currentData,
        selectedDataType
      );
      setSearchResults(result);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        filteredData: [],
        explanation: 'Search failed. Please try again.',
        confidence: 0,
        aiUsed: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleFileUploadSuccess = (type: DataType, data: any[]) => {
    // Normalize data before setting it
    const normalizedData = data.map(item => {
      if (type === 'clients' && item.AttributesJSON && typeof item.AttributesJSON === 'string') {
        try {
          JSON.parse(item.AttributesJSON);
        } catch {
          item.AttributesJSON = JSON.stringify({ value: item.AttributesJSON });
        }
      }
      return item;
    });

    setEntityData(prev => ({
      ...prev,
      [type]: normalizedData
    }));
    
    setUploadedFiles(prev => ({
      ...prev,
      [type]: true
    }));
    
    setIsParsing(false);
    setSearchQuery('');
    setSearchResults(null);

    // Run validations only for the uploaded data type
    runValidationsForType(type, normalizedData);
  };

  const resetAllData = () => {
    setEntityData({ clients: null, workers: null, tasks: null });
    setUploadedFiles({ clients: false, workers: false, tasks: false });
    setValidationErrors({ clients: [], workers: [], tasks: [] });
    setAllDataUploaded(false);
  };

const runValidationsForType = (type: DataType, data: any[]) => {
  setIsValidating(true);
  try {
    let errors: ValidationError[] = [];
    
    switch (type) {
      case 'clients':
        errors = CoreValidators.validateClients(data || []);
        break;
      case 'workers':
        errors = CoreValidators.validateWorkers(data || []);
        break;
      case 'tasks':
        errors = CoreValidators.validateTasks(data || []);
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [type]: errors
    }));
  } catch (error: unknown) {
    console.error('Validation error:', error);
    setValidationErrors(prev => ({
      ...prev,
      [type]: [{
        id: 'validation-error',
        type: 'validation-error',
        message: error instanceof Error ? error.message : 'Validation failed',
        severity: 'error'
      }]
    }));
  } finally {
    setIsValidating(false);
  }
};

const runCrossValidations = () => {
  if (!entityData.clients || !entityData.workers || !entityData.tasks) return;

  setIsValidating(true);
  try {
    const errors = CoreValidators.validateCrossReferences(
      entityData.clients,
      entityData.workers,
      entityData.tasks
    );

    // Type-safe error distribution
    const distributedErrors = {
      clients: errors.filter((e): e is ValidationError & { entityType: 'clients' } => e.entityType === 'clients'),
      workers: errors.filter((e): e is ValidationError & { entityType: 'workers' } => e.entityType === 'workers'),
      tasks: errors.filter((e): e is ValidationError & { entityType: 'tasks' } => e.entityType === 'tasks'),
    };

    setValidationErrors(prev => ({
      clients: [...(prev.clients || []), ...distributedErrors.clients],
      workers: [...(prev.workers || []), ...distributedErrors.workers],
      tasks: [...(prev.tasks || []), ...distributedErrors.tasks],
    }));
  } catch (error: unknown) {
    console.error('Cross-validation error:', error);
  } finally {
    setIsValidating(false);
  }
};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Run validations when data changes, but only for the affected type
    if (entityData[selectedDataType]) {
      runValidationsForType(selectedDataType, entityData[selectedDataType] || []);
    }
  }, [entityData[selectedDataType]]);

  useEffect(() => {
    // Run cross-validations when all three data types are loaded
    if (uploadedFiles.clients && uploadedFiles.workers && uploadedFiles.tasks) {
      runCrossValidations();
    }
  }, [uploadedFiles]);

  useEffect(() => {
    if (currentData.length > 0) {
      const suggestions = NaturalLanguageSearch.generateSearchSuggestions(
        currentData,
        selectedDataType
      );
      setSearchSuggestions(suggestions);
    }
  }, [currentData]);

  const displayData = searchResults?.filteredData || currentData;
  
  const groupedErrors = currentErrors.reduce((acc, error) => {
    if (!acc[error.type]) {
      acc[error.type] = [];
    }
    acc[error.type].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

 const handleAutoFix = (error: ValidationError) => {
  if (!entityData[selectedDataType]) return;

  const newData = [...entityData[selectedDataType]!];
  const rowIndex = error.rowIndex ?? -1;

  if (rowIndex >= 0 && rowIndex < newData.length) {
    const rowData = newData[rowIndex];

    switch (error.type) {
      case 'invalid-json-string':
        if (error.field === 'AttributesJSON' && 'AttributesJSON' in rowData) {
          try {
            // If it's already valid JSON, don't modify it
            JSON.parse(rowData.AttributesJSON);
          } catch {
            // If it's a plain string, wrap it in JSON
            if (typeof rowData.AttributesJSON === 'string') {
              rowData.AttributesJSON = JSON.stringify({ 
                value: rowData.AttributesJSON 
              });
            }
          }
        }
        break;
      
      case 'out-of-range':
        if (error.field === 'PriorityLevel' && 'PriorityLevel' in rowData) {
          const numValue = Number(rowData.PriorityLevel);
          if (!isNaN(numValue)) {
            rowData.PriorityLevel = Math.min(Math.max(1, numValue), 5);
          }
        } 
        else if (error.field === 'QualificationLevel' && 'QualificationLevel' in rowData) {
          const numValue = Number(rowData.QualificationLevel);
          if (!isNaN(numValue)) {
            rowData.QualificationLevel = Math.min(Math.max(1, numValue), 3);
          }
        }
        break;
      
      default:
        break;
    }

    setEntityData(prev => ({
      ...prev,
      [selectedDataType]: newData
    }));
  }
};

  const getTotalErrors = () => {
    return (
      validationErrors.clients.length +
      validationErrors.workers.length +
      validationErrors.tasks.length
    );
  };

  const getErrorCountForType = (type: DataType) => {
    return validationErrors[type].length;
  };

  // NEW: Check if we can proceed to rule definition
  const canProceed = allDataUploaded && getTotalErrors() === 0;

  useEffect(() => {
  if (typeof window !== 'undefined') {
    if (canProceed) {
      localStorage.setItem('dataValidated', 'true');
    } else {
      localStorage.setItem('dataValidated', 'false');
    }
  }
}, [canProceed]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative text-gray-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${currentInfo.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
              {currentInfo.icon}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Data Alchemist
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full animate-ping ${
                  getTotalErrors() > 0 ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
                <span className="text-gray-600 font-medium">Milestone 1: Data Ingestion</span>
              </div>
            </div>
          </div>
          
          {(uploadedFiles.clients || uploadedFiles.workers || uploadedFiles.tasks) && (
            <button 
              onClick={resetAllData}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Reset All Data
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(dataTypeInfo).map(([type, info]) => {
            const errorCount = getErrorCountForType(type as DataType);
            return (
              <div 
                key={type}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  uploadedFiles[type as DataType] 
                    ? errorCount > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => setSelectedDataType(type as DataType)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${info.color} rounded-lg flex items-center justify-center text-xl`}>
                    {info.icon}
                  </div>
                  <div>
                    <h3 className="font-bold capitalize">{type}</h3>
                    <p className="text-sm text-gray-600">
                      {uploadedFiles[type as DataType] 
                        ? `${entityData[type as DataType]?.length || 0} records loaded` 
                        : 'No data uploaded'}
                    </p>
                    {errorCount > 0 && (
                      <span className="text-xs text-red-600 mt-1">
                        {errorCount} issue{errorCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <p className="text-gray-600 max-w-3xl text-lg">
            Upload <span className="font-bold">three separate CSV/XLSX files</span> for:
            <span className="text-blue-600"> clients</span>, 
            <span className="text-green-600"> workers</span>, and
            <span className="text-orange-600"> tasks</span>.
          </p>
        </div>

        <div className="mb-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Upload Data
              </h2>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                Select data type to upload: 
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(dataTypeInfo).map(([type, info]) => {
                const errorCount = getErrorCountForType(type as DataType);
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedDataType(type as DataType)}
                    className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 text-sm ${
                      selectedDataType === type
                        ? `${info.color} text-white shadow-md`
                        : uploadedFiles[type as DataType]
                          ? errorCount > 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span className="capitalize">{type}</span>
                    {uploadedFiles[type as DataType] && (
                      <span className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        errorCount > 0 ? 'bg-red-500' : 'bg-green-500'
                      } text-white`}>
                        {errorCount > 0 ? errorCount : '✓'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <FileUpload
              dataType={selectedDataType}
              onParsingStart={() => setIsParsing(true)}
              onDataParsed={(data) => handleFileUploadSuccess(data.type, data.data)}
            />
          </div>
        </div>

        {isParsing && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 mb-10 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-purple-600 rounded-full animate-spin reverse duration-1500"></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI is Processing Your Data</h3>
                <p className="text-gray-600 mt-2">Analyzing and validating your file...</p>
              </div>
            </div>
          </div>
        )}

        {currentErrors.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Validation Results for {selectedDataType}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    {currentErrors.length} issues found
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentErrors.filter(e => e.severity === 'error').length} errors, 
                    {' '}
                    {currentErrors.filter(e => e.severity === 'warning').length} warnings
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {Object.entries(groupedErrors).map(([errorType, errors]) => (
                <div key={errorType} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <h3 className="text-lg font-medium mb-2 capitalize flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      errors[0].severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    {errorType.replace(/-/g, ' ')} ({errors.length})
                  </h3>
                  <div className="space-y-2">
                    {errors.map((error) => (
                      <div
                        key={error.id}
                        className={`p-4 rounded-lg transition-all ${
                          error.severity === 'error' 
                            ? 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100' 
                            : 'bg-yellow-50 border-l-4 border-yellow-500 hover:bg-yellow-100'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                          <span className="font-medium">{error.message}</span>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                            {error.field && (
                              <span className="bg-gray-200 px-2 py-1 rounded-full">
                                Field: {error.field}
                              </span>
                            )}
                            {error.rowIndex !== undefined && (
                              <span className="bg-gray-200 px-2 py-1 rounded-full">
                                Row: {error.rowIndex + 1}
                              </span>
                            )}
                            {error.entityType && (
                              <span className="bg-gray-200 px-2 py-1 rounded-full">
                                Entity: {error.entityType}
                              </span>
                            )}
                          </div>
                        </div>
                        {error.suggestion && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-blue-600 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Suggestion
                                </p>
                                <p className="mt-1 text-gray-600">{error.suggestion}</p>
                              </div>
                              {(error.type === 'invalid-json-string' || 
                                error.type === 'out-of-range') && (
                                <button
                                  onClick={() => handleAutoFix(error)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                >
                                  Auto-fix
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentData.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold">Data Preview: {selectedDataType}</h2>
                  <p className="text-sm text-gray-600">Edit values directly in the grid</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentErrors.length > 0 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentErrors.length > 0 ? `⚠ ${currentErrors.length} issues found` : '✓ Validation Complete'}
              </div>
            </div>

            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <form onSubmit={handleSearch} className="space-y-3">
                  <label htmlFor="nl-search" className="text-sm font-medium text-gray-700">
                    Natural Language Search
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        id="nl-search"
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search your data with natural language..."
                        className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchQuery && (
                        <button 
                          type="button" 
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className={`px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] ${
                        isSearching || !searchQuery.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                      }`}
                    >
                      {isSearching ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {showSuggestions && searchSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto"
                  >
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <h3 className="text-sm font-medium text-gray-700">Try searching for:</h3>
                    </div>
                    <ul>
                      {searchSuggestions.map((suggestion, index) => (
                        <li key={index}>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2 group"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              setShowSuggestions(false);
                              setTimeout(() => {
                                if (searchInputRef.current) {
                                  searchInputRef.current.focus();
                                }
                              }, 10);
                            }}
                          >
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {suggestion}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {searchResults && (
                <div className={`mt-4 p-4 rounded-xl ${
                  searchResults.filteredData.length > 0 
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}>
                  <div className="flex items-start gap-3">
                    <div>
                      {searchResults.filteredData.length > 0 ? (
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{searchResults.explanation}</p>
                      {searchResults.aiUsed && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            AI-Powered Search
                          </span>
                          <span>Confidence: {(searchResults.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                  {dataColumns[selectedDataType].map((column) => (
                    <div 
                      key={column.key}
                      className="px-4 py-3 text-xs font-semibold text-gray-700 tracking-wider uppercase border-r border-gray-200 last:border-r-0"
                      style={{ width: column.width || 'auto', minWidth: '120px' }}
                    >
                      {column.name}
                    </div>
                  ))}
                </div>

                <div className="bg-white divide-y divide-gray-100">
                  {displayData.length > 0 ? displayData.map((row, rowIndex) => {
                    const rowErrors = currentErrors.filter(e => 
                      e.rowIndex === rowIndex
                    );
                    
                    return (
                      <div 
                        key={rowIndex} 
                        className={`flex hover:bg-gray-50 transition-colors ${
                          rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${rowErrors.length > 0 ? 'bg-red-50' : ''}`}
                      >
                        {dataColumns[selectedDataType].map((column) => {
                          const value = row[column.key] || '';
                          const isEditable = column.editable;
                          const fieldErrors = rowErrors.filter(e => e.field === column.key);
                          
                          return (
                            <div 
                              key={`${rowIndex}-${column.key}`}
                              className={`px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200 last:border-r-0 flex items-center relative group ${
                                fieldErrors.length > 0 ? 'border-b-2 border-red-500' : ''
                              }`}
                              style={{ width: column.width || 'auto', minWidth: '120px' }}
                            >
                              {isEditable ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleCellEdit(rowIndex, column.key, e.target.value)}
                                  className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 px-2 py-1.5 rounded border border-gray-300 hover:border-blue-400 transition-colors"
                                />
                              ) : (
                                <span className="truncate">{value}</span>
                              )}
                              {fieldErrors.length > 0 && (
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">{fieldErrors.length}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }) : (
                    <div className="flex justify-center items-center p-10">
                      <div className="text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mt-4 text-lg font-medium">No data found</p>
                        <p className="mt-2 text-gray-600">Try a different search query or upload new data</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {displayData.length} of {currentData.length} rows
                {searchResults && (
                  <button 
                    onClick={clearSearch}
                    className="ml-3 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Clear search
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const csv = convertToCSV(currentData);
                    const blob = new Blob([csv], { type: 'text/csv' });
                    saveAs(blob, `${selectedDataType}.csv`);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
                
                {/* UPDATED BUTTON WITH NEW LOGIC */}
                <button
                  onClick={() => router.push('/rule-definition')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    !allDataUploaded 
                      ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      : getTotalErrors() > 0
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 hover:scale-[1.02]'
                  }`}
                  disabled={!allDataUploaded || getTotalErrors() > 0}
                >
                  {!allDataUploaded ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Upload all data to proceed
                    </>
                  ) : getTotalErrors() > 0 ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fix errors to proceed
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Next: Define Rules
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentData.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6 mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">How to Search with Natural Language</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Examples for {selectedDataType}
                </h3>
                <ul className="space-y-3">
                  {NaturalLanguageSearch.getExampleQueries(selectedDataType).map((example, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono hover:bg-gray-200 transition-colors cursor-pointer" onClick={() => setSearchQuery(example)}>
                        {example}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Tips for Better Searches
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✓</span>
                    <span>Be specific with your criteria</span>
                  </li>
                  <li className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✓</span>
                    <span>Use comparisons like "greater than" or "less than"</span>
                  </li>
                  <li className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✓</span>
                    <span>Combine multiple conditions with "and"</span>
                  </li>
                  <li className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-500">✓</span>
                    <span>Reference exact field names for best results</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-16 pb-8">
          <p className="text-gray-500 text-sm">Built with AI-powered data processing • Secure • Fast • Reliable</p>
          <div className="mt-3 flex justify-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI-Powered Parsing
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Natural Language Search
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Real-time Validation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert data to CSV
function convertToCSV(data: any[]) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(fieldName => {
      const value = obj[fieldName];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\r\n');
}