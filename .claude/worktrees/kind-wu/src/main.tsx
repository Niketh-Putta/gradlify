import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import 'katex/dist/katex.min.css'
import { flagBrokenLatex } from './scripts/flagBrokenLatex'
import { isAbortLikeError } from './lib/errors'

// Expose flag function to window for admin use
(window as Window & { flagBrokenLatex?: typeof flagBrokenLatex }).flagBrokenLatex = flagBrokenLatex;

// Supabase may cancel stale in-flight requests during rapid route/session transitions.
// Treat those as expected cancellations instead of noisy uncaught promise errors.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isAbortLikeError(event.reason)) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
