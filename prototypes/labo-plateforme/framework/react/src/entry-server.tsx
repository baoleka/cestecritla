/** Server entry for the prerendered variant (scripts/prerender.ts): renders <App /> to a string at build time. */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App.tsx';

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
