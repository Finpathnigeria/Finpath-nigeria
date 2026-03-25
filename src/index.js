import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App, null)
  )
);

// Hide splash screen
if (window.__hideSplash) {
  setTimeout(window.__hideSplash, 400);
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(reg) {
        console.log('[SW] Registered:', reg.scope);
      })
      .catch(function(err) {
        console.log('[SW] Registration failed:', err);
      });
  });
}
