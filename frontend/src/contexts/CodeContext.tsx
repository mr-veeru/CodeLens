/**
 * CodeContext Module
 * Provides global state management for code analysis functionality.
 * Handles file operations, code analysis, and maintains application state.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';

/**
 * API Configuration
 * Defines base URL and endpoints for the code analysis service
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/analyze`
};

/**
 * Type Definitions
 */

/**
 * Represents a file in the application
 */
export interface FileItem {
  /** Name of the file including path */
  name: string;
  /** Content of the file as string */
  content: string;
}

/**
 * Represents the structure analysis of code
 */
export interface CodeStructure {
  /** Total number of lines in the code */
  total_lines: number;
  /** Number of empty lines */
  empty_lines: number;
  /** Number of comment lines */
  comment_lines: number;
  /** Number of import statements */
  import_statements: number;
  /** Number of function definitions */
  function_definitions: number;
  /** Number of class definitions */
  class_definitions: number;
  /** Number of variable declarations */
  variable_declarations: number;
  /** Number of loop statements */
  loops: number;
  /** Number of conditional statements */
  conditionals: number;
  /** List of detected ML frameworks */
  ml_frameworks?: string[];
  /** List of detected ML operations */
  ml_operations?: string[];
  /** Detailed code structure analysis */
  detailed_structure?: any;
}

/**
 * Represents the complete analysis result
 */
export interface AnalysisResult {
  /** Detected programming language */
  language: string;
  /** AI-generated explanation of the code */
  explanation: string;
  /** Code structure analysis results */
  structure: CodeStructure;
  /** Code with added documentation */
  documented_code: string;
  /** Additional metadata about the analysis */
  meta?: {
    processing_time_ms: number;
    timestamp: string;
    api_version: string;
  };
}

/**
 * Context interface defining available operations and state
 */
interface CodeContextType {
  /** Current code content */
  code: string;
  /** Function to update code content */
  setCode: (code: string) => void;
  /** List of uploaded files */
  files: FileItem[];
  /** Currently selected file name */
  selectedFile: string | null;
  /** Latest analysis result */
  result: AnalysisResult | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error message if any */
  error: string;
  /** Function to analyze current code */
  analyzeCode: () => Promise<void>;
  /** Function to select a file */
  handleFileSelect: (fileName: string) => void;
  /** Function to handle file uploads */
  handleFileUpload: (newFiles: File[]) => Promise<void>;
  /** Function to remove a file */
  removeFile: (fileName: string) => void;
  /** Function to clear all state */
  clearAll: () => void;
}

/**
 * Create the context with undefined default value
 */
const CodeContext = createContext<CodeContextType | undefined>(undefined);

/**
 * File validation configuration
 */
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.html', '.css', '.json', '.yaml', '.yml', '.xml', '.md'
];

/**
 * CodeProvider Component
 * Provides code analysis functionality and state management
 * 
 * @param children - Child components that will have access to the context
 */
export const CodeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  /**
   * Validates a file against size and type constraints
   * @param file - File to validate
   * @returns Error message if validation fails, null if valid
   */
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 1MB limit';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_FILE_TYPES.includes(`.${ext}`)) {
      return 'File type not supported';
    }
    
    return null;
  }, []);

  /**
   * Handles file uploads with validation and content reading
   * @param newFiles - Array of files to upload
   */
  const handleFileUpload = useCallback(async (newFiles: File[]) => {
    // Validate files
    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return Promise.reject(error);
      }
    }

    setLoading(true);
    setError('');

    try {
      const filePromises = newFiles.map(file => {
        return new Promise<FileItem>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              content: e.target?.result as string
            });
          };
          reader.onerror = () => reject(new Error('Error reading file'));
          reader.readAsText(file);
        });
      });

      const newFileItems = await Promise.all(filePromises);
      setFiles(prevFiles => [...prevFiles, ...newFileItems]);
      
      if (newFileItems.length > 0 && !selectedFile) {
        setSelectedFile(newFileItems[0].name);
        setCode(newFileItems[0].content);
      }
      
      return Promise.resolve();
    } catch (err) {
      const errorMsg = 'Error reading files. Please try again.';
      setError(errorMsg);
      console.error(err);
      return Promise.reject(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, validateFile]);

  /**
   * Handles file selection and updates current code
   * @param fileName - Name of the file to select
   */
  const handleFileSelect = useCallback((fileName: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      setSelectedFile(fileName);
      setCode(file.content);
    }
  }, [files]);

  /**
   * Removes a file from the list and updates selection if needed
   * @param fileName - Name of the file to remove
   */
  const removeFile = useCallback((fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(f => f.name !== fileName));
    if (selectedFile === fileName) {
      if (files.length > 1) {
        const nextFile = files.find(f => f.name !== fileName);
        if (nextFile) {
          setSelectedFile(nextFile.name);
          setCode(nextFile.content);
        }
      } else {
        setSelectedFile(null);
        setCode('');
      }
    }
  }, [files, selectedFile]);

  /**
   * Analyzes the current code using the API
   */
  const analyzeCode = useCallback(async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const analysisResponse = await axios.post<AnalysisResult>(
        API_ENDPOINTS.analyze, 
        { 
          code,
          filename: selectedFile || undefined
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 seconds timeout
        }
      );
      
      setResult(analysisResponse.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message || 'An error occurred while analyzing the code';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred');
        console.error('Unexpected error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [code, selectedFile]);

  /**
   * Clears all state and resets the application
   */
  const clearAll = useCallback(() => {
    setCode('');
    setResult(null);
    setError('');
    setFiles([]);
    setSelectedFile(null);
  }, []);

  const value = {
    code,
    setCode,
    files,
    selectedFile,
    result,
    loading,
    error,
    analyzeCode,
    handleFileSelect,
    handleFileUpload,
    removeFile,
    clearAll
  };

  return (
    <CodeContext.Provider value={value}>
      {children}
    </CodeContext.Provider>
  );
};

/**
 * Custom hook to use the CodeContext
 * @returns CodeContextType - The context value
 * @throws Error if used outside of CodeProvider
 */
export const useCode = (): CodeContextType => {
  const context = useContext(CodeContext);
  if (context === undefined) {
    throw new Error('useCode must be used within a CodeProvider');
  }
  return context;
}; 