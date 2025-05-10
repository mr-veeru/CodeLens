/**
 * CodeLens - AI-powered code analysis and documentation tool
 * Frontend application built with React and Material-UI
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FileExplorer from './components/FileExplorer';
import LanguageIcon from './components/LanguageIcon';
import CodeSummaryCard from './components/CodeSummaryCard';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import { useCode } from './contexts/CodeContext';

/**
 * Dark theme configuration for Material-UI
 */
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Tailwind blue-500
    },
    secondary: {
      main: '#64748b', // Tailwind slate-500
    },
    background: {
      default: '#111827', // Tailwind gray-900
      paper: '#1f2937', // Tailwind gray-800
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

/**
 * ErrorBoundary - Catches and handles runtime errors in child components
 * Provides a fallback UI when errors occur
 */
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

/**
 * Loading Spinner Component
 * Displays a circular progress indicator
 */
const LoadingSpinner = () => (
  <CircularProgress size={24} color="inherit" />
);

/**
 * Toast - Displays temporary notifications with auto-dismiss functionality
 * @param message - The notification message to display
 * @param onClose - Callback function when toast is dismissed
 */
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

/**
 * CodeEditor - Interactive code input component with language detection
 * @param code - Current code content
 * @param onChange - Handler for code changes
 * @param selectedFile - Currently selected file name
 * @param language - Detected programming language
 * @param onAnalyze - Handler for code analysis
 * @param loading - Loading state indicator
 */
const CodeEditor = ({ 
  code, 
  onChange, 
  selectedFile,
  language,
  onAnalyze,
  loading
}: { 
  code: string; 
  onChange: (code: string) => void;
  selectedFile: string | null;
  language: string;
  onAnalyze: () => void;
  loading: boolean;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
      <div className="flex items-center mb-4">
        {selectedFile && (
          <div className="flex items-center text-gray-400 text-sm mr-4">
            <LanguageIcon 
              language={language} 
              size={16} 
              className="mr-2" 
            />
            {selectedFile}
          </div>
        )}
        <div className="ml-auto">
          <Button
            variant="contained"
            color="primary"
            onClick={onAnalyze}
            disabled={loading || !code.trim()}
            startIcon={loading ? <LoadingSpinner /> : <CodeIcon />}
          >
            {loading ? 'Analyzing...' : 'Analyze Code'}
          </Button>
        </div>
      </div>
      
      <div className="mt-4 relative">
        <textarea
          className="w-full bg-gray-900 text-white font-mono p-4 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[300px]"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your code here or upload a file..."
          rows={15}
        />
      </div>
    </div>
  );
};

/**
 * DocumentedCodeViewer - Displays code with syntax highlighting and documentation
 * @param documentedCode - Code with added documentation
 * @param language - Programming language for syntax highlighting
 * @param onCopy - Handler for copying code to clipboard
 */
const DocumentedCodeViewer = ({
  documentedCode,
  language,
  onCopy
}: {
  documentedCode: string;
  language: string;
  onCopy: () => void;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold">
          Documented Code
        </h3>
        <Button
          variant="outlined"
          size="small"
          onClick={onCopy}
        >
          Copy
        </Button>
      </div>
      <div className="overflow-auto h-[500px]">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent'
          }}
          showLineNumbers={true}
        >
          {documentedCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

/**
 * Main Application Component
 * Orchestrates the code analysis workflow
 */
function App() {
  const {
    code,
    setCode,
    files,
    selectedFile,
    result,
    loading,
    error,
    analyzeCode: contextAnalyzeCode,
    handleFileSelect,
    handleFileUpload,
    removeFile,
    clearAll
  } = useCode();

  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToast, setShowToast] = useState(false);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    await handleFileUpload(newFiles);
    
    if (event.target) {
      event.target.value = '';
    }
  }, [handleFileUpload]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setToastMessage('Code copied to clipboard!');
        setShowToast(true);
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setToastMessage('Failed to copy code');
        setShowToast(true);
      }
    );
  }, []);

  const closeToast = useCallback(() => {
    setShowToast(false);
  }, []);

  // Function to determine the language for syntax highlighting
  const getSyntaxHighlightLanguage = useCallback((language: string): string => {
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
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold flex items-center">
              <CodeIcon className="mr-2" /> CodeLens
            </h1>
            <p className="text-gray-400">AI-powered code analysis and documentation</p>
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
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleUpload}
                      startIcon={<UploadFileIcon />}
                    >
                      Upload File
                    </Button>
                    <Button 
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      onClick={clearAll}
                      startIcon={<DeleteIcon />}
                    >
                      Clear
                    </Button>
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
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  selectedFile={selectedFile}
                  language={result?.language || "Unknown"}
                  onAnalyze={contextAnalyzeCode}
                  loading={loading}
                />

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
                    <DocumentedCodeViewer
                      documentedCode={result.documented_code}
                      language={getSyntaxHighlightLanguage(result.language)}
                      onCopy={() => copyToClipboard(result.documented_code)}
                    />
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
    </ThemeProvider>
  );
}

export default App;
