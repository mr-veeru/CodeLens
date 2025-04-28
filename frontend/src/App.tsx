import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4 drop-shadow-lg">
              CodeLens
            </h1>
            <p className="text-gray-400 text-lg">
              Understand your code better with AI-powered analysis
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Code Input</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={handleClear}
                  className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
                  data-testid="clear-button"
                >
                  Clear All
                </button>
                <button 
                  onClick={handleUpload}
                  className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
                  data-testid="upload-button"
                >
                  Upload Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.js,.py,.java,.cpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.ts,.jsx,.tsx,.html,.css,.json,.env,.yml,.yaml,.xml,.md,.sql,.sh,.bash,.zsh,.conf,.toml,.ini,.cfg,.config,.lock,.gradle,.maven,.sln,.csproj,.vscode,.idea,.git*,.dockerignore,.eslintrc,.prettierrc,.babelrc,.webpack*,.next*,.env.*"
                  multiple
                  className="hidden"
                  data-testid="file-input"
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Uploaded Files</h3>
                <div className="flex flex-wrap gap-2">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm ${
                        selectedFile === file.name
                          ? 'bg-blue-700 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <button
                        onClick={() => handleFileSelect(file.name)}
                        className="flex-1 text-left truncate max-w-[200px]"
                      >
                        {file.name}
                      </button>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="relative border border-gray-800 rounded-lg" style={{ height: '320px' }}>
              <textarea
                className="w-full h-full p-4 bg-transparent text-white caret-white resize-none outline-none font-mono text-sm"
                placeholder="Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ caretColor: 'white', minHeight: '320px', maxHeight: '320px', overflow: 'auto' }}
              />
            </div>
            
            <button
              onClick={() => analyzeCode(code)}
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-all duration-200 shadow-lg"
              data-testid="analyze-button"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Analyze Code'
              )}
            </button>
          </div>

          {loading && <LoadingSpinner />}
          
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" data-testid="error-message">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700" data-testid="analysis-result">
              <h2 className="text-2xl font-semibold text-gray-200 mb-6">Analysis Results</h2>
              <div className="space-y-6">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Language</h3>
                  <p className="text-blue-400 font-mono">{result.language}</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Code Structure</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Total Lines</p>
                      <p className="text-xl font-semibold text-blue-400">{result.structure.total_lines}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Functions</p>
                      <p className="text-xl font-semibold text-green-400">{result.structure.function_definitions}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Classes</p>
                      <p className="text-xl font-semibold text-purple-400">{result.structure.class_definitions}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Variables</p>
                      <p className="text-xl font-semibold text-yellow-400">{result.structure.variable_declarations}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Loops</p>
                      <p className="text-xl font-semibold text-pink-400">{result.structure.loops}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Conditionals</p>
                      <p className="text-xl font-semibold text-indigo-400">{result.structure.conditionals}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Imports</p>
                      <p className="text-xl font-semibold text-orange-400">{result.structure.import_statements}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Comments</p>
                      <p className="text-xl font-semibold text-gray-400">{result.structure.comment_lines}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-400">Empty Lines</p>
                      <p className="text-xl font-semibold text-gray-400">{result.structure.empty_lines}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Explanation</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{result.explanation}</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-300">Documented Code</h3>
                    <button 
                      onClick={() => copyToClipboard(result.documented_code)}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                  <div className="rounded-lg border border-gray-700" style={{ minHeight: '320px', maxHeight: '320px' }}>
                    <SyntaxHighlighter 
                      language={getSyntaxHighlightLanguage(result.language)}
                      style={vscDarkPlus}
                      showLineNumbers={true}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        borderRadius: 0,
                        minHeight: '320px',
                        maxHeight: '320px',
                        background: 'rgb(15, 23, 42)',
                        overflow: 'auto'
                      }}
                      codeTagProps={{
                        style: {
                          fontSize: '0.875rem',
                          fontFamily: '"Consolas", "Monaco", "Andale Mono", monospace'
                        }
                      }}
                    >
                      {result.documented_code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Toast notification */}
        {showToast && (
          <Toast message={toastMessage} onClose={closeToast} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
