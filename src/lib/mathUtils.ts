export interface NormalizationDebugInfo {
  original: string;
  normalized: string;
  transformations: string[];
  hasErrors: boolean;
}

let lastDebugInfo: NormalizationDebugInfo | null = null;

export function getLastDebugInfo(): NormalizationDebugInfo | null {
  return lastDebugInfo;
}

/**
 * Smart normalizer that prepares math text for rendering
 * Handles full LaTeX, partial LaTeX, and plain text uniformly
 * SAFE: Only fixes obviously broken patterns
 */
export function normalizeMath(text: string, debug: boolean = false): string {
  if (!text) return text;
  
  const transformations: string[] = [];
  let result = text.trim();
  
  // Strip dollar signs FIRST - they should never appear in the output
  const beforeDollar = result;
  result = result.replace(/^\$+|\$+$/g, '');
  if (result !== beforeDollar) {
    transformations.push('Removed $ delimiters');
  }
  
  // If text is already wrapped in LaTeX delimiters, extract and process the inner content
  const delimiters = [
    { start: '\\(', end: '\\)', display: false },
    { start: '\\[', end: '\\]', display: true }
  ];
  
  for (const delim of delimiters) {
    if (result.startsWith(delim.start) && result.endsWith(delim.end)) {
      const inner = result.slice(delim.start.length, -delim.end.length);
      // Process the inner content and re-wrap
      const normalized = delim.start + normalizeInner(inner, transformations) + delim.end;
      
      if (debug) {
        lastDebugInfo = {
          original: text,
          normalized,
          transformations,
          hasErrors: false
        };
      }
      
      return normalized;
    }
  }
  
  // Process undelimited text
  const normalized = normalizeInner(result, transformations);
  
  if (debug) {
    lastDebugInfo = {
      original: text,
      normalized,
      transformations,
      hasErrors: false
    };
  }
  
  return normalized;
}

/**
 * Checks if braces are balanced in a string
 */
function areBracesBalanced(text: string): boolean {
  let count = 0;
  for (const char of text) {
    if (char === '{') count++;
    if (char === '}') count--;
    if (count < 0) return false;
  }
  return count === 0;
}

/**
 * Extracts content between balanced braces
 */
function extractBracedContent(text: string, startPos: number): { content: string; endPos: number } | null {
  if (text[startPos] !== '{') return null;
  
  let count = 0;
  let i = startPos;
  
  for (; i < text.length; i++) {
    if (text[i] === '{') count++;
    if (text[i] === '}') {
      count--;
      if (count === 0) {
        return { content: text.substring(startPos + 1, i), endPos: i };
      }
    }
  }
  return null;
}

/**
 * Internal normalizer for math content
 * SAFE: Only fixes obviously broken patterns
 */
