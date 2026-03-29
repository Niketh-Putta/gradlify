import 'katex/dist/katex.min.css';
import katex from 'katex';
import { normalizeMath } from '@/lib/latexNormalizer';
import { cn } from '@/lib/utils';

interface MathTextProps {
  text: string;
  display?: boolean;
  className?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function readBraceGroup(input: string, openBraceIndex: number): { endIndex: number } | null {
  if (openBraceIndex < 0 || openBraceIndex >= input.length) return null;
  if (input[openBraceIndex] !== '{') return null;

  let depth = 0;
  for (let i = openBraceIndex; i < input.length; i++) {
    const ch = input[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return { endIndex: i + 1 };
    }
  }
  return null;
}

function readBracketGroup(input: string, openBracketIndex: number): { endIndex: number } | null {
  if (openBracketIndex < 0 || openBracketIndex >= input.length) return null;
  if (input[openBracketIndex] !== '[') return null;

  let depth = 0;
  for (let i = openBracketIndex; i < input.length; i++) {
    const ch = input[i];
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) return { endIndex: i + 1 };
    }
  }
  return null;
}

function extractBraceAwareToken(input: string, startIndex: number): { token: string; endIndex: number } | null {
  const rest = input.slice(startIndex);

  if (rest.startsWith('\\frac{')) {
    const numOpen = startIndex + '\\frac'.length;
    const numGroup = readBraceGroup(input, numOpen);
    if (!numGroup) return null;
    const denOpen = numGroup.endIndex;
    const denGroup = readBraceGroup(input, denOpen);
    if (!denGroup) return null;
    return { token: input.slice(startIndex, denGroup.endIndex), endIndex: denGroup.endIndex };
  }

  if (rest.startsWith('\\sqrt{')) {
    const radOpen = startIndex + '\\sqrt'.length;
    const radGroup = readBraceGroup(input, radOpen);
    if (!radGroup) return null;
    return { token: input.slice(startIndex, radGroup.endIndex), endIndex: radGroup.endIndex };
  }

  if (rest.startsWith('\\sqrt[')) {
    const indexOpen = startIndex + '\\sqrt'.length;
    const indexGroup = readBracketGroup(input, indexOpen);
    if (!indexGroup) return null;
    const radOpen = indexGroup.endIndex;
    const radGroup = readBraceGroup(input, radOpen);
    if (!radGroup) return null;
    return { token: input.slice(startIndex, radGroup.endIndex), endIndex: radGroup.endIndex };
  }

  if (rest.startsWith('\\overline{')) {
    const overOpen = startIndex + '\\overline'.length;
    const overGroup = readBraceGroup(input, overOpen);
    if (!overGroup) return null;
    return { token: input.slice(startIndex, overGroup.endIndex), endIndex: overGroup.endIndex };
  }

  return null;
}

function fallbackMathToken(token: string): string {
  const superscriptMap: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '(': '⁽',
    ')': '⁾',
  };

  const toSuperscript = (value: string) =>
    value
      .split('')
      .map((ch) => superscriptMap[ch] ?? ch)
      .join('');

  return sanitizeMathForPlainText(token)
    .replace(/\^\{([^}]+)\}/g, (_, exp: string) => toSuperscript(String(exp).trim()))
    .replace(/\^([0-9+\-()]+)/g, (_, exp: string) => toSuperscript(String(exp).trim()))
    .replace(/_\{([^}]+)\}/g, '_$1');
}

function sanitizeMathForPlainText(text: string): string {
  if (!text) return '';

  return decodeHtmlEntities(text)
    .replace(/<==>/g, '↔')
    .replace(/<=>/g, '↔')
    .replace(/==>/g, '⇒')
    .replace(/=>/g, '⇒')
    .replace(/-->/g, '→')
    .replace(/->/g, '→')
    .replace(/<--/g, '←')
    .replace(/<-/g, '←')
    .replace(/\\\\/g, '\\')
    .replace(/\barrow\b/gi, '→')
    .replace(/\bRightarrow\b/g, '⇒')
    .replace(/\brightarrow\b/g, '→')
    .replace(/\bleftarrow\b/g, '←')
    .replace(/\bLeftarrow\b/g, '⇐')
    .replace(/\bleftrightarrow\b/g, '↔')
    .replace(/Rightarrow/g, '⇒')
    .replace(/rightarrow/g, '→')
    .replace(/leftarrow/g, '←')
    .replace(/Leftarrow/g, '⇐')
    .replace(/leftrightarrow/g, '↔')
    .replace(/\bequiv\b/g, '≡')
    .replace(/\bapprox\b/g, '≈')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Leftarrow/g, '⇐')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\equiv/g, '≡')
    .replace(/\\mid/g, '∣')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pi/g, 'π')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
    .replace(/\\([a-zA-Z]+)\b/g, '$1');
}

