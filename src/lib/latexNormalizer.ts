/**
 * MINIMAL LaTeX Normalization Utility
 * 
 * Since database is now fixed, this only handles:
 * 1. Dollar sign removal (always safe)
 * 2. Unicode → LaTeX conversion (√ → \sqrt{})
 * 3. Basic whitespace cleanup
 * 
 * Does NOT touch valid LaTeX commands - they pass through unchanged.
 */

// Track transformations for debug mode
let lastDebugInfo: {
  original: string;
  normalized: string;
  transformations: string[];
} = { original: '', normalized: '', transformations: [] };

export function getLastDebugInfo() {
  return lastDebugInfo;
}

export function normalizeMath(input: string): string {
  if (!input) return '';
  
  const transformations: string[] = [];
  let result = input;
  const original = result;
  
  try {
    // Fix missing space in prose patterns like "A1.5kg" / "a2.1kg".
    // These are sentence fragments, not algebraic indices.
    const proseDecimalUnitPattern =
      /\b([Aa])(?=\d+(?:\.\d+)?\s*(?:kg|g|mg|lb|lbs|oz|cm|mm|m|km|ml|l|mins?|minutes?|hrs?|hours?)\b)/g;
    if (proseDecimalUnitPattern.test(result)) {
      result = result.replace(proseDecimalUnitPattern, '$1 ');
      transformations.push('A1.5kg → A 1.5kg');
    }

    // 0. Convert Unicode superscripts (², ³, …) into LaTeX exponents.
    const superscriptMap: Record<string, string> = {
      '⁰': '0',
      '¹': '1',
      '²': '2',
      '³': '3',
      '⁴': '4',
      '⁵': '5',
      '⁶': '6',
      '⁷': '7',
      '⁸': '8',
      '⁹': '9',
      '⁺': '+',
      '⁻': '-',
      '⁽': '(',
      '⁾': ')',
    };
    const superscriptPattern = /([A-Za-z0-9)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾]+)/g;
    if (superscriptPattern.test(result)) {
      result = result.replace(superscriptPattern, (_, base: string, supers: string) => {
        const mapped = supers
          .split('')
          .map((ch) => superscriptMap[ch] ?? ch)
          .join('');
        return `${base}^{${mapped}}`;
      });
      transformations.push('superscripts → ^{}');
    }

    // Keep common unit exponents in human-readable index form for mixed text blocks.
    // This avoids rendering artifacts like m^{2} in plain fallback output.
    result = result
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|km|in|ft|yd|mi)\^\{2\}\b/gi, '$1$2²')
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|km|in|ft|yd|mi)\^\{3\}\b/gi, '$1$2³')
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|km|in|ft|yd|mi)\^2\b/gi, '$1$2²')
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|km|in|ft|yd|mi)\^3\b/gi, '$1$2³');

    // 1. Normalize dollar-delimited math into explicit \( ... \) before stripping delimiters.
    if (result.includes('$')) {
      result = result.replace(
        /\$(.+?)\$/gs,
        (_, inner) => `\\(${inner.replace(/\\\(/g, '').replace(/\\\)/g, '')}\\)`,
      );
      transformations.push('dollar → \\(\\)');
    }
    
    // Remove \( and \) LaTeX inline math delimiters
    if (result.includes('\\(') || result.includes('\\)')) {
      result = result.replace(/\\\(/g, '\\(').replace(/\\\)/g, '\\)');
      transformations.push('kept \\( \\)');
    }
    
    // 2. FIX MISSING BACKSLASHES - Common pattern where backslash is missing
    // sqrt{...} → \sqrt{...}
    if (/(?<!\\)sqrt\{/.test(result)) {
      result = result.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
      transformations.push('sqrt{ → \\sqrt{');
    }
    
    // sqrt(...) → \sqrt{...}
    if (/(?<!\\)sqrt\(([^)]+)\)/.test(result)) {
      result = result.replace(/(?<!\\)sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
      transformations.push('sqrt() → \\sqrt{}');
    }
    
    // sqrtN (sqrt followed by number without braces) → \sqrt{N}
    if (/(?<!\\)sqrt(\d+)/.test(result)) {
      result = result.replace(/(?<!\\)sqrt(\d+)/g, '\\sqrt{$1}');
      transformations.push('sqrtN → \\sqrt{N}');
    }
    
    // frac{...}{...} → \frac{...}{...}
    if (/(?<!\\)frac\{/.test(result)) {
      result = result.replace(/(?<!\\)frac\{/g, '\\frac{');
      transformations.push('frac{ → \\frac{');
    }
    
    // IMPORTANT: Avoid converting plain-English words/operators into raw LaTeX commands.
    // Prefer robust unicode operators (× ÷ ·) so rendering is always clean even outside KaTeX.

    // Drop leading coefficient 1 in simple algebra (e.g. 1x^2 -> x^2, 1x -> x)
    if (/(^|[=+\-*/(\s])1x\b/.test(result)) {
      result = result.replace(/(^|[=+\-*/(\s])1x\b/g, '$1x');
      transformations.push('1x → x');
    }
    if (/(^|[=+\-*/(\s])1x\^\{?2\}?/.test(result)) {
      result = result.replace(/(^|[=+\-*/(\s])1x(\^\{?2\}?)/g, '$1x$2');
      transformations.push('1x^2 → x^2');
    }

    // Convert "a times b" (math context) → ×
    if (/(\d|\))\s+times\s+(\d|\()/.test(result)) {
      result = result.replace(/(\d|\))\s+times\s+(\d|\()/g, '$1 × $2');
      transformations.push('a times b → ×');
    }

    if (/\\?texttimes/i.test(result)) {
      result = result.replace(/\\?texttimes\b/gi, '\\times');
      result = result.replace(/\\?texttimes(?=[A-Za-z])/gi, '\\times ');
      transformations.push('texttimes → \\times');
    }

    // Replace ASCII 'x' in standard form expressions (e.g. 3.2x10^5 → 3.2\times10^5).
    const standardFormPattern = /(-?\d+(?:\.\d+)?)(\s*)x(\s*)(10)/gi;
    if (standardFormPattern.test(result)) {
      result = result.replace(standardFormPattern, '$1$2\\times$3$4');
      transformations.push('standard form x10 → \\times10');
    }

    // Convert multiplied numbers that still use ASCII 'x' between digits to the consistent × symbol.
    const numericMultiplicationPattern = /([0-9]+(?:\.[0-9]+)?)([A-Za-z%£¢°gkmh]+)?\s*x\s*([A-Za-z0-9]+(?:\.[0-9]+)?)([A-Za-z%£¢°gkmh]+)?/gi;
    if (numericMultiplicationPattern.test(result)) {
      result = result.replace(numericMultiplicationPattern, (_, numA, unitA, numB, unitB) => {
        const left = `${numA}${unitA ?? ''}`;
        const right = `${numB}${unitB ?? ''}`;
        return `${left} × ${right}`;
      });
      transformations.push('digit x digit → ×');
    }

    // Convert xN or (xN) where x is acting as multiplier to × N (common shorthand such as (x2)).
    if (/([ (])x\s*\d+/i.test(result)) {
      result = result.replace(/([ (])x\s*(\d+)/gi, (_, prefix, digits) => `${prefix}× ${digits}`);
      transformations.push('xN → × N');
    }

    // Convert "a div b" (math context) → ÷
    if (/(\d|\))\s+div\s+(\d|\()/.test(result)) {
      result = result.replace(/(\d|\))\s+div\s+(\d|\()/g, '$1 ÷ $2');
      transformations.push('a div b → ÷');
    }
    
    // pm → \pm
    if (/(?<!\\)\bpm\b/.test(result)) {
      result = result.replace(/(?<!\\)\bpm\b/g, '\\pm');
      transformations.push('pm → \\pm');
    }

    // Normalize inequality symbols to KaTeX-friendly commands
    if (result.includes('≤')) {
      result = result.replace(/≤/g, '\\leq');
      transformations.push('≤ → \\leq');
    }
    if (result.includes('≥')) {
      result = result.replace(/≥/g, '\\geq');
      transformations.push('≥ → \\geq');
    }
    if (result.includes('<=')) {
      result = result.replace(/<=/g, '\\leq');
      transformations.push('<= → \\leq');
    }
    if (result.includes('>=')) {
      result = result.replace(/>=/g, '\\geq');
      transformations.push('>= → \\geq');
    }
    if (/(\\le)(?!q)/.test(result)) {
      result = result.replace(/\\le(?!q)\b/g, '\\leq');
      transformations.push('\\le → \\leq');
    }
    if (/(\\ge)(?!q)/.test(result)) {
      result = result.replace(/\\ge(?!q)\b/g, '\\geq');
      transformations.push('\\ge → \\geq');
    }
    
    // pi → \pi (but not "pine", "pick" etc)
    if (/(?<!\\)\bpi\b/.test(result)) {
      result = result.replace(/(?<!\\)\bpi\b/g, '\\pi');
      transformations.push('pi → \\pi');
    }

    // Trig functions (sin/cos/tan) → LaTeX commands when used in math context.
    if (/(?<!\\)\b(sin|cos|tan)\b(?=\s*(?:\(|[-+]?[\dA-Za-z]))/i.test(result)) {
      result = result.replace(
        /(?<!\\)\b(sin|cos|tan)\b(?=\s*(?:\(|[-+]?[\dA-Za-z]))/gi,
        '\\$1',
      );
      transformations.push('trig → \\sin/\\cos/\\tan');
    }

    // Greek letter names → LaTeX commands when used as standalone symbols.
    const greekLetters: Record<string, string> = {
      theta: '\\theta',
      phi: '\\phi',
      alpha: '\\alpha',
      beta: '\\beta',
      gamma: '\\gamma',
      delta: '\\delta',
      sigma: '\\sigma',
      omega: '\\omega',
    };
    Object.entries(greekLetters).forEach(([name, latex]) => {
      result = result.replace(new RegExp(`(?<!\\\\)\\b${name}\\b`, 'gi'), latex);
      transformations.push(`${name} → ${latex}`);
    });

    // approx → \approx when it introduces a numeric/variable approximation.
    if (/(^|[\s(=])approx\b(?=\s*[-+]?[\dA-Za-z(])/.test(result)) {
      result = result.replace(
        /(^|[\s(=])approx\b(?=\s*[-+]?[\dA-Za-z(])/g,
        '$1\\approx',
      );
      transformations.push('approx → \\approx');
    }
    
    // 3. Convert simple fractions like 1/sqrt{3} or a/b to \frac{a}{b}
    // Pattern: number or expression / sqrt{...} or number
    if (/(\d+|[a-zA-Z])\/\\sqrt\{([^}]+)\}/.test(result)) {
      result = result.replace(/(\d+|[a-zA-Z])\/\\sqrt\{([^}]+)\}/g, '\\frac{$1}{\\sqrt{$2}}');
      transformations.push('n/sqrt{} → \\frac{}{}');
    }
    
    // Pattern: simple a/b fractions (but not in URLs or complex expressions)
    // Only convert standalone simple fractions like 1/2, 3/4, a/b
    if (/(?<![a-zA-Z0-9])(\d+)\/(\d+)(?=$|[\s,.;:!?\\)])/.test(result)) {
      result = result.replace(
        /(?<![a-zA-Z0-9])(\d+)\/(\d+)(?=$|[\s,.;:!?\\)])/g,
        '\\frac{$1}{$2}',
      );
      transformations.push('n/m → \\frac{n}{m}');
    }

    const UNIT_TOKENS = new Set([
      'm', 's', 'cm', 'mm', 'km', 'h', 'd', 'kg', 'g', 'mg',
      'ms', 'min', 'hr', 'kph', 'kmh', 'mps', 'n', 'pa', 'k', '°',
    ]);
    const stripUnitExponent = (token: string) => token.replace(/\^\{?\d+\}?/g, '');
    const isSimpleUnitToken = (token: string) => {
      const cleaned = token.replace(/\s/g, '');
      if (!cleaned) return false;
      const base = stripUnitExponent(cleaned);
      return /^[a-zA-Z°]+$/.test(base) && UNIT_TOKENS.has(base.toLowerCase());
    };

    let replacedUnitFraction = false;
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, numerator, denominator) => {
      if (isSimpleUnitToken(numerator) && isSimpleUnitToken(denominator)) {
        replacedUnitFraction = true;
        return `${numerator}/${denominator}`;
      }
      return match;
    });
    if (replacedUnitFraction) {
      transformations.push('unit ratios kept inline');
    }

    // Pattern: simple variable/number fractions like x/3, 3/x, a/b (with optional spaces)
    if (/(?<![a-zA-Z0-9])([a-zA-Z])\s*\/\s*([a-zA-Z0-9]+)(?=$|[\s,.;:!?\\)])/.test(result)) {
      result = result.replace(
        /(?<![a-zA-Z0-9])([a-zA-Z])\s*\/\s*([a-zA-Z0-9]+)(?=$|[\s,.;:!?\\)])/g,
        (match, a, b) => {
          if (isSimpleUnitToken(a) && isSimpleUnitToken(b)) return match;
          return `\\frac{${a}}{${b}}`;
        },
      );
      transformations.push('x/n → \\frac{x}{n}');
    }

    if (/(?<![a-zA-Z0-9])([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z])(?=$|[\s,.;:!?\\)])/.test(result)) {
      result = result.replace(
        /(?<![a-zA-Z0-9])([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z])(?=$|[\s,.;:!?\\)])/g,
        (match, a, b) => {
          if (isSimpleUnitToken(a) && isSimpleUnitToken(b)) {
            return match;
          }
          return `\\frac{${a}}{${b}}`;
        },
      );
      transformations.push('n/x → \\frac{n}{x}');
    }

    if (/\([^()]+\)\s*\/\s*([a-zA-Z0-9]+)(?=$|[\s,.;:!?\\)])/.test(result)) {
      result = result.replace(
        /\(([^()]+)\)\s*\/\s*([a-zA-Z0-9]+)(?=$|[\s,.;:!?\\)])/g,
        '\\frac{($1)}{$2}',
      );
      transformations.push('(expr)/n → \\frac{expr}{n}');
    }

    if (/(?<![a-zA-Z0-9])([a-zA-Z0-9]+)\s*\/\s*\([^()]+\)/.test(result)) {
      result = result.replace(
        /(?<![a-zA-Z0-9])([a-zA-Z0-9]+)\s*\/\s*\(([^()]+)\)/g,
        '\\frac{$1}{($2)}',
      );
      transformations.push('n/(expr) → \\frac{n}{expr}');
    }

    if (/\([^()]+\)\s*\/\s*\([^()]+\)/.test(result)) {
      result = result.replace(
        /\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g,
        '\\frac{($1)}{($2)}',
      );
      transformations.push('(expr)/(expr) → \\frac{expr}{expr}');
    }
    
    // 4. Convert ** to exponents FIRST (before handling single *)
    if (result.includes('**')) {
      // (expression)**2 → (expression)^{2}
      result = result.replace(/\)\*\*(\d+)/g, ')^{$1}');
      // variable**2 → variable^{2}
      result = result.replace(/([a-zA-Z])\*\*(\d+)/g, '$1^{$2}');
      // number**variable → number^{variable}
      result = result.replace(/(\d+)\*\*([a-zA-Z])/g, '$1^{$2}');
      transformations.push('** → ^{}');
    }
    
    // 5. Convert * to multiplication (keep it readable; never delete and concatenate terms)
    if (result.includes('*')) {
      // Only convert when * is acting like multiplication between two tokens.
      // Examples: 3*5, 3 * 5, (2+1)*4, a*3
      result = result.replace(/(\d|\)|[a-zA-Z])\s*\*\s*(\d|\(|[a-zA-Z])/g, '$1 × $2');
      transformations.push('* → ×');
    }
    
    // 6. Add multiplication between adjacent exponential terms
    // Pattern: "3^x 3^(x-2)" → "3^x \\cdot 3^(x-2)"
    if (/\^\{[^}]+\}\s+\d|\^\d+\s+\d|\^[a-zA-Z]\s+\d/.test(result)) {
      result = result.replace(/(\^\{[^}]+\})\s+(\d)/g, '$1 \\cdot $2');
      result = result.replace(/(\^\d+)\s+(\d)/g, '$1 \\cdot $2');
      result = result.replace(/(\^[a-zA-Z])\s+(\d)/g, '$1 \\cdot $2');
      transformations.push('added \\cdot between exponential terms');
    }
    
    // 7. Fix caret notation: ^(expression) → ^{expression}
    if (result.includes('^')) {
      // Normalize spacing around braced exponents: ^ { 2 } → ^{2}
      result = result.replace(/\^\s*\{\s*([^}]+?)\s*\}/g, (_, content) => `^{${String(content).trim()}}`);
      // ^(expression) → ^{expression}
      result = result.replace(/\^\(([^)]+)\)/g, '^{($1)}');
      // ^digit / ^letter (allow spaces) → ^{digit/letter}
      result = result.replace(/\^\s*(?!\{)(-?\d+|[a-zA-Z])/g, '^{$1}');
      transformations.push('^ → ^{}');
    }

    // 7a. Compact index notation used in imported banks: a2, 5a2 -> a^{2}
    // Guard rails:
    // - skip escaped commands
    // - skip embedded words
    // - skip letter+digits followed by another letter (e.g. H2O)
    if (/(?<![\\A-Za-z])([A-Za-z])(\d+)(?![A-Za-z.]|\d)/g.test(result)) {
      result = result.replace(
        /(?<![\\A-Za-z])([A-Za-z])(\d+)(?![A-Za-z.]|\d)/g,
        (_, variable: string, exponent: string) => `${variable}^{${exponent}}`,
      );
      transformations.push('a2 → a^{2}');
    }

    // 7b. Normalize subscript spacing: _ { n } → _{n}, _n → _{n}
    if (result.includes('_')) {
      result = result.replace(/_\s*\{\s*([^}]+?)\s*\}/g, (_, content) => `_{${String(content).trim()}}`);
      result = result.replace(/_\s*(?!\{)(-?\d+|[a-zA-Z])/g, '_{$1}');
      transformations.push('_ → _{}');
    }
    
    // 8. Fix broken pi symbol (C0 or CO → π → \pi)
    // This happens when the model outputs corrupted Unicode that looks like "C0" or "CO"
    if (result.includes('C0') || result.includes('CO')) {
      // C0 × r² pattern → \pi × r²
      result = result.replace(/C0\s*×/g, '\\pi \\times');
      result = result.replace(/CO\s*×/g, '\\pi \\times');
      // = C0 × pattern
      result = result.replace(/=\s*C0\s*×/g, '= \\pi \\times');
      result = result.replace(/=\s*CO\s*×/g, '= \\pi \\times');
      // Standalone C0 or CO that should be pi (when followed by space and multiplication context)
      result = result.replace(/\bC0\b/g, '\\pi');
      result = result.replace(/\bCO\b(?!\s*cm)/g, '\\pi'); // Don't replace "CO cm" but replace standalone CO
      transformations.push('C0/CO → \\pi');
    }
    
    // 9. Convert Unicode π to LaTeX \pi
    if (result.includes('π')) {
      result = result.replace(/π/g, '\\pi');
      transformations.push('π → \\pi');
    }
    
    // 10. Convert Unicode square roots to LaTeX
    if (result.includes('√')) {
      // √10 → \sqrt{10}
      result = result.replace(/√(\d+)/g, '\\sqrt{$1}');
      // √(expression) → \sqrt{expression}
      result = result.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
      // √variable → \sqrt{variable}
      result = result.replace(/√([a-zA-Z])/g, '\\sqrt{$1}');
      transformations.push('√ → \\sqrt{}');
    }
    
    // 11. Clean up multiple spaces (safe)
    if (/\s{2,}/.test(result)) {
      result = result.replace(/\s{2,}/g, ' ');
      transformations.push('cleaned whitespace');
    }
    
    // Store debug info
    lastDebugInfo = { original, normalized: result, transformations };
    
    return result;
    
  } catch (error) {
    console.error('normalizeMath error:', error);
    return input; // Return original on error
  }
}

