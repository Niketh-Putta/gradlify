import 'katex/dist/katex.min.css';
import katex from 'katex';
import { normalizeMath, getLastDebugInfo } from '@/lib/latexNormalizer';
import { useState, useEffect } from 'react';

interface MathRendererProps {
  content: string;
  display?: boolean;
  className?: string;
}

// Global debug mode toggle
let globalDebugMode = false;
if (typeof window !== 'undefined') {
  globalDebugMode = localStorage.getItem('katex-debug-mode') === 'true';
}

export function toggleKatexDebugMode(): boolean {
  globalDebugMode = !globalDebugMode;
  if (typeof window !== 'undefined') {
    localStorage.setItem('katex-debug-mode', String(globalDebugMode));
  }
  // Force re-render of all math
  window.dispatchEvent(new CustomEvent('katex-debug-toggle'));
  return globalDebugMode;
}

export function isKatexDebugMode(): boolean {
  return globalDebugMode;
}

/**
 * Repairs broken LaTeX where backslashes were interpreted as escape chars
 * e.g., \frac → form-feed + "rac", \times → tab + "imes"
 */
function repairBrokenLatex(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Fix missing backslashes on common LaTeX commands
  // sqrt{...} → \sqrt{...}
  result = result.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
  
  // sqrt(...) → \sqrt{...}
  result = result.replace(/(?<!\\)sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  
  // sqrtN → \sqrt{N}
  result = result.replace(/(?<!\\)sqrt(\d+)/g, '\\sqrt{$1}');
  
  // frac{...}{...} → \frac{...}{...}
  result = result.replace(/(?<!\\)frac\{/g, '\\frac{');
  
  // times → \times
  result = result.replace(/(?<!\\)times(?![a-zA-Z])/g, '\\times');
  
  // pi → \pi (but not in words)
  result = result.replace(/(?<!\\)\bpi\b/g, '\\pi');
  
  // Convert simple fractions like 1/sqrt{3} to \frac{1}{\sqrt{3}}
  result = result.replace(/(\d+|[a-zA-Z])\/\\sqrt\{([^}]+)\}/g, '\\frac{$1}{\\sqrt{$2}}');
  
  // Fix common broken patterns where backslash was eaten
  // \f (form feed) eaten: "rac{" should be "\frac{"
  result = result.replace(/(?<![\\a-zA-Z])rac\{/g, '\\frac{');
  
  // \t (tab) eaten: "imes" should be "\times"
  result = result.replace(/(?<![\\a-zA-Z])imes(?![a-zA-Z])/g, '\\times');
  
  // "ext{" should be "\text{" (also \t eaten)
  result = result.replace(/(?<![\\a-zA-Z])ext\{/g, '\\text{');
  
  // \s (whitespace char): "qrt{" should be "\sqrt{"
  result = result.replace(/(?<![\\a-zA-Z])qrt\{/g, '\\sqrt{');
  
  // Also handle sqrt without braces followed by number
  result = result.replace(/(?<![\\a-zA-Z])qrt(\d)/g, '\\sqrt{$1}');
  
  // \d: "iv" should be "\div"
  result = result.replace(/(?<![\\a-zA-Z])iv(?![a-zA-Z])/g, '\\div');
  
  // \p: "m" at word boundary could be "\pm" - but be careful
  result = result.replace(/(?<![\\a-zA-Z])m(?=\s|$|\d|[+\-=])/g, '\\pm');
  
  // \c: "dot" should be "\cdot"
  result = result.replace(/(?<![\\a-zA-Z])dot(?![a-zA-Z])/g, '\\cdot');

  // \texttimes or plain 'texttimes' should become \times
  if (/\\?texttimes/i.test(result)) {
    result = result.replace(/\\?texttimes\b/gi, '\\times');
    result = result.replace(/\\?texttimes(?=[A-Za-z0-9])/gi, '\\times ');
  }
  
  // Handle actual escaped sequences that appear as whitespace/control chars
  // Form feed character (ASCII 12) + "rac" → \frac
  const FORM_FEED = String.fromCharCode(12);
  const TAB = String.fromCharCode(9);
  result = result.replace(new RegExp(`${FORM_FEED}\\s*rac\\{`, 'g'), '\\frac{');
  
  // Tab character (ASCII 9) + "imes" → \times
  result = result.replace(new RegExp(`${TAB}\\s*imes`, 'g'), '\\times');
  
  // Tab + "ext" → \text
  result = result.replace(new RegExp(`${TAB}\\s*ext\\{`, 'g'), '\\text{');
  
  // Handle double-escaped becoming single (\\frac in JSON → \frac)
  // This is actually correct, but sometimes gets double-escaped
  result = result.replace(/\\\\frac\{/g, '\\frac{');
  result = result.replace(/\\\\sqrt\{/g, '\\sqrt{');
  result = result.replace(/\\\\times/g, '\\times');
  result = result.replace(/\\\\div/g, '\\div');
  result = result.replace(/\\\\pm/g, '\\pm');
  result = result.replace(/\\\\cdot/g, '\\cdot');
  
  return result;
}

/**
 * Renders text with math notation using KaTeX
 * Automatically normalizes and sanitizes all LaTeX
 * 100% CRASH-PROOF with debug mode support
 */
export function MathRenderer({ content, display = false, className = "" }: MathRendererProps) {
  const [debugMode, setDebugMode] = useState(globalDebugMode);
  
  useEffect(() => {
    const handler = () => setDebugMode(globalDebugMode);
    window.addEventListener('katex-debug-toggle', handler);
    return () => window.removeEventListener('katex-debug-toggle', handler);
  }, []);

  if (!content) return null;

  try {
    // FIRST: Repair broken LaTeX where backslashes were eaten
    const repaired = repairBrokenLatex(content);
    
    // THEN: Normalize and sanitize
    const normalized = normalizeMath(repaired);
    const sanitized = normalized;
    const debugInfo = debugMode ? getLastDebugInfo() : null;

    // For display mode (block equations), render directly
    if (display) {
      try {
        const html = katex.renderToString(sanitized, {
          displayMode: true,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'html'
        });
        
        return (
          <>
            {debugMode && debugInfo && (
              <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs font-mono">
                <div className="font-bold mb-1">LaTeX Debug:</div>
                <div><span className="text-gray-600 dark:text-gray-400">Original:</span> {debugInfo.original}</div>
                <div><span className="text-gray-600 dark:text-gray-400">Normalized:</span> {debugInfo.normalized}</div>
                {debugInfo.transformations.length > 0 && (
                  <div className="mt-1 text-blue-700 dark:text-blue-300">
                    Fixes: {debugInfo.transformations.join(', ')}
                  </div>
                )}
              </div>
            )}
            <div 
              className={`my-4 overflow-x-auto ${className}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </>
        );
      } catch (error) {
        console.warn('KaTeX display render failed, falling back to plain text:', error);
        return (
          <div className={className}>
            {debugMode && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-xs">
                <div className="font-bold text-red-700 dark:text-red-300">Render Error</div>
                <div className="text-red-600 dark:text-red-400">{String(error)}</div>
              </div>
            )}
            {content}
          </div>
        );
      }
    }

    // For inline mode, process mixed text and math
    return (
      <>
        {debugMode && debugInfo && (
          <div className="inline-block mb-1 mr-2 p-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs font-mono">
            <span className="font-bold">Debug:</span> {debugInfo.original} → {debugInfo.normalized}
            {debugInfo.transformations.length > 0 && (
              <span className="ml-1 text-blue-700 dark:text-blue-300">
                [{debugInfo.transformations.join(', ')}]
              </span>
            )}
          </div>
        )}
        <span 
          className={className}
          dangerouslySetInnerHTML={{ __html: renderInlineWithMath(sanitized) }}
        />
      </>
    );
  } catch (error) {
    console.error('MathRenderer error, falling back to plain text:', error);
    return (
      <span className={className}>
        {debugMode && (
          <span className="inline-block mr-1 px-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">
            [Render Error]
          </span>
        )}
        {content}
      </span>
    );
  }
}

/**
 * Renders text that may contain both regular text and inline math
 * Wraps detected math expressions with KaTeX rendering
 */
function renderInlineWithMath(text: string): string {
  if (!text) return '';
  
  try {
    // FIRST: Repair any broken LaTeX patterns
    let cleanText = repairBrokenLatex(text);
    
    // Remove ALL remaining dollar signs
    cleanText = cleanText.replace(/\$/g, '');

    const delimiterRegex = /\\\((.+?)\\\)|\\\[(.+?)\\\]/g;
    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = delimiterRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        result += renderInlineMathInPlainText(cleanText.slice(lastIndex, match.index));
      }

      const mathContent = match[1] ?? match[2] ?? '';
      const isDisplay = Boolean(match[2]);

      try {
        result += katex.renderToString(mathContent, {
          displayMode: isDisplay,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'html'
        });
      } catch (error) {
        console.warn('KaTeX inline delimiter render failed, using plain text:', mathContent, error);
        result += escapeHtml(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex === 0) {
      return renderInlineMathInPlainText(cleanText);
    }

    if (lastIndex < cleanText.length) {
      result += renderInlineMathInPlainText(cleanText.slice(lastIndex));
    }

    return result || escapeHtml(cleanText);
  } catch (error) {
    console.error('renderInlineWithMath error:', error);
    return escapeHtml(text);
  }
}

function renderInlineMathInPlainText(text: string): string {
  // Look for LaTeX commands and render them
  // Enhanced regex to catch more LaTeX patterns including \times, \div, etc.
  const mathPatternRegex = /(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\sqrt[0-9]+|[a-zA-Z0-9]+\^\\circ|[a-zA-Z0-9]+\^\{[^}]+\}|\\(?:sin|cos|tan|cot|sec|csc|log|ln|exp)\([^)]+\)|\\[a-z]+\{[^}]+\}|\\times|\\div|\\pm|\\cdot|\\leq|\\geq|\\le|\\ge|\\neq|\\approx|\\[a-z]+)/g;

  let lastIndex = 0;
  let result = '';
  let match;

  while ((match = mathPatternRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, match.index));
    }

    try {
      const mathHtml = katex.renderToString(match[0], {
        displayMode: false,
        throwOnError: false,
        strict: false,
        trust: false,
        output: 'html'
      });
      result += mathHtml;
    } catch (error) {
      // SAFE FALLBACK: Plain text if rendering fails
      console.warn('KaTeX pattern render failed, using plain text:', match[0], error);
      result += escapeHtml(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }

  return result || escapeHtml(text);
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
