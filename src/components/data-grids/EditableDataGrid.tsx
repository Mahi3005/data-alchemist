// src/components/data-grids/EditableDataGrid.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { DataGrid, Column, textEditor, RenderCellProps } from 'react-data-grid';

import { Search, AlertCircle, Lightbulb, CheckCircle, X } from 'lucide-react';
import { DataType } from '@/types';
import { ValidationError } from '@/types'; // 

import { NaturalLanguageSearch } from '@/lib/ai/nlSearch';

interface EditableDataGridProps {
  data: any[];
  dataType: DataType;
  validationErrors: ValidationError[];
  onDataChange: (newData: any[]) => void;
  onCellEdit?: (rowIndex: number, field: string, value: any) => void;
}

interface SearchState {
  query: string;
  isSearching: boolean;
  filteredData: any[];
  explanation: string;
  showSuggestions: boolean;
}

export default function EditableDataGrid({
  data,
  dataType,
  validationErrors,
  onDataChange,
  onCellEdit
}: EditableDataGridProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isSearching: false,
    filteredData: data,
    explanation: '',
    showSuggestions: false
  });

  // Get error for specific cell
  const getCellError = useCallback((rowIndex: number, field: string) => {
    return validationErrors.find(error => 
      error.rowIndex === rowIndex && error.field === field
    );
  }, [validationErrors]);

  // Get row-level errors
  const getRowErrors = useCallback((rowIndex: number) => {
    return validationErrors.filter(error => error.rowIndex === rowIndex);
  }, [validationErrors]);

  // Custom cell renderer with error highlighting
  const ErrorHighlightCell = useCallback(({ row, column, rowIdx }: RenderCellProps<any>) => {
    const error = getCellError(rowIdx, column.key);
    const cellValue = row[column.key];
    
    return (
      <div className={`
        h-full flex items-center px-2 relative
        ${error ? (error.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200') : ''}
      `}>
        <span className="truncate">{cellValue}</span>
        {error && (
          <div className="ml-1 relative group">
            <AlertCircle className={`h-4 w-4 ${error.severity === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {error.message}
                {error.suggestion && (
                  <div className="text-blue-200 mt-1">💡 {error.suggestion}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [getCellError]);

  // Custom editable cell with validation
  const EditableCell = useCallback(({ row, column, rowIdx, onRowChange }: RenderCellProps<any>) => {
    const error = getCellError(rowIdx, column.key);
    
    return (
      <div className={`
        h-full relative
        ${error ? (error.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50') : ''}
      `}>
        <input
          className="w-full h-full px-2 bg-transparent border-none outline-none"
          value={row[column.key] || ''}
          onChange={(e) => {
            const newRow = { ...row, [column.key]: e.target.value };
            onRowChange(newRow);
            
            // Trigger validation
            if (onCellEdit) {
              onCellEdit(rowIdx, column.key, e.target.value);
            }
          }}
          placeholder={`Enter ${column.key}`}
        />
        {error && (
          <AlertCircle className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
            error.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
          }`} />
        )}
      </div>
    );
  }, [getCellError, onCellEdit]);

  // Generate columns based on data type
  const columns = useMemo((): Column<any>[] => {
    if (data.length === 0) return [];
    
    const sampleRow = data[0];
    const columnKeys = Object.keys(sampleRow);
    
    return columnKeys.map(key => ({
      key,
      name: key,
      width: getColumnWidth(key),
      resizable: true,
      sortable: true,
      editable: true,
      renderCell: (props) => <ErrorHighlightCell {...props} />,
      renderEditCell: textEditor
    }));
  }, [data, ErrorHighlightCell]);

  // Handle row changes
  const handleRowsChange = useCallback((newRows: any[]) => {
    onDataChange(newRows);
    // Update filtered data if search is active
    if (searchState.query) {
      setSearchState(prev => ({
        ...prev,
        filteredData: newRows
      }));
    }
  }, [onDataChange, searchState.query]);

  // Natural language search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        filteredData: data,
        explanation: '',
        query: ''
      }));
      return;
    }

    setSearchState(prev => ({
      ...prev,
      isSearching: true,
      query
    }));

    try {
      const result = await NaturalLanguageSearch.searchWithPatterns(query, data, dataType);
      
      setSearchState(prev => ({
        ...prev,
        filteredData: result.filteredData,
        explanation: result.explanation,
        isSearching: false
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        filteredData: data,
        explanation: 'Search failed, showing all data',
        isSearching: false
      }));
    }
  }, [data, dataType]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    return NaturalLanguageSearch.generateSearchSuggestions(data, dataType);
  }, [data, dataType]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      isSearching: false,
      filteredData: data,
      explanation: '',
      showSuggestions: false
    });
  }, [data]);

  const displayData = searchState.query ? searchState.filteredData : data;
  const errorCount = validationErrors.length;
  const errorsByType = validationErrors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Search Interface */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold">Natural Language Search</h3>
        </div>
        
        <div className="relative">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchState.query}
              onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchState.query);
                }
              }}
              placeholder={`Search ${dataType} using natural language...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSearch(searchState.query)}
              disabled={searchState.isSearching}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {searchState.isSearching ? 'Searching...' : 'Search'}
            </button>
            {searchState.query && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Search Suggestions */}
          <div className="mt-2">
            <button
              onClick={() => setSearchState(prev => ({ ...prev, showSuggestions: !prev.showSuggestions }))}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <Lightbulb className="h-4 w-4" />
              <span>{searchState.showSuggestions ? 'Hide' : 'Show'} search examples</span>
            </button>
            
            {searchState.showSuggestions && (
              <div className="mt-2 flex flex-wrap gap-2">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchState(prev => ({ ...prev, query: suggestion }));
                      handleSearch(suggestion);
                    }}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Search Results Info */}
        {searchState.explanation && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{searchState.explanation}</span>
          </div>
        )}
      </div>

      {/* Validation Summary */}
      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Validation Issues Found</h3>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-red-700">
              {errorsByType.error || 0} errors, {errorsByType.warning || 0} warnings
            </span>
          </div>
          <div className="mt-2 text-xs text-red-600">
            Hover over highlighted cells to see detailed error messages and suggestions.
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold capitalize">{dataType} Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            {displayData.length} of {data.length} records
            {searchState.query && ` matching "${searchState.query}"`}
          </p>
        </div>
        
        {displayData.length > 0 ? (
          <div style={{ height: '500px' }}>
            <DataGrid
              columns={columns}
              rows={displayData.map((row, index) => ({ ...row, _internalIndex: index }))}
              onRowsChange={handleRowsChange}
              className="rdg-light"
              rowKeyGetter={(row) => row._internalIndex}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchState.query ? 'No records match your search' : `No ${dataType} data to display`}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to determine column width
function getColumnWidth(columnKey: string): number {
  const widthMap: Record<string, number> = {
    'ID': 120,
    'Name': 200,
    'Skills': 250,
    'RequiredSkills': 250,
    'RequestedTaskIDs': 200,
    'AvailableSlots': 150,
    'PreferredPhases': 150,
    'AttributesJSON': 200,
    'Priority': 120,
    'Status': 120,
    'CreatedAt': 150,
    'UpdatedAt': 150,
    'AssignedTo': 200,
    'Description': 300,
    'Category': 150,
    'Tags': 200,
    'Duration': 120,
    'Deadline': 150,
    'Budget': 120,
    'Location': 180,
    'ContactEmail': 200,
    'ContactPhone': 150,
    'Notes': 250,
    'Version': 100,
    'IsActive': 100,
    'Department': 150,
    'Manager': 180,
    'Team': 150,
    'Project': 180,
    'Phase': 120,
    'Milestone': 150,
    'Progress': 120,
    'CompletionRate': 150,
    'EstimatedHours': 140,
    'ActualHours': 140,
    'Resources': 200,
    'Dependencies': 250,
    'RiskLevel': 120,
    'QualityScore': 140,
    'CustomerRating': 140,
    'Feedback': 300,
    'Attachments': 200,
    'ExternalLinks': 250,
    'Metadata': 200,
    'CustomField1': 150,
    'CustomField2': 150,
    'CustomField3': 150,
    'default': 150
  };

  // Return specific width or default
  return widthMap[columnKey] || widthMap.default;
}