function wrapTextInMath(token: string): string {
  if (!token) return token;
  return token.replace(/([A-Za-z]+(?:\s+[A-Za-z]+)+)/g, '\\text{$1}');
}

function looksLikeBareMath(text: string): boolean {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return false;

  // Single-letter variables like x, y.
  if (/^[A-Za-z]$/.test(trimmed)) return true;

  const hasBareMathChars =
    /[0-9+\-*/=^()]/.test(trimmed) || /[×÷·√≤≥≠≈π]/.test(trimmed) || /\b[A-Za-z]\b/.test(trimmed);
  if (!hasBareMathChars) return false;

  // Avoid rendering whole sentences as math.
  const wordTokens = trimmed.match(/\b[A-Za-z]{2,}\b/g) ?? [];
  if (wordTokens.length > 0) return false;

  return true;
}

function isMathJoiner(text: string): boolean {
  if (!text) return false;
  if (/[A-Za-z]/.test(text)) return false;
  return /^[-\s0-9.,:+×÷·*/=(){}[\]<>≤≥≠≈π√^_|\\]+$/.test(text);
}

/**
 * Repairs broken LaTeX where backslashes were missing or eaten
 */
function repairBrokenLatex(text: string): string {
  if (!text) return '';
  
  let result = decodeHtmlEntities(text);
  // Normalize unicode minus to ASCII minus.
  result = result.replace(/−/g, '-');

  // Remove LaTeX spacing commands that often leak into plain text rendering.
  // Examples: "\," "\;" "\:" "\!" (and double-escaped variants).
  result = result.replace(/\\\\[,;:!]/g, ' ');
  result = result.replace(/\\[,;:!]/g, ' ');
  // Remove explicit LaTeX space commands like "\ ".
  result = result.replace(/\\\s+/g, ' ');
  // Drop size-adjusting delimiters that can leak as raw text.
  result = result.replace(/\\\\left\s*/g, '');
  result = result.replace(/\\\\right\s*/g, '');
  result = result.replace(/\\left\s*/g, '');
  result = result.replace(/\\right\s*/g, '');
  
  // If an arrow command was inserted into a normal JS string, the backslash may be eaten,
  // leaving "Rightarrow" as plain text. Convert it back into a KaTeX command.
  result = result.replace(/(?<!\\)\b(Rightarrow|rightarrow|Leftarrow|leftrightarrow)\b/g, '\\$1');
  // Also repair plain "arrow" tokens and common ASCII arrow operators.
  result = result
    .replace(/\barrow\b/gi, '\\rightarrow')
    .replace(/<==>/g, '\\leftrightarrow')
    .replace(/<=>/g, '\\leftrightarrow')
    .replace(/==>/g, '\\Rightarrow')
    .replace(/=>/g, '\\Rightarrow')
    .replace(/-->/g, '\\rightarrow')
    .replace(/->/g, '\\rightarrow')
    .replace(/<--/g, '\\leftarrow')
    .replace(/<-/g, '\\leftarrow');
  // Fix cases like "0Rightarrow" or ")Rightarrow" where the backslash was dropped.
  result = result.replace(/([0-9A-Za-z)\]])(Rightarrow|rightarrow|Leftarrow|leftrightarrow)/g, '$1 \\$2');
  // Add spacing around common arrow commands to avoid "0Rightarrow" style concatenation.
  result = result.replace(/\s*\\(Rightarrow|rightarrow|leftarrow|Leftarrow|leftrightarrow)\s*/g, ' \\\\$1 ');
  // Collapse extra whitespace introduced by spacing fixes.
  result = result.replace(/\s{2,}/g, ' ');
  
  // Fix missing backslashes on common LaTeX commands
  // sqrt{...} → \sqrt{...}
  result = result.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
  
  // sqrt(...) → \sqrt{...}
  result = result.replace(/(?<!\\)sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  
  // sqrtN → \sqrt{N}
  result = result.replace(/(?<!\\)sqrt(\d+)/g, '\\sqrt{$1}');
  
  // frac{...}{...} → \frac{...}{...}
  result = result.replace(/(?<!\\)frac\{/g, '\\frac{');

  // begin{...} / end{...} → \begin{...} / \end{...}
  result = result.replace(/(?<!\\)begin\{/g, '\\begin{');
  result = result.replace(/(?<!\\)end\{/g, '\\end{');
  
  // Avoid converting plain-English "times" into LaTeX here.
  // (Normalization handles math-context conversions more safely.)
  
  // pi → \pi (but not in words)
  result = result.replace(/(?<!\\)\bpi\b/g, '\\pi');
  
  // Convert simple fractions like 1/sqrt{3} to \frac{1}{\sqrt{3}}
  result = result.replace(/(\d+|[a-zA-Z])\/\\sqrt\{([^}]+)\}/g, '\\frac{$1}{\\sqrt{$2}}');

  // Repair bare exponents like 3^-1 or x^2 (without braces)
  result = result.replace(/([A-Za-z0-9)])\^\s*(?!\{)(\([^()]+\)|[-]?[A-Za-z0-9]+)/g, (_, base, exponent) => {
    if (exponent.startsWith('\\')) {
      return `${base}^${exponent}`;
    }
    return `${base}^{${exponent.replace(/−/g, '-')}}`;
  });
  
  // Fix common broken patterns where backslash was eaten
  result = result.replace(/(?<![\\a-zA-Z])rac\{/g, '\\frac{');
  result = result.replace(/(?<![\\a-zA-Z])imes(?![a-zA-Z])/g, '\\times');
  result = result.replace(/(?<![\\a-zA-Z])qrt\{/g, '\\sqrt{');
  result = result.replace(/(?<![\\a-zA-Z])qrt(\d)/g, '\\sqrt{$1}');
  
  return result;
}

/**
 * Renders text with LaTeX commands properly formatted
 * Handles both full LaTeX expressions and mixed content
 */
export default function MathText({ text, display = false, className }: MathTextProps) {
  if (!text) return null;
  
  try {
    // First, repair any broken LaTeX patterns, then normalize
    const repaired = repairBrokenLatex(text);
    // Normalize and strip common LaTeX inline/block delimiters so content like
    // "... \\(\\frac{1}{2}\\) ..." can still be rendered by our mixed-content parser.
    const normalized = normalizeMath(repaired)
      // Convert common double-escaped LaTeX commands into single-escaped (e.g. "\\\\frac" -> "\\frac").
      .replace(
        /\\\\(frac|sqrt|overline|dot|binom|text|mathrm|times|div|cdot|pi|theta|alpha|beta|gamma|delta|sigma|omega|equiv|mid|approx|cdots|gcd|lcm|begin|end|pmatrix|bmatrix|vmatrix|matrix|cases|leq|geq|le|ge|neq|Rightarrow|rightarrow|Leftarrow|leftrightarrow)\b/g,
        '\\$1',
      )
      // Fallback: collapse any other double-escaped command names (length >= 2).
      .replace(/\\\\([A-Za-z]{2,})\b/g, '\\$1')
      // Strip both single-escaped and double-escaped delimiters: \( \) \[ \]
      .replace(/(?:\\\\)?\\\(|(?:\\\\)?\\\)|(?:\\\\)?\\\[|(?:\\\\)?\\\]/g, '');
    
    // Check if text contains LaTeX commands (including \cdot, \overline and others)
    const hasLatexCommands = /\\[a-zA-Z]+/.test(normalized);
    const hasEquationPattern =
      /[0-9a-zA-Z]\s*(=|<|>|\\leq|\\geq|\\le|\\ge)\s*[-+]?\s*(?:[0-9a-zA-Z]|\\\\)/.test(normalized);
    const textSansLatex = normalized
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
      .replace(/\\[a-zA-Z]+/g, '');
    const hasWordToken = /\b[A-Za-z]{2,}\b/.test(textSansLatex);
    const bareMathOnly = looksLikeBareMath(textSansLatex);
    
    // If the entire text is a LaTeX expression (no regular English words, just math),
    // render it as a single math expression.
    const hasMultipleWords = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(textSansLatex);
    if (
      (hasLatexCommands || hasEquationPattern || bareMathOnly)
      && !hasMultipleWords
      && !hasWordToken
      && !normalized.match(/[.!?]\s+[A-Z]/)
      && !/^[A-Z][a-z]+/.test(normalized.trim())
    ) {
      try {
        const mathHtml = katex.renderToString(normalized, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'html'
        });
        
        if (display) {
          return (
            <div
              className={cn("my-2 text-base leading-relaxed", className)}
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        }
        
        return (
          <span
            className={cn("inline-math text-base", className)}
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        );
      } catch (error) {
        console.error('KaTeX full render error:', error);
        // Fall through to mixed content handling
      }
    }
    
    // Check if text contains math patterns that need rendering
    // Include subscripts like a_n / a_{n+1} (common in sequences)
    const hasMathPatterns =
      /\d/.test(normalized)
      || /\b\d+[A-Za-z]\b|\b[A-Za-z]\d+\b/.test(normalized)
      || /\^\{|\^[0-9a-zA-Z]|_\{|_[0-9a-zA-Z]|×|÷|·|√|⇒|→|←|⇐|↔|≤|≥|≠|≈|π|\\begin\{|\\(sqrt|frac|overline|dot|binom|text|mathrm|mathbf|vec)\{|\\(times|div|cdot|pm|Rightarrow|rightarrow|leftarrow|Leftarrow|leftrightarrow|equiv|mid|approx|cdots|gcd|lcm)\b|\\[a-zA-Z]+/i.test(
        normalized,
      ) || hasEquationPattern || bareMathOnly;
    
    // If no math patterns detected, render as plain text
    if (!hasMathPatterns && !hasLatexCommands) {
      return (
        <span className={cn("text-base leading-relaxed", className)}>
          {sanitizeMathForPlainText(normalized)}
        </span>
      );
    }
    
    // Mixed content: parse and render math inline with text.
    // Brace-aware handling is needed because normalization can introduce nested braces
    // (e.g. x^2 -> x^{2}) inside \frac{...}{...}.
    const mathRegex = /\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}|\\mathbf\{[^}]+\}|\\vec\{[^}]+\}|\\binom\{[^}]+\}\{[^}]+\}|\\text\{[^}]+\}|\\mathrm\{[^}]+\}|\\overline\{[^}]+\}|\\dot\{[^}]+\}|\([^)]*\)\^\{[^}]+\}|\([^)]*\)\^[0-9a-zA-Z]|\\(?:sin|cos|tan|sec|csc|cot)\([^)]+\)|\\(?:sin|cos|tan|sec|csc|cot|log|ln|pi|theta|alpha|beta|gamma|delta|sigma|omega|circ|neq|leq|geq|le|ge|equiv|mid|approx|cdots|gcd|lcm|pm|cdot|times|div|to|infty|sum|int|lim|dot|overline|Rightarrow|rightarrow|leftarrow|Leftarrow|leftrightarrow)|\\sqrt\\[[^\\]]+\\]\\{[^}]+\\}|\\[a-zA-Z]+\{[^}]+\}|\\[a-zA-Z]+|\b\d+(?![dD]\b)[A-Za-z]\b|\b(?![QAqa]\d+\b)[A-Za-z]\d+\b|[a-zA-Z0-9]+_\{[^}]+\}|[a-zA-Z0-9]+_[a-zA-Z0-9]+|[a-zA-Z0-9]+\^\{[^}]+\}|[a-zA-Z0-9]+\^\d+|[a-zA-Z0-9]+\^[a-zA-Z]|[a-zA-Z0-9]+\^\\circ|\b(?![AaIi]\b)[A-Za-z]\b|\b\d+(?:\.\d+)?\b|\d+°|√\d+|×|÷|·|⇒|→|←|⇐|↔|≤|≥|≠|≈|π/g;

    const renderRegexSegment = (segment: string, keySeed: { value: number }, out: (string | JSX.Element)[]) => {
      mathRegex.lastIndex = 0;
      const matches: { start: number; end: number; token: string }[] = [];
      let match: RegExpExecArray | null;

      while ((match = mathRegex.exec(segment)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, token: match[0] });
      }

      if (matches.length === 0) {
        if (segment) out.push(segment);
        return;
      }

      let cursor = 0;
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];

        if (current.start > cursor) {
          const plainText = segment.slice(cursor, current.start);
          if (plainText) out.push(sanitizeMathForPlainText(plainText));
        }

        let runText = current.token;
        let runEnd = current.end;
        let j = i;

        while (j + 1 < matches.length) {
          const next = matches[j + 1];
          const between = segment.slice(runEnd, next.start);
          if (between && isMathJoiner(between)) {
            runText += between + next.token;
            runEnd = next.end;
            j += 1;
            continue;
          }
          break;
        }

        const simpleMultiplier = /^\(?×\s*\d+(?:\.\d+)?\)?$/i.test(runText.trim());
        if (simpleMultiplier) {
          out.push(sanitizeMathForPlainText(runText));
          cursor = runEnd;
          i = j;
          continue;
        }

        try {
          const normalizedToken = wrapTextInMath(runText);
          const token = normalizedToken === '×'
            ? '\\times'
            : normalizedToken === '÷'
              ? '\\div'
              : normalizedToken === '·'
                ? '\\cdot'
                : normalizedToken === '⇒'
                  ? '\\Rightarrow'
                  : normalizedToken === '→'
                    ? '\\rightarrow'
                    : normalizedToken === '←'
                      ? '\\leftarrow'
                    : normalizedToken === '⇐'
                      ? '\\Leftarrow'
                      : normalizedToken === '↔'
                        ? '\\leftrightarrow'
                        : normalizedToken === '≤'
                          ? '\\leq'
                          : normalizedToken === '≥'
                            ? '\\geq'
                            : normalizedToken === '≠'
                              ? '\\neq'
                              : normalizedToken === '≈'
                                ? '\\approx'
                                : normalizedToken === 'π'
                                  ? '\\pi'
                                  : normalizedToken;

          const mathHtml = katex.renderToString(token, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: false,
            output: 'html'
          });
          if (mathHtml.includes('katex-error')) {
            out.push(fallbackMathToken(runText));
            cursor = runEnd;
            i = j;
            continue;
          }
          out.push(
            <span
              key={`math-${keySeed.value++}`}
              className="inline-math"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        } catch (err) {
          console.warn('KaTeX inline render failed:', err);
          out.push(fallbackMathToken(runText));
        }

        cursor = runEnd;
        i = j;
      }

      if (cursor < segment.length) {
        const remaining = segment.slice(cursor);
        if (remaining) out.push(sanitizeMathForPlainText(remaining));
      }
    };

    const parts: (string | JSX.Element)[] = [];
    const keySeed = { value: 0 };

    let cursor = 0;
    while (cursor < normalized.length) {
      const nextFrac = normalized.indexOf('\\frac{', cursor);
      const nextSqrt = normalized.indexOf('\\sqrt', cursor);
      const nextOver = normalized.indexOf('\\overline{', cursor);

      const candidates = [nextFrac, nextSqrt, nextOver].filter((i) => i !== -1);
      const nextCmd = candidates.length ? Math.min(...candidates) : -1;

      if (nextCmd === -1) {
        const tail = normalized.slice(cursor);
        if (tail) renderRegexSegment(tail, keySeed, parts);
        break;
      }

      const before = normalized.slice(cursor, nextCmd);
      if (before) renderRegexSegment(before, keySeed, parts);

      const token = extractBraceAwareToken(normalized, nextCmd);
      if (!token) {
        // If parsing fails, emit the backslash and continue to avoid infinite loops.
        parts.push(normalized[nextCmd]);
        cursor = nextCmd + 1;
        continue;
      }

      try {
        const mathHtml = katex.renderToString(token.token, {
          displayMode: false,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'html'
        });
        if (mathHtml.includes('katex-error')) {
          parts.push(fallbackMathToken(token.token));
          cursor = token.endIndex;
          continue;
        }
        parts.push(
          <span
            key={`math-${keySeed.value++}`}
            className="inline-math"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        );
      } catch (err) {
        console.warn('KaTeX inline render failed:', err);
        parts.push(fallbackMathToken(token.token));
      }

      cursor = token.endIndex;
    }
    
    // If no math was found, just return plain text
    if (parts.length === 0) {
      return (
        <span className={cn("text-base leading-relaxed", className)}>
          {fallbackMathToken(normalized)}
        </span>
      );
    }
    
    // Render mixed content
    if (display) {
      return (
        <div className={cn("my-2 text-base leading-relaxed", className)}>
          {parts.map((part, idx) => 
            typeof part === 'string' 
              ? <span key={`text-${idx}`}>{part}</span>
              : part
          )}
        </div>
      );
    }
    
    return (
      <span className={cn("text-base leading-relaxed", className)}>
        {parts.map((part, idx) => 
          typeof part === 'string'
            ? <span key={`text-${idx}`}>{part}</span>
            : part
        )}
      </span>
    );
    
  } catch (error) {
    console.error('MathText rendering error:', error);
    return (
      <span className={cn("text-base leading-relaxed", className)}>
        {sanitizeMathForPlainText(text)}
      </span>
    );
  }
}
