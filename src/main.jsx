import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dev-only handle for inspecting the simulation from the browser console.
if (import.meta.env.DEV) {
  import('./sim/world').then(({ world }) => {
    window.__ocean = world;
  });
}