/**
 * Safe LaTeX renderer - just a passthrough now that normalization is minimal
 */
export function safeRenderLatex(latex: string, displayMode: boolean = false): string {
  // This is now handled by MathRenderer component
  return latex;
}

// ==========================================
// TEST CASES (for development/debugging)
// ==========================================

const TEST_CASES = [
  {
    input: '$x^2 + 1$',
    expected: 'x^{2} + 1',
    description: 'Remove dollar signs'
  },
  {
    input: '(x - 2)**2',
    expected: '(x - 2)^{2}',
    description: 'Convert ** to exponents'
  },
  {
    input: '(x - 1)*(x - 2)',
    expected: '(x - 1)(x - 2)',
    description: 'Implicit multiplication between factors'
  },
  {
    input: '5*x',
    expected: '5x',
    description: 'Implicit multiplication number*variable'
  },
  {
    input: '√5',
    expected: '\\sqrt{5}',
    description: 'Unicode square root to LaTeX'
  },
  {
    input: '\\frac{1}{2}',
    expected: '\\frac{1}{2}',
    description: 'Valid LaTeX passes through unchanged'
  },
  {
    input: '\\sin(30^\\circ)',
    expected: '\\sin(30^\\circ)',
    description: 'Trig functions pass through unchanged'
  },
  {
    input: 'x  +  y',
    expected: 'x + y',
    description: 'Clean up multiple spaces'
  },
  {
    input: 'sqrt{3}',
    expected: '\\sqrt{3}',
    description: 'Fix missing backslash on sqrt{}'
  },
  {
    input: '1/sqrt{3}',
    expected: '\\frac{1}{\\sqrt{3}}',
    description: 'Convert fraction with sqrt'
  },
  {
    input: 'sqrt3',
    expected: '\\sqrt{3}',
    description: 'Fix sqrtN without braces'
  },
  {
    input: 'frac{1}{2}',
    expected: '\\frac{1}{2}',
    description: 'Fix missing backslash on frac'
  },
  {
    input: 'pi times 2',
    expected: '\\pi \\times 2',
    description: 'Fix pi and times without backslashes'
  }
];

export function runTests() {
  console.log('Running LaTeX normalizer tests...\n');
  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    const result = normalizeMath(test.input);
    const success = result === test.expected;
    
    if (success) {
      passed++;
      console.log(`PASS: ${test.description}`);
    } else {
      failed++;
      console.log(`FAIL: ${test.description}`);
      console.log(`  Input:    "${test.input}"`);
      console.log(`  Expected: "${test.expected}"`);
      console.log(`  Got:      "${result}"`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as Window & { testLatexNormalizer?: typeof runTests }).testLatexNormalizer = runTests;
}
