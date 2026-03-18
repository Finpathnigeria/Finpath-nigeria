import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide the splash screen once React has mounted
if (window.__hideSplash) {
  setTimeout(window.__hideSplash, 400);
}

// Register service worker for PWA offline support
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('[App] FinPath is cached and ready for offline use.');
  },
  onUpdate: (registration) => {
    console.log('[App] New version of FinPath available.');
    // The usePWA hook will detect this and show the update banner
  },
});
