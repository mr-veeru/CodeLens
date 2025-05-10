/**
 * CodeVisualization Component
 * Renders interactive code structure diagrams and visualizations.
 * Supports dynamic rendering of code diagrams with error handling.
 */

import React from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * Props interface for the CodeVisualization component
 */
interface CodeVisualizationProps {
  /** SVG or HTML string containing the code structure diagram */
  diagram: string;
}

/**
 * CodeVisualization Component
 * Renders code structure diagrams with support for:
 * - Dynamic diagram rendering
 * - Error handling and fallback UI
 * - Responsive container sizing
 * 
 * @param diagram - SVG or HTML string containing the code structure diagram
 * @returns React component with the rendered visualization
 */
const CodeVisualization: React.FC<CodeVisualizationProps> = ({ diagram }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  /**
   * Effect hook to render the diagram when it changes
   * Handles error cases and updates the container content
   */
  useEffect(() => {
    if (!containerRef.current || !diagram) return;
    
    try {
      // Render visualization in the container
      containerRef.current.innerHTML = diagram;
    } catch (e) {
      console.error('Error rendering visualization:', e);
      setError('Failed to render code visualization');
    }
  }, [diagram]);

  // Render error state if visualization fails
  if (error) {
    return <div className="p-4 bg-red-900/50 text-red-200 rounded">{error}</div>;
  }

  return (
    <div className="visualization-container">
      <div className="controls flex justify-end mb-2">
        {/* Future implementation: Add zoom and pan controls */}
      </div>
      <div 
        ref={containerRef} 
        className="p-4 bg-gray-850 rounded overflow-auto"
      />
    </div>
  );
};

export default CodeVisualization; 