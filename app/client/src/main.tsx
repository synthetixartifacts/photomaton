import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ConfigProvider } from './contexts/ConfigContext.tsx';
import './index.css';

// Prevent browser back/forward navigation
// Push a dummy state to prevent accidental navigation away from the app
window.history.pushState(null, '', window.location.href);
window.addEventListener('popstate', () => {
  window.history.pushState(null, '', window.location.href);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </AuthProvider>
  </React.StrictMode>,
);