import React from 'react';
import LanguageIcon from './LanguageIcon';
import { FiFolder, FiTrash2, FiChevronRight, FiChevronDown } from 'react-icons/fi';

interface FileItem {
  name: string;
  content: string;
}

interface FileExplorerProps {
  files: FileItem[];
  selectedFile: string | null;
  onFileSelect: (fileName: string) => void;
  onRemoveFile: (fileName: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  selectedFile, 
  onFileSelect,
  onRemoveFile
}) => {
  const [expanded, setExpanded] = React.useState(true);
  
  // Determine language from file extension
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const extensionMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript React',
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'py': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'html': 'HTML',
      'css': 'CSS',
      'md': 'Markdown',
      'json': 'JSON',
      'yml': 'YAML',
      'yaml': 'YAML',
      'xml': 'XML',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'txt': 'Plain Text'
    };
    
    return extensionMap[ext] || 'Plain Text';
  };
  
  // Group files by their "folders" (if filenames contain /)
  const organizeFilesByFolder = () => {
    const fileSystem: Record<string, FileItem[]> = { 
      '/': [] 
    };
    
    files.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length === 1) {
        fileSystem['/'].push(file);
      } else {
        const folderPath = parts.slice(0, -1).join('/');
        if (!fileSystem[folderPath]) {
          fileSystem[folderPath] = [];
        }
        fileSystem[folderPath].push({
          ...file,
          name: parts[parts.length - 1]
        });
      }
    });
    
    return fileSystem;
  };
  
  // In this simplified version, we'll just render files in a flat list
  // but the structure is extensible for folder organization
  
  return (
    <div className="bg-gray-800 text-white h-full w-full rounded-lg overflow-hidden border border-gray-700">
      <div 
        className="px-3 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          {expanded ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
          <span className="font-medium">EXPLORER</span>
        </div>
        <span className="text-xs text-gray-400">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>
      
      {expanded && (
        <div className="p-1 max-h-[calc(100vh-300px)] overflow-y-auto">
          {files.length === 0 ? (
            <div className="text-gray-500 text-sm p-2">
              No files uploaded yet
            </div>
          ) : (
            <div>
              {files.map((file) => {
                const language = getLanguageFromFilename(file.name);
                return (
                  <div 
                    key={file.name}
                    className={`flex items-center justify-between p-1 px-2 rounded cursor-pointer text-sm hover:bg-gray-700 ${
                      selectedFile === file.name ? 'bg-blue-900 bg-opacity-50' : ''
                    }`}
                    onClick={() => onFileSelect(file.name)}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <LanguageIcon language={language} size={18} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.name);
                      }}
                      title="Remove file"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer; 