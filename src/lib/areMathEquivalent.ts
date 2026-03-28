import { ComputeEngine, type BoxedExpression } from '@cortex-js/compute-engine';
import { normalizeMath } from '@/lib/latexNormalizer';

const computeEngine = new ComputeEngine();

function cleanAnswer(raw: string): string {
  return normalizeMath(String(raw ?? '').trim());
}

function normalizeStatement(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bonly\b/g, '')
    .replace(/\s+/g, '');
}

function canonicalizeMath(raw: string): string {
  return raw
    .trim()
    // Normalize common inline math delimiters so "$10$", "\\(10\\)" and "10" compare reliably.
    .replace(/\\\((.*?)\\\)/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/^\$+|\$+$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
}

function parseOrEquation(raw: string): string[] | null {
  const normalized = normalizeStatement(raw);
  if (!normalized.includes('or') || !normalized.includes('=')) return null;

  const parts = normalized.split('or').filter(Boolean);
  const values: string[] = [];
  for (const part of parts) {
    const eqIndex = part.lastIndexOf('=');
    if (eqIndex === -1) return null;
    const value = part.slice(eqIndex + 1);
    if (!value) return null;
    values.push(value);
  }
  return values.sort();
}

function looksLikeStatement(raw: string): boolean {
  return (
    /[=<>]/.test(raw) ||
    /\\(leq|geq|le|ge|neq)\b/i.test(raw) ||
    /\b(or|only|solution|solutions|roots?)\b/i.test(raw)
  );
}

function tryParseLatex(latex: string): BoxedExpression | null {
  if (!latex) return null;
  try {
    const expr = computeEngine.parse(latex, { canonical: true });
    if (!expr?.isValid) return null;
    return expr;
  } catch {
    return null;
  }
}

export function areMathEquivalent(aRaw: string, bRaw: string): boolean {
  const a = cleanAnswer(aRaw);
  const b = cleanAnswer(bRaw);

  if (!a || !b) return false;
  if (a === b) return true;

  const aCanonical = canonicalizeMath(a);
  const bCanonical = canonicalizeMath(b);
  if (aCanonical && bCanonical && aCanonical === bCanonical) return true;

  const aOr = parseOrEquation(a);
  const bOr = parseOrEquation(b);
  if (aOr || bOr) {
    if (!aOr || !bOr || aOr.length !== bOr.length) return false;
    return aOr.every((value, idx) => value === bOr[idx]);
  }

  if (looksLikeStatement(a) || looksLikeStatement(b)) {
    return normalizeStatement(a) === normalizeStatement(b);
  }

  const aExpr = tryParseLatex(a);
  const bExpr = tryParseLatex(b);
  if (!aExpr || !bExpr) return false;

  const direct = aExpr.isEqual(bExpr);
  if (direct !== undefined) return direct;

  try {
    const diff = aExpr.sub(bExpr).simplify().evaluate().N();
    if (diff.is(0)) return true;

    const numeric = diff.numericValue;
    if (typeof numeric === 'number') {
      return Math.abs(numeric) < 1e-9;
    }
  } catch {
    // fall through
  }

  return false;
}

export function uniqueMathAnswers(answers: string[]): string[] {
  const out: string[] = [];
  for (const raw of answers) {
    const candidate = String(raw ?? '').trim();
    if (!candidate) continue;
    const isDup = out.some(existing => areMathEquivalent(candidate, existing));
    if (!isDup) out.push(candidate);
  }
  return out;
}