function normalizeInner(text: string, transformations: string[] = []): string {
  if (!text) return text;
  
  try {
    let result = text;
    
    // STEP 1: REMOVE ALL DOLLAR SIGNS IMMEDIATELY
    const beforeDollar = result;
    result = result.replace(/\$/g, '');
    if (result !== beforeDollar) {
      transformations.push('Removed $ signs');
    }
    
    // STEP 2: Fix degree symbols FIRST (before other processing)
    const beforeDegree = result;
    // \circ without braces after digits → wrap in superscript
    result = result.replace(/([0-9]+)\\circ(?!\})/g, '$1^\\circ');
    // Plain ° symbol → convert to ^\circ
    result = result.replace(/([0-9]+)°/g, '$1^\\circ');
    if (result !== beforeDegree) {
      transformations.push('Fixed degree symbols');
    }
    
    // STEP 3: Fix trig functions with arguments
    const beforeTrig = result;
    // \sin31\circ → \sin(31^\circ)
    result = result.replace(/(\\(?:sin|cos|tan|cot|sec|csc))([0-9]+)\^\\circ/g, '$1($2^\\circ)');
    // \sin31° → \sin(31^\circ) (if any ° remain)
    result = result.replace(/(\\(?:sin|cos|tan|cot|sec|csc))([0-9]+)°/g, '$1($2^\\circ)');
    // \sin31 → \sin(31)
    result = result.replace(/(\\(?:sin|cos|tan|cot|sec|csc))([0-9]+)(?![0-9^({])/g, '$1($2)');
    // sin31 → \sin(31)
    result = result.replace(/(?<!\\)(sin|cos|tan|cot|sec|csc)([0-9]+)/g, '\\$1($2)');
    if (result !== beforeTrig) {
      transformations.push('Fixed trig functions');
    }
    
    // STEP 4: Pre-normalize √ symbol to \sqrt
    result = result.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}');
    result = result.replace(/√\s*([a-zA-Z0-9]+)/g, '\\sqrt{$1}');
    result = result.replace(/√/g, '\\sqrt');
    
    // STEP 5: Fix BROKEN \frac patterns - CRITICAL FIXES
    const beforeFrac = result;
    
    // Case 1: \frac12 → \frac{1}{2} (most common case - two adjacent digits)
    result = result.replace(/\\frac([0-9])([0-9])/g, '\\frac{$1}{$2}');
    
    // Case 2: \frac73 → \frac{7}{3} (double digit variations)
    result = result.replace(/\\frac([0-9]+)([0-9]+)/g, (match, a, b) => {
      if (a.length === 1 && b.length === 1) {
        return `\\frac{${a}}{${b}}`;
      }
      // Split in half for longer numbers
      const mid = Math.floor(match.slice(5).length / 2);
      const num = match.slice(5, 5 + mid);
      const den = match.slice(5 + mid);
      return `\\frac{${num}}{${den}}`;
    });
    
    // Case 3: \frac√7{11} or \frac\sqrt7{11} → \frac{\sqrt{7}}{11}
    result = result.replace(/\\frac√([0-9]+)\{([^}]+)\}/g, '\\frac{\\sqrt{$1}}{$2}');
    result = result.replace(/\\frac\\sqrt([0-9]+)\{([^}]+)\}/g, '\\frac{\\sqrt{$1}}{$2}');
    
    // Case 4: \frac\sqrt{7}{11} → needs proper nesting check
    result = result.replace(/\\frac(\\sqrt\{[^}]+\})\{([^}]+)\}/g, '\\frac{$1}{$2}');
    
    // Case 5: \frac{a} b or \frac a {b} → \frac{a}{b}
    result = result.replace(/\\frac\{([^}]+)\}\s*([0-9a-zA-Z]+)(?!\{)/g, '\\frac{$1}{$2}');
    result = result.replace(/\\frac\s*([0-9a-zA-Z]+)\s*\{([^}]+)\}/g, '\\frac{$1}{$2}');
    
    if (result !== beforeFrac) {
      transformations.push('Fixed frac braces');
    }
    
    // STEP 6: Fix BROKEN \sqrt patterns
    const beforeSqrt = result;
    
    // \sqrt5 → \sqrt{5}
    result = result.replace(/\\sqrt([0-9]+)/g, '\\sqrt{$1}');
    
    // \sqrt73 → \sqrt{73}
    result = result.replace(/\\sqrt([0-9]+)/g, '\\sqrt{$1}');
    
    // \sqrt x → \sqrt{x}
    result = result.replace(/\\sqrt\s*([a-zA-Z])(?![a-zA-Z{])/g, '\\sqrt{$1}');
    
    // \sqrt anything → \sqrt{anything}
    result = result.replace(/\\sqrt([^{\s}][a-zA-Z0-9]*)/g, '\\sqrt{$1}');
    
    if (result !== beforeSqrt) {
      transformations.push('Fixed sqrt braces');
    }
    
    // STEP 7: Remove stray backslashes (not part of valid commands)
    // \7, \73, etc. → 7, 73
    result = result.replace(/\\([0-9]+)(?![a-zA-Z])/g, '$1');
    
    // Stray \( or \) without matching pair
    result = result.replace(/(?<!\\)\\\((?![^)]*\\\))/g, '(');
    result = result.replace(/(?<!\\)\\\)(?<!\\\([^(]*)/g, ')');
    
    // STEP 8: Normalize Unicode superscripts
    const superscriptMap: Record<string, string> = {
      '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
      '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
      '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
      'ⁿ': 'n', 'ⁱ': 'i', 'ˣ': 'x', 'ʸ': 'y'
    };
    
    result = result.replace(/([a-zA-Z0-9]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ]+)/g, (match, base, superscripts) => {
      const normalized = superscripts.split('').map((char: string) => superscriptMap[char] || char).join('');
      return `${base}^{${normalized}}`;
    });
    
    // STEP 9: Fix unmatched braces
    // Remove or fix dangling braces
    const openCount = (result.match(/\{/g) || []).length;
    const closeCount = (result.match(/\}/g) || []).length;
    
    if (openCount > closeCount) {
      result += '}'.repeat(openCount - closeCount);
      transformations.push(`Balanced braces (+${openCount - closeCount} close)`);
    } else if (closeCount > openCount) {
      result = result.replace(/\}/g, (match, offset, string) => {
        closeCount--;
        return closeCount >= openCount ? '' : match;
      });
      transformations.push(`Balanced braces (-${closeCount - openCount} close)`);
    }
    
    // STEP 10: Final cleanup
    // Remove double spaces
    result = result.replace(/\s+/g, ' ').trim();
    
    // Remove any remaining lone backslashes before non-command chars
    result = result.replace(/\\(?![a-zA-Z({])/g, '');
    
    return result;
  } catch (error) {
    console.error('LaTeX normalization failed:', error);
    return text;
  }
}

