import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FileExplorer from './components/FileExplorer';
import LanguageIcon from './components/LanguageIcon';
import CodeSummaryCard from './components/CodeSummaryCard';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Something went wrong</h2>
          <p>Please refresh the page and try again</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Toast Notification component
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed bottom-8 right-8 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg border border-gray-700 flex items-center space-x-3 animate-fade-in z-50">
      <div className="text-green-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p>{message}</p>
    </div>
  );
};

interface AnalysisResult {
  language: string;
  explanation: string;
  structure: {
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
  };
  documented_code: string;
}

interface ApiResponse {
  language: string;
  explanation: string;
  structure: {
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
  };
  documented_code: string;
  error?: string;
}

interface FileItem {
  name: string;
  content: string;
}

// File validation constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.html', '.css', '.json', '.yaml', '.yml', '.xml', '.md'
];

function App() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleClear = () => {
    setCode('');
    setResult(null);
    setError('');
    setFiles([]);
    setSelectedFile(null);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 1MB limit';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_FILE_TYPES.includes(`.${ext}`)) {
      return 'File type not supported';
    }
    
    return null;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    
    // Validate files
    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
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
    } catch (err) {
      setError('Error reading files. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleFileSelect = (fileName: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      setSelectedFile(fileName);
      setCode(file.content);
    }
  };

  const removeFile = (fileName: string) => {
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
  };

  const analyzeCode = async (code: string) => {
    try {
      const analysisResponse = await axios.post<ApiResponse>('http://localhost:5000/analyze', { code });
      setResult(analysisResponse.data);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'An error occurred while analyzing the code');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // Show toast instead of alert
        setToastMessage('Code copied to clipboard!');
        setShowToast(true);
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setToastMessage('Failed to copy code');
        setShowToast(true);
      }
    );
  };

  const closeToast = () => {
    setShowToast(false);
  };

  // Function to determine the language for syntax highlighting
  const getSyntaxHighlightLanguage = (language: string): string => {
    // Map our language detection to syntax highlighter's language names
    const languageMap: { [key: string]: string } = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'JavaScript React': 'jsx',
      'TypeScript React': 'tsx',
      'Python': 'python',
      'Java': 'java',
      'C#': 'csharp',
      'C++': 'cpp',
      'HTML': 'html',
      'CSS': 'css',
      'JSON': 'json',
      'YAML': 'yaml',
      'XML': 'xml',
      'Markdown': 'markdown',
      'Environment Variables': 'bash',
      'Plain Text': 'text'
    };
    
    return languageMap[language] || 'text';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">CodeLens</h1>
          <p className="text-gray-400">Analyze and understand code with AI</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with file explorer */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <FileExplorer 
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onRemoveFile={removeFile}
                />
              
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={handleUpload}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center justify-center"
                  >
                    Upload File
                  </button>
                  <button 
                    onClick={handleClear}
                    className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                  >
                    Clear
                  </button>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.html,.css,.json,.yaml,.yml,.xml,.md"
                />
              </div>
            </div>

            {/* Main content area */}
            <div className="lg:col-span-3">
              {/* Code input section */}
              <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
                <div className="flex items-center mb-4">
                  {selectedFile && (
                    <div className="flex items-center text-gray-400 text-sm mr-4">
                      <LanguageIcon 
                        language={result?.language || "Unknown"} 
                        size={16} 
                        className="mr-2" 
                      />
                      {selectedFile}
                    </div>
                  )}
                  <div className="ml-auto flex gap-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                      onClick={() => analyzeCode(code)}
                      disabled={loading || !code.trim()}
                    >
                      {loading ? 'Analyzing...' : 'Analyze Code'}
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 relative">
                  <textarea
                    className="w-full bg-gray-900 text-white font-mono p-4 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[300px]"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your code here or upload a file..."
                    rows={15}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Error</h3>
                  <p>{error}</p>
                </div>
              )}

              {/* Results section */}
              {result && (
                <div className="mt-6 space-y-6">
                  {/* Code Summary Card */}
                  <CodeSummaryCard 
                    language={result.language}
                    explanation={result.explanation}
                    isMlCode={!!result.structure.ml_frameworks}
                    mlFrameworks={result.structure.ml_frameworks}
                    mlOperations={result.structure.ml_operations}
                    structure={result.structure}
                  />
                  
                  {/* Documented code section */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                    <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold">
                        Documented Code
                      </h3>
                      <button
                        onClick={() => copyToClipboard(result.documented_code)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="overflow-auto">
                      <SyntaxHighlighter
                        language={getSyntaxHighlightLanguage(result.language)}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          background: 'transparent'
                        }}
                        showLineNumbers={true}
                      >
                        {result.documented_code}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </main>

      {showToast && (
        <Toast message={toastMessage} onClose={closeToast} />
      )}
    </div>
  );
}

export default App;
