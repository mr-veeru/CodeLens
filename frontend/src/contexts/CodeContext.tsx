import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/analyze`
};

// Types
export interface FileItem {
  name: string;
  content: string;
}

export interface CodeStructure {
  total_lines: number;
  empty_lines: number;
  comment_lines: number;
  import_statements: number;
  function_definitions: number;
  class_definitions: number;
  variable_declarations: number;
  loops: number;
  conditionals: number;
  ml_frameworks?: string[];
  ml_operations?: string[];
  detailed_structure?: any;
}

export interface AnalysisResult {
  language: string;
  explanation: string;
  structure: CodeStructure;
  documented_code: string;
  meta?: {
    processing_time_ms: number;
    timestamp: string;
    api_version: string;
  };
}

interface CodeContextType {
  code: string;
  setCode: (code: string) => void;
  files: FileItem[];
  selectedFile: string | null;
  result: AnalysisResult | null;
  loading: boolean;
  error: string;
  analyzeCode: () => Promise<void>;
  handleFileSelect: (fileName: string) => void;
  handleFileUpload: (newFiles: File[]) => Promise<void>;
  removeFile: (fileName: string) => void;
  clearAll: () => void;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

// File validation constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.html', '.css', '.json', '.yaml', '.yml', '.xml', '.md'
];

export const CodeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

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

  const handleFileSelect = useCallback((fileName: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      setSelectedFile(fileName);
      setCode(file.content);
    }
  }, [files]);

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

// Custom hook to use the CodeContext
export const useCode = (): CodeContextType => {
  const context = useContext(CodeContext);
  if (context === undefined) {
    throw new Error('useCode must be used within a CodeProvider');
  }
  return context;
}; 