import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Global ESC key → stop speech synthesis
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.speechSynthesis?.cancel();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);