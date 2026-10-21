import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { IncomeProvider } from './app/income';
import './index.css';
import './tokens.css';
import './components.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <IncomeProvider>
      <App />
    </IncomeProvider>
  </StrictMode>,
);
