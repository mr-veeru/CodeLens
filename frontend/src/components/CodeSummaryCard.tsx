import React from 'react';
import LanguageIcon from './LanguageIcon';
import { FiCpu, FiCode, FiCheckCircle, FiFileText } from 'react-icons/fi';

interface CodeSummaryCardProps {
  language: string;
  explanation: string;
  isMlCode?: boolean;
  mlFrameworks?: string[];
  mlOperations?: string[];
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

const CodeSummaryCard: React.FC<CodeSummaryCardProps> = ({
  language,
  explanation,
  isMlCode = false,
  mlFrameworks = [],
  mlOperations = [],
  structure
}) => {
  return (
    <div className="bg-gray-800 text-white rounded-lg border border-gray-700 shadow-lg overflow-hidden">
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LanguageIcon language={language} size={20} />
          <h3 className="font-semibold">{language} Code Summary</h3>
        </div>
        {isMlCode && (
          <div className="px-2 py-1 bg-indigo-900 text-indigo-200 rounded-full text-xs font-semibold flex items-center">
            <FiCpu className="mr-1" size={12} />
            ML Code
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <h4 className="text-gray-400 text-sm font-medium mb-2 flex items-center">
            <FiFileText className="mr-2" size={14} />
            Summary
          </h4>
          <p className="text-sm">{explanation}</p>
        </div>
        
        {isMlCode && (
          <div className="mb-4">
            <h4 className="text-gray-400 text-sm font-medium mb-2 flex items-center">
              <FiCpu className="mr-2" size={14} />
              Machine Learning
            </h4>
            {mlFrameworks.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-gray-400">Frameworks: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {mlFrameworks.map(framework => (
                    <span 
                      key={framework} 
                      className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                    >
                      {framework}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {mlOperations.length > 0 && (
              <div>
                <span className="text-xs text-gray-400">Operations: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {mlOperations.map(operation => (
                    <span 
                      key={operation} 
                      className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                    >
                      {operation}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div>
          <h4 className="text-gray-400 text-sm font-medium mb-2 flex items-center">
            <FiCode className="mr-2" size={14} />
            Code Stats
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Lines of Code</div>
              <div className="font-semibold">{structure.total_lines}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Functions</div>
              <div className="font-semibold">{structure.function_definitions}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Classes</div>
              <div className="font-semibold">{structure.class_definitions}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Imports</div>
              <div className="font-semibold">{structure.import_statements}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Conditionals</div>
              <div className="font-semibold">{structure.conditionals}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400">Loops</div>
              <div className="font-semibold">{structure.loops}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSummaryCard; 