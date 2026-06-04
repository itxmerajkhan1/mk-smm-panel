// Define a writable property wrapper for window.fetch to prevent iframe/sandboxed environment errors 
// when automation scripts or third-party polyfills try to override window.fetch
try {
  if (typeof window !== 'undefined') {
    let currentFetch = window.fetch;
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    const proto = Window.prototype;
    
    if (proto && Object.getOwnPropertyDescriptor(proto, 'fetch')?.configurable) {
      Object.defineProperty(proto, 'fetch', {
        get() { return currentFetch; },
        set(val) { currentFetch = val; },
        configurable: true,
        enumerable: true
      });
    } else if (desc?.configurable) {
      Object.defineProperty(window, 'fetch', {
        get() { return currentFetch; },
        set(val) { currentFetch = val; },
        configurable: true,
        enumerable: true
      });
    } else {
      // Fallback: If both are not configurable, let's try to define it on the window's parent proto if possible
      const winProto = Object.getPrototypeOf(window);
      if (winProto && Object.getOwnPropertyDescriptor(winProto, 'fetch')?.configurable) {
        Object.defineProperty(winProto, 'fetch', {
          get() { return currentFetch; },
          set(val) { currentFetch = val; },
          configurable: true,
          enumerable: true
        });
      }
    }
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
