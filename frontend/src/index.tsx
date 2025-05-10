import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { CodeProvider } from './contexts/CodeContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <CodeProvider>
      <App />
    </CodeProvider>
  </React.StrictMode>
);