/**
 * Converts simple math notation (carets, etc.) to LaTeX format
 * Handles common patterns found in GCSE questions
 * @deprecated Use normalizeMath instead for better handling
 */
export function toLatex(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // 0. Normalize Unicode superscripts to caret notation
  // Map of Unicode superscript characters to regular characters
  const superscriptMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
    'ⁿ': 'n', 'ⁱ': 'i', 'ˣ': 'x', 'ʸ': 'y'
  };
  
  // Find sequences of superscript characters and convert them to caret notation
  // Match one or more consecutive superscript characters
  const superscriptRegex = new RegExp(`[${Object.keys(superscriptMap).join('')}]+`, 'g');
  
  result = result.replace(/([a-zA-Z0-9]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ]+)/g, (match, base, superscripts) => {
    const normalized = superscripts.split('').map((char: string) => superscriptMap[char] || char).join('');
    return `${base}^${normalized}`;
  });
  
  // 1. Normalize punctuation
  // Convert en/em dashes to hyphens
  result = result.replace(/[– - ]/g, '-');
  
  // Convert smart quotes to ASCII
  result = result.replace(/[""]/g, '"');
  result = result.replace(/['']/g, "'");
  
  // 2. Protect common non-math patterns
  // Protect decimal places notation like "(2 d.p.)" or "(3 s.f.)"
  const protectedPatterns: Array<{ pattern: RegExp; replacements: string[] }> = [];
  
  // Protect (X d.p.), (X s.f.), etc.
  result = result.replace(/\((\d+)\s*(d\.?p\.?|s\.?f\.?|cm|mm|kg|m)\)/gi, (match) => {
    const id = `__PROTECTED_${protectedPatterns.length}__`;
    protectedPatterns.push({ pattern: new RegExp(id, 'g'), replacements: [match] });
    return id;
  });
  
  // 3. Convert exponents (caret notation to LaTeX superscripts)
  // Pattern: x^2, a^(-3), 4a^2, x^(n+1), 10^-5
  
  // Handle parenthesized exponents first: x^(anything)
  result = result.replace(/([a-zA-Z0-9]+)\^\(([^)]+)\)/g, (match, base, exp) => {
    return `${base}^{${exp}}`;
  });
  
  // Handle negative exponents explicitly: 10^-5, x^-2
  result = result.replace(/([a-zA-Z0-9]+)\^(-[a-zA-Z0-9]+)/g, (match, base, exp) => {
    return `${base}^{${exp}}`;
  });
  
  // Handle positive exponents: x^2, a^b
  result = result.replace(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, (match, base, exp) => {
    return `${base}^{${exp}}`;
  });
  
  // 4. Convert common functions
  // sqrtx, sqrt2, etc. -> \sqrt{x}, \sqrt{2} (without parentheses - common in database)
  result = result.replace(/sqrt([a-z0-9]+)/gi, (match, content) => {
    return `\\sqrt{${content}}`;
  });
  
  // sqrt(x) -> \sqrt{x} (with parentheses - for more complex expressions)
  result = result.replace(/sqrt\(([^)]+)\)/gi, (match, content) => {
    return `\\sqrt{${content}}`;
  });
  
  // abs(x) -> |x| or \lvert x \rvert
  result = result.replace(/abs\(([^)]+)\)/gi, (match, content) => {
    return `\\lvert ${content} \\rvert`;
  });
  
  // 5. Convert fractions - only when clearly mathematical
  // Pattern: (a)/(b) where both parts are single tokens or simple expressions
  result = result.replace(/\(([a-zA-Z0-9+\-*/^]+)\)\/\(([a-zA-Z0-9+\-*/^]+)\)/g, (match, num, den) => {
    return `\\frac{${num}}{${den}}`;
  });
  
  // 6. Replace * with \cdot for multiplication
  // Replace all asterisks that are clearly multiplication operators
  // Handle patterns like: 3*x, x*y, 3*(2), *(1/3), etc.
  result = result.replace(/\*\*/g, '\\cdot '); // Double asterisks
  result = result.replace(/([a-zA-Z0-9)])\s*\*\s*([a-zA-Z0-9(])/g, '$1 \\cdot $2'); // General multiplication
  result = result.replace(/\*\s*\(/g, '\\cdot ('); // Asterisk before parenthesis
  result = result.replace(/\)\s*\*/g, ') \\cdot '); // Asterisk after parenthesis
  
  // 7. Handle multiplication symbol × (if present)
  result = result.replace(/([0-9])\s*[×x]\s*([0-9])/g, '$1 \\times $2');
  
  // 8. Wrap math expressions with delimiters ONLY if not already wrapped
  // Check if already has LaTeX delimiters
  const alreadyHasDelimiters = /\\\(|\\\[|\$\$?/.test(result);
  const hasLatex = /[\\^{}]/.test(result);
  
  if (!alreadyHasDelimiters && hasLatex) {
    // Check if the line starts with = or has equation-like structure
    const isEquation = /^[=\s]*[a-zA-Z0-9^{}\\_\-+*/()]+\s*=/.test(result);
    
    // Don't wrap if it's mixed content (long prose with some math)
    const hasMixedContent = result.split(/[\\^{}]/).some(part => 
      part.length > 20 && /[.,:;!?]\s+[A-Z]/.test(part)
    );
    
    if (!hasMixedContent && (isEquation || result.length < 150)) {
      // Wrap short expressions or equations in inline math delimiters
      result = `\\(${result}\\)`;
    }
  }
  
  // 9. Restore protected patterns
  protectedPatterns.forEach(({ pattern, replacements }) => {
    replacements.forEach(replacement => {
      result = result.replace(pattern, replacement);
    });
  });
  
  return result;
}

/**
 * Checks if text contains math notation that should be rendered
 */
export function hasMathNotation(text: string): boolean {
  if (!text) return false;
  
  // Check for common math indicators
  return /[\^_\\{}]|sqrt|abs|\*|×|÷|≤|≥|≠|∈|∑|∏|∫/.test(text);
}
