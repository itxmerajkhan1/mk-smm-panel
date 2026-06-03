// Define a writable property wrapper for window.fetch to prevent iframe/sandboxed environment errors 
// when automation scripts or third-party polyfills try to override window.fetch
try {
  if (typeof window !== 'undefined') {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(val) {
        currentFetch = val;
      },
      configurable: true,
      enumerable: true
    });
  }
} catch (error) {
  console.warn('Failed to define fetch setter on window:', error);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
