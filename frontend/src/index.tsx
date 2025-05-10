/**
 * Application Entry Point
 * Initializes the React application and sets up the global context provider.
 * This is the root component that bootstraps the entire application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { CodeProvider } from './contexts/CodeContext';

// Create root element for React application
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render the application with strict mode and context provider
root.render(
  <React.StrictMode>
    <CodeProvider>
      <App />
    </CodeProvider>
  </React.StrictMode>
);
