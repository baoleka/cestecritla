import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('#root missing');
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// Variant 1 (CSR): the HTML ships an empty #root. Variant 1b (prerendered, scripts/prerender.ts):
// the HTML already contains the page, React only hydrates it. Same bundle in both cases.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
