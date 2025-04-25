import React, { useState, useRef } from 'react';
import axios from 'axios';

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
  error?: string;
}

interface FileItem {
  name: string;
  content: string;
}

function App() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    const filePromises = newFiles.map(file => {
      return new Promise<FileItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            content: e.target?.result as string
          });
        };
        reader.readAsText(file);
      });
    });

    try {
      const newFileItems = await Promise.all(filePromises);
      setFiles(prevFiles => [...prevFiles, ...newFileItems]);
      if (newFileItems.length > 0 && !selectedFile) {
        setSelectedFile(newFileItems[0].name);
        setCode(newFileItems[0].content);
      }
    } catch (err) {
      setError('Error reading files. Please try again.');
      console.error(err);
    }

    // Reset the input value so the same files can be selected again
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

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post<ApiResponse>('http://localhost:5000/api/analyze', {
        code: code,
        filename: selectedFile || ''
      });
      
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setResult({
          language: response.data.language,
          explanation: response.data.explanation,
          structure: response.data.structure
        });
      }
    } catch (err) {
      setError('Failed to analyze code. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            CodeLens
          </h1>
          <p className="text-gray-400 text-lg">
            Understand your code better with AI-powered analysis
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Code Input</h2>
            <div className="flex space-x-2">
              <button 
                onClick={handleClear}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={handleUpload}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
          
          <textarea
            className="w-full h-64 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 font-mono text-sm resize-none"
            placeholder="Paste your code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          
          <button
            onClick={analyzeCode}
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200"
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

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
