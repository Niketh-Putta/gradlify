/*
Generates a deterministic SQL migration that inserts 8 questions per mini-subtopic:
- 4 Foundation (2 calculator, 2 non-calculator)
- 4 Higher (2 calculator, 2 non-calculator)

Output:
- By default writes a NEW timestamped migration file under supabase/migrations/.
- Pass an explicit output filename as argv[2] to control the name.

Design goals:
- No external APIs.
- Computed correct answers.
- 3 plausible wrong answers.
- Detailed explanations.
- Strict vertical fractions using \frac{a}{b}.
*/

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Ensure consistently professional math formatting in generated text.
// - Use unicode operators (× ÷) to avoid backslash-escaping issues in JS strings.
// - Force vertical fractions for simple numeric a/b patterns.
const beautifyMathText = (input) => {
  let s = String(input ?? '');

  // Replace LaTeX operator commands with unicode operators.
  // KaTeX supports these directly, and the app renderer also treats them as math.
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\div\b/g, '÷');
  s = s.replace(/\\approx\b/g, '≈');
  s = s.replace(/\\leq\b|\\le\b/g, '≤');
  s = s.replace(/\\geq\b|\\ge\b/g, '≥');
  s = s.replace(/\\,/g, ' ');

  // Force vertical fractions for standalone numeric a/b.
  // Avoid URLs, decimals, or longer expressions.
  s = s.replace(/(?<![a-zA-Z0-9])(-?\d+)\/(\d+)(?![a-zA-Z0-9\/.])/g, '\\frac{$1}{$2}');

  return s;
};

// ---------- Taxonomy (mirrors src/lib/topicConstants.ts) ----------
const TOPIC_SUBTOPICS = {
  number: {
    name: 'Number',
    subtopics: [
      { key: 'integers', name: 'Integers and place value' },
      { key: 'decimals', name: 'Decimals' },
      { key: 'fractions', name: 'Fractions' },
      { key: 'fractions_decimals_percent', name: 'Fractions, decimals and percentages conversions' },
      { key: 'percentages', name: 'Percentages' },
      { key: 'powers', name: 'Powers and roots' },
      { key: 'factors_multiples', name: 'Factors, multiples and primes' },
      { key: 'hcf_lcm', name: 'HCF and LCM' },
      { key: 'negative_numbers', name: 'Negative numbers' },
      { key: 'bidmas', name: 'Order of operations (BIDMAS)' },
      { key: 'rounding_bounds', name: 'Rounding, estimation and bounds' },
      { key: 'standard_form', name: 'Standard form' },
      { key: 'surds', name: 'Surds' },
      { key: 'recurring_decimals', name: 'Recurring decimals' },
      { key: 'unit_conversions', name: 'Unit conversions' },
    ],
  },
  algebra: {
    name: 'Algebra',
    subtopics: [
      { key: 'expressions', name: 'Algebraic expressions' },
      { key: 'expand', name: 'Expanding brackets' },
      { key: 'factorise', name: 'Factorising' },
      { key: 'substitution', name: 'Substitution' },
      { key: 'rearranging', name: 'Rearranging formulae' },
      { key: 'equations', name: 'Linear equations' },
      { key: 'inequalities', name: 'Inequalities' },
      { key: 'simultaneous', name: 'Simultaneous equations' },
      { key: 'sequences', name: 'Sequences' },
      { key: 'nth_term', name: 'Nth term' },
      { key: 'graphs', name: 'Graphs and functions' },
      { key: 'gradients', name: 'Gradients and intercepts' },
      { key: 'quadratics', name: 'Quadratic equations' },
      { key: 'algebraic_fractions', name: 'Algebraic fractions' },
    ],
  },
  ratio: {
    name: 'Ratio & Proportion',
    subtopics: [
      { key: 'ratio', name: 'Ratio & Proportion' },
      { key: 'proportion', name: 'Direct proportion' },
      { key: 'percentage_change', name: 'Percentage change' },
      { key: 'reverse_percentages', name: 'Reverse percentages' },
      { key: 'ratio_share', name: 'Sharing in a ratio' },
      { key: 'rates', name: 'Rates (speed, density, pressure)' },
      { key: 'speed', name: 'Speed = distance / time' },
      { key: 'best_buys', name: 'Best buys' },
      { key: 'growth_decay', name: 'Repeated percentage change' },
      { key: 'compound_interest', name: 'Compound interest' },
      { key: 'direct_inverse', name: 'Direct and inverse proportion' },
      { key: 'similarity_scale', name: 'Scale factors and similarity' },
    ],
  },
  geometry: {
    name: 'Geometry & Measures',
    subtopics: [
      { key: 'shapes', name: '2D and 3D shapes' },
      { key: 'perimeter_area', name: 'Perimeter and area' },
      { key: 'area_volume', name: 'Area and volume' },
      { key: 'angles', name: 'Angles and triangles' },
      { key: 'polygons', name: 'Polygons' },
      { key: 'trigonometry', name: 'Trigonometry' },
      { key: 'pythagoras', name: 'Pythagoras theorem' },
      { key: 'circles', name: 'Circles' },
      { key: 'arcs_sectors', name: 'Arcs and sectors' },
      { key: 'surface_area', name: 'Surface area' },
      { key: 'volume', name: 'Volume' },
      { key: 'bearings', name: 'Bearings' },
      { key: 'transformations', name: 'Transformations' },
      { key: 'constructions_loci', name: 'Constructions and loci' },
      { key: 'congruence', name: 'Congruence' },
      { key: 'vectors', name: 'Vectors' },
      { key: 'circle_theorems', name: 'Circle theorems' },
    ],
  },
  probability: {
    name: 'Probability',
    subtopics: [
      { key: 'basic', name: 'Basic probability' },
      { key: 'combined', name: 'Combined events' },
      { key: 'tree_diagrams', name: 'Tree diagrams' },
      { key: 'conditional', name: 'Conditional probability' },
      { key: 'relative_frequency', name: 'Relative frequency' },
      { key: 'venn_diagrams', name: 'Venn diagrams' },
      { key: 'expected_frequency', name: 'Expected frequency' },
      { key: 'independence', name: 'Independence' },
      { key: 'mutually_exclusive', name: 'Mutually exclusive events' },
    ],
  },
  statistics: {
    name: 'Statistics',
    subtopics: [
      { key: 'data', name: 'Data collection' },
      { key: 'averages', name: 'Averages and spread' },
      { key: 'charts', name: 'Charts and graphs' },
      { key: 'correlation', name: 'Correlation' },
      { key: 'sampling', name: 'Sampling' },
      { key: 'frequency_tables', name: 'Frequency tables' },
      { key: 'spread', name: 'Range and IQR' },
      { key: 'scatter', name: 'Scatter graphs' },
      { key: 'histograms', name: 'Histograms' },
      { key: 'cumulative_frequency', name: 'Cumulative frequency' },
      { key: 'box_plots', name: 'Box plots' },
      { key: 'two_way_tables', name: 'Two-way tables' },
    ],
  },
};

const topicKeyToCanonical = (topicKey) => {
  switch (topicKey) {
    case 'number':
      return 'Number';
    case 'algebra':
      return 'Algebra';
    case 'ratio':
      return 'Ratio & Proportion';
    case 'geometry':
      return 'Geometry & Measures';
    case 'probability':
      return 'Probability';
    case 'statistics':
      return 'Statistics';
    default:
      throw new Error(`Unknown topicKey: ${topicKey}`);
  }
};

// ---------- Deterministic RNG ----------
const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const hashStringToSeed = (s) => {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (rng, arr) => arr[randInt(rng, 0, arr.length - 1)];

// ---------- Math helpers ----------
const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) {
    if (n % i === 0) return false;
  }
  return true;
};

const countFactors = (n) => {
  let count = 0;
  for (let i = 1; i * i <= n; i += 1) {
    if (n % i === 0) count += i * i === n ? 1 : 2;
  }
  return count;
};

const simplifyFraction = (n, d) => {
  const sign = (n < 0) ^ (d < 0) ? -1 : 1;
  const nn = Math.abs(n);
  const dd = Math.abs(d);
  const g = gcd(nn, dd);
  return { n: sign * (nn / g), d: dd / g };
};

const fracLatex = (n, d) => {
  const f = simplifyFraction(n, d);
  if (f.d === 1) return `${f.n}`;
  if (f.n === 0) return '0';
  return `\\frac{${f.n}}{${f.d}}`;
};

const formatSigned = (x) => (x < 0 ? `-${Math.abs(x)}` : `${x}`);
const vectorLatex = (x, y) => `\\begin{pmatrix}${x}\\\\${y}\\end{pmatrix}`;
const formatBearing = (angle) => {
  const rounded = Math.round(angle);
  const normalized = ((rounded % 360) + 360) % 360;
  return String(normalized).padStart(3, '0');
};

const formatLinearEquation = (n, d, c) => {
  const mStr = d === 1 ? `${n}` : fracLatex(n, d);
  const mPart = mStr === '1' ? 'x' : mStr === '-1' ? '-x' : `${mStr}x`;
  if (c === 0) return `y = ${mPart}`;
  return `y = ${mPart} ${c >= 0 ? '+' : '-'} ${Math.abs(c)}`;
};

const formatRationalOption = (n, d) => {
  if (d === 0) return 'undefined';
  const value = n / d;
  return Number.isInteger(value) ? `${value}` : fracLatex(n, d);
};

const formatRootPair = (a, b) => {
  const first = a <= b ? a : b;
  const second = a <= b ? b : a;
  return `x = ${first} or x = ${second}`;
};

const buildQuadraticRootWrongs = (r1, r2) => {
  const correctPair = formatRootPair(r1, r2);
  const wrongs = [];
  const add = (a, b) => {
    const candidate = formatRootPair(a, b);
    if (candidate === correctPair) return;
    if (!wrongs.includes(candidate)) wrongs.push(candidate);
  };

  add(-r1, -r2);
  add(r1, -r2);
  add(-r1, r2);

  for (let n = 1; wrongs.length < 3 && n < 6; n += 1) {
    add(r1 + n, r2);
    add(r1 - n, r2);
    add(r1, r2 + n);
    add(r1, r2 - n);
  }

  return { correctPair, wrongs: wrongs.slice(0, 3) };
};

const trimLongDecimal = (value, maxDp = 3) => {
  const raw = String(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return raw;
  const [, decimals = ''] = raw.split('.');
  if (decimals.length <= maxDp) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return String(Number(n.toFixed(maxDp)));
};

const nCr = (n, r) => {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= k; i += 1) {
    res = (res * (n - k + i)) / i;
  }
  return Math.round(res);
};

const svgLineGraph = ({ x1, y1, x2, y2, range = 6, color = '#2563EB' }) => {
  const width = 360;
  const height = 360;
  const scale = width / (range * 2);
  const toX = (x) => (x + range) * scale;
  const toY = (y) => (range - y) * scale;

  const grid = [];
  for (let i = -range; i <= range; i++) {
    const x = toX(i);
    const y = toY(i);
    grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#E5E7EB" stroke-width="1" />`);
    grid.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />`);
  }

  const ticks = [];
  for (let i = -range + 1; i <= range - 1; i++) {
    if (i === 0) continue;
    const x = toX(i);
    const y = toY(i);
    ticks.push(`<text x="${x}" y="${toY(0) + 14}" font-size="10" text-anchor="middle" fill="#374151">${i}</text>`);
    ticks.push(`<text x="${toX(0) + 6}" y="${y + 3}" font-size="10" text-anchor="start" fill="#374151">${i}</text>`);
  }

  const line = `<line x1="${toX(x1)}" y1="${toY(y1)}" x2="${toX(x2)}" y2="${toY(
    y2,
  )}" stroke="${color}" stroke-width="2.5" />`;

  const points = `
    <circle cx="${toX(x1)}" cy="${toY(y1)}" r="3.5" fill="#111827" />
    <circle cx="${toX(x2)}" cy="${toY(y2)}" r="3.5" fill="#111827" />
    <text x="${toX(x1) + 6}" y="${toY(y1) - 6}" font-size="11" fill="#111827">A</text>
    <text x="${toX(x2) + 6}" y="${toY(y2) - 6}" font-size="11" fill="#111827">B</text>
    <text x="12" y="20" font-size="12" fill="#111827">A(${x1}, ${y1})</text>
    <text x="12" y="38" font-size="12" fill="#111827">B(${x2}, ${y2})</text>
  `;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  ${grid.join('\n  ')}
  <line x1="${toX(0)}" y1="0" x2="${toX(0)}" y2="${height}" stroke="#111827" stroke-width="2" />
  <line x1="0" y1="${toY(0)}" x2="${width}" y2="${toY(0)}" stroke="#111827" stroke-width="2" />
  ${ticks.join('\n  ')}
  ${line}
  ${points}
</svg>
`.trim();
};

const svgQuadraticGraph = ({ r1, r2, range = 6, color = '#16A34A' }) => {
  const width = 360;
  const height = 360;
  const scale = width / (range * 2);
  const toX = (x) => (x + range) * scale;
  const toY = (y) => (range - y) * scale;

  const grid = [];
  for (let i = -range; i <= range; i++) {
    const x = toX(i);
    const y = toY(i);
    grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#E5E7EB" stroke-width="1" />`);
    grid.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />`);
  }

  const ticks = [];
  for (let i = -range + 1; i <= range - 1; i++) {
    if (i === 0) continue;
    const x = toX(i);
    const y = toY(i);
    ticks.push(`<text x="${x}" y="${toY(0) + 14}" font-size="10" text-anchor="middle" fill="#374151">${i}</text>`);
    ticks.push(`<text x="${toX(0) + 6}" y="${y + 3}" font-size="10" text-anchor="start" fill="#374151">${i}</text>`);
  }

  const points = [];
  for (let x = -4; x <= 4.01; x += 0.2) {
    const y = (x - r1) * (x - r2);
    points.push(`${toX(x)},${toY(y)}`);
  }
  const path = `<path d="M ${points.join(' L ')}" fill="none" stroke="${color}" stroke-width="2.5" />`;

  const rootLabels = `
    <circle cx="${toX(r1)}" cy="${toY(0)}" r="3.5" fill="#111827" />
    <circle cx="${toX(r2)}" cy="${toY(0)}" r="3.5" fill="#111827" />
    <text x="${toX(r1)}" y="${toY(0) + 16}" font-size="11" text-anchor="middle" fill="#111827">${r1}</text>
    <text x="${toX(r2)}" y="${toY(0) + 16}" font-size="11" text-anchor="middle" fill="#111827">${r2}</text>
  `;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  ${grid.join('\n  ')}
  <line x1="${toX(0)}" y1="0" x2="${toX(0)}" y2="${height}" stroke="#111827" stroke-width="2" />
  <line x1="0" y1="${toY(0)}" x2="${width}" y2="${toY(0)}" stroke="#111827" stroke-width="2" />
  ${ticks.join('\n  ')}
  ${path}
  ${rootLabels}
</svg>
`.trim();
};

const svgTriangleAngles = ({ a, b }) => {
  const width = 320;
  const height = 240;
  const points = '60,200 260,200 160,60';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <polygon points="${points}" fill="none" stroke="#111827" stroke-width="3" />
  <text x="48" y="210" font-size="16" fill="#111827">${a}°</text>
  <text x="248" y="210" font-size="16" fill="#111827">${b}°</text>
  <text x="150" y="48" font-size="14" fill="#6B7280">triangle</text>
</svg>
`.trim();
};

const svgRightTriangle = ({ baseLabel, heightLabel, hypLabel, angleLabel, angleAt = 'right', rightAngleLabel }) => {
  const width = 320;
  const height = 240;
  const anglePos =
    angleAt === 'br'
      ? { x: 216, y: 186 }
      : angleAt === 'top'
        ? { x: 78, y: 82 }
        : { x: 84, y: 188 };
  const rightLabel = rightAngleLabel
    ? `<text x="86" y="176" font-size="11" fill="#6B7280">${rightAngleLabel}</text>`
    : '';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <polyline points="60,200 260,200 60,60 60,200" fill="none" stroke="#111827" stroke-width="3" />
  <rect x="60" y="180" width="20" height="20" fill="none" stroke="#111827" stroke-width="2" />
  <text x="160" y="226" font-size="14" text-anchor="middle" fill="#111827">${baseLabel}</text>
  <text x="16" y="132" font-size="14" text-anchor="start" fill="#111827">${heightLabel}</text>
  <text x="200" y="70" font-size="14" text-anchor="middle" fill="#111827">${hypLabel}</text>
  ${rightLabel}
  <text x="${anglePos.x}" y="${anglePos.y}" font-size="12" fill="#6B7280">${angleLabel}</text>
</svg>
`.trim();
};

const svgCircleRadius = ({ r }) => {
  const width = 320;
  const height = 240;
  const cx = 160;
  const cy = 120;
  const radius = 70;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#111827" stroke-width="3" />
  <line x1="${cx}" y1="${cy}" x2="${cx + radius}" y2="${cy}" stroke="#2563EB" stroke-width="3" />
  <text x="${cx + radius + 10}" y="${cy + 5}" font-size="14" fill="#111827">r = ${r} cm</text>
</svg>
`.trim();
};

const svgSector = ({ r, theta }) => {
  const width = 320;
  const height = 240;
  const cx = 160;
  const cy = 120;
  const radius = 70;
  const angleRad = (theta * Math.PI) / 180;
  const x = cx + radius * Math.cos(angleRad);
  const y = cy - radius * Math.sin(angleRad);
  const largeArc = theta > 180 ? 1 : 0;
  const path = `M ${cx} ${cy} L ${cx + radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#111827" stroke-width="3" />
  <path d="${path}" fill="rgba(37,99,235,0.15)" stroke="#2563EB" stroke-width="2" />
  <text x="${cx + 10}" y="${cy - 10}" font-size="14" fill="#111827">${theta}°</text>
  <text x="${cx + radius + 10}" y="${cy + 5}" font-size="14" fill="#111827">r = ${r} cm</text>
</svg>
`.trim();
};

const svgCuboid = ({ l, w, h }) => {
  const width = 320;
  const height = 240;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <polygon points="60,170 190,170 250,130 120,130" fill="rgba(37,99,235,0.12)" stroke="#111827" stroke-width="2" />
  <polygon points="60,170 120,130 120,60 60,100" fill="rgba(16,163,74,0.12)" stroke="#111827" stroke-width="2" />
  <polygon points="120,130 250,130 250,60 120,60" fill="rgba(245,158,11,0.12)" stroke="#111827" stroke-width="2" />
  <text x="110" y="185" font-size="14" fill="#111827">l = ${l} cm</text>
  <text x="20" y="120" font-size="14" fill="#111827">w = ${w} cm</text>
  <text x="255" y="95" font-size="14" fill="#111827">h = ${h} cm</text>
</svg>
`.trim();
};

const svgBearing = ({ bearing }) => {
  const width = 360;
  const height = 260;
  const cx = 180;
  const cy = 130;
  const r = 78;
  const angle = (bearing - 90) * (Math.PI / 180);
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const arcR = 46;
  const arcX = cx + arcR * Math.cos(angle);
  const arcY = cy + arcR * Math.sin(angle);
  const largeArc = bearing > 180 ? 1 : 0;
  const arcPath = `M ${cx} ${cy - arcR} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcX} ${arcY}`;
  const labelX = cx + (arcR + 10) * Math.cos(angle / 2);
  const labelY = cy + (arcR + 10) * Math.sin(angle / 2);
  const bearingText = `${formatBearing(bearing)}°`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#111827" stroke-width="2" />
  <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#111827" stroke-width="1" />
  <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#111827" stroke-width="1" />
  <text x="${cx - 5}" y="${cy - r - 10}" font-size="12" fill="#111827">N</text>
  <text x="${cx - 5}" y="${cy + r + 20}" font-size="12" fill="#111827">S</text>
  <text x="${cx + r + 10}" y="${cy + 4}" font-size="12" fill="#111827">E</text>
  <text x="${cx - r - 20}" y="${cy + 4}" font-size="12" fill="#111827">W</text>
  <path d="${arcPath}" fill="none" stroke="#2563EB" stroke-width="2" />
  <text x="${labelX}" y="${labelY}" font-size="12" fill="#111827">${bearingText}</text>
  <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2563EB" stroke-width="3" />
  <circle cx="${cx}" cy="${cy}" r="3" fill="#111827" />
  <text x="${cx + 6}" y="${cy - 6}" font-size="12" fill="#111827">A</text>
  <circle cx="${x}" cy="${y}" r="4" fill="#2563EB" />
  <text x="${x + 8}" y="${y - 6}" font-size="12" fill="#111827">B</text>
</svg>
`.trim();
};

const svgBarChart = ({ labels, values }) => {
  const width = 360;
  const height = 240;
  const chartWidth = 280;
  const chartHeight = 150;
  const left = 50;
  const bottom = 190;
  const max = Math.max(...values, 1);
  const barWidth = Math.floor(chartWidth / values.length) - 8;
  const bars = values.map((v, i) => {
    const barHeight = Math.round((v / max) * chartHeight);
    const x = left + i * (barWidth + 8);
    const y = bottom - barHeight;
    const valueY = Math.max(y - 6, 14);
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#2563EB" />` +
      `<text x="${x + barWidth / 2}" y="${bottom + 16}" font-size="12" text-anchor="middle" fill="#111827">${labels[i]}</text>` +
      `<text x="${x + barWidth / 2}" y="${valueY}" font-size="12" text-anchor="middle" fill="#111827">${values[i]}</text>`;
  });
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <line x1="${left}" y1="${bottom}" x2="${left + chartWidth}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  <line x1="${left}" y1="${bottom - chartHeight}" x2="${left}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  ${bars.join('\n  ')}
</svg>
`.trim();
};

const svgScatter = ({ points, labelPoints = [] }) => {
  const width = 320;
  const height = 240;
  const left = 40;
  const bottom = 200;
  const chartWidth = 240;
  const chartHeight = 150;
  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const dots = points.map((p) => {
    const x = left + Math.round((p.x / maxX) * chartWidth);
    const y = bottom - Math.round((p.y / maxY) * chartHeight);
    return `<circle cx="${x}" cy="${y}" r="4" fill="#2563EB" />`;
  });
  const labels = labelPoints.map((p) => {
    const x = left + Math.round((p.x / maxX) * chartWidth);
    const y = bottom - Math.round((p.y / maxY) * chartHeight);
    return `<text x="${x + 6}" y="${y - 6}" font-size="11" fill="#111827">(${p.x}, ${p.y})</text>`;
  });
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <line x1="${left}" y1="${bottom}" x2="${left + chartWidth}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  <line x1="${left}" y1="${bottom - chartHeight}" x2="${left}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  ${dots.join('\n  ')}
  ${labels.join('\n  ')}
</svg>
`.trim();
};

const svgHistogram = ({ bins }) => {
  const labels = bins.map((b) => b.label);
  const values = bins.map((b) => b.value);
  return svgBarChart({ labels, values });
};

const svgBoxPlot = ({ min, q1, med, q3, max }) => {
  const width = 360;
  const height = 160;
  const left = 40;
  const right = 320;
  const lineY = 80;
  const range = max - min || 1;
  const scale = (val) => left + Math.round(((val - min) / range) * (right - left));
  const xMin = scale(min);
  const xQ1 = scale(q1);
  const xMed = scale(med);
  const xQ3 = scale(q3);
  const xMax = scale(max);
  const labelY = 140;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <line x1="${xMin}" y1="${lineY}" x2="${xMax}" y2="${lineY}" stroke="#111827" stroke-width="2" />
  <rect x="${xQ1}" y="${lineY - 20}" width="${xQ3 - xQ1}" height="40" fill="rgba(37,99,235,0.15)" stroke="#2563EB" stroke-width="2" />
  <line x1="${xMed}" y1="${lineY - 20}" x2="${xMed}" y2="${lineY + 20}" stroke="#2563EB" stroke-width="2" />
  <line x1="${xMin}" y1="${lineY - 10}" x2="${xMin}" y2="${lineY + 10}" stroke="#111827" stroke-width="2" />
  <line x1="${xMax}" y1="${lineY - 10}" x2="${xMax}" y2="${lineY + 10}" stroke="#111827" stroke-width="2" />
  <text x="${xMin}" y="${labelY}" font-size="12" text-anchor="middle" fill="#111827">${min}</text>
  <text x="${xQ1}" y="${labelY}" font-size="12" text-anchor="middle" fill="#111827">${q1}</text>
  <text x="${xMed}" y="${labelY}" font-size="12" text-anchor="middle" fill="#111827">${med}</text>
  <text x="${xQ3}" y="${labelY}" font-size="12" text-anchor="middle" fill="#111827">${q3}</text>
  <text x="${xMax}" y="${labelY}" font-size="12" text-anchor="middle" fill="#111827">${max}</text>
</svg>
`.trim();
};

const svgCumulativeFrequency = ({ points }) => {
  const width = 360;
  const height = 240;
  const left = 40;
  const bottom = 200;
  const chartWidth = 260;
  const chartHeight = 150;
  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const coords = points.map((p) => {
    const x = left + Math.round((p.x / maxX) * chartWidth);
    const y = bottom - Math.round((p.y / maxY) * chartHeight);
    return `${x},${y}`;
  });
  const xLabels = points.map((p) => {
    const x = left + Math.round((p.x / maxX) * chartWidth);
    return `<text x="${x}" y="${bottom + 18}" font-size="11" text-anchor="middle" fill="#111827">${p.x}</text>`;
  });
  const yLabels = points.map((p) => {
    const y = bottom - Math.round((p.y / maxY) * chartHeight);
    return `<text x="${left - 8}" y="${y + 4}" font-size="11" text-anchor="end" fill="#111827">${p.y}</text>`;
  });
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <line x1="${left}" y1="${bottom}" x2="${left + chartWidth}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  <line x1="${left}" y1="${bottom - chartHeight}" x2="${left}" y2="${bottom}" stroke="#111827" stroke-width="2" />
  <polyline points="${coords.join(' ')}" fill="none" stroke="#2563EB" stroke-width="3" />
  ${coords
    .map((pt) => {
      const [x, y] = pt.split(',');
      return `<circle cx="${x}" cy="${y}" r="3" fill="#2563EB" />`;
    })
    .join('\n  ')}
  ${xLabels.join('\n  ')}
  ${yLabels.join('\n  ')}
</svg>
`.trim();
};

const makeWrongAnswers = (correct, wrongs) => {
  const uniq = [];
  const seen = new Set([String(correct)]);
  for (const w of wrongs) {
    const s = trimLongDecimal(w);
    if (!seen.has(s)) {
      seen.add(s);
      uniq.push(s);
    }
  }

  const parseFrac = (s) => {
    const m = s.match(/^\\frac\{(-?\d+)\}\{(\d+)\}$/);
    if (!m) return null;
    return { n: Number(m[1]), d: Number(m[2]) };
  };

  const parseNumber = (s) => {
    if (!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const parsePercent = (s) => {
    const m = s.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const buildFallback = (idx) => {
    const cs = String(correct).trim();
    const upper = cs.toUpperCase();

    const letterOnly = cs.match(/^[A-D]$/i);
    if (letterOnly) {
      return ['A', 'B', 'C', 'D'].filter((l) => l.toUpperCase() !== upper);
    }

    const studentMatch = cs.match(/^Student\s+([A-D])$/i);
    if (studentMatch) {
      return ['A', 'B', 'C', 'D']
        .filter((l) => l.toUpperCase() !== studentMatch[1].toUpperCase())
        .map((l) => `Student ${l}`);
    }

    const pairMatch = cs.match(/^(Pack|Rice|Detergent)\s+([AB])$/i);
    if (pairMatch) {
      const prefix = pairMatch[1];
      return [`${prefix} A`, `${prefix} B`, 'Both are the same', 'Neither is better']
        .filter((opt) => opt !== cs);
    }

    const wordLetterMatch = cs.match(/^(.+?)\s+([A-D])$/i);
    if (wordLetterMatch) {
      const prefix = wordLetterMatch[1];
      return ['A', 'B', 'C', 'D']
        .filter((l) => l.toUpperCase() !== wordLetterMatch[2].toUpperCase())
        .map((l) => `${prefix} ${l}`);
    }

    const correlationSet = ['Positive correlation', 'Negative correlation', 'No correlation', 'Cannot be determined'];
    if (correlationSet.some((opt) => opt.toLowerCase() === cs.toLowerCase())) {
      return correlationSet.filter((opt) => opt.toLowerCase() !== cs.toLowerCase());
    }

    const chartSet = ['Histogram', 'Bar chart', 'Pie chart', 'Scatter graph', 'Box plot', 'Line graph'];
    if (chartSet.some((opt) => opt.toLowerCase() === cs.toLowerCase())) {
      return chartSet.filter((opt) => opt.toLowerCase() !== cs.toLowerCase());
    }
    const f = parseFrac(cs);
    if (f) {
      // Generate nearby, valid fractions (still LaTeX).
      const variants = [
        fracLatex(f.n + idx, f.d),
        fracLatex(f.n - idx, f.d),
        fracLatex(f.n, f.d + idx),
        fracLatex(f.n + idx, f.d + idx),
      ];
      return variants;
    }

    const p = parsePercent(cs);
    if (p !== null) {
      return [`${p + 5 * idx}%`, `${Math.max(0, p - 5 * idx)}%`];
    }

    const n = parseNumber(cs);
    if (n !== null) {
      // Keep integer/decimal answers numeric.
      const variants = [n + idx, n - idx, n + 2 * idx, n - 2 * idx]
        .filter((x) => Number.isFinite(x))
        .map((x) => trimLongDecimal(`${x}`));
      return variants;
    }

    // Last resort: distinct plain-text distractors.
    return [`Not ${cs}`, 'None of the above'];
  };

  // pad if needed (never mutate LaTeX by string concatenation)
  let idx = 1;
  while (uniq.length < 3 && idx < 25) {
    for (const candidate of buildFallback(idx)) {
      if (uniq.length >= 3) break;
      if (!seen.has(candidate)) {
        seen.add(candidate);
        uniq.push(candidate);
      }
    }
    idx += 1;
  }
  return uniq.slice(0, 3);
};

// ---------- Template generators ----------
// Each returns { question, correct, wrongs, explanation, difficulty, marks, est }

const templates = {
  // NUMBER
  integers: (rng, tier, calc, v) => {
    const placeMap = [
      { name: 'tens', value: 10 },
      { name: 'hundreds', value: 100 },
      { name: 'thousands', value: 1000 },
      { name: 'ten-thousands', value: 10000 },
      { name: 'hundred-thousands', value: 100000 },
    ];

    const makeArithmetic = (hard) => {
      const a = randInt(rng, hard ? 20 : 3, hard ? 120 : 40);
      const b = randInt(rng, hard ? 12 : 3, hard ? 90 : 40);
      const c = randInt(rng, hard ? 5 : 2, hard ? 35 : 15);
      const d = randInt(rng, hard ? 5 : 2, hard ? 25 : 12);
      const question = hard
        ? `Work out (${a} - ${b}) × ${c} + ${d}.`
        : `Work out ${a} × ${b} - ${c}.`;
      const correct = hard ? ((a - b) * c + d) : (a * b - c);
      const wrongs = hard
        ? makeWrongAnswers(`${correct}`, [`${(a - b) * (c + 1) + d}`, `${(a + b) * c + d}`, `${(a - b) * c - d}`])
        : makeWrongAnswers(`${correct}`, [`${a * (b - c)}`, `${a * b + c}`, `${a * b - (c + 1)}`]);
      const explanation = hard
        ? `Step 1: Brackets first: ${a} - ${b} = ${a - b}.

Step 2: Multiply: ${a - b} × ${c} = ${(a - b) * c}.

Step 3: Add ${d}: ${(a - b) * c} + ${d} = ${correct}.

Final answer: ${correct}`
        : `Step 1: Multiply first: ${a} × ${b} = ${a * b}.

Step 2: Subtract ${c}: ${a * b} - ${c} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: hard ? 3 : 2, marks: 1, est: calc === 'Calculator' ? 55 : 65 };
    };

    const makePlaceValue = (hard) => {
      const min = hard ? 50000 : 4000;
      const max = hard ? 999999 : 99999;
      const num = randInt(rng, min, max);
      const place = pick(rng, placeMap.filter((p) => (hard ? p.value >= 100 : p.value >= 10 && p.value <= 10000)));
      const digit = Math.floor(num / place.value) % 10;
      const correct = `${digit * place.value}`;
      const question = `In the number ${num}, what is the value of the digit in the ${place.name} place?`;
      const wrongs = makeWrongAnswers(correct, [`${digit}`, `${digit * place.value * 10}`, `${Math.max(0, digit * place.value - place.value)}`]);
      const explanation = `Step 1: The ${place.name} place is worth ${place.value}.

Step 2: The digit is ${digit}, so its value is ${digit} × ${place.value} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: hard ? 3 : 2, marks: 1, est: 70 };
    };

    const makeOrder = (hard) => {
      const count = hard ? 5 : 4;
      const nums = new Set();
      while (nums.size < count) {
        nums.add(randInt(rng, hard ? 200 : 30, hard ? 1500 : 500));
      }
      const list = Array.from(nums);
      const sorted = [...list].sort((a, b) => a - b);
      const question = `Put these numbers in ascending order: ${list.join(', ')}.`;
      const correct = sorted.join(', ');
      const wrongs = makeWrongAnswers(correct, [
        [...sorted].reverse().join(', '),
        [sorted[1], sorted[0], ...sorted.slice(2)].join(', '),
        [sorted[0], sorted[2], sorted[1], ...sorted.slice(3)].join(', '),
      ]);
      const explanation = `Step 1: Compare each number by place value.

Step 2: The ascending order is ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: hard ? 3 : 1, marks: 1, est: 80 };
    };

    const makeExpanded = (hard) => {
      const digits = [];
      const length = hard ? 6 : 5;
      while (digits.length < length) {
        const d = randInt(rng, digits.length === 0 ? 1 : 0, 9);
        digits.push(d);
      }
      const num = Number(digits.join(''));
      const powers = digits.map((d, idx) => d * Math.pow(10, length - idx - 1)).filter((x) => x > 0);
      const question = `Write ${powers.join(' + ')} as a single number.`;
      const correct = `${num}`;
      const wrongs = makeWrongAnswers(correct, [`${num + 10}`, `${num - 10}`, `${powers.reduce((a, b) => a + b, 0) + 100}`]);
      const explanation = `Step 1: Add the place values.

Step 2: ${powers.join(' + ')} = ${num}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: hard ? 3 : 2, marks: 1, est: 85 };
    };

    const foundationPatterns = [
      () => makeArithmetic(false),
      () => makePlaceValue(false),
      () => makeOrder(false),
      () => makeExpanded(false),
    ];
    const higherPatterns = [
      () => makeArithmetic(true),
      () => makePlaceValue(true),
      () => makeOrder(true),
      () => makeExpanded(true),
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  decimals: (rng, tier, calc, v) => {
    const makeAddSub = (isAdd) => {
      const dp = pick(rng, [1, 2]);
      const x = randInt(rng, 12, tier === 'Higher Tier' ? 99 : 60);
      const y = randInt(rng, 12, tier === 'Higher Tier' ? 99 : 60);
      const a = Number((x / (dp === 1 ? 10 : 100)).toFixed(dp));
      const b = Number((y / (dp === 1 ? 10 : 100)).toFixed(dp));
      const question = isAdd ? `Work out ${a} + ${b}.` : `Work out ${a} - ${b}.`;
      const correct = Number((isAdd ? a + b : a - b).toFixed(dp));
      const wrongs = makeWrongAnswers(`${correct}`, [
        `${Number((isAdd ? a + b + (dp === 1 ? 0.1 : 0.01) : a - b + (dp === 1 ? 0.1 : 0.01)).toFixed(dp))}`,
        `${Number((isAdd ? a + b - (dp === 1 ? 0.1 : 0.01) : a - b - (dp === 1 ? 0.1 : 0.01)).toFixed(dp))}`,
        `${Number((isAdd ? a + (b / 10) : a - (b / 10)).toFixed(dp))}`,
      ]);
      const explanation = `Step 1: Line up the decimal points.

Step 2: ${a} ${isAdd ? '+' : '-'} ${b} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: calc === 'Calculator' ? 60 : 75 };
    };

    const makeMultiply = (hard) => {
      const dp = hard ? 2 : 1;
      const a = Number((randInt(rng, 12, hard ? 99 : 60) / (dp === 1 ? 10 : 100)).toFixed(dp));
      const b = hard
        ? Number((randInt(rng, 12, 99) / 10).toFixed(1))
        : randInt(rng, 2, 9);
      const question = `Work out ${a} × ${b}. Give your answer to ${hard ? 2 : dp} decimal places.`;
      const correct = Number((a * b).toFixed(hard ? 2 : dp));
      const wrongs = makeWrongAnswers(`${correct}`, [
        `${Number((a * b * 10).toFixed(hard ? 2 : dp))}`,
        `${Number((a * b / 10).toFixed(hard ? 2 : dp))}`,
        `${Number((a + b).toFixed(hard ? 2 : dp))}`,
      ]);
      const explanation = `Step 1: Multiply as integers then place the decimal point back.

Step 2: ${a} × ${b} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: hard ? 4 : 2, marks: 1, est: calc === 'Calculator' ? 70 : 90 };
    };

    const makeDivide = (hard) => {
      const divisor = pick(rng, [2, 4, 5, 8, 10]);
      const base = randInt(rng, hard ? 15 : 6, hard ? 60 : 30);
      const dividend = Number((base * divisor / 10).toFixed(1));
      const question = `Work out ${dividend} ÷ ${divisor}.`;
      const correct = Number((dividend / divisor).toFixed(2));
      const wrongs = makeWrongAnswers(`${correct}`, [
        `${Number((dividend * divisor).toFixed(2))}`,
        `${Number((dividend / (divisor * 10)).toFixed(2))}`,
        `${Number((dividend - divisor).toFixed(2))}`,
      ]);
      const explanation = `Step 1: Divide ${dividend} by ${divisor}.

Step 2: ${dividend} ÷ ${divisor} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: hard ? 3 : 2, marks: 1, est: calc === 'Calculator' ? 70 : 85 };
    };

    const foundationPatterns = [
      () => makeAddSub(true),
      () => makeAddSub(false),
      () => makeMultiply(false),
      () => makeDivide(false),
    ];
    const higherPatterns = [
      () => makeAddSub(true),
      () => makeAddSub(false),
      () => makeMultiply(true),
      () => makeDivide(true),
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  fractions: (rng, tier, calc, v) => {
    const makeAdd = () => {
      const a = randInt(rng, 1, 9);
      const b = randInt(rng, 2, 12);
      const c = randInt(rng, 1, 9);
      const d = randInt(rng, 2, 12);
      const f1 = simplifyFraction(a, b);
      const f2 = simplifyFraction(c, d);
      const cn = f1.n * f2.d + f2.n * f1.d;
      const cd = f1.d * f2.d;
      const corr = simplifyFraction(cn, cd);
      const correct = fracLatex(corr.n, corr.d);
      const wrongs = makeWrongAnswers(correct, [
        fracLatex(cn, cd),
        fracLatex(f1.n + f2.n, f1.d + f2.d),
        fracLatex(f1.n * f2.d - f2.n * f1.d, f1.d * f2.d),
      ]);
      const question = `Work out ${fracLatex(f1.n, f1.d)} + ${fracLatex(f2.n, f2.d)}. Give your answer in its simplest form.`;
      const explanation = `Step 1: Common denominator is ${f1.d * f2.d}.

Step 2: Add numerators: ${cn}.

Step 3: Simplify ${fracLatex(cn, cd)} to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: calc === 'Calculator' ? 80 : 95 };
    };

    const makeSubtract = () => {
      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 3, 12);
      const c = randInt(rng, 1, 8);
      const d = randInt(rng, 3, 12);
      const f1 = simplifyFraction(a, b);
      const f2 = simplifyFraction(c, d);
      const cn = f1.n * f2.d - f2.n * f1.d;
      const cd = f1.d * f2.d;
      const corr = simplifyFraction(cn, cd);
      const correct = fracLatex(corr.n, corr.d);
      const wrongs = makeWrongAnswers(correct, [
        fracLatex(cn, cd),
        fracLatex(f1.n + f2.n, f1.d + f2.d),
        fracLatex(f1.n * f2.d + f2.n * f1.d, f1.d * f2.d),
      ]);
      const question = `Work out ${fracLatex(f1.n, f1.d)} - ${fracLatex(f2.n, f2.d)}. Give your answer in its simplest form.`;
      const explanation = `Step 1: Common denominator is ${f1.d * f2.d}.

Step 2: Subtract numerators: ${cn}.

Step 3: Simplify ${fracLatex(cn, cd)} to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: calc === 'Calculator' ? 80 : 95 };
    };

    const makeMultiply = () => {
      const a = randInt(rng, 1, 9);
      const b = randInt(rng, 2, 12);
      const c = randInt(rng, 1, 9);
      const d = randInt(rng, 2, 12);
      const f1 = simplifyFraction(a, b);
      const f2 = simplifyFraction(c, d);
      const cn = f1.n * f2.n;
      const cd = f1.d * f2.d;
      const corr = simplifyFraction(cn, cd);
      const correct = fracLatex(corr.n, corr.d);
      const wrongs = makeWrongAnswers(correct, [
        fracLatex(cn, cd),
        fracLatex(f1.n * f2.d, f1.d * f2.n),
        fracLatex(f1.n * f2.n + 1, f1.d * f2.d),
      ]);
      const question = `Work out ${fracLatex(f1.n, f1.d)} × ${fracLatex(f2.n, f2.d)}. Give your answer in its simplest form.`;
      const explanation = `Step 1: Multiply numerators and denominators.

Step 2: ${fracLatex(cn, cd)} simplifies to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: calc === 'Calculator' ? 80 : 95 };
    };

    const makeDivide = () => {
      const a = randInt(rng, 1, 9);
      const b = randInt(rng, 2, 12);
      const c = randInt(rng, 1, 9);
      const d = randInt(rng, 2, 12);
      const f1 = simplifyFraction(a, b);
      const f2 = simplifyFraction(c, d);
      const cn = f1.n * f2.d;
      const cd = f1.d * f2.n;
      const corr = simplifyFraction(cn, cd);
      const correct = fracLatex(corr.n, corr.d);
      const wrongs = makeWrongAnswers(correct, [
        fracLatex(cn, cd),
        fracLatex(f1.n * f2.n, f1.d * f2.d),
        fracLatex(f1.n * f2.d + 1, f1.d * f2.n),
      ]);
      const question = `Work out ${fracLatex(f1.n, f1.d)} ÷ ${fracLatex(f2.n, f2.d)}. Give your answer in its simplest form.`;
      const explanation = `Step 1: Multiply by the reciprocal: ${fracLatex(f1.n, f1.d)} × ${fracLatex(f2.d, f2.n)}.

Step 2: ${fracLatex(cn, cd)} simplifies to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: calc === 'Calculator' ? 90 : 110 };
    };

    const makeFractionOf = () => {
      const n = randInt(rng, 1, 9);
      const d = pick(rng, [2, 3, 4, 5, 6, 8, 10, 12]);
      const mult = randInt(rng, 2, 12);
      const total = d * mult;
      const correct = `${(n * mult)}`;
      const wrongs = makeWrongAnswers(correct, [`${mult}`, `${total / n}`, `${n + mult}`]);
      const question = `Find ${fracLatex(n, d)} of ${total}.`;
      const explanation = `Step 1: Divide by ${d}: ${total} ÷ ${d} = ${mult}.

Step 2: Multiply by ${n}: ${mult} × ${n} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: calc === 'Calculator' ? 80 : 95 };
    };

    const foundationPatterns = [makeAdd, makeSubtract, makeMultiply, makeFractionOf];
    const higherPatterns = [makeAdd, makeSubtract, makeMultiply, makeDivide, makeFractionOf];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  fractions_decimals_percent: (rng, tier, calc, v) => {
    const fractionToPercent = () => {
      const n = pick(rng, [1, 3, 5, 7, 9]);
      const d = pick(rng, [2, 4, 5, 8, 10, 20]);
      const frac = simplifyFraction(n, d);
      const percent = (frac.n / frac.d) * 100;
      const question = `Convert ${fracLatex(frac.n, frac.d)} to a percentage.`;
      const correct = `${percent}%`;
      const wrongs = makeWrongAnswers(correct, [`${percent / 10}%`, `${percent * 10}%`, `${percent + 5}%`]);
      const explanation = `Step 1: Multiply by 100.

Step 2: ${fracLatex(frac.n, frac.d)} × 100 = ${percent}%.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 60 };
    };

    const percentToFraction = () => {
      const percent = pick(rng, [12.5, 20, 25, 37.5, 40, 45, 60, 75]);
      const f = simplifyFraction(percent * 10, 1000);
      const correct = fracLatex(f.n, f.d);
      const question = `Convert ${percent}% to a fraction in its simplest form.`;
      const wrongs = makeWrongAnswers(correct, [fracLatex(f.n, f.d * 10), fracLatex(f.n * 10, f.d), fracLatex(f.n + 1, f.d)]);
      const explanation = `Step 1: Write ${percent}% as a fraction over 100.

Step 2: Simplify to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 70 };
    };

    const fractionToDecimal = () => {
      const n = pick(rng, [1, 3, 5, 7, 9]);
      const d = pick(rng, [2, 4, 5, 8, 10, 20]);
      const frac = simplifyFraction(n, d);
      const decimal = trimLongDecimal((frac.n / frac.d).toFixed(3));
      const question = `Convert ${fracLatex(frac.n, frac.d)} to a decimal.`;
      const correct = `${decimal}`;
      const wrongs = makeWrongAnswers(correct, [`${trimLongDecimal(((frac.n + 1) / frac.d).toFixed(3))}`, `${trimLongDecimal((frac.n / (frac.d + 1)).toFixed(3))}`, `${trimLongDecimal(((frac.n * 10) / frac.d).toFixed(3))}`]);
      const explanation = `Step 1: Divide ${frac.n} by ${frac.d}.

Step 2: ${frac.n} ÷ ${frac.d} = ${decimal}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 60 };
    };

    const decimalToFraction = () => {
      const decimals = [0.2, 0.25, 0.3, 0.4, 0.6, 0.75, 1.2, 1.5];
      const value = pick(rng, decimals);
      const denom = value % 1 === 0 ? 1 : 100;
      const num = Math.round(value * denom);
      const f = simplifyFraction(num, denom);
      const correct = fracLatex(f.n, f.d);
      const question = `Convert ${value} to a fraction in its simplest form.`;
      const wrongs = makeWrongAnswers(correct, [fracLatex(f.n, f.d * 10), fracLatex(f.n + 1, f.d), fracLatex(f.n * 10, f.d)]);
      const explanation = `Step 1: Write ${value} as a fraction over ${denom}.

Step 2: Simplify to ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 70 };
    };

    const percentToDecimal = () => {
      const percent = pick(rng, [5, 12.5, 18, 25, 40, 62.5, 80]);
      const correct = trimLongDecimal((percent / 100).toFixed(3));
      const question = `Convert ${percent}% to a decimal.`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((percent / 10).toFixed(3))}`,
        `${trimLongDecimal((percent / 1000).toFixed(3))}`,
        `${trimLongDecimal(((percent + 5) / 100).toFixed(3))}`,
      ]);
      const explanation = `Step 1: Divide by 100.

Step 2: ${percent}% = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 60 };
    };

    const decimalToPercent = () => {
      const value = pick(rng, [0.12, 0.25, 0.375, 0.6, 0.84, 1.2]);
      const correct = `${trimLongDecimal((value * 100).toFixed(2))}%`;
      const question = `Convert ${value} to a percentage.`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((value * 10).toFixed(2))}%`,
        `${trimLongDecimal((value / 100).toFixed(2))}%`,
        `${trimLongDecimal(((value + 0.05) * 100).toFixed(2))}%`,
      ]);
      const explanation = `Step 1: Multiply by 100.

Step 2: ${value} × 100 = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 60 };
    };

    const foundationPatterns = [fractionToPercent, percentToFraction, fractionToDecimal, decimalToPercent];
    const higherPatterns = [fractionToPercent, percentToFraction, fractionToDecimal, decimalToFraction, percentToDecimal, decimalToPercent];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  percentages: (rng, tier, calc, v) => {
    const makePercentOf = () => {
      const amount = randInt(rng, 40, tier === 'Higher Tier' ? 480 : 240);
      const p = pick(rng, tier === 'Higher Tier' ? [12, 15, 17.5, 22, 35] : [10, 12, 15, 20, 25]);
      const correctNum = (amount * p) / 100;
      const correct = trimLongDecimal(correctNum.toFixed(2));
      const question = `Work out ${p}% of ${amount}.`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((amount * (p / 10)).toFixed(2))}`,
        `${amount + p}`,
        `${trimLongDecimal((amount * p).toFixed(2))}`,
      ]);
      const explanation = `Step 1: Convert ${p}% to a decimal: ${p / 100}.

Step 2: ${amount} × ${p / 100} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 2, marks: 1, est: calc === 'Calculator' ? 70 : 85 };
    };

    const makeIncrease = () => {
      const amount = randInt(rng, 60, tier === 'Higher Tier' ? 600 : 300);
      const p = pick(rng, [5, 10, 12.5, 15, 20, 25]);
      const correctNum = amount * (1 + p / 100);
      const correct = trimLongDecimal(correctNum.toFixed(2));
      const question = `Increase ${amount} by ${p}%.`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((amount * (1 - p / 100)).toFixed(2))}`,
        `${amount + p}`,
        `${trimLongDecimal((amount * (1 + (p / 10) / 100)).toFixed(2))}`,
      ]);
      const explanation = `Step 1: Multiply by ${1 + p / 100}.

Step 2: ${amount} × ${1 + p / 100} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 1, est: calc === 'Calculator' ? 70 : 90 };
    };

    const makeDecrease = () => {
      const amount = randInt(rng, 60, tier === 'Higher Tier' ? 600 : 300);
      const p = pick(rng, [5, 10, 15, 20, 25, 30]);
      const correctNum = amount * (1 - p / 100);
      const correct = trimLongDecimal(correctNum.toFixed(2));
      const question = `Decrease ${amount} by ${p}%.`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((amount * (1 + p / 100)).toFixed(2))}`,
        `${amount - p}`,
        `${trimLongDecimal((amount * (1 - (p / 10) / 100)).toFixed(2))}`,
      ]);
      const explanation = `Step 1: Multiply by ${1 - p / 100}.

Step 2: ${amount} × ${1 - p / 100} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 1, est: calc === 'Calculator' ? 70 : 90 };
    };

    const makeWhatPercent = () => {
      const total = randInt(rng, 80, tier === 'Higher Tier' ? 320 : 200);
      const part = pick(rng, [10, 15, 20, 25, 30, 40]) * Math.round(total / 100);
      const percent = Math.round((part / total) * 100);
      const correct = `${percent}%`;
      const wrongs = makeWrongAnswers(correct, [`${percent + 5}%`, `${percent - 5}%`, `${percent + 10}%`]);
      const question = `${part} is what percentage of ${total}?`;
      const explanation = `Step 1: Percentage = \\frac{part}{total} × 100.

Step 2: \\frac{${part}}{${total}} × 100 = ${percent}%.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 100 };
    };

    const foundationPatterns = [makePercentOf, makeIncrease, makeDecrease, makeWhatPercent];
    const higherPatterns = [makePercentOf, makeIncrease, makeDecrease, makeWhatPercent];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  powers: (rng, tier, calc, v) => {
    const makeMultiply = () => {
      const a = pick(rng, [2, 3, 5, 10]);
      const m = randInt(rng, 2, tier === 'Higher Tier' ? 7 : 5);
      const n = randInt(rng, 1, tier === 'Higher Tier' ? 6 : 4);
      const power = m + n;
      const correct = `${a}^${power}`;
      const question = `Simplify ${a}^${m} × ${a}^${n}.`;
      const wrongs = makeWrongAnswers(correct, [`${a}^${m * n}`, `${a}^${m - n}`, `${a}^${m + n + 1}`]);
      const explanation = `Step 1: When multiplying powers with the same base, add the indices.

Step 2: ${a}^${m} × ${a}^${n} = ${a}^${power}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 70 };
    };

    const makeDivide = () => {
      const a = pick(rng, [2, 3, 5, 10]);
      const m = randInt(rng, 2, tier === 'Higher Tier' ? 7 : 5);
      const n = randInt(rng, 1, tier === 'Higher Tier' ? 6 : 4);
      const power = m - n;
      const correct = `${a}^${power}`;
      const question = `Simplify ${a}^${m} ÷ ${a}^${n}.`;
      const wrongs = makeWrongAnswers(correct, [`${a}^${m + n}`, `${a}^${m * n}`, `${a}^${m - n - 1}`]);
      const explanation = `Step 1: When dividing powers with the same base, subtract the indices.

Step 2: ${a}^${m} ÷ ${a}^${n} = ${a}^${power}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 70 };
    };

    const makePowerOfPower = () => {
      const a = pick(rng, [2, 3, 5]);
      const m = randInt(rng, 2, 5);
      const n = randInt(rng, 2, 4);
      const power = m * n;
      const correct = `${a}^${power}`;
      const question = `Simplify (${a}^${m})^${n}.`;
      const wrongs = makeWrongAnswers(correct, [`${a}^${m + n}`, `${a}^${m - n}`, `${a}^${power + 1}`]);
      const explanation = `Step 1: Power of a power multiplies indices.

Step 2: (${a}^${m})^${n} = ${a}^${m * n} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 2, est: 110 };
    };

    const makeEvaluate = () => {
      const a = pick(rng, [2, 3, 4, 5, 6, 10]);
      const n = randInt(rng, 2, 4);
      const correct = `${a ** n}`;
      const question = `Work out ${a}^${n}.`;
      const wrongs = makeWrongAnswers(correct, [`${a * n}`, `${a ** (n - 1)}`, `${a ** n + a}`]);
      const explanation = `Step 1: ${a}^${n} means ${a} multiplied by itself ${n} times.

Step 2: ${a}^${n} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 60 };
    };

    const makeNegativeIndex = () => {
      const a = pick(rng, [2, 3, 5, 6, 10]);
      const n = randInt(rng, 1, 3);
      const correct = fracLatex(1, a ** n);
      const question = `Simplify ${a}^-${n}.`;
      const wrongs = makeWrongAnswers(correct, [`${a ** n}`, `${fracLatex(1, a + n)}`, `${a ** (n + 1)}`]);
      const explanation = `Step 1: Negative index means reciprocal.

Step 2: ${a}^-${n} = \\frac{1}{${a}^${n}} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 120 };
    };

    const makeRoots = () => {
      const squares = [16, 25, 36, 49, 64, 81, 100, 121, 144];
      const cubes = [8, 27, 64, 125, 216];
      const useCube = tier === 'Higher Tier' && rng() < 0.4;
      const value = useCube ? pick(rng, cubes) : pick(rng, squares);
      const root = useCube ? Math.round(Math.cbrt(value)) : Math.round(Math.sqrt(value));
      const question = useCube ? `Work out \\sqrt[3]{${value}}.` : `Work out \\sqrt{${value}}.`;
      const correct = `${root}`;
      const wrongs = makeWrongAnswers(correct, [`${root + 1}`, `${root - 1}`, `${root + 2}`]);
      const explanation = `Step 1: ${value} = ${root}${useCube ? '^3' : '^2'}.

Step 2: So the ${useCube ? 'cube' : 'square'} root is ${root}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 70 };
    };

    const foundationPatterns = [makeEvaluate, makeMultiply, makeDivide, makeRoots];
    const higherPatterns = [makeMultiply, makeDivide, makePowerOfPower, makeNegativeIndex, makeRoots];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  factors_multiples: (rng, tier, calc, v) => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];
    const compositePool = [12, 14, 15, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30];
    const formatPrimeFactors = (list) =>
      list
        .map(({ p, e }) => (e > 1 ? `${p}^${e}` : `${p}`))
        .join(' × ');

    const foundationPatterns = [
      () => {
        const base = pick(rng, [4, 6, 7, 8, 9, 12]);
        const k = randInt(rng, 3, 9);
        const correct = `${base * k}`;
        const question = `Which of these is a multiple of ${base}?`;
        const wrongs = makeWrongAnswers(correct, [
          `${base * k + 1}`,
          `${base * k - 1}`,
          `${base * (k + 1) + 1}`,
        ]);
        const explanation = `Step 1: Multiples of ${base} are ${base}, ${base * 2}, ${base * 3}, ...

Step 2: ${correct} = ${base} × ${k}, so it is a multiple.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 80 };
      },
      () => {
        const factor = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
        const n = factor * randInt(rng, 4, 12);
        const correct = `${factor}`;
        const wrongs = makeWrongAnswers(correct, [
          `${factor + 1}`,
          `${factor - 1}`,
          `${factor + 2}`,
        ]);
        const question = `Which of these is a factor of ${n}?`;
        const explanation = `Step 1: A factor divides exactly with no remainder.

Step 2: ${n} ÷ ${factor} = ${n / factor}, so ${factor} is a factor.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 80 };
      },
      () => {
        const prime = pick(rng, primes);
        const composites = [pick(rng, compositePool), pick(rng, compositePool), pick(rng, compositePool)];
        const question = `Which of these numbers is prime?`;
        const correct = `${prime}`;
        const wrongs = makeWrongAnswers(correct, composites.map(String));
        const explanation = `Step 1: A prime has exactly two factors: 1 and itself.

Step 2: ${prime} is prime.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const n = pick(rng, [18, 20, 24, 28, 30, 36, 40, 45, 50, 60]);
        const smallest = primes.find((p) => n % p === 0);
        const correct = `${smallest}`;
        const wrongs = makeWrongAnswers(correct, [`${smallest + 1}`, `${smallest + 2}`, `${smallest + 3}`]);
        const question = `Find the smallest prime factor of ${n}.`;
        const explanation = `Step 1: Test prime numbers in order: 2, 3, 5, 7, ...

Step 2: ${n} is divisible by ${smallest}, so the smallest prime factor is ${smallest}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
    ];

    const higherPatterns = [
      () => {
        const n = pick(rng, [36, 40, 48, 54, 60, 72, 84, 90]);
        const correct = `${countFactors(n)}`;
        const wrongs = makeWrongAnswers(correct, [`${countFactors(n) + 2}`, `${countFactors(n) - 2}`, `${countFactors(n) + 4}`]);
        const question = `How many factors does ${n} have?`;
        const explanation = `Step 1: List factor pairs of ${n}.

Step 2: Count all distinct factors to get ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 120 };
      },
      () => {
        const p = pick(rng, primes.slice(0, 6));
        const q = pick(rng, primes.slice(0, 6));
        const r = pick(rng, primes.slice(0, 6));
        const factors = [
          { p, e: 2 },
          { p: q, e: 1 },
          { p: r, e: 1 },
        ];
        const n = (p * p) * q * r;
        const correct = formatPrimeFactors(factors);
        const wrongs = makeWrongAnswers(correct, [
          `${p} × ${q} × ${r}`,
          `${p}^2 × ${q}`,
          `${p}^2 × ${r}`,
        ]);
        const question = `Write ${n} as a product of prime factors.`;
        const explanation = `Step 1: Divide ${n} by primes to factorise.

Step 2: ${n} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 150 };
      },
      () => {
        const base = pick(rng, [6, 8, 9, 12, 15, 18]);
        const k = randInt(rng, 4, 9);
        const correct = `${base * k + 1}`;
        const wrongs = makeWrongAnswers(correct, [
          `${base * k}`,
          `${base * (k + 1)}`,
          `${base * (k - 1)}`,
        ]);
        const question = `Which of these is NOT a multiple of ${base}?`;
        const explanation = `Step 1: Multiples of ${base} are ${base}, ${base * 2}, ${base * 3}, ...

Step 2: ${correct} is not divisible by ${base}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 120 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  hcf_lcm: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const a = pick(rng, [24, 30, 36, 42, 48, 54, 60]);
        const b = pick(rng, [18, 20, 28, 35, 40, 45, 50]);
        const g = gcd(a, b);
        const question = `Find the highest common factor (HCF) of ${a} and ${b}.`;
        const correct = `${g}`;
        const wrongs = makeWrongAnswers(correct, [`${g * 2}`, `${g / 2}`, `${a - b}`]);
        const explanation = `Step 1: Find common factors of ${a} and ${b}.

Step 2: The greatest common factor is ${g}.

Final answer: ${g}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 100 };
      },
      () => {
        const a = pick(rng, [12, 15, 18, 20, 24, 30]);
        const b = pick(rng, [16, 21, 25, 28, 35, 40]);
        const g = gcd(a, b);
        const lcm = (a / g) * b;
        const question = `Find the lowest common multiple (LCM) of ${a} and ${b}.`;
        const correct = `${lcm}`;
        const wrongs = makeWrongAnswers(correct, [`${a * b}`, `${lcm / 2}`, `${lcm + g}`]);
        const explanation = `Step 1: Find HCF(${a}, ${b}) = ${g}.

Step 2: LCM = \\frac{${a} × ${b}}{${g}} = ${lcm}.

Final answer: ${lcm}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 110 };
      },
    ];

    const higherPatterns = [
      () => {
        const a = pick(rng, [18, 24, 30, 36, 42, 48]);
        const b = pick(rng, [20, 28, 35, 40, 45, 50]);
        const c = pick(rng, [12, 15, 21, 25, 27, 32]);
        const g = gcd(gcd(a, b), c);
        const question = `Find the HCF of ${a}, ${b} and ${c}.`;
        const correct = `${g}`;
        const wrongs = makeWrongAnswers(correct, [`${g * 2}`, `${g / 2}`, `${g + 1}`]);
        const explanation = `Step 1: Find the HCF of all three numbers.

Step 2: HCF(${a}, ${b}, ${c}) = ${g}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 130 };
      },
      () => {
        const a = pick(rng, [6, 8, 9, 10, 12]);
        const b = pick(rng, [14, 15, 16, 18, 20]);
        const g = gcd(a, b);
        const lcm = (a / g) * b;
        const question = `Two buses leave a station every ${a} minutes and every ${b} minutes.

If they leave together now, after how many minutes will they next leave together?`;
        const correct = `${lcm}`;
        const wrongs = makeWrongAnswers(correct, [`${a + b}`, `${a * b}`, `${lcm + g}`]);
        const explanation = `Step 1: The next time together is the LCM of ${a} and ${b}.

Step 2: LCM = ${lcm} minutes.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  negative_numbers: (rng, tier, calc, v) => {
    const makeAddSub = () => {
      const a = randInt(rng, 5, 30);
      const b = randInt(rng, 5, 30);
      const c = randInt(rng, 5, 30);
      const question = `Work out ${formatSigned(-a)} + ${formatSigned(b)} - ${formatSigned(c)}.`;
      const correct = -a + b - c;
      const wrongs = makeWrongAnswers(`${correct}`, [`${-a + b + c}`, `${a + b - c}`, `${-a - b - c}`]);
      const explanation = `Step 1: Work left to right.

Step 2: ${-a} + ${b} = ${-a + b}.

Step 3: ${-a + b} - ${c} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 1, marks: 1, est: 60 };
    };

    const makeMultiply = () => {
      const a = randInt(rng, 5, 20);
      const b = randInt(rng, 5, 20);
      const question = `Work out ${formatSigned(-a)} × ${formatSigned(-b)}.`;
      const correct = a * b;
      const wrongs = makeWrongAnswers(`${correct}`, [`${-a * b}`, `${a * (-b)}`, `${a + b}`]);
      const explanation = `Step 1: A negative times a negative is positive.

Step 2: ${-a} × ${-b} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 1, marks: 1, est: 60 };
    };

    const makeOrder = () => {
      const nums = [randInt(rng, -20, -2), randInt(rng, -10, 5), randInt(rng, -15, 3), randInt(rng, -25, -1)];
      const question = `Put these numbers in ascending order: ${nums.join(', ')}.`;
      const correct = [...nums].sort((a, b) => a - b).join(', ');
      const wrongs = makeWrongAnswers(correct, [
        [...nums].sort((a, b) => b - a).join(', '),
        [nums[1], nums[0], nums[2], nums[3]].join(', '),
        [nums[2], nums[1], nums[0], nums[3]].join(', '),
      ]);
      const explanation = `Step 1: More negative numbers are smaller.

Step 2: The ascending order is ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
    };

    const makeTemperature = () => {
      const start = randInt(rng, -8, 4);
      const change = randInt(rng, 6, 14);
      const end = start - change;
      const question = `The temperature is ${start}°C. It falls by ${change}°C.

What is the new temperature?`;
      const correct = `${end}°C`;
      const wrongs = makeWrongAnswers(correct, [`${start + change}°C`, `${start - (change - 1)}°C`, `${start}°C`]);
      const explanation = `Step 1: Falling by ${change}°C means subtract ${change}.

Step 2: ${start} - ${change} = ${end}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
    };

    const makeBrackets = () => {
      const a = randInt(rng, 2, 8);
      const b = randInt(rng, 3, 9);
      const c = randInt(rng, 4, 12);
      const correct = -(a + b) + c;
      const question = `Work out -(${a} + ${b}) + ${c}.`;
      const wrongs = makeWrongAnswers(`${correct}`, [`${-(a - b) + c}`, `${-(a + b) - c}`, `${a + b + c}`]);
      const explanation = `Step 1: Brackets first: ${a} + ${b} = ${a + b}.

Step 2: Apply the negative: -(${a + b}) = ${-(a + b)}.

Step 3: Add ${c}: ${-(a + b)} + ${c} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 1, est: 90 };
    };

    const foundationPatterns = [makeAddSub, makeMultiply, makeOrder, makeTemperature];
    const higherPatterns = [makeAddSub, makeMultiply, makeOrder, makeBrackets, makeTemperature];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  bidmas: (rng, tier, calc, v) => {
    const makeMulFirst = () => {
      const a = randInt(rng, 2, 12);
      const b = randInt(rng, 2, 12);
      const c = randInt(rng, 2, 12);
      const question = `Work out ${a} + ${b} × ${c}.`;
      const correct = a + b * c;
      const wrongs = makeWrongAnswers(`${correct}`, [`${(a + b) * c}`, `${a + b + c}`, `${a + b * (c + 1)}`]);
      const explanation = `Step 1: Multiply first: ${b} × ${c} = ${b * c}.

Step 2: Add ${a}: ${a} + ${b * c} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 2, marks: 1, est: 70 };
    };

    const makeBrackets = () => {
      const a = randInt(rng, 2, 12);
      const b = randInt(rng, 2, 12);
      const c = randInt(rng, 2, 12);
      const d = randInt(rng, 2, 12);
      const question = `Work out (${a} + ${b}) × ${c} - ${d}.`;
      const correct = (a + b) * c - d;
      const wrongs = makeWrongAnswers(`${correct}`, [`${(a + b) * (c - d)}`, `${(a + b) * c + d}`, `${(a + b) * c - (d + 1)}`]);
      const explanation = `Step 1: Brackets first: ${a} + ${b} = ${a + b}.

Step 2: Multiply: ${a + b} × ${c} = ${(a + b) * c}.

Step 3: Subtract ${d}: ${(a + b) * c} - ${d} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 2, marks: 1, est: 75 };
    };

    const makeDivision = () => {
      const a = randInt(rng, 12, 60);
      const b = pick(rng, [2, 3, 4, 5, 6]);
      const c = randInt(rng, 3, 12);
      const d = randInt(rng, 2, 9);
      const question = `Work out ${a} ÷ ${b} + ${c} × ${d}.`;
      const correct = a / b + c * d;
      const wrongs = makeWrongAnswers(`${correct}`, [`${(a + c) / b + d}`, `${a / (b + c) + d}`, `${(a / b + c) * d}`]);
      const explanation = `Step 1: Division and multiplication first: ${a} ÷ ${b} = ${a / b}, ${c} × ${d} = ${c * d}.

Step 2: Add: ${a / b} + ${c * d} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 2, est: 90 };
    };

    const makePowers = () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 2, 5);
      const c = randInt(rng, 2, 9);
      const question = `Work out ${a}^2 + ${b} × ${c}.`;
      const correct = a * a + b * c;
      const wrongs = makeWrongAnswers(`${correct}`, [`${(a + b) * c}`, `${a * a + b + c}`, `${(a * a + b) * c}`]);
      const explanation = `Step 1: Powers first: ${a}^2 = ${a * a}.

Step 2: Multiply: ${b} × ${c} = ${b * c}.

Step 3: Add: ${a * a} + ${b * c} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 2, est: 90 };
    };

    const makeNested = () => {
      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 4, 12);
      const c = randInt(rng, 2, 8);
      const d = randInt(rng, 2, 6);
      const question = `Work out ${a} + (${b} - ${c}) × ${d}.`;
      const correct = a + (b - c) * d;
      const wrongs = makeWrongAnswers(`${correct}`, [`${(a + b - c) * d}`, `${a + b - c * d}`, `${a + (b + c) * d}`]);
      const explanation = `Step 1: Brackets first: ${b} - ${c} = ${b - c}.

Step 2: Multiply: ${b - c} × ${d} = ${(b - c) * d}.

Step 3: Add ${a}: ${a} + ${(b - c) * d} = ${correct}.

Final answer: ${correct}`;
      return { question, correct: `${correct}`, wrongs, explanation, difficulty: 3, marks: 2, est: 95 };
    };

    const foundationPatterns = [makeMulFirst, makeBrackets, makeDivision, makePowers];
    const higherPatterns = [makeMulFirst, makeBrackets, makeDivision, makePowers, makeNested];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  rounding_bounds: (rng, tier, calc, v) => {
    const makeErrorInterval = () => {
      const value = randInt(rng, 20, 900) / 10;
      const dp = pick(rng, [1, 2]);
      const rounded = Number(value.toFixed(dp));
      const step = dp === 1 ? 0.05 : 0.005;
      const lower = rounded - step;
      const upper = rounded + step;
      const question = `A value is rounded to ${dp} decimal place${dp > 1 ? 's' : ''} as ${rounded}.

What is the error interval for the original value?`;
      const correct = `${lower} \\le x < ${upper}`;
      const wrongs = makeWrongAnswers(correct, [
        `${rounded - 2 * step} \\le x < ${rounded + 2 * step}`,
        `${lower} < x \\le ${upper}`,
        `${lower} \\le x \\le ${upper}`,
      ]);
      const explanation = `Step 1: Rounding to ${dp} d.p. means the half-step is ${step}.

Step 2: Lower bound = ${rounded} - ${step} = ${lower}.

Step 3: Upper bound = ${rounded} + ${step} = ${upper}, but upper is not included.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 110 };
    };

    const makeRoundSf = () => {
      const value = randInt(rng, 234, 9876);
      const sf = pick(rng, [1, 2]);
      const rounded = Number(value.toPrecision(sf));
      const question = `Round ${value} to ${sf} significant figure${sf > 1 ? 's' : ''}.`;
      const correct = `${rounded}`;
      const wrongs = makeWrongAnswers(correct, [
        `${Number(value.toPrecision(sf + 1))}`,
        `${Number(value.toPrecision(sf === 1 ? 2 : 1))}`,
        `${value}`,
      ]);
      const explanation = `Step 1: Keep ${sf} significant figure${sf > 1 ? 's' : ''}.

Step 2: ${value} rounds to ${rounded}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
    };

    const roundToOneSf = (value) => Number(Number(value).toPrecision(1));

    const makeEstimate = () => {
      const a = randInt(rng, 18, 92);
      const b = randInt(rng, 12, 88);
      const c = randInt(rng, 4, 16);
      const aR = roundToOneSf(a);
      const bR = roundToOneSf(b);
      const cR = roundToOneSf(c);
      const correct = `${Math.round((aR * bR) / cR)}`;
      const question = `Estimate the value of \\frac{${a} × ${b}}{${c}} by rounding to 1 significant figure.`;
      const wrongs = makeWrongAnswers(correct, [
        `${Math.round((a * b) / c)}`,
        `${Math.round((aR * bR) / (cR + 1))}`,
        `${Math.round(((aR + 10) * bR) / cR)}`,
      ]);
      const explanation = `Step 1: Round to 1 s.f.: ${a} → ${aR}, ${b} → ${bR}, ${c} → ${cR}.

Step 2: Estimate: (${aR} × ${bR}) ÷ ${cR} ≈ ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 120 };
    };

    const makeBounds = () => {
      const rounded = randInt(rng, 40, 120);
      const lower = rounded - 0.5;
      const upper = rounded + 0.5;
      const question = `A length is rounded to the nearest cm as ${rounded} cm.

Give the lower and upper bounds for the original length.`;
      const correct = `${lower} \\le x < ${upper}`;
      const wrongs = makeWrongAnswers(correct, [
        `${lower} < x \\le ${upper}`,
        `${rounded - 1} \\le x < ${rounded + 1}`,
        `${lower} \\le x \\le ${upper}`,
      ]);
      const explanation = `Step 1: Nearest cm means half a cm each side.

Step 2: Lower bound ${lower}, upper bound ${upper}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 110 };
    };

    const foundationPatterns = [makeErrorInterval, makeRoundSf, makeEstimate];
    const higherPatterns = [makeErrorInterval, makeRoundSf, makeEstimate, makeBounds];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  standard_form: (rng, tier, calc, v) => {
    const makeToStandard = () => {
      const n = randInt(rng, 12, 999);
      const pow = randInt(rng, -5, 6);
      const value = n * Math.pow(10, pow);
      const question = `Write ${value} in standard form.`;
      const k = Math.floor(Math.log10(Math.abs(value)));
      const a = value / Math.pow(10, k);
      const aRounded = Number(a.toPrecision(3));
      const correct = `${aRounded} \\times 10^{${k}}`;
      const wrongs = makeWrongAnswers(correct, [
        `${aRounded} \\times 10^{${k + 1}}`,
        `${aRounded} \\times 10^{${k - 1}}`,
        `${Number((aRounded * 10).toPrecision(3))} \\times 10^{${k - 1}}`,
      ]);
      const explanation = `Step 1: Move the decimal point so the first number is between 1 and 10.

Step 2: Count how many places you moved. That is the power of 10.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120 };
    };

    const makeFromStandard = () => {
      const a = Number((randInt(rng, 12, 95) / 10).toFixed(1));
      const k = randInt(rng, -4, 6);
      const value = trimLongDecimal((a * Math.pow(10, k)).toFixed(3));
      const question = `Write ${a} × 10^{${k}} as an ordinary number.`;
      const correct = `${value}`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((a * Math.pow(10, k + 1)).toFixed(3))}`,
        `${trimLongDecimal((a * Math.pow(10, k - 1)).toFixed(3))}`,
        `${a}`,
      ]);
      const explanation = `Step 1: Move the decimal point ${Math.abs(k)} places ${k >= 0 ? 'right' : 'left'}.

Step 2: ${a} × 10^{${k}} = ${value}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 110 };
    };

    const makeMultiply = () => {
      const a1 = Number((randInt(rng, 12, 95) / 10).toFixed(1));
      const a2 = Number((randInt(rng, 12, 95) / 10).toFixed(1));
      const k1 = randInt(rng, -3, 5);
      const k2 = randInt(rng, -3, 5);
      const coeff = Number((a1 * a2).toPrecision(3));
      const power = k1 + k2;
      const correct = `${coeff} × 10^{${power}}`;
      const question = `Calculate (${a1} × 10^{${k1}}) × (${a2} × 10^{${k2}}) and give your answer in standard form.`;
      const wrongs = makeWrongAnswers(correct, [
        `${coeff} × 10^{${power + 1}}`,
        `${coeff} × 10^{${power - 1}}`,
        `${Number((a1 + a2).toPrecision(3))} × 10^{${power}}`,
      ]);
      const explanation = `Step 1: Multiply coefficients: ${a1} × ${a2} = ${coeff}.

Step 2: Add powers: 10^{${k1}} × 10^{${k2}} = 10^{${power}}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 150 };
    };

    const makeDivide = () => {
      const a1 = Number((randInt(rng, 12, 95) / 10).toFixed(1));
      const a2 = Number((randInt(rng, 12, 95) / 10).toFixed(1));
      const k1 = randInt(rng, -3, 5);
      const k2 = randInt(rng, -3, 5);
      const coeff = Number((a1 / a2).toPrecision(3));
      const power = k1 - k2;
      const correct = `${coeff} × 10^{${power}}`;
      const question = `Calculate (${a1} × 10^{${k1}}) ÷ (${a2} × 10^{${k2}}) and give your answer in standard form.`;
      const wrongs = makeWrongAnswers(correct, [
        `${coeff} × 10^{${power + 1}}`,
        `${coeff} × 10^{${power - 1}}`,
        `${Number((a1 * a2).toPrecision(3))} × 10^{${power}}`,
      ]);
      const explanation = `Step 1: Divide coefficients: ${a1} ÷ ${a2} = ${coeff}.

Step 2: Subtract powers: 10^{${k1}} ÷ 10^{${k2}} = 10^{${power}}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
    };

    const foundationPatterns = [makeToStandard, makeFromStandard];
    const higherPatterns = [makeToStandard, makeFromStandard, makeMultiply, makeDivide];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  surds: (rng, tier, calc, v) => {
    const simplifySqrt = (inside) => {
      let a = 1;
      let b = inside;
      for (let f = 2; f * f <= b; f++) {
        while (b % (f * f) === 0) {
          a *= f;
          b /= f * f;
        }
      }
      return { a, b };
    };

    const makeSimplify = (inside, difficulty, marks, est) => {
      const { a, b } = simplifySqrt(inside);
      const question = `Simplify \\sqrt{${inside}}.`;
      const correct = b === 1 ? `${a}` : `${a}\\sqrt{${b}}`;
      const wrongs = makeWrongAnswers(correct, [`${a}\\sqrt{${inside}}`, `${inside}\\sqrt{1}`, `${(a + 1)}\\sqrt{${b}}`]);
      const explanation = `Step 1: Factor ${inside} into a square number times another number.

Step 2: \\sqrt{${inside}} = \\sqrt{${a * a}}\\sqrt{${b}} = ${a}\\sqrt{${b}}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty, marks, est };
    };

    const foundationSimplifyList = [
      8, 12, 18, 20, 24, 27, 28, 32, 36, 40, 45, 48, 50, 54, 56, 63, 72, 75, 80, 98, 99, 108, 112, 120,
    ];
    const higherSimplifyList = [
      72, 75, 80, 98, 108, 112, 125, 128, 147, 150, 162, 175, 180, 192, 200, 225, 242, 245, 250, 288,
    ];

    const makeMultiply = (a, b, difficulty, marks, est) => {
      const inside = a * b;
      const { a: coeff, b: rem } = simplifySqrt(inside);
      const question = `Simplify \\sqrt{${a}} \\times \\sqrt{${b}}.`;
      const correct = rem === 1 ? `${coeff}` : `${coeff}\\sqrt{${rem}}`;
      const wrongs = makeWrongAnswers(correct, [
        `${a}\\sqrt{${b}}`,
        `${coeff}\\sqrt{${inside}}`,
        `${coeff + 1}\\sqrt{${rem}}`,
      ]);
      const explanation = `Step 1: \\sqrt{${a}}\\times\\sqrt{${b}} = \\sqrt{${inside}}.

Step 2: \\sqrt{${inside}} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty, marks, est };
    };

    const makeRationalise = (num, den, difficulty, marks, est) => {
      const question = `Rationalise the denominator: \\frac{${num}}{\\sqrt{${den}}}.`;
      const correct = `\\frac{${num}\\sqrt{${den}}}{${den}}`;
      const wrongs = makeWrongAnswers(correct, [
        `\\frac{${num}}{${den}\\sqrt{${den}}}`,
        `\\frac{${num}\\sqrt{${den}}}{${den * 2}}`,
        `\\frac{${num}\\sqrt{${den}}}{${den * den}}`,
      ]);
      const explanation = `Step 1: Multiply top and bottom by \\sqrt{${den}}.

Step 2: \\frac{${num}}{\\sqrt{${den}}} \\times \\frac{\\sqrt{${den}}}{\\sqrt{${den}}} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty, marks, est };
    };

    const makeConjugate = (a, b, difficulty, marks, est) => {
      const question = `Simplify (${a} + \\sqrt{${b}})(${a} - \\sqrt{${b}}).`;
      const correct = `${a * a - b}`;
      const wrongs = makeWrongAnswers(correct, [
        `${a * a + b}`,
        `${a + b}`,
        `${a * a - b + 1}`,
      ]);
      const explanation = `Step 1: Use (x + y)(x - y) = x^2 - y^2.

Step 2: ${a}^2 - (${b}) = ${a * a} - ${b} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty, marks, est };
    };

    const makeCombine = (a, b, difficulty, marks, est) => {
      const { a: c1, b: r1 } = simplifySqrt(a);
      const { a: c2, b: r2 } = simplifySqrt(b);
      const question = `Simplify \\sqrt{${a}} + \\sqrt{${b}}.`;
      if (r1 !== r2) {
        const correct = `${c1}\\sqrt{${r1}} + ${c2}\\sqrt{${r2}}`;
        const wrongs = makeWrongAnswers(correct, [
          `${c1 + c2}\\sqrt{${r1}}`,
          `${c1}\\sqrt{${r1 + r2}}`,
          `${c1}\\sqrt{${r1}} - ${c2}\\sqrt{${r2}}`,
        ]);
        const explanation = `Step 1: Simplify each surd.

Step 2: \\sqrt{${a}} = ${c1}\\sqrt{${r1}}, \\sqrt{${b}} = ${c2}\\sqrt{${r2}}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty, marks, est };
      }

      const correct = `${c1 + c2}\\sqrt{${r1}}`;
      const wrongs = makeWrongAnswers(correct, [
        `${(c1 + c2) * 2}\\sqrt{${r1}}`,
        `${c1 + c2}\\sqrt{${r1 * r1}}`,
        `${c1 + c2}\\sqrt{${r1 + 1}}`,
      ]);
      const explanation = `Step 1: Simplify each surd.

Step 2: \\sqrt{${a}} = ${c1}\\sqrt{${r1}}, \\sqrt{${b}} = ${c2}\\sqrt{${r1}}.

Step 3: Add like surds: (${c1} + ${c2})\\sqrt{${r1}} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty, marks, est };
    };

    const foundationPatterns = [
      () => makeSimplify(pick(rng, foundationSimplifyList), 2, 2, 120),
      () => makeMultiply(pick(rng, [2, 3, 5, 6, 7, 8, 10, 12]), pick(rng, [6, 8, 10, 12, 14, 15, 18]), 2, 2, 130),
      () => makeSimplify(pick(rng, foundationSimplifyList), 2, 2, 130),
    ];

    const higherPatterns = [
      () => makeSimplify(pick(rng, higherSimplifyList), 4, 2, 150),
      () => makeRationalise(pick(rng, [3, 4, 5, 6, 7, 8]), pick(rng, [2, 3, 5, 6, 7, 8]), 5, 3, 190),
      () => makeConjugate(pick(rng, [3, 4, 5, 6, 7]), pick(rng, [2, 3, 5, 6, 7, 8, 11]), 4, 3, 180),
      () => makeCombine(pick(rng, [8, 18, 20, 32, 50, 72]), pick(rng, [2, 8, 18, 32, 50, 72]), 4, 3, 180),
      () => makeMultiply(pick(rng, [5, 6, 7, 8, 10, 12]), pick(rng, [14, 15, 18, 20, 24, 27]), 4, 3, 170),
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  recurring_decimals: (rng, tier, calc, v) => {
    const singleDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const doubleDigits = [];
    for (let i = 11; i <= 98; i += 1) {
      if (i % 10 !== 0) doubleDigits.push(i);
    }
    const tripleDigits = [];
    for (let i = 101; i <= 989; i += 1) {
      if (i % 10 !== 0) tripleDigits.push(i);
    }

    const makeSingle = (a) => {
      const question = `Convert 0.\\dot{${a}} to a fraction in its simplest form.`;
      const correct = fracLatex(a, 9);
      const wrongs = makeWrongAnswers(correct, [fracLatex(a, 90), fracLatex(a, 99), fracLatex(a + 1, 9)]);
      const explanation = `Step 1: Let x = 0.\\dot{${a}}.

Step 2: Multiply by 10: 10x = ${a}.\\dot{${a}}.

Step 3: Subtract: 10x - x = ${a}.

Step 4: So 9x = ${a} and x = ${fracLatex(a, 9)}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 3, est: 160 };
    };

    const makeDouble = (ab) => {
      const a = Math.floor(ab / 10);
      const b = ab % 10;
      const question = `Convert 0.\\dot{${a}${b}} to a fraction in its simplest form.`;
      const f = simplifyFraction(ab, 99);
      const correct = fracLatex(f.n, f.d);
      const wrongs = makeWrongAnswers(correct, [fracLatex(ab, 990), fracLatex(ab + 1, 99), fracLatex(ab, 9)]);
      const explanation = `Step 1: Let x = 0.\\dot{${a}${b}}.

Step 2: Multiply by 100: 100x = ${ab}.\\dot{${a}${b}}.

Step 3: Subtract: 100x - x = ${ab}.

Step 4: So 99x = ${ab} and x = \\frac{${ab}}{99} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 190 };
    };

    const makeTriple = (abc) => {
      const a = Math.floor(abc / 100);
      const b = Math.floor((abc % 100) / 10);
      const c = abc % 10;
      const question = `Convert 0.\\dot{${a}${b}${c}} to a fraction in its simplest form.`;
      const f = simplifyFraction(abc, 999);
      const correct = fracLatex(f.n, f.d);
      const wrongs = makeWrongAnswers(correct, [fracLatex(abc, 9990), fracLatex(abc + 1, 999), fracLatex(abc, 99)]);
      const explanation = `Step 1: Let x = 0.\\dot{${a}${b}${c}}.

Step 2: Multiply by 1000: 1000x = ${abc}.\\dot{${a}${b}${c}}.

Step 3: Subtract: 1000x - x = ${abc}.

Step 4: So 999x = ${abc} and x = \\frac{${abc}}{999} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 210 };
    };

    const makeFractionToRecurring = () => {
      const n = pick(rng, [1, 2, 4, 5, 7, 8]);
      const d = 9;
      const question = `Convert ${fracLatex(n, d)} to a recurring decimal.`;
      const correct = `0.\\dot{${n}}`;
      const wrongs = makeWrongAnswers(correct, [
        `0.${n}`,
        `0.\\dot{${n + 1}}`,
        `\\dot{0}.${n}`,
      ]);
      const explanation = `Step 1: ${fracLatex(n, d)} is a repeating decimal with digit ${n}.

Step 2: ${fracLatex(n, d)} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 170 };
    };

    const patterns = [
      () => makeDouble(pick(rng, doubleDigits)),
      () => makeTriple(pick(rng, tripleDigits)),
      () => makeSingle(pick(rng, singleDigits)),
      () => makeFractionToRecurring(),
    ];

    return patterns[v % patterns.length]();
  },

  unit_conversions: (rng, tier, calc, v) => {
    const formatNum = (n, dp = 3) => trimLongDecimal(Number(n.toFixed(dp)));

    const foundationPatterns = [
      () => {
        const n = randInt(rng, 1200, 9800);
        const correctNum = n / 1000;
        const question = `Convert ${n} g to kg.`;
        const correct = `${formatNum(correctNum, 3)} kg`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 100, 3)} kg`, `${n * 1000} kg`, `${n} kg`]);
        const explanation = `Step 1: 1000 g = 1 kg.

Step 2: ${n} ÷ 1000 = ${formatNum(correctNum, 3)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 2, 18);
        const question = `Convert ${n} kg to g.`;
        const correctNum = n * 1000;
        const correct = `${correctNum} g`;
        const wrongs = makeWrongAnswers(correct, [`${n * 100} g`, `${n / 1000} g`, `${n} g`]);
        const explanation = `Step 1: 1 kg = 1000 g.

Step 2: ${n} × 1000 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 24, 360);
        const question = `Convert ${n} cm to m.`;
        const correctNum = n / 100;
        const correct = `${formatNum(correctNum, 2)} m`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 10, 2)} m`, `${n * 100} m`, `${n} m`]);
        const explanation = `Step 1: 100 cm = 1 m.

Step 2: ${n} ÷ 100 = ${formatNum(correctNum, 2)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 3, 24);
        const question = `Convert ${n} m to cm.`;
        const correctNum = n * 100;
        const correct = `${correctNum} cm`;
        const wrongs = makeWrongAnswers(correct, [`${n * 10} cm`, `${n / 100} cm`, `${n} cm`]);
        const explanation = `Step 1: 1 m = 100 cm.

Step 2: ${n} × 100 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = pick(rng, [150, 230, 420, 560, 780, 900]);
        const question = `Convert ${n} mm to cm.`;
        const correctNum = n / 10;
        const correct = `${correctNum} cm`;
        const wrongs = makeWrongAnswers(correct, [`${n * 10} cm`, `${n / 100} cm`, `${correctNum + 1} cm`]);
        const explanation = `Step 1: 10 mm = 1 cm.

Step 2: ${n} ÷ 10 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 12, 80);
        const question = `Convert ${n} cm to mm.`;
        const correctNum = n * 10;
        const correct = `${correctNum} mm`;
        const wrongs = makeWrongAnswers(correct, [`${n / 10} mm`, `${n * 100} mm`, `${n} mm`]);
        const explanation = `Step 1: 1 cm = 10 mm.

Step 2: ${n} × 10 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 120, 950);
        const question = `Convert ${n} ml to litres.`;
        const correctNum = n / 1000;
        const correct = `${formatNum(correctNum, 3)} L`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 100, 3)} L`, `${n * 1000} L`, `${n} L`]);
        const explanation = `Step 1: 1000 ml = 1 L.

Step 2: ${n} ÷ 1000 = ${formatNum(correctNum, 3)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 2, 9);
        const question = `Convert ${n} L to ml.`;
        const correctNum = n * 1000;
        const correct = `${correctNum} ml`;
        const wrongs = makeWrongAnswers(correct, [`${n * 100} ml`, `${n / 1000} ml`, `${n} ml`]);
        const explanation = `Step 1: 1 L = 1000 ml.

Step 2: ${n} × 1000 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
      },
      () => {
        const n = randInt(rng, 1500, 9800);
        const question = `Convert ${n} m to km.`;
        const correctNum = n / 1000;
        const correct = `${formatNum(correctNum, 3)} km`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 100, 3)} km`, `${n * 1000} km`, `${n} km`]);
        const explanation = `Step 1: 1000 m = 1 km.

Step 2: ${n} ÷ 1000 = ${formatNum(correctNum, 3)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
      },
      () => {
        const n = randInt(rng, 2, 15);
        const question = `Convert ${n} km to m.`;
        const correctNum = n * 1000;
        const correct = `${correctNum} m`;
        const wrongs = makeWrongAnswers(correct, [`${n * 100} m`, `${n / 1000} m`, `${n} m`]);
        const explanation = `Step 1: 1 km = 1000 m.

Step 2: ${n} × 1000 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
      },
    ];

    const higherPatterns = [
      () => {
        const n = pick(rng, [54, 72, 90, 108, 126, 144]);
        const correctNum = (n * 1000) / 3600;
        const question = `Convert ${n} km/h to m/s.`;
        const correct = `${formatNum(correctNum, 2)} m/s`;
        const wrongs = makeWrongAnswers(correct, [
          `${formatNum(n * 3.6, 2)} m/s`,
          `${formatNum(n / 36, 2)} m/s`,
          `${formatNum((n * 1000) / 60, 2)} m/s`,
        ]);
        const explanation = `Step 1: Convert km/h to m/s by multiplying by \frac{1000}{3600}.

Step 2: ${n} × \frac{1000}{3600} = ${formatNum(correctNum, 2)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
      },
      () => {
        const n = pick(rng, [8, 10, 12, 14, 15, 16]);
        const correctNum = n * 3.6;
        const question = `Convert ${n} m/s to km/h.`;
        const correct = `${formatNum(correctNum, 2)} km/h`;
        const wrongs = makeWrongAnswers(correct, [
          `${formatNum(n / 3.6, 2)} km/h`,
          `${formatNum(n * 36, 2)} km/h`,
          `${formatNum(n * 0.36, 2)} km/h`,
        ]);
        const explanation = `Step 1: Convert m/s to km/h by multiplying by 3.6.

Step 2: ${n} × 3.6 = ${formatNum(correctNum, 2)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
      },
      () => {
        const distM = pick(rng, [600, 900, 1200, 1500]);
        const timeSec = pick(rng, [75, 90, 120, 150]);
        const speedMs = distM / timeSec;
        const speedKmh = speedMs * 3.6;
        const question = `A runner travels ${distM} m in ${timeSec} seconds.

Find their average speed in km/h.`;
        const correct = `${formatNum(speedKmh, 2)} km/h`;
        const wrongs = makeWrongAnswers(correct, [
          `${formatNum(speedMs, 2)} km/h`,
          `${formatNum(speedMs / 3.6, 2)} km/h`,
          `${formatNum(speedMs * 36, 2)} km/h`,
        ]);
        const explanation = `Step 1: Speed in m/s = ${distM} ÷ ${timeSec} = ${formatNum(speedMs, 2)}.

Step 2: Convert m/s to km/h by multiplying by 3.6.

Step 3: ${formatNum(speedMs, 2)} × 3.6 = ${formatNum(speedKmh, 2)} km/h.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 180 };
      },
      () => {
        const n = pick(rng, [2400, 3600, 4800, 7200]);
        const question = `Convert ${n} m to km.`;
        const correctNum = n / 1000;
        const correct = `${formatNum(correctNum, 3)} km`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 100, 3)} km`, `${n * 1000} km`, `${n} km`]);
        const explanation = `Step 1: 1000 m = 1 km.

Step 2: ${n} ÷ 1000 = ${formatNum(correctNum, 3)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 120 };
      },
      () => {
        const n = pick(rng, [2.4, 3.6, 4.8, 6.5, 7.2]);
        const question = `Convert ${n} km to m.`;
        const correctNum = n * 1000;
        const correct = `${correctNum} m`;
        const wrongs = makeWrongAnswers(correct, [`${n / 1000} m`, `${n * 100} m`, `${n} m`]);
        const explanation = `Step 1: 1 km = 1000 m.

Step 2: ${n} × 1000 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 120 };
      },
      () => {
        const n = pick(rng, [2500, 3600, 4900, 6400]);
        const correctNum = n / 10000;
        const question = `Convert ${n} cm^2 to m^2.`;
        const correct = `${formatNum(correctNum, 4)} m^2`;
        const wrongs = makeWrongAnswers(correct, [`${formatNum(n / 1000, 3)} m^2`, `${formatNum(n / 100, 2)} m^2`, `${n} m^2`]);
        const explanation = `Step 1: 1 m^2 = 10,000 cm^2.

Step 2: ${n} ÷ 10,000 = ${formatNum(correctNum, 4)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      },
      () => {
        const n = pick(rng, [1.2, 1.5, 2.4, 3.2]);
        const correctNum = n * 10000;
        const question = `Convert ${n} m^2 to cm^2.`;
        const correct = `${correctNum} cm^2`;
        const wrongs = makeWrongAnswers(correct, [`${n * 100} cm^2`, `${n * 1000} cm^2`, `${n} cm^2`]);
        const explanation = `Step 1: 1 m^2 = 10,000 cm^2.

Step 2: ${n} × 10,000 = ${correctNum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },


  // ALGEBRA
  expressions: (rng, tier, calc, v) => {
    const makeSingleVar = () => {
      const a = randInt(rng, 2, tier === 'Higher Tier' ? 9 : 7);
      const b = randInt(rng, 2, tier === 'Higher Tier' ? 9 : 7);
      const c = randInt(rng, 2, tier === 'Higher Tier' ? 9 : 7);
      const question = `Simplify ${a}x + ${b}x - ${c}x.`;
      const correct = `${a + b - c}x`;
      const wrongs = makeWrongAnswers(correct, [`${a + b + c}x`, `${a - b - c}x`, `${a + b - c}`]);
      const explanation = `Step 1: Collect like terms.

Step 2: (${a} + ${b} - ${c})x = ${(a + b - c)}x.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 70 };
    };

    const makeTwoVars = () => {
      const a = randInt(rng, 2, 8);
      const b = randInt(rng, 2, 8);
      const c = randInt(rng, 2, 8);
      const d = randInt(rng, 2, 8);
      const question = `Simplify ${a}x + ${b}y - ${c}x + ${d}y.`;
      const correct = `${a - c}x + ${b + d}y`;
      const wrongs = makeWrongAnswers(correct, [
        `${a + c}x + ${b + d}y`,
        `${a - c}x + ${b - d}y`,
        `${a - c}x + ${b + d}`,
      ]);
      const explanation = `Step 1: Collect x terms: ${a}x - ${c}x = ${(a - c)}x.

Step 2: Collect y terms: ${b}y + ${d}y = ${(b + d)}y.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
    };

    const makeWithConstants = () => {
      const a = randInt(rng, 2, 7);
      const b = randInt(rng, -9, 9);
      const c = randInt(rng, -9, 9);
      const question = `Simplify ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} + ${a}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}.`;
      const correct = `${a + a}x ${b + c >= 0 ? '+' : '-'} ${Math.abs(b + c)}`;
      const wrongs = makeWrongAnswers(correct, [
        `${a}x ${b + c >= 0 ? '+' : '-'} ${Math.abs(b + c)}`,
        `${a + a}x ${b - c >= 0 ? '+' : '-'} ${Math.abs(b - c)}`,
        `${(a + a)}x ${b + c}`,
      ]);
      const explanation = `Step 1: Combine x terms: ${a}x + ${a}x = ${(a + a)}x.

Step 2: Combine constants: ${b} ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${b + c}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 80 };
    };

    const makeNegatives = () => {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 2, 6);
      const question = `Simplify -${a}x + ${b}x - ${a}x.`;
      const correct = `${b - 2 * a}x`;
      const wrongs = makeWrongAnswers(correct, [`${b}x`, `${-(a + b)}x`, `${b + 2 * a}x`]);
      const explanation = `Step 1: Collect x terms: -${a}x - ${a}x = -${2 * a}x.

Step 2: -${2 * a}x + ${b}x = ${(b - 2 * a)}x.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 85 };
    };

    const foundationPatterns = [makeSingleVar, makeTwoVars, makeWithConstants];
    const higherPatterns = [makeSingleVar, makeTwoVars, makeWithConstants, makeNegatives];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  expand: (rng, tier, calc, v) => {
    const makeSingleBracket = () => {
      const a = randInt(rng, 2, tier === 'Higher Tier' ? 9 : 6);
      const b = randInt(rng, 1, tier === 'Higher Tier' ? 9 : 6);
      const c = randInt(rng, 2, tier === 'Higher Tier' ? 7 : 5);
      const question = `Expand and simplify ${c}(${a}x + ${b}).`;
      const correct = `${c * a}x + ${c * b}`;
      const wrongs = makeWrongAnswers(correct, [`${c}x + ${c * b}`, `${c * a}x + ${b}`, `${c * a}x - ${c * b}`]);
      const explanation = `Step 1: Multiply every term inside the bracket by ${c}.

Step 2: ${c} × ${a}x = ${c * a}x and ${c} × ${b} = ${c * b}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 100 };
    };

    const makeWithMinus = () => {
      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 2, 9);
      const c = randInt(rng, 2, 7);
      const question = `Expand and simplify ${c}(${a}x - ${b}).`;
      const correct = `${c * a}x - ${c * b}`;
      const wrongs = makeWrongAnswers(correct, [`${c * a}x + ${c * b}`, `${c}x - ${b}`, `${c * a}x - ${b}`]);
      const explanation = `Step 1: Multiply every term by ${c}.

Step 2: ${c} × ${a}x = ${c * a}x and ${c} × ${b} = ${c * b}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 100 };
    };

    const makeDoubleBracket = () => {
      const a = randInt(rng, 1, 4);
      const b = randInt(rng, 2, 8);
      const c = randInt(rng, 1, 4);
      const d = randInt(rng, 2, 8);
      const question = `Expand and simplify (${a}x + ${b})(${c}x + ${d}).`;
      const correct = `${a * c}x^2 + ${(a * d + b * c)}x + ${b * d}`;
      const wrongs = makeWrongAnswers(correct, [
        `${a * c}x^2 + ${a * d}x + ${b * d}`,
        `${a * c}x^2 + ${(a * d - b * c)}x + ${b * d}`,
        `${(a + c)}x^2 + ${b + d}`,
      ]);
      const explanation = `Step 1: Multiply each term in the first bracket by each term in the second.

Step 2: Collect like terms to get ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 150 };
    };

    const foundationPatterns = [makeSingleBracket, makeWithMinus];
    const higherPatterns = [makeSingleBracket, makeWithMinus, makeDoubleBracket];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  factorise: (rng, tier, calc, v) => {
    const makeHcf = () => {
      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 2, 9);
      const g = randInt(rng, 2, 6);
      const question = `Factorise fully ${g * a}x + ${g * b}.`;
      const correct = `${g}(${a}x + ${b})`;
      const wrongs = makeWrongAnswers(correct, [`${g}x(${a} + ${b})`, `${g}(${a + b}x)`, `${g}(${a}x - ${b})`]);
      const explanation = `Step 1: Identify the HCF: ${g}.

Step 2: ${g * a}x + ${g * b} = ${g}(${a}x + ${b}).

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 100 };
    };

    const makeHcfWithConstant = () => {
      const g = randInt(rng, 2, 6);
      const a = randInt(rng, 2, 8);
      const b = randInt(rng, 2, 8);
      const question = `Factorise fully ${g * a}x - ${g * b}.`;
      const correct = `${g}(${a}x - ${b})`;
      const wrongs = makeWrongAnswers(correct, [`${g}(${a}x + ${b})`, `${g * a}x(${b})`, `${g}x(${a} - ${b})`]);
      const explanation = `Step 1: HCF is ${g}.

Step 2: ${g * a}x - ${g * b} = ${g}(${a}x - ${b}).

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 110 };
    };

    const makeQuadratic = () => {
      const r1 = randInt(rng, -5, 5) || -3;
      const r2 = randInt(rng, -5, 5) || 4;
      const sum = r1 + r2;
      const prod = r1 * r2;
      const question = `Factorise x^2 ${sum >= 0 ? '+' : '-'} ${Math.abs(sum)}x ${prod >= 0 ? '+' : '-'} ${Math.abs(prod)}.`;
      const correct = `(x ${r1 >= 0 ? '-' : '+'} ${Math.abs(r1)})(x ${r2 >= 0 ? '-' : '+'} ${Math.abs(r2)})`;
      const wrongs = makeWrongAnswers(correct, [
        `(x ${r1 >= 0 ? '+' : '-'} ${Math.abs(r1)})(x ${r2 >= 0 ? '+' : '-'} ${Math.abs(r2)})`,
        `(x ${r1 >= 0 ? '-' : '+'} ${Math.abs(r1)})(x ${r2 >= 0 ? '+' : '-'} ${Math.abs(r2)})`,
        `(x ${sum >= 0 ? '+' : '-'} ${Math.abs(sum)})(x ${prod >= 0 ? '+' : '-'} ${Math.abs(prod)})`,
      ]);
      const explanation = `Step 1: Find two numbers that add to ${sum} and multiply to ${prod}.

Step 2: The factors are ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 140 };
    };

    const makeDifferenceSquares = () => {
      const a = randInt(rng, 3, 9);
      const b = randInt(rng, 2, a - 1);
      const question = `Factorise ${a}^2 - ${b}^2.`;
      const correct = `(${a} - ${b})(${a} + ${b})`;
      const wrongs = makeWrongAnswers(correct, [
        `(${a} - ${b})^2`,
        `(${a} + ${b})^2`,
        `(${a} + ${b})(${a} + ${b})`,
      ]);
      const explanation = `Step 1: Use a^2 - b^2 = (a - b)(a + b).

Step 2: ${a}^2 - ${b}^2 = (${a} - ${b})(${a} + ${b}).

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 130 };
    };

    const foundationPatterns = [makeHcf, makeHcfWithConstant];
    const higherPatterns = [makeHcfWithConstant, makeQuadratic, makeDifferenceSquares, makeHcf];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  substitution: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 3);

      if (variant === 1) {
        const a = randInt(rng, 2, 5);
        const b = randInt(rng, -8, 8);
        const c = randInt(rng, -6, 6);
        const x = randInt(rng, -5, 5) || 2;
        const question = `If x = ${x}, work out ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(
          b,
        )}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}.`;
        const correct = `${a * x * x + b * x + c}`;
        const wrongs = makeWrongAnswers(correct, [
          `${a * x + b * x + c}`,
          `${a * x * x + b + c}`,
          `${a * x * x - b * x + c}`,
        ]);
        const explanation = `Step 1: Substitute x = ${x}.

Step 2: ${a}(${x})^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}(${x}) ${
          c >= 0 ? '+' : '-'
        } ${Math.abs(c)} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 110 };
      }

      if (variant === 2) {
        const a = randInt(rng, 2, 6);
        const b = randInt(rng, 2, 8);
        const c = randInt(rng, -5, 9);
        const x = randInt(rng, -4, 6) || 3;
        const question = `If x = ${x}, work out ${a}(x - ${b}) ${c >= 0 ? '+' : '-'} ${Math.abs(
          c,
        )}.`;
        const correct = `${a * (x - b) + c}`;
        const wrongs = makeWrongAnswers(correct, [
          `${a * x - b + c}`,
          `${a * (x + b) + c}`,
          `${a * (x - b) - c}`,
        ]);
        const explanation = `Step 1: Substitute x = ${x} into the bracket.

Step 2: ${a}(${x} - ${b}) ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 110 };
      }

      const a = randInt(rng, 2, 6);
      const b = randInt(rng, -4, 5);
      const m = randInt(rng, 2, 4);
      const n = randInt(rng, 2, 5);
      const question = `If a = ${a} and b = ${b}, work out ${m}a^2 ${
        n >= 0 ? '-' : '+'
      } ${Math.abs(n)}b.`;
      const correct = `${m * a * a - n * b}`;
      const wrongs = makeWrongAnswers(correct, [
        `${m * a - n * b}`,
        `${m * a * a + n * b}`,
        `${m * a * a - n + b}`,
      ]);
      const explanation = `Step 1: Substitute a = ${a} and b = ${b}.

Step 2: ${m}(${a})^2 - ${n}(${b}) = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 110 };
    }

    const a = randInt(rng, 2, 7);
    const b = randInt(rng, 1, 9);
    const x = randInt(rng, -3, 6);
    const question = `If x = ${x}, work out ${a}x + ${b}.`;
    const correct = `${a * x + b}`;
    const wrongs = makeWrongAnswers(correct, [`${a + x + b}`, `${a * (x + b)}`, `${a * x - b}`]);
    const explanation = `Step 1: Substitute x = ${x}.

Step 2: ${a}x + ${b} = ${a}(${x}) + ${b} = ${a * x} + ${b} = ${correct}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 70 };
  },

  rearranging: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 3);

      if (variant === 1) {
        const a = randInt(rng, 2, 9);
        const b = randInt(rng, 2, 8);
        const question = `Make x the subject of the formula y = ${a}(x - ${b}).`;
        const correct = `x = ${fracLatex(1, a)}y + ${b}`;
        const wrongs = makeWrongAnswers(correct, [
          `x = ${fracLatex(1, a)}(y + ${b})`,
          `x = ${a}y + ${b}`,
          `x = ${fracLatex(1, a)}y - ${b}`,
        ]);
        const explanation = `Step 1: Divide both sides by ${a}: ${fracLatex(1, a)}y = x - ${b}.

Step 2: Add ${b}: x = ${fracLatex(1, a)}y + ${b}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      }

      if (variant === 2) {
        const a = randInt(rng, 2, 7);
        const b = randInt(rng, 2, 9);
        const c = randInt(rng, 2, 6);
        const question = `Make x the subject of the formula y = ${fracLatex(1, c)}(${a}x + ${b}).`;
        const correct = `x = ${fracLatex(1, a)}(${c}y - ${b})`;
        const wrongs = makeWrongAnswers(correct, [
          `x = ${fracLatex(1, a)}(${c}y + ${b})`,
          `x = ${fracLatex(1, c)}(${a}y - ${b})`,
          `x = ${fracLatex(1, a)}(y - ${b})`,
        ]);
        const explanation = `Step 1: Multiply both sides by ${c}: ${c}y = ${a}x + ${b}.

Step 2: Subtract ${b}: ${c}y - ${b} = ${a}x.

Step 3: Divide by ${a}: x = ${fracLatex(1, a)}(${c}y - ${b}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 4, est: 170 };
      }

      const a = randInt(rng, 6, 14);
      const b = randInt(rng, 2, 9);
      const question = `Make x the subject of the formula y = ${a} - ${b}x.`;
      const correct = `x = ${fracLatex(1, b)}(${a} - y)`;
      const wrongs = makeWrongAnswers(correct, [
        `x = ${fracLatex(1, b)}(${a} + y)`,
        `x = ${fracLatex(1, a)}(${b} - y)`,
        `x = ${fracLatex(1, b)}(y - ${a})`,
      ]);
      const explanation = `Step 1: Subtract ${a}: y - ${a} = -${b}x.

Step 2: Divide by -${b}: x = ${fracLatex(1, b)}(${a} - y).

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
    }

    const a = randInt(rng, 2, 8);
    const b = randInt(rng, 3, 12);
    const question = `Make x the subject of the formula y = ${a}x + ${b}.`;
    const correct = `x = ${fracLatex(1, a)}(y - ${b})`;
    const wrongs = makeWrongAnswers(correct, [
      `x = ${fracLatex(1, a)}(y + ${b})`,
      `x = ${a}(y - ${b})`,
      `x = y - ${b} \\div ${a}`,
    ]);
    const explanation = `Step 1: Subtract ${b} from both sides: y - ${b} = ${a}x.

Step 2: Divide both sides by ${a}: x = ${fracLatex(1, a)}(y - ${b}).

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 140 };
  },

  equations: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 3);

      if (variant === 1) {
        const x = randInt(rng, -6, 9) || 4;
        const a = randInt(rng, 2, 5);
        const b = randInt(rng, 2, 8);
        let c = randInt(rng, 2, 6);
        while (c === a) c = randInt(rng, 2, 6);
        const d = a * (x + b) - c * x;
        const question = `Solve ${a}(x + ${b}) = ${c}x + ${d}.`;
        const correct = `${x}`;
        const wrongs = makeWrongAnswers(correct, [
          `${x + 1}`,
          `${x - 1}`,
          `${x + b}`,
        ]);
        const explanation = `Step 1: Expand: ${a}x + ${a * b} = ${c}x + ${d}.

Step 2: Collect terms: ${(a - c)}x = ${d - a * b}.

Step 3: x = ${fracLatex(d - a * b, a - c)} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      }

      if (variant === 2) {
        const a = randInt(rng, 2, 9);
        const b = randInt(rng, 1, 6);
        const c = randInt(rng, 4, 12);
        const x = a * (c - b);
        const question = `Solve ${fracLatex(1, a)}x + ${b} = ${c}.`;
        const correct = `${x}`;
        const wrongs = makeWrongAnswers(correct, [
          `${(c - b)}`,
          `${a * (c + b)}`,
          `${a + c - b}`,
        ]);
        const explanation = `Step 1: Subtract ${b}: ${fracLatex(1, a)}x = ${c - b}.

Step 2: Multiply by ${a}: x = ${a}(${c - b}) = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 150 };
      }

      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 1, 12);
      let c = randInt(rng, 2, 8);
      while (c === a) c = randInt(rng, 2, 8);
      const x = randInt(rng, -8, 8) || -3;
      const d = (a - c) * x + b;
      const question = `Solve ${a}x + ${b} = ${c}x + ${d}.`;
      const correct = `${x}`;
      const wrongs = makeWrongAnswers(correct, [
        `${x + 2}`,
        `${x - 2}`,
        `${x + b}`,
      ]);
      const explanation = `Step 1: Subtract ${c}x from both sides: ${(a - c)}x + ${b} = ${d}.

Step 2: Subtract ${b}: ${(a - c)}x = ${d - b}.

Step 3: Divide by ${a - c}: x = ${fracLatex(d - b, a - c)} = ${correct}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
    }

    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 1, 12);
    const c = randInt(rng, 10, 50);
    const question = `Solve ${a}x + ${b} = ${c}.`;
    const x = (c - b) / a;
    const correct = Number.isInteger(x) ? `${x}` : fracLatex(c - b, a);
    const wrongs = makeWrongAnswers(correct, [
      formatRationalOption(c + b, a),
      `${(c - b) * a}`,
      formatRationalOption(c - b, a + 1),
    ]);
    const explanation = `Step 1: Subtract ${b}: ${a}x = ${c} - ${b} = ${c - b}.

Step 2: Divide by ${a}: x = ${fracLatex(c - b, a)}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120 };
  },

  inequalities: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 4);

      if (variant === 1) {
        const a = randInt(rng, 2, 9);
        const b = randInt(rng, 1, 9);
        const c = randInt(rng, -6, 24);
        const bound = fracLatex(c + a * b, a);
        const question = `Solve ${a}(x - ${b}) \\ge ${c}.`;
        const correct = `x \\ge ${bound}`;
        const wrongs = [
          `x \\le ${bound}`,
          `x \\ge ${fracLatex(c - b, a)}`,
          `x \\ge ${fracLatex(c + a * b + a, a)}`,
        ];
        const explanation = `Step 1: Expand: ${a}x - ${a * b} \\ge ${c}.

Step 2: Add ${a * b}: ${a}x \\ge ${c + a * b}.

Step 3: Divide by ${a}: x \\ge ${bound}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      }

      if (variant === 2) {
        const a = randInt(rng, 2, 9);
        let c = randInt(rng, 2, 9);
        while (c === a) c = randInt(rng, 2, 9);
        const b = randInt(rng, 1, 12);
        const d = randInt(rng, -8, 10);
        const diff = a - c;
        const rhs = d - b;
        const sign = diff > 0 ? '\\le' : '\\ge';
        const bound = fracLatex(diff > 0 ? rhs : -rhs, Math.abs(diff));
        const question = `Solve ${a}x + ${b} \\le ${c}x + ${d}.`;
        const correct = `x ${sign} ${bound}`;
        const wrongs = [
          `x ${diff > 0 ? '\\ge' : '\\le'} ${bound}`,
          `x ${sign} ${fracLatex(rhs, a + c)}`,
          `x ${sign} ${fracLatex(rhs + diff, Math.abs(diff))}`,
        ];
        const explanation = `Step 1: Subtract ${c}x: ${(a - c)}x + ${b} \\le ${d}.

Step 2: Subtract ${b}: ${(a - c)}x \\le ${rhs}.

Step 3: Divide by ${a - c}${diff < 0 ? ' (flip the inequality)' : ''}: x ${sign} ${bound}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      }

      if (variant === 3) {
        const a = randInt(rng, 2, 9);
        const b = randInt(rng, -6, 10);
        const c = randInt(rng, -8, 12);
        const bound = fracLatex(b - c, a);
        const question = `Solve -${a}x + ${b} < ${c}.`;
        const correct = `x > ${bound}`;
        const wrongs = [
          `x < ${bound}`,
          `x > ${fracLatex(c - b, a)}`,
          `x \\ge ${bound}`,
        ];
        const explanation = `Step 1: Subtract ${b}: -${a}x < ${c - b}.

Step 2: Divide by -${a} (flip the inequality): x > ${bound}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      }

      const k = randInt(rng, 2, 5);
      const d = randInt(rng, 3, 7);
      const b = randInt(rng, 1, 9);
      const c = randInt(rng, b + 2, b + 20);
      const bound = fracLatex(d * (c - b), k);
      const question = `Solve \\frac{${k}x}{${d}} + ${b} > ${c}.`;
      const correct = `x > ${bound}`;
      const wrongs = [
        `x < ${bound}`,
        `x > ${fracLatex(c - b, k)}`,
        `x > ${fracLatex(d * (c + b), k)}`,
      ];
      const explanation = `Step 1: Subtract ${b}: \\frac{${k}x}{${d}} > ${c - b}.

Step 2: Multiply by ${d}: ${k}x > ${d * (c - b)}.

Step 3: Divide by ${k}: x > ${bound}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
    }

    const a = randInt(rng, 2, 8);
    const b = randInt(rng, 1, 20);
    const c = randInt(rng, 5, 40);
    const boundVal = (c - b) / a;
    const bound = Number.isInteger(boundVal) ? `${boundVal}` : fracLatex(c - b, a);
    const correct = `x < ${bound}`;
    const wrongs = [
      `x > ${bound}`,
      `x \\le ${bound}`,
      `x < ${Number.isInteger(boundVal) ? boundVal + 1 : fracLatex(c - b + 1, a)}`,
    ];
    const question = `Solve ${a}x + ${b} < ${c}.`;
    const explanation = `Step 1: Subtract ${b}: ${a}x < ${c - b}.

Step 2: Divide by ${a} (positive, so inequality stays the same): x < ${fracLatex(c - b, a)}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
  },

  simultaneous: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 3);

      if (variant === 1) {
        let x = randInt(rng, -6, 9) || 4;
        let y = randInt(rng, -6, 9) || -2;
        while (y === x) y = randInt(rng, -6, 9) || -2;
        let a = randInt(rng, 2, 7);
        let b = randInt(rng, 2, 7);
        let c = randInt(rng, 2, 7);
        let d = randInt(rng, 2, 7);
        while (a * d - b * c === 0) {
          a = randInt(rng, 2, 7);
          b = randInt(rng, 2, 7);
          c = randInt(rng, 2, 7);
          d = randInt(rng, 2, 7);
        }
        const p = a * x + b * y;
        const q = c * x + d * y;
        const system = `${a}x + ${b}y = ${p}\\n${c}x + ${d}y = ${q}`;
        const question = `Solve the simultaneous equations:

  ${system}`;
        const correct = `x = ${x}, y = ${y}`;
        const wrongs = makeWrongAnswers(correct, [
          `x = ${y}, y = ${x}`,
          `x = ${x + 1}, y = ${y}`,
          `x = ${x}, y = ${y - 1}`,
        ]);
        const explanation = `Step 1: Multiply the first equation by ${d} and the second by ${b} to eliminate y.

Step 2: ${(a * d)}x + ${(b * d)}y = ${p * d} and ${(c * b)}x + ${(d * b)}y = ${q * b}.

Step 3: Subtract to eliminate y: ${(a * d - b * c)}x = ${p * d - q * b}.

Step 4: x = ${fracLatex(p * d - q * b, a * d - b * c)} = ${x}.

Step 5: Substitute x = ${x} into one equation to get y = ${y}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 5, marks: 4, est: 240 };
      }

      if (variant === 2) {
        let x = randInt(rng, -5, 7) || 3;
        const m = randInt(rng, 2, 4) * (rng() < 0.5 ? 1 : -1);
        const k = randInt(rng, -6, 6);
        let y = m * x + k;
        if (y === x) {
          x = x + 1;
          y = m * x + k;
        }
        const a = randInt(rng, 2, 7);
        const b = randInt(rng, 2, 7);
        const p = a * x + b * y;
        const system = `y = ${m}x ${k >= 0 ? '+' : '-'} ${Math.abs(
          k,
        )}\\n${a}x + ${b}y = ${p}`;
        const question = `Solve the simultaneous equations:

  ${system}`;
        const correct = `x = ${x}, y = ${y}`;
        const wrongs = makeWrongAnswers(correct, [
          `x = ${x + 1}, y = ${y + m}`,
          `x = ${x - 1}, y = ${y - m}`,
          `x = ${y}, y = ${x}`,
        ]);
        const explanation = `Step 1: Substitute y = ${m}x ${k >= 0 ? '+' : '-'} ${Math.abs(
          k,
        )} into ${a}x + ${b}y = ${p}.

Step 2: ${a}x + ${b}(${m}x ${k >= 0 ? '+' : '-'} ${Math.abs(k)}) = ${p}.

Step 3: Solve for x to get x = ${x}. Then y = ${m}(${x}) ${k >= 0 ? '+' : '-'} ${Math.abs(
          k,
        )} = ${y}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 5, marks: 4, est: 240 };
      }

      let x = randInt(rng, -7, 8) || -4;
      let y = randInt(rng, -7, 8) || 5;
      while (y === x) y = randInt(rng, -7, 8) || 5;
      let a = randInt(rng, 2, 7);
      let b = randInt(rng, 2, 7) * (rng() < 0.5 ? 1 : -1);
      let c = randInt(rng, 2, 7);
      let d = randInt(rng, 2, 7) * (rng() < 0.5 ? 1 : -1);
      while (a * d - b * c === 0) {
        a = randInt(rng, 2, 7);
        b = randInt(rng, 2, 7) * (rng() < 0.5 ? 1 : -1);
        c = randInt(rng, 2, 7);
        d = randInt(rng, 2, 7) * (rng() < 0.5 ? 1 : -1);
      }
      const p = a * x + b * y;
      const q = c * x + d * y;
      const system = `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(
        b,
      )}y = ${p}\\n${c}x ${d >= 0 ? '+' : '-'} ${Math.abs(d)}y = ${q}`;
      const question = `Solve the simultaneous equations:

  ${system}`;
      const correct = `x = ${x}, y = ${y}`;
      const wrongs = makeWrongAnswers(correct, [
        `x = ${x + 2}, y = ${y}`,
        `x = ${x}, y = ${y + 2}`,
        `x = ${y}, y = ${x}`,
      ]);
      const scale1 = Math.abs(d);
      const scale2 = Math.abs(b);
      const eq1x = a * scale1;
      const eq1y = b * scale1;
      const eq1c = p * scale1;
      const eq2x = c * scale2;
      const eq2y = d * scale2;
      const eq2c = q * scale2;
      const useAdd = eq1y + eq2y === 0;
      const elimX = useAdd ? eq1x + eq2x : eq1x - eq2x;
      const elimC = useAdd ? eq1c + eq2c : eq1c - eq2c;
      const lineEq = (xCoef, yCoef, constant) =>
        `${xCoef}x ${yCoef >= 0 ? '+' : '-'} ${Math.abs(yCoef)}y = ${constant}`;
      const explanation = `Step 1: Multiply the first equation by ${scale1} and the second by ${scale2} so the y-coefficients match.

Step 2: ${lineEq(eq1x, eq1y, eq1c)} and ${lineEq(eq2x, eq2y, eq2c)}.

Step 3: ${useAdd ? 'Add' : 'Subtract'} to eliminate y: ${elimX}x = ${elimC}, so x = ${fracLatex(elimC, elimX)} = ${x}.

Step 4: Substitute x = ${x} back to find y = ${y}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 5, marks: 4, est: 240 };
    }

    // Simple elimination: ax + y = p, bx + y = q
    const a = randInt(rng, 1, 4);
    const b = a + randInt(rng, 1, 4);
    const x = randInt(rng, 1, 9);
    let y = randInt(rng, 1, 12);
    while (y === x) y = randInt(rng, 1, 12);
    const p = a * x + y;
    const q = b * x + y;

    const system = `${a}x + y = ${p}\\n${b}x + y = ${q}`;
    const question = `Solve the simultaneous equations:

  ${system}`;

    const correct = `x = ${x}, y = ${y}`;
    const wrongs = makeWrongAnswers(correct, [
      `x = ${y}, y = ${x}`,
      `x = ${x + 1}, y = ${y}`,
      `x = ${x}, y = ${y + 1}`,
    ]);

    const explanation = `Step 1: Subtract the first equation from the second to eliminate y.

Step 2: (${b}x + y) - (${a}x + y) = ${q} - ${p}

Step 3: ${(b - a)}x = ${q - p} so x = ${fracLatex(q - p, b - a)} = ${x}.

Step 4: Substitute x = ${x} into ${a}x + y = ${p}: ${a}(${x}) + y = ${p} so y = ${p - a * x} = ${y}.

Final answer: ${correct}`;

    return { question, correct, wrongs, explanation, difficulty: 3, marks: 4, est: 240 };
  },

  sequences: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = randInt(rng, 1, 3);

      if (variant === 1) {
        const a = randInt(rng, 1, 3);
        const b = randInt(rng, -4, 6);
        const c = randInt(rng, -6, 6);
        const term = (n) => a * n * n + b * n + c;
        const terms = [1, 2, 3, 4].map(term);
        const next = term(5);
        const question = `The sequence is: ${terms.join(', ')}, ...

What is the next term?`;
        const correct = `${next}`;
        const wrongs = makeWrongAnswers(correct, [
          `${next + 2}`,
          `${next - 2}`,
          `${next + (2 * a)}`,
        ]);
        const explanation = `Step 1: Find the first differences, then the second differences.

Step 2: The second difference is constant, so it is quadratic.

Step 3: Extend the pattern to get the next term ${next}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 140 };
      }

      if (variant === 2) {
        const ratio = calc === 'Calculator'
          ? pick(rng, [[3, 2], [5, 2], [4, 3]])
          : pick(rng, [[2, 1], [3, 1], [4, 1]]);
        const [rn, rd] = ratio;
        const a1 = randInt(rng, 2, 9);
        const terms = [];
        let num = a1;
        let den = 1;
        for (let i = 0; i < 4; i++) {
          const f = simplifyFraction(num, den);
          terms.push(fracLatex(f.n, f.d));
          num *= rn;
          den *= rd;
        }
        const nextFrac = simplifyFraction(num, den);
        const correct = fracLatex(nextFrac.n, nextFrac.d);
        const question = `The sequence is: ${terms.join(', ')}, ...

What is the next term?`;
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(nextFrac.n + nextFrac.d, nextFrac.d),
          fracLatex(nextFrac.n, nextFrac.d + 1),
          fracLatex(nextFrac.n - nextFrac.d, nextFrac.d),
        ]);
        const explanation = `Step 1: Find the common ratio: multiply each term by ${fracLatex(
          rn,
          rd,
        )}.

Step 2: Multiply the last term by ${fracLatex(rn, rd)} to get ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
      }

      const oddStart = randInt(rng, 2, 12);
      const evenStart = randInt(rng, 3, 14);
      const d1 = randInt(rng, 2, 6);
      const d2 = randInt(rng, -5, -2);
      const t1 = oddStart;
      const t2 = evenStart;
      const t3 = oddStart + d1;
      const t4 = evenStart + d2;
      const t5 = oddStart + 2 * d1;
      const question = `The sequence is: ${t1}, ${t2}, ${t3}, ${t4}, ...

What is the next term?`;
      const correct = `${t5}`;
      const wrongs = makeWrongAnswers(correct, [
        `${t4 + d2}`,
        `${t3 + d1}`,
        `${t2 + d2}`,
      ]);
      const explanation = `Step 1: Split into odd and even positions.

Step 2: Odd terms: ${t1}, ${t3}, ${t5} increase by ${d1}.

Step 3: Even terms: ${t2}, ${t4} change by ${d2}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
    }

    const d = randInt(rng, 2, 9);
    const a1 = randInt(rng, 1, 10);
    const terms = [a1, a1 + d, a1 + 2 * d, a1 + 3 * d];
    const question = `The sequence is: ${terms.join(', ')}, ...

What is the next term?`;
    const correct = `${a1 + 4 * d}`;
    const wrongs = makeWrongAnswers(correct, [
      `${a1 + 3 * d + (d + 1)}`,
      `${a1 + 3 * d - d}`,
      `${a1 + 4 * (d + 1)}`,
    ]);
    const explanation = `Step 1: Find the common difference: ${terms[1]} - ${terms[0]} = ${d}.

Step 2: Add ${d} to the last term: ${terms[3]} + ${d} = ${a1 + 4 * d}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 75 };
  },

  nth_term: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const variant = v % 3;
      const formatQuadratic = (a, b, c) => {
        const parts = [];
        if (a === 1) parts.push('n^2');
        else if (a === -1) parts.push('-n^2');
        else parts.push(`${a}n^2`);
        if (b !== 0) parts.push(`${b >= 0 ? '+' : '-'} ${Math.abs(b)}n`);
        if (c !== 0) parts.push(`${c >= 0 ? '+' : '-'} ${Math.abs(c)}`);
        return parts.join(' ');
      };

      if (variant === 0) {
        const a = pick(rng, [1, 2]);
        let b = randInt(rng, -4, 4);
        while (b === 0) b = randInt(rng, -4, 4);
        const c = randInt(rng, -6, 6);
        const term = (n) => a * n * n + b * n + c;
        const terms = [1, 2, 3, 4].map(term);
        const question = `The sequence is: ${terms.join(', ')}, ...

Find an expression for the nth term.`;
        const correct = formatQuadratic(a, b, c);
        const wrongs = makeWrongAnswers(correct, [
          formatQuadratic(a, b + 1, c),
          formatQuadratic(a, b, c + 1),
          formatQuadratic(a, -b, c),
        ]);
        const explanation = `Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      }

      if (variant === 1) {
        const d = randInt(rng, -9, -2);
        const a1 = randInt(rng, 15, 30);
        const c = a1 - d;
        const terms = [a1, a1 + d, a1 + 2 * d, a1 + 3 * d];
        const question = `The sequence is: ${terms.join(', ')}, ...

Find an expression for the nth term.`;
        const correct = `${d}n + ${c}`;
        const wrongs = makeWrongAnswers(correct, [
          `${d}n - ${c}`,
          `${c}n + ${d}`,
          `${d}n + ${c + 2}`,
        ]);
        const explanation = `Step 1: The common difference is ${d}, so the sequence is linear.

Step 2: Use n = 1: ${d}(1) + c = ${a1}, so c = ${c}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 };
      }

      const r = pick(rng, [2, 3]);
      let a1 = randInt(rng, 1, 6);
      while (a1 === r) a1 = randInt(rng, 1, 6);
      const terms = [a1, a1 * r, a1 * r * r, a1 * r * r * r];
      const question = `The sequence is: ${terms.join(', ')}, ...

Find an expression for the nth term.`;
      const correct = `${a1} \\times ${r}^{n-1}`;
      const wrongs = makeWrongAnswers(correct, [
        `${a1} \\times ${r}^{n}`,
        `${r} \\times ${a1}^{n-1}`,
        `${a1 + r}^{n-1}`,
      ]);
      const explanation = `Step 1: The sequence is geometric with common ratio ${r}.

Step 2: The nth term is ${a1} \\times ${r}^{n-1}.

Final answer: ${correct}`;
      return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
    }

    const d = randInt(rng, 2, 8);
    const a1 = randInt(rng, 1, 12);
    const c = a1 - d;
    const terms = [a1, a1 + d, a1 + 2 * d, a1 + 3 * d];
    const question = `The sequence is: ${terms.join(', ')}, ...

Find an expression for the nth term.`;

    const correct = `${d}n + ${c}`;
    const wrongs = makeWrongAnswers(correct, [`${d}n - ${c}`, `${c}n + ${d}`, `${d}n + ${c + 1}`]);

    const explanation = `Step 1: The common difference is ${d}, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = ${a1}.

Step 3: So ${d} + c = ${a1} and c = ${a1 - d}.

Final answer: ${correct}`;

    return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
  },

  graphs: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const slopes = [
        { n: -3, d: 1 },
        { n: -2, d: 1 },
        { n: -3, d: 2 },
        { n: -1, d: 2 },
        { n: 1, d: 2 },
        { n: 3, d: 2 },
        { n: 2, d: 1 },
        { n: 3, d: 1 },
      ];
      const slope = pick(rng, slopes);
      const c = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
      const xs = slope.d === 1 ? [-4, -2, 0, 2, 4] : [-4, -2, 2, 4];
      let x1 = pick(rng, xs);
      let x2 = pick(rng, xs.filter((x) => x !== x1));
      const mVal = slope.n / slope.d;
      let y1 = mVal * x1 + c;
      let y2 = mVal * x2 + c;
      let attempts = 0;
      while ((Math.abs(y1) > 5 || Math.abs(y2) > 5) && attempts < 20) {
        x1 = pick(rng, xs);
        x2 = pick(rng, xs.filter((x) => x !== x1));
        y1 = mVal * x1 + c;
        y2 = mVal * x2 + c;
        attempts += 1;
      }

      const question = `The graph shows a straight line passing through A(${x1}, ${y1}) and B(${x2}, ${y2}).

Find the equation of the line.`;
      const correct = formatLinearEquation(slope.n, slope.d, c);
      const wrongs = makeWrongAnswers(correct, [
        formatLinearEquation(-slope.n, slope.d, c),
        formatLinearEquation(slope.n, slope.d, -c),
        formatLinearEquation(slope.n + 1, slope.d, c),
      ]);
      const dy = y2 - y1;
      const dx = x2 - x1;
      const mDisplay = dy % dx === 0 ? `${dy / dx}` : fracLatex(dy, dx);
      const explanation = `Step 1: Gradient m = \\frac{${y2} - ${y1}}{${x2} - ${x1}} = ${fracLatex(dy, dx)} = ${mDisplay}.

Step 2: Substitute A(${x1}, ${y1}) into y = mx + c: ${y1} = ${mDisplay}×${x1} + c, so c = ${c}.

Step 3: Equation is ${correct}.

Final answer: ${correct}`;
      const imageSvg = svgLineGraph({ x1, y1, x2, y2 });
      const imageAlt = `Graph of a straight line through A(${x1},${y1}) and B(${x2},${y2})`;
      return {
        question,
        correct,
        wrongs,
        explanation,
        difficulty: 4,
        marks: 3,
        est: 180,
        imageSvg,
        imageAlt,
      };
    }

    const m = randInt(rng, -4, 5);
    const c = randInt(rng, -6, 8);
    const question = `A line has equation y = ${m}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}.

What is the y-intercept?`;
    const correct = `${c}`;
    const wrongs = makeWrongAnswers(correct, [`${m}`, `${-c}`, `${c + 1}`]);
    const explanation = `Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = ${m}(0) ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${c}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70 };
  },

  gradients: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier') {
      const x1 = randInt(rng, -4, 1);
      const y1 = randInt(rng, -4, 4);
      const run = pick(rng, [2, 3, 4, 5]);
      let rise = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5]);
      let attempts = 0;
      while (Math.abs(rise) === run && attempts < 10) {
        rise = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5]);
        attempts += 1;
      }
      const x2 = x1 + run;
      const y2 = y1 + rise;

      const question = `The graph shows points A(${x1}, ${y1}) and B(${x2}, ${y2}) on a line.

Find the gradient of the line AB.`;
      const correct = rise % run === 0 ? `${rise / run}` : fracLatex(rise, run);
      const wrongs = makeWrongAnswers(correct, [
        fracLatex(run, rise || 1),
        rise % run === 0 ? `${-(rise / run)}` : fracLatex(-rise, run),
        fracLatex(rise, run + 1),
      ]);

      const explanation = `Step 1: Use gradient = \\frac{\\Delta y}{\\Delta x}.

Step 2: \\Delta y = ${y2} - ${y1} = ${rise} and \\Delta x = ${x2} - ${x1} = ${run}.

Step 3: Gradient = ${fracLatex(rise, run)}.

Final answer: ${correct}`;

      const imageSvg = svgLineGraph({ x1, y1, x2, y2 });
      const imageAlt = `Graph with points A(${x1},${y1}) and B(${x2},${y2})`;
      return {
        question,
        correct,
        wrongs,
        explanation,
        difficulty: 4,
        marks: 3,
        est: 170,
        imageSvg,
        imageAlt,
      };
    }

    const x1 = randInt(rng, -4, 2);
    const y1 = randInt(rng, -4, 6);
    const run = randInt(rng, 2, 7);
    const rise = randInt(rng, -6, 6);
    const x2 = x1 + run;
    const y2 = y1 + rise;

    const question = `Find the gradient of the line through the points (${x1}, ${y1}) and (${x2}, ${y2}).`;
    const correct = rise % run === 0 ? `${rise / run}` : fracLatex(rise, run);
    const wrongs = makeWrongAnswers(correct, [
      fracLatex(run, rise || 1),
      `${(y2 + y1) / (x2 + x1 || 1)}`,
      fracLatex(rise, run + 1),
    ]);

    const explanation = `Step 1: Use gradient = \\frac{\\Delta y}{\\Delta x}.

Step 2: \\Delta y = ${y2} - ${y1} = ${rise} and \\Delta x = ${x2} - ${x1} = ${run}.

Step 3: Gradient = ${fracLatex(rise, run)}.

Final answer: ${correct}`;

    return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150 };
  },

  quadratics: (rng, tier, calc, v) => {
    if (tier === 'Higher Tier' && v % 2 === 0) {
      let r1 = randInt(rng, -3, 3) || -2;
      let r2 = randInt(rng, -3, 3) || 3;
      while (r2 === r1 || r2 === -r1) r2 = randInt(rng, -3, 3) || 1;
      const yIntercept = r1 * r2;
      const axis = (r1 + r2) % 2 === 0 ? `${(r1 + r2) / 2}` : fracLatex(r1 + r2, 2);
      const question = `The graph shows a quadratic curve that crosses the y-axis at y = ${yIntercept} and is symmetric about x = ${axis}.

What are the roots of the equation?`;
      const { correctPair, wrongs } = buildQuadraticRootWrongs(r1, r2);
      const correct = correctPair;
      const sum = r1 + r2;
      const explanation = `Step 1: Symmetry about x = ${axis} means the roots are equally spaced, so r1 + r2 = ${sum}.

Step 2: The graph crosses the y-axis at y = ${yIntercept}, so r1 × r2 = ${yIntercept}.

Step 3: The roots are x = ${r1} and x = ${r2}.

Final answer: ${correct}`;
      const imageSvg = svgQuadraticGraph({ r1, r2 });
      const imageAlt = `Quadratic graph with x-intercepts at ${r1} and ${r2}`;
      return {
        question,
        correct,
        wrongs,
        explanation,
        difficulty: 5,
        marks: 3,
        est: 200,
        imageSvg,
        imageAlt,
      };
    }

    const higher = tier === 'Higher Tier';
    const a = higher ? randInt(rng, 2, 4) : 1;
    let r1 = randInt(rng, -6, 6) || 2;
    let r2 = randInt(rng, -6, 6) || -3;
    while (r2 === r1 || r2 === -r1) r2 = randInt(rng, -6, 6) || -1;
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const question = `Solve ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = 0.`;
    const { correctPair, wrongs } = buildQuadraticRootWrongs(r1, r2);
    const correct = correctPair;

    const explanation = `Step 1: Factorise: ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${a}(x ${r1 >= 0 ? '-' : '+'} ${Math.abs(
      r1,
    )})(x ${r2 >= 0 ? '-' : '+'} ${Math.abs(r2)}).

Step 2: Set each bracket to 0:

x ${r1 >= 0 ? '-' : '+'} ${Math.abs(r1)} = 0 gives x = ${r1}

x ${r2 >= 0 ? '-' : '+'} ${Math.abs(r2)} = 0 gives x = ${r2}

Final answer: ${correct}`;

    return { question, correct, wrongs, explanation, difficulty: higher ? 4 : 3, marks: 3, est: 220 };
  },

  algebraic_fractions: (rng, tier, calc, v) => {
    const mk = ({ question, correct, wrongs, explanation, difficulty, marks, est }) => ({
      question,
      correct,
      wrongs: makeWrongAnswers(correct, wrongs),
      explanation,
      difficulty,
      marks,
      est,
    });

    const formatCoeffX = (n, d) => {
      const coeff = fracLatex(n, d);
      if (coeff === '1') return 'x';
      if (coeff === '-1') return '-x';
      return `${coeff}x`;
    };

    const simplifyCoef = (n, d) => {
      const f = simplifyFraction(n, d);
      return { n: f.n, d: f.d };
    };

    const foundationPatterns = [
      () => {
        const g = pick(rng, [2, 3, 4]);
        const a = g * randInt(rng, 2, 9);
        let b = g * randInt(rng, 2, 9);
        while (b === a) b = g * randInt(rng, 2, 9);
        const simp = simplifyCoef(a, b);
        const question = `Simplify \\frac{${a}x}{${b}}.`;
        const correct = formatCoeffX(simp.n, simp.d);
        const wrongs = [
          formatCoeffX(simp.n + 1, simp.d),
          formatCoeffX(simp.n, simp.d + 1),
          fracLatex(simp.n, simp.d),
        ];
        const explanation = `Step 1: Simplify the fraction ${a}/${b} by dividing by ${g}.

Step 2: \\frac{${a}x}{${b}} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}x}{${b}x}.`;
        const correct = fracLatex(a, b);
        const wrongs = [fracLatex(b, a), formatCoeffX(a, b), `${a}${b}`];
        const explanation = `Step 1: Cancel x from top and bottom.

Step 2: \\frac{${a}x}{${b}x} = \\frac{${a}}{${b}}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}x^2}{${b}x}.`;
        const correct = formatCoeffX(a, b);
        const wrongs = [formatCoeffX(b, a), `${a}x^2`, fracLatex(a, b)];
        const explanation = `Step 1: Cancel one x: \\frac{x^2}{x} = x.

Step 2: \\frac{${a}x^2}{${b}x} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 130 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}xy}{${b}y}.`;
        const correct = formatCoeffX(a, b);
        const wrongs = [formatCoeffX(b, a), formatCoeffX(a, b + 1), fracLatex(a, b)];
        const explanation = `Step 1: Cancel y from top and bottom.

Step 2: \\frac{${a}xy}{${b}y} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 130 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}x^2y}{${b}xy}.`;
        const correct = formatCoeffX(a, b);
        const wrongs = [formatCoeffX(b, a), `${a}xy`, fracLatex(a, b)];
        const explanation = `Step 1: Cancel x and y: \\frac{x^2y}{xy} = x.

Step 2: \\frac{${a}x^2y}{${b}xy} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 130 });
      },
    ];

    const higherPatterns = [
      () => {
        const k = randInt(rng, 2, 7);
        const question = `Simplify \\frac{x^2 - ${k * k}}{x - ${k}}.`;
        const correct = `x + ${k}`;
        const wrongs = [`x - ${k}`, `x^2 - ${k * k}`, `x + ${k * k}`];
        const explanation = `Step 1: Factorise the numerator: x^2 - ${k * k} = (x - ${k})(x + ${k}).

Step 2: Cancel (x - ${k}).

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 });
      },
      () => {
        const b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{x^2 + ${b}x}{x}.`;
        const correct = `x + ${b}`;
        const wrongs = [`x^2 + ${b}`, `x + ${b}x`, `${b}`];
        const explanation = `Step 1: Factorise: x^2 + ${b}x = x(x + ${b}).

Step 2: Cancel x.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}x^2y}{${b}xy^2}.`;
        const correct = `\\frac{${a}x}{${b}y}`;
        const wrongs = [`\\frac{${a}y}{${b}x}`, formatCoeffX(a, b), `\\frac{${a}}{${b}}xy`];
        const explanation = `Step 1: Cancel x and y: \\frac{x^2y}{xy^2} = \\frac{x}{y}.

Step 2: \\frac{${a}x^2y}{${b}xy^2} = \\frac{${a}x}{${b}y}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 });
      },
      () => {
        const a = randInt(rng, 2, 8);
        let b = randInt(rng, 2, 8);
        while (b === a) b = randInt(rng, 2, 8);
        const question = `Simplify \\frac{${a}x^2}{${b}x}.`;
        const correct = formatCoeffX(a, b);
        const wrongs = [formatCoeffX(b, a), `${a}x^2`, fracLatex(a, b)];
        const explanation = `Step 1: Cancel one x: \\frac{x^2}{x} = x.

Step 2: \\frac{${a}x^2}{${b}x} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 });
      },
      () => {
        const a = randInt(rng, 2, 9);
        let b = randInt(rng, 2, 9);
        while (b === a) b = randInt(rng, 2, 9);
        const question = `Simplify \\frac{${a}xy}{${b}y}.`;
        const correct = formatCoeffX(a, b);
        const wrongs = [formatCoeffX(b, a), formatCoeffX(a, b + 1), fracLatex(a, b)];
        const explanation = `Step 1: Cancel y from top and bottom.

Step 2: \\frac{${a}xy}{${b}y} = ${correct}.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 });
      },
      () => {
        const a = randInt(rng, 2, 7);
        const question = `Simplify \\frac{${a}x^2 - ${a}x}{${a}x}.`;
        const correct = `x - 1`;
        const wrongs = [`x + 1`, `x^2 - 1`, `1 - x`];
        const explanation = `Step 1: Factorise the numerator: ${a}x^2 - ${a}x = ${a}x(x - 1).

Step 2: Cancel ${a}x.

Final answer: ${correct}`;
        return mk({ question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 160 });
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    const pattern = pool[v % pool.length];
    return pattern();
  },

  // RATIO
  ratio: (rng, tier, calc, v) => {
    const simplify = (a, b) => {
      const g = gcd(a, b);
      return { g, correct: `${a / g}:${b / g}` };
    };

    const foundationPatterns = [
      () => {
        const g = pick(rng, [2, 3, 4, 5]);
        const a = g * randInt(rng, 2, 12);
        let b = g * randInt(rng, 2, 12);
        while (b === a) b = g * randInt(rng, 2, 12);
        const { g: hcf, correct } = simplify(a, b);
        const question = `Simplify the ratio ${a}:${b}.`;
        const wrongs = makeWrongAnswers(correct, [`${a}:${b / hcf}`, `${a / hcf}:${b}`, `${a / 2}:${b / 2}`]);
        const explanation = `Step 1: Find the HCF of ${a} and ${b}: ${hcf}.

Step 2: Divide both parts by ${hcf}: ${a}÷${hcf}:${b}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 80 };
      },
      () => {
        const g = pick(rng, [2, 3, 4]);
        const red = g * randInt(rng, 4, 18);
        const blue = g * randInt(rng, 4, 18);
        const { g: hcf, correct } = simplify(red, blue);
        const question = `A bag has ${red} red beads and ${blue} blue beads.

Write the ratio red:blue in its simplest form.`;
        const wrongs = makeWrongAnswers(correct, [`${red}:${blue / hcf}`, `${red / hcf}:${blue}`, `${red / 2}:${blue / 2}`]);
        const explanation = `Step 1: HCF of ${red} and ${blue} is ${hcf}.

Step 2: Divide both by ${hcf}: ${red}÷${hcf}:${blue}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const waterL = pick(rng, [1.2, 1.5, 1.8, 2.4]);
        const juiceMl = pick(rng, [300, 450, 600, 750, 900]);
        const waterMl = Math.round(waterL * 1000);
        const { g: hcf, correct } = simplify(waterMl, juiceMl);
        const question = `A drink contains ${waterL} L of water and ${juiceMl} ml of juice.

Simplify the ratio water:juice.`;
        const wrongs = makeWrongAnswers(correct, [`${waterMl}:${juiceMl / hcf}`, `${waterMl / hcf}:${juiceMl}`, `${waterMl}:${juiceMl}`]);
        const explanation = `Step 1: Convert to the same units: ${waterL} L = ${waterMl} ml.

Step 2: HCF of ${waterMl} and ${juiceMl} is ${hcf}.

Step 3: ${waterMl}÷${hcf}:${juiceMl}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120 };
      },
      () => {
        const a = randInt(rng, 2, 9);
        const b = randInt(rng, 2, 9);
        const question = `The ratio of apples to oranges is ${a}:${b}.

What fraction of the fruit are apples?`;
        const correct = fracLatex(a, a + b);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(b, a + b),
          fracLatex(a, b),
          fracLatex(a + b, a),
        ]);
        const explanation = `Step 1: Total parts = ${a} + ${b} = ${a + b}.

Step 2: Fraction of apples = \\frac{${a}}{${a + b}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120 };
      },
      () => {
        const a = randInt(rng, 2, 6);
        const b = randInt(rng, 3, 8);
        const scale = randInt(rng, 2, 5);
        const question = `Complete the ratio: ${a}:${b} = ${a * scale}: ?`;
        const correct = `${b * scale}`;
        const wrongs = makeWrongAnswers(correct, [
          `${b + scale}`,
          `${b * (scale + 1)}`,
          `${b * scale - 1}`,
        ]);
        const explanation = `Step 1: The first part is multiplied by ${scale}.

Step 2: Multiply the second part by ${scale}: ${b} × ${scale} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 };
      },
    ];

    const higherPatterns = [
      () => {
        const g = pick(rng, [2, 3, 4]);
        const a = g * randInt(rng, 3, 10);
        const b = g * randInt(rng, 3, 10);
        const c = g * randInt(rng, 3, 10);
        const hcf = gcd(gcd(a, b), c);
        const correct = `${a / hcf}:${b / hcf}:${c / hcf}`;
        const question = `Simplify the ratio ${a}:${b}:${c}.`;
        const wrongs = makeWrongAnswers(correct, [`${a}:${b / hcf}:${c / hcf}`, `${a / hcf}:${b}:${c / hcf}`, `${a / 2}:${b / 2}:${c / 2}`]);
        const explanation = `Step 1: HCF of ${a}, ${b}, and ${c} is ${hcf}.

Step 2: Divide each part by ${hcf}: ${a}÷${hcf}:${b}÷${hcf}:${c}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 130 };
      },
      () => {
        const riceG = pick(rng, [1500, 1800, 2100, 2400]);
        const pastaG = pick(rng, [450, 600, 750, 900]);
        const { g: hcf, correct } = simplify(riceG, pastaG);
        const question = `A bag contains ${riceG / 1000} kg of rice and ${pastaG} g of pasta.

Simplify the ratio rice:pasta.`;
        const wrongs = makeWrongAnswers(correct, [`${riceG}:${pastaG / hcf}`, `${riceG / hcf}:${pastaG}`, `${riceG}:${pastaG}`]);
        const explanation = `Step 1: Convert to grams: rice = ${riceG} g, pasta = ${pastaG} g.

Step 2: HCF of ${riceG} and ${pastaG} is ${hcf}.

Step 3: ${riceG}÷${hcf}:${pastaG}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
      },
      () => {
        const widthMm = pick(rng, [240, 300, 360, 420]);
        const heightCm = pick(rng, [12, 15, 18, 21]);
        const heightMm = heightCm * 10;
        const { g: hcf, correct } = simplify(widthMm, heightMm);
        const question = `A rectangle is ${widthMm} mm wide and ${heightCm} cm tall.

Write the ratio width:height in its simplest form.`;
        const wrongs = makeWrongAnswers(correct, [`${widthMm}:${heightMm / hcf}`, `${widthMm / hcf}:${heightMm}`, `${widthMm}:${heightMm}`]);
        const explanation = `Step 1: Convert ${heightCm} cm to mm: ${heightMm} mm.

Step 2: HCF of ${widthMm} and ${heightMm} is ${hcf}.

Step 3: ${widthMm}÷${hcf}:${heightMm}÷${hcf} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
      },
      () => {
        const a = pick(rng, [1.2, 1.5, 2.4, 3.6]);
        const b = pick(rng, [0.8, 1.2, 2.0, 2.4, 3.0]);
        const scale = 10;
        const aa = Math.round(a * scale);
        const bb = Math.round(b * scale);
        const g = gcd(aa, bb);
        const correct = `${aa / g}:${bb / g}`;
        const question = `Simplify the ratio ${a}:${b}.`;
        const wrongs = makeWrongAnswers(correct, [
          `${aa}:${bb}`,
          `${aa / g}:${bb}`,
          `${aa}:${bb / g}`,
        ]);
        const explanation = `Step 1: Multiply by ${scale} to clear decimals: ${a}:${b} = ${aa}:${bb}.

Step 2: HCF of ${aa} and ${bb} is ${g}.

Step 3: Simplify to ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      },
      () => {
        const a = randInt(rng, 3, 8);
        const b = randInt(rng, 4, 9);
        const total = (a + b) * randInt(rng, 3, 6);
        const part = (total / (a + b)) * a;
        const question = `The ratio of boys to girls is ${a}:${b}. There are ${total} students in total.

How many are boys?`;
        const correct = `${part}`;
        const wrongs = makeWrongAnswers(correct, [
          `${total - part}`,
          `${a * total}`,
          `${total / a}`,
        ]);
        const explanation = `Step 1: Total parts = ${a} + ${b} = ${a + b}.

Step 2: One part = ${total} ÷ ${a + b} = ${total / (a + b)}.

Step 3: Boys = ${a} × ${total / (a + b)} = ${part}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 170 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  proportion: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const k = randInt(rng, 2, 12);
        const x1 = randInt(rng, 2, 9);
        const y1 = k * x1;
        const x2 = randInt(rng, 10, 25);
        const y2 = k * x2;
        const question = `y is directly proportional to x.

When x = ${x1}, y = ${y1}.

Find y when x = ${x2}.`;
        const correct = `${y2}`;
        const wrongs = makeWrongAnswers(correct, [`${y1 + x2}`, `${y1 * x2}`, `${Math.round((y1 / x2) * x1)}`]);
        const explanation = `Step 1: Direct proportion means y = kx.

Step 2: ${y1} = k(${x1}) so k = ${fracLatex(y1, x1)} = ${k}.

Step 3: y = ${k} × ${x2} = ${y2}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150 };
      },
      () => {
        const k = randInt(rng, 2, 10);
        const x1 = randInt(rng, 3, 9);
        const y1 = k * x1;
        const y2 = k * randInt(rng, 10, 18);
        const x2 = y2 / k;
        const question = `y is directly proportional to x.

When x = ${x1}, y = ${y1}.

Find x when y = ${y2}.`;
        const correct = `${x2}`;
        const wrongs = makeWrongAnswers(correct, [`${y2 - x1}`, `${y2 + x1}`, `${Math.round(y2 / (k + 1))}`]);
        const explanation = `Step 1: y = kx.

Step 2: ${y1} = k(${x1}) so k = ${k}.

Step 3: ${y2} = ${k}x so x = ${fracLatex(y2, k)} = ${x2}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150 };
      },
      () => {
        const k = randInt(rng, 2, 8);
        const mass1 = randInt(rng, 2, 6);
        const cost1 = k * mass1;
        const mass2 = randInt(rng, 7, 12);
        const cost2 = k * mass2;
        const question = `The cost of apples is directly proportional to the mass.

${mass1} kg costs £${cost1}. Find the cost of ${mass2} kg.`;
        const correct = `£${cost2}`;
        const wrongs = makeWrongAnswers(correct, [`£${cost1 + mass2}`, `£${cost1 * mass2}`, `£${cost2 + k}`]);
        const explanation = `Step 1: Cost = k × mass.

Step 2: k = £${cost1} ÷ ${mass1} = £${k} per kg.

Step 3: Cost for ${mass2} kg = £${k} × ${mass2} = £${cost2}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 180 };
      },
    ];

    const higherPatterns = [
      () => {
        const k = randInt(rng, 3, 9);
        const x1 = randInt(rng, 4, 9);
        const y1 = k * x1;
        const y2 = randInt(rng, 60, 140);
        const x2 = fracLatex(y2, k);
        const question = `y is directly proportional to x.

When x = ${x1}, y = ${y1}.

Find x when y = ${y2}.`;
        const correct = `${x2}`;
        const wrongs = makeWrongAnswers(correct, [`${y2}`, `${fracLatex(y2, k + 1)}`, `${fracLatex(y2 + k, k)}`]);
        const explanation = `Step 1: y = kx.

Step 2: ${y1} = k(${x1}) so k = ${k}.

Step 3: ${y2} = ${k}x so x = ${fracLatex(y2, k)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 190 };
      },
      () => {
        const k = randInt(rng, 2, 7);
        const time1 = randInt(rng, 6, 10);
        const vol1 = k * time1;
        const vol2 = randInt(rng, 70, 140);
        const time2 = fracLatex(vol2, k);
        const question = `The volume of water collected is directly proportional to time.

In ${time1} minutes, ${vol1} litres are collected.

How many minutes to collect ${vol2} litres?`;
        const correct = `${time2}`;
        const wrongs = makeWrongAnswers(correct, [`${vol2}`, `${fracLatex(vol2, k + 1)}`, `${fracLatex(vol2 + k, k)}`]);
        const explanation = `Step 1: Volume = k × time.

Step 2: k = ${vol1} ÷ ${time1} = ${k} L/min.

Step 3: ${vol2} = ${k} × time so time = ${fracLatex(vol2, k)} minutes.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
      () => {
        const k = randInt(rng, 3, 8);
        const x1 = randInt(rng, 5, 9);
        const y1 = k * x1;
        const x2 = randInt(rng, 12, 20);
        const y2 = k * x2;
        const question = `y is directly proportional to x.

When x = ${x1}, y = ${y1}. Write an equation for y in terms of x, then find y when x = ${x2}.`;
        const correct = `${y2}`;
        const wrongs = makeWrongAnswers(correct, [`${y1 + x2}`, `${y1 * x2}`, `${y2 + k}`]);
        const explanation = `Step 1: y = kx.

Step 2: ${y1} = k(${x1}) so k = ${k} and y = ${k}x.

Step 3: y = ${k} × ${x2} = ${y2}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  percentage_change: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const original = randInt(rng, 40, 500);
        const p = pick(rng, [5, 10, 12, 15, 20, 25]);
        const isDecrease = v % 2 === 0;
        const factor = isDecrease ? (1 - p / 100) : (1 + p / 100);
        const question = isDecrease
          ? `A price of £${original} is decreased by ${p}%. Find the new price.`
          : `A price of £${original} is increased by ${p}%. Find the new price.`;
        const correct = `£${Number((original * factor).toFixed(2))}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((original / factor).toFixed(2))}`,
          `£${original + p}`,
          `£${Number((original * (p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: A ${p}% ${isDecrease ? 'decrease' : 'increase'} means multiply by ${factor}.

Step 2: ${original} × ${factor} = ${Number((original * factor).toFixed(2))}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 160 };
      },
      () => {
        const p = pick(rng, [10, 15, 20, 25, 30]);
        const original = randInt(rng, 80, 300);
        const isDecrease = rng() < 0.5;
        const newValue = Math.round(original * (isDecrease ? (1 - p / 100) : (1 + p / 100)));
        const question = `A price changes from £${original} to £${newValue}.

Find the percentage ${isDecrease ? 'decrease' : 'increase'}.`;
        const correct = `${p}%`;
        const wrongs = makeWrongAnswers(correct, [
          `${Math.round((Math.abs(newValue - original) / newValue) * 100)}%`,
          `${p + 5}%`,
          `${p - 5}%`,
        ]);
        const explanation = `Step 1: Change = ${Math.abs(newValue - original)}.

Step 2: Percentage change = ${fracLatex(Math.abs(newValue - original), original)} × 100.

Step 3: ${fracLatex(Math.abs(newValue - original) * 100, original)} = ${p}%.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 170 };
      },
    ];

    const higherPatterns = [
      () => {
        const original = randInt(rng, 120, 600);
        const discount = pick(rng, [10, 12.5, 15, 20]);
        const vat = pick(rng, [5, 10, 20]);
        const afterDiscount = original * (1 - discount / 100);
        const finalPrice = Number((afterDiscount * (1 + vat / 100)).toFixed(2));
        const question = `A price of £${original} is reduced by ${discount}% and then VAT at ${vat}% is added.

Find the final price.`;
        const correct = `£${finalPrice}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((original * (1 + vat / 100)).toFixed(2))}`,
          `£${Number((original * (1 - discount / 100)).toFixed(2))}`,
          `£${Number((original * (1 - discount / 100 + vat / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Apply the discount: £${original} × ${1 - discount / 100} = £${afterDiscount.toFixed(2)}.

Step 2: Add VAT: £${afterDiscount.toFixed(2)} × ${1 + vat / 100} = £${finalPrice}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const p = pick(rng, [7.5, 12.5, 17.5]);
        const original = randInt(rng, 160, 420);
        const isDecrease = rng() < 0.5;
        const factor = isDecrease ? (1 - p / 100) : (1 + p / 100);
        const newValue = Number((original * factor).toFixed(2));
        const question = `A price of £${original} is ${isDecrease ? 'reduced' : 'increased'} by ${p}%.

Find the new price.`;
        const correct = `£${newValue}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((original / factor).toFixed(2))}`,
          `£${Number((original * (p / 100)).toFixed(2))}`,
          `£${Number((original + p).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Multiplier = ${factor}.

Step 2: £${original} × ${factor} = £${newValue}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 200 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  reverse_percentages: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const original = randInt(rng, 50, 400);
        const p = pick(rng, [10, 15, 20, 25]);
        const increased = Number((original * (1 + p / 100)).toFixed(2));
        const question = `A value is increased by ${p}% to give ${increased}.

What was the original value?`;
        const correct = `${original}`;
        const wrongs = makeWrongAnswers(correct, [
          `${increased}`,
          `${Number((increased * (1 + p / 100)).toFixed(2))}`,
          `${Number((increased * (1 - p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Increase by ${p}% means multiply by ${1 + p / 100}.

Step 2: Original = ${fracLatex(increased, 1 + p / 100)} = ${original}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 200 };
      },
      () => {
        const original = randInt(rng, 80, 300);
        const p = pick(rng, [10, 20, 25, 30]);
        const decreased = Number((original * (1 - p / 100)).toFixed(2));
        const question = `A price is decreased by ${p}% to give £${decreased}.

What was the original price?`;
        const correct = `£${original}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${decreased}`,
          `£${Number((decreased * (1 - p / 100)).toFixed(2))}`,
          `£${Number((decreased * (1 + p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Decrease by ${p}% means multiply by ${1 - p / 100}.

Step 2: Original = £${decreased} ÷ ${1 - p / 100} = £${original}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 200 };
      },
    ];

    const higherPatterns = [
      () => {
        const base = randInt(rng, 120, 480);
        const p = pick(rng, [12.5, 15, 20]);
        const sale = Number((base * (1 - p / 100)).toFixed(2));
        const question = `A jacket is sold for £${sale} after a ${p}% discount.

Find the original price.`;
        const correct = `£${base}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((sale * (1 + p / 100)).toFixed(2))}`,
          `£${Number((sale * (1 - p / 100)).toFixed(2))}`,
          `£${Number((sale + p).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Discounted price = original × ${1 - p / 100}.

Step 2: Original = £${sale} ÷ ${1 - p / 100} = £${base}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const net = randInt(rng, 60, 220);
        const vat = pick(rng, [5, 20]);
        const gross = Number((net * (1 + vat / 100)).toFixed(2));
        const question = `A price including ${vat}% VAT is £${gross}.

Find the price before VAT.`;
        const correct = `£${net}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((gross * (1 + vat / 100)).toFixed(2))}`,
          `£${Number((gross * (1 - vat / 100)).toFixed(2))}`,
          `£${Number((gross + vat).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Gross = net × ${1 + vat / 100}.

Step 2: Net = £${gross} ÷ ${1 + vat / 100} = £${net}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  ratio_share: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const total = randInt(rng, 60, 240);
        const a = randInt(rng, 1, 7);
        const b = randInt(rng, 1, 7);
        const parts = a + b;
        const shareA = (total * a) / parts;
        const question = `Share £${total} in the ratio ${a}:${b}.

How much does the first person get?`;
        const correct = `£${shareA}`;
        const wrongs = makeWrongAnswers(correct, [`£${(total * b) / parts}`, `£${total / parts}`, `£${total * a}`]);
        const explanation = `Step 1: Total parts = ${a} + ${b} = ${parts}.

Step 2: One part = £${fracLatex(total, parts)}.

Step 3: First share = ${a} parts = £${fracLatex(total * a, parts)} = £${shareA}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 200 };
      },
      () => {
        const a = randInt(rng, 2, 6);
        const b = randInt(rng, 2, 6);
        const parts = a + b;
        const shareA = randInt(rng, 6, 18) * a;
        const total = (shareA / a) * parts;
        const shareB = total - shareA;
        const question = `Sam and Alex share money in the ratio ${a}:${b}.

Sam gets £${shareA}. How much does Alex get?`;
        const correct = `£${shareB}`;
        const wrongs = makeWrongAnswers(correct, [`£${shareA}`, `£${total}`, `£${shareA + a}`]);
        const explanation = `Step 1: ${a} parts = £${shareA}, so 1 part = £${fracLatex(shareA, a)}.

Step 2: Alex gets ${b} parts: £${fracLatex(shareA * b, a)} = £${shareB}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 200 };
      },
      () => {
        const a = randInt(rng, 1, 5);
        const b = randInt(rng, 2, 6);
        const c = randInt(rng, 2, 6);
        const parts = a + b + c;
        const total = randInt(rng, 12, 24) * parts;
        const shareB = (total * b) / parts;
        const question = `Share £${total} in the ratio ${a}:${b}:${c}.

How much does the second person get?`;
        const correct = `£${shareB}`;
        const wrongs = makeWrongAnswers(correct, [`£${(total * a) / parts}`, `£${(total * c) / parts}`, `£${total / parts}`]);
        const explanation = `Step 1: Total parts = ${a} + ${b} + ${c} = ${parts}.

Step 2: One part = £${fracLatex(total, parts)}.

Step 3: Second share = ${b} parts = £${fracLatex(total * b, parts)} = £${shareB}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 210 };
      },
    ];

    const higherPatterns = [
      () => {
        const a = randInt(rng, 2, 6);
        const b = randInt(rng, 3, 7);
        const parts = a + b;
        const total = randInt(rng, 20, 40) * parts;
        const shareA = (total * a) / parts;
        const shareB = total - shareA;
        const question = `A and B share £${total} in the ratio ${a}:${b}.

Find the difference between their shares.`;
        const correct = `£${Math.abs(shareB - shareA)}`;
        const wrongs = makeWrongAnswers(correct, [`£${shareA}`, `£${shareB}`, `£${total / parts}`]);
        const explanation = `Step 1: Total parts = ${a} + ${b} = ${parts}.

Step 2: One part = £${fracLatex(total, parts)}.

Step 3: Shares are £${shareA} and £${shareB}, so the difference is £${Math.abs(shareB - shareA)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const a = randInt(rng, 2, 5);
        const b = randInt(rng, 3, 6);
        const parts = a + b;
        const shareA = randInt(rng, 10, 20) * a;
        const total = (shareA / a) * parts;
        const question = `Liam and Mia share money in the ratio ${a}:${b}.

Liam gets £${shareA}. Find the total amount shared.`;
        const correct = `£${total}`;
        const wrongs = makeWrongAnswers(correct, [`£${shareA}`, `£${(shareA / a) * b}`, `£${shareA + b}`]);
        const explanation = `Step 1: ${a} parts = £${shareA}, so 1 part = £${fracLatex(shareA, a)}.

Step 2: Total parts = ${parts}, so total = £${fracLatex(shareA * parts, a)} = £${total}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  rates: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const mass = randInt(rng, 240, 1800);
        const vol = randInt(rng, 3, 12);
        const density = mass / vol;
        const question = `A metal has mass ${mass} g and volume ${vol} cm^3.

Find the density in g/cm^3.`;
        const correct = Number.isInteger(density) ? `${density}` : `${density}`;
        const wrongs = makeWrongAnswers(correct, [`${vol / mass}`, `${mass * vol}`, `${mass + vol}`]);
        const explanation = `Step 1: Density = \\frac{mass}{volume}.

Step 2: Density = \\frac{${mass}}{${vol}} = ${density}.

Final answer: ${correct} g/cm^3`;
        return {
          question,
          correct: `${correct} g/cm^3`,
          wrongs: wrongs.map((x) => `${x} g/cm^3`),
          explanation,
          difficulty: 2,
          marks: 2,
          est: 160,
        };
      },
      () => {
        const force = randInt(rng, 80, 240);
        const area = randInt(rng, 4, 12);
        const pressure = force / area;
        const question = `A force of ${force} N acts on an area of ${area} cm^2.

Find the pressure in N/cm^2.`;
        const correct = Number.isInteger(pressure) ? `${pressure}` : `${pressure}`;
        const wrongs = makeWrongAnswers(correct, [`${area / force}`, `${force * area}`, `${force + area}`]);
        const explanation = `Step 1: Pressure = \\frac{force}{area}.

Step 2: Pressure = \\frac{${force}}{${area}} = ${pressure}.

Final answer: ${correct} N/cm^2`;
        return {
          question,
          correct: `${correct} N/cm^2`,
          wrongs: wrongs.map((x) => `${x} N/cm^2`),
          explanation,
          difficulty: 2,
          marks: 2,
          est: 160,
        };
      },
      () => {
        const rate = randInt(rng, 6, 12);
        const time = randInt(rng, 4, 10);
        const total = rate * time;
        const question = `A tap fills at ${rate} litres per minute.

How many litres in ${time} minutes?`;
        const correct = `${total}`;
        const wrongs = makeWrongAnswers(correct, [`${rate + time}`, `${rate * (time + 1)}`, `${total - rate}`]);
        const explanation = `Step 1: Volume = rate × time.

Step 2: ${rate} × ${time} = ${total}.

Final answer: ${correct} litres`;
        return { question, correct: `${correct} litres`, wrongs: wrongs.map((x) => `${x} litres`), explanation, difficulty: 2, marks: 2, est: 150 };
      },
    ];

    const higherPatterns = [
      () => {
        const mass = randInt(rng, 350, 1500);
        const density = pick(rng, [2.4, 3.2, 4.5, 5.6]);
        const volume = Number((mass / density).toFixed(1));
        const question = `A block has mass ${mass} g and density ${density} g/cm^3.

Find its volume to 1 decimal place.`;
        const correct = `${volume}`;
        const wrongs = makeWrongAnswers(correct, [`${Number((mass * density).toFixed(1))}`, `${Number((mass / (density + 1)).toFixed(1))}`, `${Number((mass / density + 1).toFixed(1))}`]);
        const explanation = `Step 1: Density = \\frac{mass}{volume}.

Step 2: Volume = \\frac{mass}{density} = \\frac{${mass}}{${density}} = ${volume}.

Final answer: ${correct} cm^3`;
        return { question, correct: `${correct} cm^3`, wrongs: wrongs.map((x) => `${x} cm^3`), explanation, difficulty: 4, marks: 3, est: 210 };
      },
      () => {
        const force = randInt(rng, 120, 360);
        const pressure = pick(rng, [4.8, 6, 7.5, 9.6]);
        const area = Number((force / pressure).toFixed(1));
        const question = `A force of ${force} N produces a pressure of ${pressure} N/cm^2.

Find the area to 1 decimal place.`;
        const correct = `${area}`;
        const wrongs = makeWrongAnswers(correct, [`${Number((force * pressure).toFixed(1))}`, `${Number((force / (pressure + 1)).toFixed(1))}`, `${Number((area + 1).toFixed(1))}`]);
        const explanation = `Step 1: Pressure = \\frac{force}{area}.

Step 2: Area = \\frac{force}{pressure} = \\frac{${force}}{${pressure}} = ${area}.

Final answer: ${correct} cm^2`;
        return { question, correct: `${correct} cm^2`, wrongs: wrongs.map((x) => `${x} cm^2`), explanation, difficulty: 4, marks: 3, est: 210 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  speed: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const dist = randInt(rng, 60, 240);
        const time = randInt(rng, 2, 6);
        const speed = dist / time;
        const question = `A car travels ${dist} miles in ${time} hours.

Find the average speed in miles per hour.`;
        const correct = `${speed}`;
        const wrongs = makeWrongAnswers(correct, [`${dist * time}`, `${time / dist}`, `${dist + time}`]);
        const explanation = `Step 1: Speed = \\frac{distance}{time}.

Step 2: Speed = \\frac{${dist}}{${time}} = ${speed}.

Final answer: ${speed} mph`;
        return { question, correct: `${correct} mph`, wrongs: wrongs.map((x) => `${x} mph`), explanation, difficulty: 2, marks: 2, est: 150 };
      },
      () => {
        const speed = randInt(rng, 40, 80);
        const timeMin = randInt(rng, 30, 90);
        const timeHr = timeMin / 60;
        const dist = speed * timeHr;
        const question = `A cyclist travels at ${speed} mph for ${timeMin} minutes.

How far do they travel?`;
        const correct = `${dist}`;
        const wrongs = makeWrongAnswers(correct, [`${speed * timeMin}`, `${speed + timeMin}`, `${dist + speed}`]);
        const explanation = `Step 1: Convert time to hours: ${timeMin} minutes = ${timeHr} hours.

Step 2: Distance = speed × time = ${speed} × ${timeHr} = ${dist}.

Final answer: ${dist} miles`;
        return { question, correct: `${correct} miles`, wrongs: wrongs.map((x) => `${x} miles`), explanation, difficulty: 2, marks: 2, est: 170 };
      },
      () => {
        const dist = randInt(rng, 90, 210);
        const speed = randInt(rng, 30, 70);
        const timeHr = dist / speed;
        const timeMin = timeHr * 60;
        const question = `A train travels ${dist} miles at ${speed} mph.

How long does the journey take in minutes?`;
        const correct = `${timeMin}`;
        const wrongs = makeWrongAnswers(correct, [`${dist * speed}`, `${dist + speed}`, `${Math.round(timeMin + 10)}`]);
        const explanation = `Step 1: Time = \\frac{distance}{speed} = \\frac{${dist}}{${speed}} = ${timeHr} hours.

Step 2: Convert to minutes: ${timeHr} × 60 = ${timeMin}.

Final answer: ${timeMin} minutes`;
        return { question, correct: `${correct} minutes`, wrongs: wrongs.map((x) => `${x} minutes`), explanation, difficulty: 3, marks: 3, est: 190 };
      },
    ];

    const higherPatterns = [
      () => {
        const dist = randInt(rng, 120, 320);
        const timeMin = randInt(rng, 70, 140);
        const timeHr = timeMin / 60;
        const speed = Number((dist / timeHr).toFixed(1));
        const question = `A runner travels ${dist} miles in ${timeMin} minutes.

Find the average speed in mph to 1 decimal place.`;
        const correct = `${speed}`;
        const wrongs = makeWrongAnswers(correct, [`${Number((dist * timeHr).toFixed(1))}`, `${Number((timeHr / dist).toFixed(1))}`, `${Number((speed + 1).toFixed(1))}`]);
        const explanation = `Step 1: Convert time to hours: ${timeMin} minutes = ${timeHr} hours.

Step 2: Speed = \\frac{${dist}}{${timeHr}} = ${speed}.

Final answer: ${correct} mph`;
        return { question, correct: `${correct} mph`, wrongs: wrongs.map((x) => `${x} mph`), explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const speed = randInt(rng, 45, 75);
        const dist = randInt(rng, 180, 360);
        const timeHr = dist / speed;
        const timeMin = Number((timeHr * 60).toFixed(0));
        const question = `A coach travels ${dist} miles at ${speed} mph.

How long does the journey take, to the nearest minute?`;
        const correct = `${timeMin}`;
        const wrongs = makeWrongAnswers(correct, [`${Math.round(timeMin + 8)}`, `${Math.round(timeMin - 8)}`, `${Math.round(timeMin + 15)}`]);
        const explanation = `Step 1: Time = \\frac{distance}{speed} = \\frac{${dist}}{${speed}} = ${timeHr} hours.

Step 2: Convert to minutes: ${timeHr} × 60 = ${timeMin}.

Final answer: ${timeMin} minutes`;
        return { question, correct: `${correct} minutes`, wrongs: wrongs.map((x) => `${x} minutes`), explanation, difficulty: 4, marks: 3, est: 220 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  best_buys: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const a = randInt(rng, 3, 9);
        const b = randInt(rng, 10, 25);
        const c = randInt(rng, 3, 9);
        const d = randInt(rng, 10, 25);
        const unit1 = a / b;
        const unit2 = c / d;
        const question = `Pack A costs £${a} for ${b} items.
Pack B costs £${c} for ${d} items.

Which is better value per item?`;
        const correct = unit1 < unit2 ? 'Pack A' : 'Pack B';
        const wrongs = makeWrongAnswers(correct, ['Pack A', 'Pack B', 'Both are the same']);
        const explanation = `Step 1: Cost per item.

Step 2: Pack A: £${a} ÷ ${b} = £${unit1.toFixed(3)}.

Step 3: Pack B: £${c} ÷ ${d} = £${unit2.toFixed(3)}.

Step 4: Lower cost per item is better value.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 200 };
      },
      () => {
        const priceA = randInt(rng, 4, 10);
        const gramsA = pick(rng, [250, 300, 400, 500]);
        const priceB = randInt(rng, 5, 12);
        const gramsB = pick(rng, [350, 450, 600, 700]);
        const costA = priceA / gramsA;
        const costB = priceB / gramsB;
        const question = `Rice A costs £${priceA} for ${gramsA} g.
Rice B costs £${priceB} for ${gramsB} g.

Which is better value per gram?`;
        const correct = costA < costB ? 'Rice A' : 'Rice B';
        const wrongs = makeWrongAnswers(correct, ['Rice A', 'Rice B', 'Both are the same']);
        const explanation = `Step 1: Cost per gram.

Step 2: Rice A: £${priceA} ÷ ${gramsA} = £${costA.toFixed(4)} per g.

Step 3: Rice B: £${priceB} ÷ ${gramsB} = £${costB.toFixed(4)} per g.

Step 4: Lower cost per gram is better value.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 3, est: 210 };
      },
    ];

    const higherPatterns = [
      () => {
        const priceA = randInt(rng, 8, 16);
        const litresA = pick(rng, [1.2, 1.5, 1.8, 2.0]);
        const priceB = randInt(rng, 9, 18);
        const litresB = pick(rng, [1.0, 1.3, 1.6, 2.1]);
        const unitA = priceA / litresA;
        const unitB = priceB / litresB;
        const question = `Detergent A costs £${priceA} for ${litresA} L.
Detergent B costs £${priceB} for ${litresB} L.

Which is better value per litre?`;
        const correct = unitA < unitB ? 'Detergent A' : 'Detergent B';
        const wrongs = makeWrongAnswers(correct, ['Detergent A', 'Detergent B', 'Both are the same']);
        const explanation = `Step 1: Cost per litre.

Step 2: A: £${priceA} ÷ ${litresA} = £${unitA.toFixed(3)} per L.

Step 3: B: £${priceB} ÷ ${litresB} = £${unitB.toFixed(3)} per L.

Step 4: Lower cost per litre is better value.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 230 };
      },
      () => {
        const priceA = randInt(rng, 6, 12);
        const itemsA = randInt(rng, 8, 16);
        const discount = pick(rng, [10, 15, 20]);
        const priceB = randInt(rng, 5, 11);
        const itemsB = randInt(rng, 8, 16);
        const discountedA = Number((priceA * (1 - discount / 100)).toFixed(2));
        const unitA = discountedA / itemsA;
        const unitB = priceB / itemsB;
        const question = `Pack A costs £${priceA} for ${itemsA} items, with a ${discount}% discount.
Pack B costs £${priceB} for ${itemsB} items.

Which is better value per item after the discount?`;
        const correct = unitA < unitB ? 'Pack A' : 'Pack B';
        const wrongs = makeWrongAnswers(correct, ['Pack A', 'Pack B', 'Both are the same']);
        const explanation = `Step 1: Discounted cost for A: £${priceA} × ${1 - discount / 100} = £${discountedA}.

Step 2: Cost per item A = £${discountedA} ÷ ${itemsA} = £${unitA.toFixed(3)}.

Step 3: Cost per item B = £${priceB} ÷ ${itemsB} = £${unitB.toFixed(3)}.

Step 4: Lower cost per item is better value.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 4, est: 240 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  growth_decay: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const start = randInt(rng, 80, 500);
        const p = pick(rng, [5, 8, 10, 12, 15]);
        const years = randInt(rng, 2, 4);
        const factor = Math.pow(1 + p / 100, years);
        const end = Number((start * factor).toFixed(2));
        const question = `A quantity increases by ${p}% each year.

It starts at ${start}. Find its value after ${years} years.`;
        const correct = `${end}`;
        const wrongs = makeWrongAnswers(correct, [
          `${Number((start * (1 + (p / 100) * years)).toFixed(2))}`,
          `${Number((start * (1 + p / 100)).toFixed(2))}`,
          `${Number((start * factor * (1 + p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Multiplier each year = ${1 + p / 100}.

Step 2: After ${years} years: ${start} × ${1 + p / 100}^{${years}} = ${end}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 220 };
      },
      () => {
        const start = randInt(rng, 600, 1500);
        const p = pick(rng, [10, 12, 15, 20]);
        const years = randInt(rng, 2, 3);
        const factor = Math.pow(1 - p / 100, years);
        const end = Number((start * factor).toFixed(2));
        const question = `A car is worth £${start} and depreciates by ${p}% each year.

Find its value after ${years} years.`;
        const correct = `£${end}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((start * (1 - (p / 100) * years)).toFixed(2))}`,
          `£${Number((start * (1 - p / 100)).toFixed(2))}`,
          `£${Number((start * factor * (1 - p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Multiplier each year = ${1 - p / 100}.

Step 2: After ${years} years: £${start} × ${1 - p / 100}^{${years}} = £${end}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 230 };
      },
    ];

    const higherPatterns = [
      () => {
        const start = randInt(rng, 120, 380);
        const p = pick(rng, [8, 10, 12, 15]);
        const years = randInt(rng, 3, 5);
        const factor = Math.pow(1 + p / 100, years);
        const end = Number((start * factor).toFixed(2));
        const question = `A population increases by ${p}% each year.

It starts at ${start}. Find the population after ${years} years.`;
        const correct = `${end}`;
        const wrongs = makeWrongAnswers(correct, [
          `${Number((start * (1 + (p / 100) * years)).toFixed(2))}`,
          `${Number((start * (1 + p / 100)).toFixed(2))}`,
          `${Number((end / (1 + p / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Multiplier = ${1 + p / 100}.

Step 2: ${start} × ${1 + p / 100}^{${years}} = ${end}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 230 };
      },
      () => {
        const start = randInt(rng, 200, 600);
        const inc = pick(rng, [6, 8, 10]);
        const dec = pick(rng, [5, 7, 9]);
        const after = Number((start * (1 + inc / 100) * (1 - dec / 100)).toFixed(2));
        const question = `A value increases by ${inc}% and then decreases by ${dec}%.

It starts at ${start}. Find the final value.`;
        const correct = `${after}`;
        const wrongs = makeWrongAnswers(correct, [
          `${Number((start * (1 + inc / 100 - dec / 100)).toFixed(2))}`,
          `${Number((start * (1 + inc / 100)).toFixed(2))}`,
          `${Number((start * (1 - dec / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Increase: ${start} × ${1 + inc / 100} = ${Number((start * (1 + inc / 100)).toFixed(2))}.

Step 2: Decrease: ${Number((start * (1 + inc / 100)).toFixed(2))} × ${1 - dec / 100} = ${after}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 4, est: 240 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  compound_interest: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const principal = randInt(rng, 200, 1500);
        const rate = pick(rng, [2, 3, 4, 5, 6]);
        const years = randInt(rng, 2, 4);
        const total = Number((principal * Math.pow(1 + rate / 100, years)).toFixed(2));
        const question = `£${principal} is invested at ${rate}% compound interest per year.

Find the value after ${years} years.`;
        const correct = `£${total}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((principal * (1 + (rate / 100) * years)).toFixed(2))}`,
          `£${Number((principal * (1 + rate / 100)).toFixed(2))}`,
          `£${Number((total * (1 + rate / 100)).toFixed(2))}`,
        ]);
        const explanation = `Step 1: Multiplier per year = ${1 + rate / 100}.

Step 2: Value after ${years} years = ${principal} × ${1 + rate / 100}^{${years}}.

Step 3: ${principal} × ${1 + rate / 100}^{${years}} = ${total}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 4, est: 260 };
      },
      () => {
        const principal = randInt(rng, 300, 1200);
        const rate = pick(rng, [2, 3, 4, 5]);
        const years = randInt(rng, 2, 3);
        const total = Number((principal * Math.pow(1 + rate / 100, years)).toFixed(2));
        const interest = Number((total - principal).toFixed(2));
        const question = `£${principal} is invested at ${rate}% compound interest per year.

How much interest is earned after ${years} years?`;
        const correct = `£${interest}`;
        const wrongs = makeWrongAnswers(correct, [
          `£${Number((principal * (rate / 100)).toFixed(2))}`,
          `£${Number((principal * (rate / 100) * years).toFixed(2))}`,
          `£${total}`,
        ]);
        const explanation = `Step 1: Total value = £${principal} × ${1 + rate / 100}^{${years}} = £${total}.

Step 2: Interest = total − principal = £${total} − £${principal} = £${interest}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 4, est: 260 };
      },
    ];

    const pool = tier === 'Higher Tier' ? foundationPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  direct_inverse: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const x1 = randInt(rng, 2, 10);
        const y1 = randInt(rng, 6, 30);
        const k = x1 * y1;
        const x2 = randInt(rng, 2, 12);
        const y2 = k / x2;
        const question = `y is inversely proportional to x.

When x = ${x1}, y = ${y1}.

Find y when x = ${x2}.`;
        const correct = Number.isInteger(y2) ? `${y2}` : fracLatex(k, x2);
        const wrongs = makeWrongAnswers(correct, [`${k * x2}`, `${k / (x2 + 1)}`, `${(y1 / x1) * x2}`]);
        const explanation = `Step 1: Inverse proportion means y = \\frac{k}{x}.

Step 2: ${y1} = \\frac{k}{${x1}} so k = ${x1} × ${y1} = ${k}.

Step 3: y = \\frac{${k}}{${x2}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 230 };
      },
      () => {
        const x1 = randInt(rng, 3, 9);
        const y1 = randInt(rng, 8, 24);
        const k = x1 * y1;
        const y2 = randInt(rng, 6, 18);
        const x2 = k / y2;
        const question = `y is inversely proportional to x.

When x = ${x1}, y = ${y1}.

Find x when y = ${y2}.`;
        const correct = Number.isInteger(x2) ? `${x2}` : fracLatex(k, y2);
        const wrongs = makeWrongAnswers(correct, [`${k * y2}`, `${k / (y2 + 1)}`, `${(y1 / x1) * y2}`]);
        const explanation = `Step 1: y = \\frac{k}{x}.

Step 2: ${y1} = \\frac{k}{${x1}} so k = ${k}.

Step 3: ${y2} = \\frac{k}{x} so x = \\frac{${k}}{${y2}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 230 };
      },
    ];

    const higherPatterns = [
      () => {
        const x1 = randInt(rng, 4, 10);
        const y1 = randInt(rng, 12, 30);
        const k = x1 * y1;
        const x2 = randInt(rng, 3, 12);
        const y2 = k / x2;
        const question = `y is inversely proportional to x.

When x = ${x1}, y = ${y1}. Find k, then find y when x = ${x2}.`;
        const correct = Number.isInteger(y2) ? `${y2}` : fracLatex(k, x2);
        const wrongs = makeWrongAnswers(correct, [`${k}`, `${k * x2}`, `${k / (x2 + 1)}`]);
        const explanation = `Step 1: y = \\frac{k}{x} so k = ${x1} × ${y1} = ${k}.

Step 2: y = \\frac{${k}}{${x2}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 240 };
      },
      () => {
        const x1 = randInt(rng, 3, 8);
        const y1 = randInt(rng, 10, 28);
        const k = x1 * y1;
        const x2 = randInt(rng, 5, 12);
        const y2 = k / x2;
        const question = `y is inversely proportional to x.

When x = ${x1}, y = ${y1}.

Find y when x is increased to ${x2}.`;
        const correct = Number.isInteger(y2) ? `${y2}` : fracLatex(k, x2);
        const wrongs = makeWrongAnswers(correct, [`${k * x2}`, `${k / (x2 + 1)}`, `${(y1 / x1) * x2}`]);
        const explanation = `Step 1: k = ${x1} × ${y1} = ${k}.

Step 2: y = \\frac{${k}}{${x2}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 240 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  similarity_scale: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const scale = randInt(rng, 2, 6);
        const length = randInt(rng, 4, 18);
        const newLen = length * scale;
        const question = `A shape is enlarged by scale factor ${scale}.

A length on the original shape is ${length} cm. What is the new length?`;
        const correct = `${newLen} cm`;
        const wrongs = makeWrongAnswers(correct, [`${length + scale} cm`, `${length / scale} cm`, `${newLen * scale} cm`]);
        const explanation = `Step 1: Multiply lengths by the scale factor ${scale}.

Step 2: ${length} × ${scale} = ${newLen}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
      },
      () => {
        const scale = randInt(rng, 2, 5);
        const newLen = randInt(rng, 12, 30);
        const orig = newLen / scale;
        const question = `A shape is enlarged by scale factor ${scale}.

A length on the new shape is ${newLen} cm. What was the original length?`;
        const correct = `${orig} cm`;
        const wrongs = makeWrongAnswers(correct, [`${newLen * scale} cm`, `${newLen + scale} cm`, `${newLen - scale} cm`]);
        const explanation = `Step 1: Enlargement multiplies lengths by ${scale}.

Step 2: Original length = ${newLen} ÷ ${scale} = ${orig}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
      },
    ];

    const higherPatterns = [
      () => {
        const scale = randInt(rng, 2, 4);
        const area = randInt(rng, 20, 60);
        const newArea = area * scale * scale;
        const question = `A shape is enlarged by scale factor ${scale}.

The original area is ${area} cm^2. Find the new area.`;
        const correct = `${newArea} cm^2`;
        const wrongs = makeWrongAnswers(correct, [`${area * scale} cm^2`, `${area / scale} cm^2`, `${newArea / scale} cm^2`]);
        const explanation = `Step 1: Area scale factor = ${scale}^2 = ${scale * scale}.

Step 2: New area = ${area} × ${scale * scale} = ${newArea}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
      () => {
        const scale = randInt(rng, 2, 3);
        const volume = randInt(rng, 30, 90);
        const newVol = volume * scale ** 3;
        const question = `A solid is enlarged by scale factor ${scale}.

The original volume is ${volume} cm^3. Find the new volume.`;
        const correct = `${newVol} cm^3`;
        const wrongs = makeWrongAnswers(correct, [`${volume * scale} cm^3`, `${volume * scale * scale} cm^3`, `${newVol / scale} cm^3`]);
        const explanation = `Step 1: Volume scale factor = ${scale}^3 = ${scale ** 3}.

Step 2: New volume = ${volume} × ${scale ** 3} = ${newVol}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 210 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  // GEOMETRY
  shapes: (rng, tier, calc, v) => {
      const foundationPatterns = [
        () => {
          const l = randInt(rng, 4, 12);
          const w = randInt(rng, 3, 10);
          const h = randInt(rng, 2, 8);
          const question = `A cuboid has length ${l} cm, width ${w} cm and height ${h} cm.

How many vertices does the cuboid have?`;
          const correct = `8`;
          const wrongs = makeWrongAnswers(correct, ['6', '10', '12']);
          const explanation = `Step 1: Any cuboid has 8 corner points (vertices).

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l, w, h });
          const imageAlt = `Cuboid with length ${l} cm, width ${w} cm, height ${h} cm`;
          return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 70, imageSvg, imageAlt };
        },
        () => {
          const shapes = [
            { name: 'Cylinder', curved: 1, circular: 2, desc: 'A tin can has radius r and height h.' },
            { name: 'Cone', curved: 1, circular: 1, desc: 'A party hat has radius r and slant height s.' },
            { name: 'Sphere', curved: 1, circular: 0, desc: 'A ball has radius r.' },
          ];
          const choice = pick(rng, shapes);
          const r = randInt(rng, 3, 9);
          const h = randInt(rng, 6, 14);
          const question = `${choice.desc.replace('r', `${r} cm`).replace('h', `${h} cm`).replace('s', `${h} cm`)}

Which 3D shape is it?`;
          const correct = choice.name;
          const wrongs = makeWrongAnswers(correct, ['Cylinder', 'Cone', 'Sphere', 'Cube']);
          const explanation = `Step 1: A ${choice.name.toLowerCase()} has ${choice.curved} curved surface(s) and ${choice.circular} circular face(s).

Final answer: ${correct}`;
          return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 80 };
        },
        () => {
          const side = pick(rng, [4, 5, 6, 7, 8]);
          const total = 12 * side;
          const question = `A cube has side length ${side} cm.

Find the total length of all its edges.`;
          const correct = `${total} cm`;
          const wrongs = makeWrongAnswers(correct, [`${6 * side} cm`, `${8 * side} cm`, `${24 * side} cm`]);
          const explanation = `Step 1: A cube has 12 edges.

Step 2: Total edge length = 12 × ${side} = ${total}.

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l: side, w: side, h: side });
          const imageAlt = `Cube with side ${side} cm`;
          return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 110, imageSvg, imageAlt };
        },
        () => {
          const l = pick(rng, [4, 6, 8, 10, 12]);
          const w = pick(rng, [3, 5, 7, 9]);
          const h = pick(rng, [2, 4, 6]);
          const total = 4 * (l + w + h);
          const question = `A cuboid has length ${l} cm, width ${w} cm and height ${h} cm.

Find the total length of all its edges.`;
          const correct = `${total} cm`;
          const wrongs = makeWrongAnswers(correct, [`${2 * (l + w + h)} cm`, `${l + w + h} cm`, `${8 * (l + w + h)} cm`]);
          const explanation = `Step 1: A cuboid has 4 edges of each dimension.

Step 2: Total edge length = 4(${l} + ${w} + ${h}) = ${total}.

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l, w, h });
          const imageAlt = `Cuboid with length ${l} cm, width ${w} cm, height ${h} cm`;
          return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120, imageSvg, imageAlt };
        },
        () => {
          const solids = [
            { name: 'Cube', faces: 6, edges: 12 },
            { name: 'Triangular prism', faces: 5, edges: 9 },
            { name: 'Tetrahedron', faces: 4, edges: 6 },
            { name: 'Square-based pyramid', faces: 5, edges: 8 },
          ];
          const choice = pick(rng, solids);
          const edgeLen = randInt(rng, 3, 12);
          const question = `A solid has ${choice.faces} faces and ${choice.edges} edges.

One of its edges is ${edgeLen} cm.

Which solid is it?`;
          const correct = choice.name;
          const wrongs = makeWrongAnswers(correct, solids.map((s) => s.name));
          const explanation = `Step 1: Match the faces and edges to a known solid.

Final answer: ${correct}`;
          return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
        },
      ];

      const higherPatterns = [
        () => {
          const solids = [
            { name: 'Triangular prism', faces: 5, edges: 9 },
            { name: 'Square-based pyramid', faces: 5, edges: 8 },
            { name: 'Cube', faces: 6, edges: 12 },
            { name: 'Tetrahedron', faces: 4, edges: 6 },
          ];
          const choice = pick(rng, solids);
          const edgeLen = randInt(rng, 4, 14);
          const question = `A solid has ${choice.faces} faces and ${choice.edges} edges.

One edge measures ${edgeLen} cm.

Which solid is it?`;
          const correct = choice.name;
          const wrongs = makeWrongAnswers(correct, solids.map((s) => s.name));
          const explanation = `Step 1: Match the faces and edges to a known solid.

Final answer: ${correct}`;
          return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 150 };
        },
        () => {
          const side = randInt(rng, 3, 14);
          const total = side * 12;
          const question = `The total length of all the edges of a cube is ${total} cm.

Find the length of one edge.`;
          const correct = `${side} cm`;
          const wrongs = makeWrongAnswers(correct, [`${total / 6} cm`, `${total / 8} cm`, `${total / 24} cm`]);
          const explanation = `Step 1: A cube has 12 edges.

Step 2: side = ${total} ÷ 12 = ${side}.

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l: side, w: side, h: side });
          const imageAlt = `Cube with side ${side} cm`;
          return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 180, imageSvg, imageAlt };
        },
        () => {
          const l = pick(rng, [6, 8, 10, 12]);
          const w = pick(rng, [4, 5, 7]);
          const h = pick(rng, [3, 4, 6]);
          const total = 4 * (l + w + h);
          const question = `A cuboid has total edge length ${total} cm.

If length = ${l} cm and width = ${w} cm, find the height.`;
          const hCalc = total / 4 - l - w;
          const correct = `${hCalc} cm`;
          const wrongs = makeWrongAnswers(correct, [`${hCalc + 1} cm`, `${hCalc + 2} cm`, `${total / 4} cm`]);
          const explanation = `Step 1: Total edge length = 4(l + w + h).

Step 2: ${total} ÷ 4 = ${l} + ${w} + h = ${total / 4}.

Step 3: h = ${total / 4} − ${l} − ${w} = ${hCalc}.

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l, w, h: hCalc });
          const imageAlt = `Cuboid with length ${l} cm and width ${w} cm`;
          return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 190, imageSvg, imageAlt };
        },
        () => {
          const l = randInt(rng, 5, 11);
          const w = randInt(rng, 4, 9);
          const h = randInt(rng, 3, 8);
          const question = `A cuboid has length ${l} cm, width ${w} cm and height ${h} cm.

It has 8 vertices and 12 edges.

How many faces does it have?`;
          const correct = `6`;
          const wrongs = makeWrongAnswers(correct, ['5', '8', '12']);
          const explanation = `Step 1: A cuboid has 6 rectangular faces.

Final answer: ${correct}`;
          const imageSvg = svgCuboid({ l, w, h });
          const imageAlt = `Cuboid with length ${l} cm, width ${w} cm, height ${h} cm`;
          return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 90, imageSvg, imageAlt };
        },
      ];

      const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
      return pool[v % pool.length]();
  },

  perimeter_area: (rng, tier, calc, v) => {
    const w = randInt(rng, 3, 18);
    const h = randInt(rng, 3, 18);
    const question = v % 2 === 0
      ? `A rectangle has width ${w} cm and height ${h} cm.

Find the perimeter.`
      : `A rectangle has width ${w} cm and height ${h} cm.

Find the area.`;
    const correct = v % 2 === 0 ? `${2 * (w + h)} cm` : `${w * h} cm^2`;
    const wrongs = v % 2 === 0
      ? makeWrongAnswers(correct, [`${w + h} cm`, `${w * h} cm`, `${2 * w + h} cm`])
      : makeWrongAnswers(correct, [`${2 * (w + h)} cm^2`, `${w + h} cm^2`, `${w * h * 2} cm^2`]);
    const explanation = v % 2 === 0
      ? `Step 1: Perimeter of a rectangle = 2(width + height).

Step 2: 2(${w} + ${h}) = ${2 * (w + h)}.

Final answer: ${correct}`
      : `Step 1: Area of a rectangle = width \\times height.

Step 2: ${w} \\times ${h} = ${w * h}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 90 };
  },

  area_volume: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        let base = randInt(rng, 6, 18);
        const height = randInt(rng, 4, 14);
        if (base % 2 !== 0) base += 1;
        const area = (base * height) / 2;
        const question = `A triangle has base ${base} cm and height ${height} cm.

Find its area.`;
        const correct = `${area} cm^2`;
        const wrongs = makeWrongAnswers(correct, [`${base * height} cm^2`, `${area + height} cm^2`, `${area - 2} cm^2`]);
        const explanation = `Step 1: Area of a triangle = \\frac{1}{2} \\times base \\times height.

Step 2: \\frac{1}{2} \\times ${base} \\times ${height} = ${area}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
      },
      () => {
        let a = randInt(rng, 6, 16);
        let b = randInt(rng, 6, 16);
        const h = randInt(rng, 4, 12);
        if ((a + b) % 2 !== 0) b += 1;
        const area = ((a + b) / 2) * h;
        const question = `A trapezium has parallel sides ${a} cm and ${b} cm, and height ${h} cm.

Find its area.`;
        const correct = `${area} cm^2`;
        const wrongs = makeWrongAnswers(correct, [`${(a + b) * h} cm^2`, `${area + h} cm^2`, `${area - 4} cm^2`]);
        const explanation = `Step 1: Area of a trapezium = \\frac{1}{2}(a + b) \\times h.

Step 2: \\frac{1}{2}(${a} + ${b}) \\times ${h} = ${area}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 3, est: 170 };
      },
      () => {
        const r = randInt(rng, 3, 20);
        const question = `A circle has radius ${r} cm.

Find its area in terms of \\pi.`;
        const correct = `${r * r}\\pi\\,\\text{cm}^2`;
        const wrongs = makeWrongAnswers(correct, [`${2 * r}\\pi\\,\\text{cm}^2`, `${r}\\pi\\,\\text{cm}^2`, `${(r + 1) * (r + 1)}\\pi\\,\\text{cm}^2`]);
        const explanation = `Step 1: Area of a circle = \\pi r^2.

Step 2: = \\pi × ${r}^2 = ${r * r}\\pi.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140, imageSvg, imageAlt };
      },
      () => {
        const d = randInt(rng, 8, 40);
        const r = d / 2;
        const question = `A circle has diameter ${d} cm.

Find its area in terms of \\pi.`;
        const correct = `${r * r}\\pi\\,\\text{cm}^2`;
        const wrongs = makeWrongAnswers(correct, [`${d}\\pi\\,\\text{cm}^2`, `${r}\\pi\\,\\text{cm}^2`, `${(r + 2) * (r + 2)}\\pi\\,\\text{cm}^2`]);
        const explanation = `Step 1: Radius = diameter ÷ 2 = ${d} ÷ 2 = ${r}.

Step 2: Area = \\pi r^2 = \\pi × ${r}^2 = ${r * r}\\pi.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with diameter ${d} cm`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 150, imageSvg, imageAlt };
      },
      () => {
        const r = randInt(rng, 5, 18);
        const area = `${r * r}\\pi\\,\\text{cm}^2`;
        const question = `A circle has area ${area}.

Find its radius.`;
        const correct = `${r} cm`;
        const wrongs = makeWrongAnswers(correct, [`${2 * r} cm`, `${r + 2} cm`, `${r - 1} cm`]);
        const explanation = `Step 1: Area = \\pi r^2.

Step 2: r^2 = ${r * r}, so r = ${r}.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160, imageSvg, imageAlt };
      },
    ];

    return patterns[v % patterns.length]();
  },

  angles: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const a = randInt(rng, 20, 110);
        const b = randInt(rng, 20, 110);
        const c = 180 - a - b;
        const question = `Two angles in a triangle are ${a}° and ${b}°.

Find the third angle.`;
        const correct = `${c}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - a}°`, `${180 - b}°`, `${a + b}°`]);
        const explanation = `Step 1: Angles in a triangle add to 180°.

Step 2: Third angle = 180° - ${a}° - ${b}° = ${c}°.

Final answer: ${correct}`;
        const imageSvg = svgTriangleAngles({ a, b });
        const imageAlt = `Triangle with angles ${a}° and ${b}° marked`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 80, imageSvg, imageAlt };
      },
      () => {
        const a = randInt(rng, 25, 155);
        const b = 180 - a;
        const question = `Two angles on a straight line are ${a}° and x°.

Find x.`;
        const correct = `${b}°`;
        const wrongs = makeWrongAnswers(correct, [`${a}°`, `${a + 10}°`, `${b + 10}°`]);
        const explanation = `Step 1: Angles on a straight line add to 180°.

Step 2: x = 180° - ${a}° = ${b}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 80 };
      },
      () => {
        const a = randInt(rng, 60, 120);
        const b = randInt(rng, 40, 100);
        const c = randInt(rng, 30, 80);
        const d = 360 - a - b - c;
        const question = `Angles around a point are ${a}°, ${b}°, ${c}° and x°.

Find x.`;
        const correct = `${d}°`;
        const wrongs = makeWrongAnswers(correct, [`${a + b}°`, `${180 - a}°`, `${d + 10}°`]);
        const explanation = `Step 1: Angles around a point add to 360°.

Step 2: x = 360° - (${a}° + ${b}° + ${c}°) = ${d}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 110 };
      },
      () => {
        const a = randInt(rng, 25, 155);
        const question = `Two lines cross. One angle is ${a}°.

Find the vertically opposite angle.`;
        const correct = `${a}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - a}°`, `${a + 10}°`, `${a - 10}°`]);
        const explanation = `Step 1: Vertically opposite angles are equal.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 70 };
      },
      () => {
        const a = randInt(rng, 30, 150);
        const question = `Two parallel lines are cut by a transversal. One corresponding angle is ${a}°.

Find the other corresponding angle.`;
        const correct = `${a}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - a}°`, `${a + 15}°`, `${a - 15}°`]);
        const explanation = `Step 1: Corresponding angles in parallel lines are equal.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 80 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  polygons: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const n = randInt(rng, 5, 20);
        const sum = (n - 2) * 180;
        const question = `Find the sum of the interior angles of a ${n}-sided polygon.`;
        const correct = `${sum}°`;
        const wrongs = makeWrongAnswers(correct, [`${(n - 1) * 180}°`, `${n * 180}°`, `${(n - 2) * 90}°`]);
        const explanation = `Step 1: Sum of interior angles = (n - 2) \\times 180.

Step 2: (${n} - 2) \\times 180 = ${sum}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 150 };
      },
      () => {
        const n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]);
        const sum = (n - 2) * 180;
        const interior = sum / n;
        const question = `A regular ${n}-sided polygon.

Find the size of each interior angle.`;
        const correct = `${interior}°`;
        const wrongs = makeWrongAnswers(correct, [`${sum}°`, `${360 / n}°`, `${(n - 2) * 90}°`]);
        const explanation = `Step 1: Sum of interior angles = (n - 2) \\times 180.

Step 2: = (${n} - 2) \\times 180 = ${sum}.

Step 3: Regular polygon means all angles equal, so each = ${sum} \\div ${n} = ${interior}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
      () => {
        const n = pick(rng, [4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]);
        const exterior = 360 / n;
        const question = `A regular ${n}-sided polygon.

Find the size of each exterior angle.`;
        const correct = `${exterior}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - exterior}°`, `${360 - exterior}°`, `${(n - 2) * 180}°`]);
        const explanation = `Step 1: Sum of exterior angles = 360°.

Step 2: Each exterior angle = 360° ÷ ${n} = ${exterior}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]);
        const interior = 180 - 360 / n;
        const question = `A regular polygon has each interior angle ${interior}°.

How many sides does it have?`;
        const correct = `${n}`;
        const wrongs = makeWrongAnswers(correct, [`${n + 1}`, `${n - 1}`, `${n + 2}`]);
        const explanation = `Step 1: Interior angle = 180° - \\frac{360°}{n}.

Step 2: ${interior} = 180 - \\frac{360}{n} gives n = ${n}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 190 };
      },
      () => {
        const n = pick(rng, [4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]);
        const exterior = 360 / n;
        const question = `A regular polygon has each exterior angle ${exterior}°.

How many sides does it have?`;
        const correct = `${n}`;
        const wrongs = makeWrongAnswers(correct, [`${n + 1}`, `${n - 2}`, `${n + 3}`]);
        const explanation = `Step 1: Exterior angle = \\frac{360°}{n}.

Step 2: ${exterior} = \\frac{360}{n} gives n = ${n}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 190 };
      },
      () => {
        const n = randInt(rng, 5, 20);
        const sum = (n - 2) * 180;
        const question = `The sum of the interior angles of a polygon is ${sum}°.

How many sides does the polygon have?`;
        const correct = `${n}`;
        const wrongs = makeWrongAnswers(correct, [`${n + 1}`, `${n - 1}`, `${n + 2}`]);
        const explanation = `Step 1: Sum of interior angles = (n - 2) \\times 180.

Step 2: ${sum} = (n - 2) \\times 180 gives n = ${n}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  pythagoras: (rng, tier, calc, v) => {
    const triples = [
      [3, 4, 5],
      [5, 12, 13],
      [6, 8, 10],
      [7, 24, 25],
      [8, 15, 17],
      [9, 12, 15],
      [9, 40, 41],
      [10, 24, 26],
      [12, 16, 20],
    ];
    const scale = pick(rng, [1, 1, 1, 2, 3]);
    const [a0, b0, c0] = pick(rng, triples);
    const a = a0 * scale;
    const b = b0 * scale;
    const c = c0 * scale;

    const patterns = [
      () => {
        const question = `A right-angled triangle has perpendicular sides ${a} cm and ${b} cm.

Find the length of the hypotenuse.`;
        const correct = `\\sqrt{${a * a + b * b}} cm`;
        const wrongs = makeWrongAnswers(correct, [`${a + b} cm`, `\\sqrt{${Math.abs(a * a - b * b)}} cm`, `\\sqrt{${a * a + b * b + 1}} cm`]);
        const explanation = `Step 1: Use Pythagoras: c^2 = a^2 + b^2.

Step 2: c^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${a * a + b * b}.

Step 3: c = \\sqrt{${a * a + b * b}}.

Final answer: ${correct}`;
        const imageSvg = svgRightTriangle({
          baseLabel: `${b} cm`,
          heightLabel: `${a} cm`,
          hypLabel: 'x cm',
          angleLabel: '90°',
        });
        const imageAlt = `Right-angled triangle with legs ${a} cm and ${b} cm`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
      },
      () => {
        const question = `A right-angled triangle has hypotenuse ${c} cm and one perpendicular side ${a} cm.

Find the length of the other perpendicular side.`;
        const correct = `${b} cm`;
        const wrongs = makeWrongAnswers(correct, [`${c - a} cm`, `${c + a} cm`, `${a * a + b} cm`]);
        const explanation = `Step 1: Use Pythagoras: a^2 + b^2 = c^2.

Step 2: b^2 = ${c}^2 - ${a}^2 = ${c * c - a * a}.

Step 3: b = ${b}.

Final answer: ${correct}`;
        const imageSvg = svgRightTriangle({
          baseLabel: 'x cm',
          heightLabel: `${a} cm`,
          hypLabel: `${c} cm`,
          angleLabel: '90°',
        });
        const imageAlt = `Right-angled triangle with hypotenuse ${c} cm and one leg ${a} cm`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
      },
      () => {
        const x1 = randInt(rng, -8, 3);
        const y1 = randInt(rng, -6, 2);
        const dx = randInt(rng, 3, 10);
        const dy = randInt(rng, 3, 10);
        const x2 = x1 + dx;
        const y2 = y1 + dy;
        const dist2 = dx * dx + dy * dy;
        const question = `Find the distance between the points A(${x1}, ${y1}) and B(${x2}, ${y2}).`;
        const correct = `\\sqrt{${dist2}}`;
        const wrongs = makeWrongAnswers(correct, [`${dx + dy}`, `\\sqrt{${Math.abs(dx * dx - dy * dy)}}`, `\\sqrt{${dist2 + 1}}`]);
        const explanation = `Step 1: Horizontal change = ${dx}, vertical change = ${dy}.

Step 2: Distance^2 = ${dx}^2 + ${dy}^2 = ${dx * dx} + ${dy * dy} = ${dist2}.

Step 3: Distance = \\sqrt{${dist2}}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 190 };
      },
      () => {
        const len = randInt(rng, 6, 18);
        const wid = randInt(rng, 4, len - 1);
        const diag2 = len * len + wid * wid;
        const question = `A rectangle is ${len} cm by ${wid} cm.

Find the length of its diagonal.`;
        const correct = `\\sqrt{${diag2}} cm`;
        const wrongs = makeWrongAnswers(correct, [`${len + wid} cm`, `\\sqrt{${Math.abs(len * len - wid * wid)}} cm`, `${len * wid} cm`]);
        const explanation = `Step 1: The diagonal forms the hypotenuse of a right-angled triangle.

Step 2: d^2 = ${len}^2 + ${wid}^2 = ${len * len} + ${wid * wid} = ${diag2}.

Step 3: d = \\sqrt{${diag2}}.

Final answer: ${correct}`;
        const imageSvg = svgRightTriangle({
          baseLabel: `${len} cm`,
          heightLabel: `${wid} cm`,
          hypLabel: 'x cm',
          angleLabel: '90°',
        });
        const imageAlt = `Right-angled triangle representing a rectangle ${len} cm by ${wid} cm`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
      },
      () => {
        const ladder = c;
        const height = a;
        const base = b;
        const question = `A ladder of length ${ladder} m leans against a wall.

The top of the ladder is ${height} m above the ground.

How far is the base of the ladder from the wall?`;
        const correct = `${base} m`;
        const wrongs = makeWrongAnswers(correct, [`${ladder - height} m`, `${ladder + height} m`, `${height} m`]);
        const explanation = `Step 1: Use Pythagoras: base^2 + height^2 = ladder^2.

Step 2: base^2 = ${ladder}^2 - ${height}^2 = ${ladder * ladder - height * height}.

Step 3: base = ${base}.

Final answer: ${correct}`;
        const imageSvg = svgRightTriangle({
          baseLabel: 'x m',
          heightLabel: `${height} m`,
          hypLabel: `${ladder} m`,
          angleLabel: '90°',
        });
        const imageAlt = `Right-angled triangle with height ${height} m and hypotenuse ${ladder} m`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
      },
    ];

    return patterns[v % patterns.length]();
  },

  trigonometry: (rng, tier, calc, v) => {
    const isCalc = calc === 'Calculator';
    const ratioAnswer = (num, den) => {
      const f = simplifyFraction(num, den);
      return fracLatex(f.n, f.d);
    };
    const triples = [
      [3, 4, 5],
      [5, 12, 13],
      [6, 8, 10],
      [7, 24, 25],
      [8, 15, 17],
      [9, 12, 15],
      [9, 40, 41],
      [10, 24, 26],
      [12, 16, 20],
    ];
    const scale = pick(rng, [1, 1, 1, 2, 3]);
    const [oppBase, adjBase, hypBase] = pick(rng, triples);
    const oppT = oppBase * scale;
    const adjT = adjBase * scale;
    const hypT = hypBase * scale;

    const ratioSin = () => {
      const question = `In a right-angled triangle, the side opposite angle A is ${oppT} cm and the hypotenuse is ${hypT} cm.

Find \\sin A.`;
      const correct = ratioAnswer(oppT, hypT);
      const wrongs = makeWrongAnswers(correct, [ratioAnswer(hypT, oppT), ratioAnswer(oppT, hypT - 1), ratioAnswer(oppT + 1, hypT)]);
      const explanation = `Step 1: \\sin A = \\frac{opposite}{hypotenuse}.

Step 2: \\sin A = \\frac{${oppT}}{${hypT}} = ${correct}.

Final answer: ${correct}`;
      const imageSvg = svgRightTriangle({
        baseLabel: 'adj',
        heightLabel: `opp = ${oppT} cm`,
        hypLabel: `hyp = ${hypT} cm`,
        angleLabel: 'A',
        angleAt: 'br',
        rightAngleLabel: '90°',
      });
      const imageAlt = `Right-angled triangle with opposite ${oppT} cm and hypotenuse ${hypT} cm`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 2, est: 180, imageSvg, imageAlt };
    };

    const ratioCos = () => {
      const question = `In a right-angled triangle, the side adjacent to angle A is ${adjT} cm and the hypotenuse is ${hypT} cm.

Find \\cos A.`;
      const correct = ratioAnswer(adjT, hypT);
      const wrongs = makeWrongAnswers(correct, [ratioAnswer(hypT, adjT), ratioAnswer(adjT, hypT - 1), ratioAnswer(adjT + 1, hypT)]);
      const explanation = `Step 1: \\cos A = \\frac{adjacent}{hypotenuse}.

Step 2: \\cos A = \\frac{${adjT}}{${hypT}} = ${correct}.

Final answer: ${correct}`;
      const imageSvg = svgRightTriangle({
        baseLabel: `adj = ${adjT} cm`,
        heightLabel: 'opp',
        hypLabel: `hyp = ${hypT} cm`,
        angleLabel: 'A',
        angleAt: 'br',
        rightAngleLabel: '90°',
      });
      const imageAlt = `Right-angled triangle with adjacent ${adjT} cm and hypotenuse ${hypT} cm`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 2, est: 180, imageSvg, imageAlt };
    };

    const ratioTan = () => {
      const question = `In a right-angled triangle, the side opposite angle A is ${oppT} cm and the side adjacent to angle A is ${adjT} cm.

Find \\tan A.`;
      const correct = ratioAnswer(oppT, adjT);
      const wrongs = makeWrongAnswers(correct, [ratioAnswer(adjT, oppT), ratioAnswer(oppT + 1, adjT), ratioAnswer(oppT, adjT + 1)]);
      const explanation = `Step 1: \\tan A = \\frac{opposite}{adjacent}.

Step 2: \\tan A = \\frac{${oppT}}{${adjT}} = ${correct}.

Final answer: ${correct}`;
      const imageSvg = svgRightTriangle({
        baseLabel: `adj = ${adjT} cm`,
        heightLabel: `opp = ${oppT} cm`,
        hypLabel: 'hyp',
        angleLabel: 'A',
        angleAt: 'br',
        rightAngleLabel: '90°',
      });
      const imageAlt = `Right-angled triangle with opposite ${oppT} cm and adjacent ${adjT} cm`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 2, est: 180, imageSvg, imageAlt };
    };

    const calcFindOpp = () => {
      const hyp = randInt(rng, 10, 25);
      const angle = pick(rng, [25, 30, 35, 40, 50, 55]);
      const opp = hyp * Math.sin((angle * Math.PI) / 180);
      const ans = trimLongDecimal(opp.toFixed(1));
      const question = `A right-angled triangle has hypotenuse ${hyp} cm and angle A = ${angle}°.

Find the length of the side opposite angle A. Give your answer to 1 decimal place.`;
      const correct = `${ans} cm`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((opp + 1).toFixed(1))} cm`,
        `${trimLongDecimal((opp - 1).toFixed(1))} cm`,
        `${trimLongDecimal((hyp * Math.cos((angle * Math.PI) / 180)).toFixed(1))} cm`,
      ]);
      const explanation = `Step 1: \\sin A = \\frac{opposite}{hypotenuse}.

Step 2: opposite = ${hyp} \\times \\sin(${angle}°) = ${ans}.

Final answer: ${correct}`;
      const imageSvg = svgRightTriangle({
        baseLabel: 'adj',
        heightLabel: 'x cm',
        hypLabel: `hyp = ${hyp} cm`,
        angleLabel: `${angle}°`,
        angleAt: 'br',
        rightAngleLabel: '90°',
      });
      const imageAlt = `Right-angled triangle with hypotenuse ${hyp} cm and angle ${angle} degrees`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
    };

    const calcFindAngle = () => {
      const hyp = randInt(rng, 10, 25);
      const opp = randInt(rng, 4, hyp - 1);
      const angle = Math.asin(opp / hyp) * (180 / Math.PI);
      const ans = trimLongDecimal(angle.toFixed(1));
      const question = `A right-angled triangle has opposite side ${opp} cm and hypotenuse ${hyp} cm.

Find angle A. Give your answer to 1 decimal place.`;
      const correct = `${ans}°`;
      const wrongs = makeWrongAnswers(correct, [
        `${trimLongDecimal((angle + 5).toFixed(1))}°`,
        `${trimLongDecimal((angle - 5).toFixed(1))}°`,
        `${trimLongDecimal((90 - angle).toFixed(1))}°`,
      ]);
      const explanation = `Step 1: \\sin A = \\frac{opposite}{hypotenuse} = \\frac{${opp}}{${hyp}}.

Step 2: A = \\sin^{-1}\\left(\\frac{${opp}}{${hyp}}\\right) = ${ans}°.

Final answer: ${correct}`;
      const imageSvg = svgRightTriangle({
        baseLabel: 'adj',
        heightLabel: `opp = ${opp} cm`,
        hypLabel: `hyp = ${hyp} cm`,
        angleLabel: 'A',
        angleAt: 'br',
        rightAngleLabel: '90°',
      });
      const imageAlt = `Right-angled triangle with opposite ${opp} cm and hypotenuse ${hyp} cm`;
      return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 3, marks: 3, est: 200, imageSvg, imageAlt };
    };

    const nonCalcPatterns = [ratioSin, ratioCos, ratioTan];
    const calcPatterns = tier === 'Higher Tier'
      ? [ratioSin, ratioCos, ratioTan, calcFindOpp, calcFindAngle]
      : [ratioSin, ratioCos, ratioTan, calcFindOpp];

    const patterns = isCalc ? calcPatterns : nonCalcPatterns;
    return patterns[v % patterns.length]();
  },

  circles: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const r = randInt(rng, 3, 14);
        const question = `A circle has radius ${r} cm.

Find the circumference in terms of \\pi.`;
        const correct = `${2 * r}\\pi\\,\\text{cm}`;
        const wrongs = makeWrongAnswers(correct, [`${r}\\pi\\,\\text{cm}`, `${r * r}\\pi\\,\\text{cm}`, `${(2 * r + 2)}\\pi\\,\\text{cm}`]);
        const explanation = `Step 1: Circumference = 2\\pi r.

Step 2: = 2\\pi \\times ${r} = ${2 * r}\\pi.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150, imageSvg, imageAlt };
      },
      () => {
        const d = randInt(rng, 8, 30);
        const r = d / 2;
        const question = `A circle has diameter ${d} cm.

Find the circumference in terms of \\pi.`;
        const correct = `${d}\\pi\\,\\text{cm}`;
        const wrongs = makeWrongAnswers(correct, [`${r}\\pi\\,\\text{cm}`, `${2 * r}\\pi\\,\\text{cm}^2`, `${r * r}\\pi\\,\\text{cm}`]);
        const explanation = `Step 1: Circumference = \\pi d.

Step 2: = \\pi \\times ${d} = ${d}\\pi.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with diameter ${d} cm`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150, imageSvg, imageAlt };
      },
      () => {
        const r = randInt(rng, 4, 16);
        const area = r * r;
        const question = `A circle has radius ${r} cm.

Find its area in terms of \\pi.`;
        const correct = `${area}\\pi\\,\\text{cm}^2`;
        const wrongs = makeWrongAnswers(correct, [`${2 * r}\\pi\\,\\text{cm}^2`, `${area}\\pi\\,\\text{cm}`, `${r}\\pi\\,\\text{cm}^2`]);
        const explanation = `Step 1: Area = \\pi r^2.

Step 2: = \\pi \\times ${r}^2 = ${area}\\pi.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160, imageSvg, imageAlt };
      },
      () => {
        const r = randInt(rng, 4, 14);
        const c = 2 * r;
        const question = `A circle has circumference ${c}\\pi\\,\\text{cm}.

Find its radius.`;
        const correct = `${r} cm`;
        const wrongs = makeWrongAnswers(correct, [`${c} cm`, `${r / 2} cm`, `${r + 2} cm`]);
        const explanation = `Step 1: Circumference = 2\\pi r.

Step 2: ${c}\\pi = 2\\pi r, so r = ${c} ÷ 2 = ${r}.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 170, imageSvg, imageAlt };
      },
      () => {
        const r = randInt(rng, 5, 15);
        const area = r * r;
        const question = `A circle has area ${area}\\pi\\,\\text{cm}^2.

Find its radius.`;
        const correct = `${r} cm`;
        const wrongs = makeWrongAnswers(correct, [`${area} cm`, `${r + 2} cm`, `${r - 1} cm`]);
        const explanation = `Step 1: Area = \\pi r^2.

Step 2: r^2 = ${area}, so r = ${r}.

Final answer: ${correct}`;
        const imageSvg = svgCircleRadius({ r });
        const imageAlt = `Circle with radius ${r} cm`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 170, imageSvg, imageAlt };
      },
    ];

    return patterns[v % patterns.length]();
  },

  arcs_sectors: (rng, tier, calc, v) => {
    const r = randInt(rng, 4, 15);
    const theta = pick(rng, [30, 45, 60, 90, 120, 150]);
    const question = `A sector of a circle has radius ${r} cm and angle ${theta}°.

Find the area of the sector in terms of \\pi.`;
    const correct = `${fracLatex(theta, 360)} \\times ${r * r}\\pi\\,\\text{cm}^2`;
    const wrongs = makeWrongAnswers(correct, [`${fracLatex(theta, 180)} \\times ${r * r}\\pi\\,\\text{cm}^2`, `${fracLatex(theta, 360)} \\times ${2 * r}\\pi\\,\\text{cm}^2`, `${fracLatex(360, theta)} \\times ${r * r}\\pi\\,\\text{cm}^2`]);
    const explanation = `Step 1: Area of full circle = ${r * r}\\pi.

Step 2: Sector fraction = \\frac{${theta}}{360}.

Step 3: Sector area = \\frac{${theta}}{360} \\times ${r * r}\\pi = ${correct}.

Final answer: ${correct}`;
    const imageSvg = svgSector({ r, theta });
    const imageAlt = `Sector with radius ${r} cm and angle ${theta} degrees`;
    return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 240, imageSvg, imageAlt };
  },

  surface_area: (rng, tier, calc, v) => {
    const a = randInt(rng, 2, 10);
    const b = randInt(rng, 2, 12);
    const c = randInt(rng, 2, 14);
    const sa = 2 * (a * b + a * c + b * c);
    const question = `A cuboid has dimensions ${a} cm by ${b} cm by ${c} cm.

Find the total surface area.`;
    const correct = `${sa} cm^2`;
    const wrongs = makeWrongAnswers(correct, [`${a * b * c} cm^2`, `${2 * (a * b + a * c)} cm^2`, `${sa + 2} cm^2`]);
    const explanation = `Step 1: Surface area = 2(ab + ac + bc).

Step 2: ab = ${a * b}, ac = ${a * c}, bc = ${b * c}.

Step 3: 2(${a * b} + ${a * c} + ${b * c}) = ${sa}.

Final answer: ${correct}`;
    const imageSvg = svgCuboid({ l: a, w: b, h: c });
    const imageAlt = `Cuboid with dimensions ${a} cm, ${b} cm, ${c} cm`;
    return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 240, imageSvg, imageAlt };
  },

  volume: (rng, tier, calc, v) => {
    const l = randInt(rng, 4, 20);
    const w = randInt(rng, 3, 12);
    const h = randInt(rng, 3, 10);
    const vol = l * w * h;
    const question = `A cuboid has length ${l} cm, width ${w} cm and height ${h} cm.

Find its volume.`;
    const correct = `${vol} cm^3`;
    const wrongs = makeWrongAnswers(correct, [`${2 * (l * w + l * h + w * h)} cm^3`, `${l * w} cm^3`, `${vol + 10} cm^3`]);
    const explanation = `Step 1: Volume of a cuboid = length \\times width \\times height.

Step 2: ${l} \\times ${w} \\times ${h} = ${vol}.

Final answer: ${correct}`;
    const imageSvg = svgCuboid({ l, w, h });
    const imageAlt = `Cuboid with dimensions ${l} cm, ${w} cm, ${h} cm`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 160, imageSvg, imageAlt };
  },

  bearings: (rng, tier, calc, v) => {
    const backBearing = (b) => (b + 180) % 360;
    const patternsFoundation = [
      () => {
        const b = randInt(rng, 10, 350);
        const back = backBearing(b);
        const question = `The bearing of B from A is ${formatBearing(b)}°.

What is the bearing of A from B?`;
        const correct = `${formatBearing(back)}°`;
        const wrongs = makeWrongAnswers(correct, [`${formatBearing((back + 90) % 360)}°`, `${formatBearing((back + 270) % 360)}°`, `${formatBearing((b + 90) % 360)}°`]);
        const explanation = `Step 1: The reverse bearing is 180° different.

Step 2: ${formatBearing(b)}° + 180° = ${formatBearing(back)}°.

Final answer: ${correct}`;
        const imageSvg = svgBearing({ bearing: b });
        const imageAlt = `Compass bearing of ${formatBearing(b)} degrees`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 120, imageSvg, imageAlt };
      },
      () => {
        const n = randInt(rng, 4, 12);
        const e = n;
        const bearing = 45;
        const question = `Point B is ${e} km east and ${n} km north of A.

Find the bearing of B from A.`;
        const correct = `${formatBearing(bearing)}°`;
        const wrongs = makeWrongAnswers(correct, [`${formatBearing(315)}°`, `${formatBearing(135)}°`, `${formatBearing(225)}°`]);
        const explanation = `Step 1: Equal east and north gives a 45° angle from North.

Step 2: Bearing = 045°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
      },
      () => {
        const n = randInt(rng, 4, 12);
        const w = n;
        const bearing = 315;
        const question = `Point B is ${w} km west and ${n} km north of A.

Find the bearing of B from A.`;
        const correct = `${formatBearing(bearing)}°`;
        const wrongs = makeWrongAnswers(correct, [`${formatBearing(45)}°`, `${formatBearing(135)}°`, `${formatBearing(225)}°`]);
        const explanation = `Step 1: Equal west and north gives 45° to the west of North.

Step 2: Bearing = 315°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
      },
    ];

    const patternsHigher = [
      () => {
        const north = randInt(rng, 5, 18);
        const east = randInt(rng, 4, 16);
        const angle = (Math.atan2(east, north) * 180) / Math.PI;
        const bearing = formatBearing(angle);
        const question = `A boat travels ${north} km north and ${east} km east from A to B.

Find the bearing of B from A, to the nearest degree.`;
        const correct = `${bearing}°`;
        const wrongs = makeWrongAnswers(correct, [`${formatBearing(angle + 10)}°`, `${formatBearing(angle + 20)}°`, `${formatBearing(angle + 30)}°`]);
        const explanation = `Step 1: Bearing is measured clockwise from North.

Step 2: \\tan(\\theta) = \\frac{east}{north} = \\frac{${east}}{${north}}.

Step 3: \\theta \\approx ${Math.round(angle)}°, so bearing = ${bearing}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const north = randInt(rng, 6, 20);
        const west = randInt(rng, 4, 16);
        const angle = (Math.atan2(-west, north) * 180) / Math.PI;
        const bearing = formatBearing(angle);
        const question = `A plane travels ${north} km north and ${west} km west from A to B.

Find the bearing of B from A, to the nearest degree.`;
        const correct = `${bearing}°`;
        const wrongs = makeWrongAnswers(correct, [`${formatBearing(angle + 10)}°`, `${formatBearing(angle + 20)}°`, `${formatBearing(angle + 30)}°`]);
        const explanation = `Step 1: Bearing is measured clockwise from North.

Step 2: \\tan(\\theta) = \\frac{west}{north} = \\frac{${west}}{${north}}.

Step 3: Bearing \\approx ${bearing}° (north-west quadrant).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
      () => {
        const b = randInt(rng, 10, 350);
        const distance = randInt(rng, 5, 20);
        const question = `A ship sails ${distance} km on a bearing of ${formatBearing(b)}°.

How many km north of the starting point is it? (nearest km)`;
        const north = Math.round(distance * Math.cos((b * Math.PI) / 180));
        const correct = `${north} km`;
        const wrongs = makeWrongAnswers(correct, [`${Math.abs(north)} km`, `${Math.round(distance * Math.sin((b * Math.PI) / 180))} km`, `${Math.round(distance * 0.5)} km`]);
        const explanation = `Step 1: North component = distance \\times \\cos(\\text{bearing}).

Step 2: ${distance} \\times \\cos(${formatBearing(b)}°) \\approx ${north}.

Final answer: ${correct}`;
        const imageSvg = svgBearing({ bearing: b });
        const imageAlt = `Compass bearing of ${formatBearing(b)} degrees`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 230, imageSvg, imageAlt };
      },
    ];

    const pool = tier === 'Higher Tier' ? patternsHigher : patternsFoundation;
    return pool[v % pool.length]();
  },

  transformations: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point A(${x}, ${y}) is reflected in the y-axis.

What are the coordinates of A'?`;
        const correct = `(${-x}, ${y})`;
        const wrongs = makeWrongAnswers(correct, [`(${x}, ${-y})`, `(${-x}, ${-y})`, `(${y}, ${x})`]);
        const explanation = `Step 1: Reflection in the y-axis changes (x, y) to (-x, y).

Step 2: (${x}, ${y}) becomes (${-x}, ${y}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
      },
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point B(${x}, ${y}) is reflected in the x-axis.

What are the coordinates of B'?`;
        const correct = `(${x}, ${-y})`;
        const wrongs = makeWrongAnswers(correct, [`(${-x}, ${y})`, `(${-x}, ${-y})`, `(${y}, ${x})`]);
        const explanation = `Step 1: Reflection in the x-axis changes (x, y) to (x, -y).

Step 2: (${x}, ${y}) becomes (${x}, ${-y}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
      },
      () => {
        const x = randInt(rng, -5, 5);
        const y = randInt(rng, -5, 5);
        const a = randInt(rng, -4, 4);
        const b = randInt(rng, -4, 4);
        const question = `A point C(${x}, ${y}) is translated by vector ${vectorLatex(a, b)}.

What are the coordinates of C'?`;
        const correct = `(${x + a}, ${y + b})`;
        const wrongs = makeWrongAnswers(correct, [`(${x - a}, ${y - b})`, `(${x + b}, ${y + a})`, `(${x + a}, ${y - b})`]);
        const explanation = `Step 1: Add the vector to the coordinates.

Step 2: (${x}, ${y}) + (${a}, ${b}) = (${x + a}, ${y + b}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150 };
      },
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point D(${x}, ${y}) is rotated 90° clockwise about the origin.

What are the coordinates of D'?`;
        const correct = `(${y}, ${-x})`;
        const wrongs = makeWrongAnswers(correct, [`(${-y}, ${x})`, `(${-x}, ${-y})`, `(${x}, ${-y})`]);
        const explanation = `Step 1: A 90° clockwise rotation maps (x, y) to (y, -x).

Step 2: (${x}, ${y}) becomes (${y}, ${-x}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point H(${x}, ${y}) is rotated 180° about the origin.

What are the coordinates of H'?`;
        const correct = `(${-x}, ${-y})`;
        const wrongs = makeWrongAnswers(correct, [`(${x}, ${-y})`, `(${-x}, ${y})`, `(${y}, ${x})`]);
        const explanation = `Step 1: A 180° rotation maps (x, y) to (-x, -y).

Step 2: (${x}, ${y}) becomes (${-x}, ${-y}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const x = randInt(rng, -4, 4);
        const y = randInt(rng, -4, 4);
        const k = pick(rng, [2, 3]);
        const question = `A point J(${x}, ${y}) is enlarged by scale factor ${k} about the origin.

What are the coordinates of J'?`;
        const correct = `(${k * x}, ${k * y})`;
        const wrongs = makeWrongAnswers(correct, [`(${x + k}, ${y + k})`, `(${x * k}, ${y})`, `(${x}, ${y * k})`]);
        const explanation = `Step 1: Enlargement about the origin multiplies each coordinate by ${k}.

Step 2: (${x}, ${y}) becomes (${k * x}, ${k * y}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 170 };
      },
    ];

    const higherPatterns = [
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point E(${x}, ${y}) is reflected in the line y = x.

What are the coordinates of E'?`;
        const correct = `(${y}, ${x})`;
        const wrongs = makeWrongAnswers(correct, [`(${-y}, ${-x})`, `(${x}, ${y})`, `(${-x}, ${-y})`]);
        const explanation = `Step 1: Reflection in y = x swaps coordinates.

Step 2: (${x}, ${y}) becomes (${y}, ${x}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
      () => {
        const x = randInt(rng, -6, 6);
        const y = randInt(rng, -6, 6);
        const question = `A point F(${x}, ${y}) is rotated 90° anticlockwise about the origin.

What are the coordinates of F'?`;
        const correct = `(${-y}, ${x})`;
        const wrongs = makeWrongAnswers(correct, [`(${y}, ${-x})`, `(${-x}, ${-y})`, `(${x}, ${-y})`]);
        const explanation = `Step 1: A 90° anticlockwise rotation maps (x, y) to (-y, x).

Step 2: (${x}, ${y}) becomes (${-y}, ${x}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
      () => {
        const x1 = randInt(rng, -6, 6);
        const y1 = randInt(rng, -6, 6);
        const x2 = x1 + randInt(rng, 2, 6);
        const y2 = y1 + randInt(rng, -6, -2);
        const question = `A point moves from P(${x1}, ${y1}) to P'(${x2}, ${y2}) by a translation.

Find the translation vector.`;
        const correct = vectorLatex(x2 - x1, y2 - y1);
        const wrongs = makeWrongAnswers(correct, [
          vectorLatex(x1 - x2, y1 - y2),
          vectorLatex(x2 + x1, y2 + y1),
          vectorLatex(x2 - x1, y1 - y2),
        ]);
        const explanation = `Step 1: Vector = (change in x, change in y).

Step 2: (${x2} - ${x1}, ${y2} - ${y1}) = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 180 };
      },
      () => {
        const x = randInt(rng, -5, 5);
        const y = randInt(rng, -5, 5);
        const k = pick(rng, [2, 3, 4]);
        const question = `A point G(${x}, ${y}) is enlarged by scale factor ${k} about the origin.

What are the coordinates of G'?`;
        const correct = `(${k * x}, ${k * y})`;
        const wrongs = makeWrongAnswers(correct, [`(${x + k}, ${y + k})`, `(${x * x}, ${y * y})`, `(${x * k}, ${y})`]);
        const explanation = `Step 1: Enlargement about the origin multiplies each coordinate by ${k}.

Step 2: (${x}, ${y}) becomes (${k * x}, ${k * y}).

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
      () => {
        const x = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
        const y = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
        const k = pick(rng, [2, 3, 4]);
        const question = `A point K(${x}, ${y}) is enlarged to K'(${k * x}, ${k * y}) about the origin.

Find the scale factor.`;
        const correct = `${k}`;
        const wrongs = makeWrongAnswers(correct, [`${k + 1}`, `${k - 1}`, `${k * 2}`]);
        const explanation = `Step 1: Compare coordinates: ${k * x} ÷ ${x} = ${k}.

Step 2: Scale factor = ${k}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 190 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  constructions_loci: (rng, tier, calc, v) => {
    const foundationPatterns = [
      () => {
        const d = randInt(rng, 2, 12);
        const question = `A point P is at least ${d} cm from a fixed point A.

Which region represents all possible positions of P?`;
        const correct = `Outside (and on) a circle of radius ${d} cm centred at A`;
        const wrongs = makeWrongAnswers(correct, [
          `Inside (and on) a circle of radius ${d} cm centred at A`,
          `On a circle of radius ${d} cm centred at A only`,
          `Inside a circle of radius ${d * 2} cm centred at A`,
        ]);
        const explanation = `Step 1: “At least ${d} cm” means distance \\ge ${d} cm.

Step 2: The boundary is a circle of radius ${d} cm centred at A.

Step 3: All valid points are on or outside that circle.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
      },
      () => {
        const d = randInt(rng, 3, 12);
        const question = `A point P is exactly ${d} cm from a fixed point A.

Which region represents all possible positions of P?`;
        const correct = `On a circle of radius ${d} cm centred at A`;
        const wrongs = makeWrongAnswers(correct, [
          `Inside (and on) a circle of radius ${d} cm centred at A`,
          `Outside (and on) a circle of radius ${d} cm centred at A`,
          `On a circle of radius ${d * 2} cm centred at A`,
        ]);
        const explanation = `Step 1: “Exactly ${d} cm” means distance = ${d} cm.

Step 2: Points at a fixed distance from A form a circle.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 130 };
      },
      () => {
        const d = randInt(rng, 1, 8);
        const question = `A point P is within ${d} cm of a straight line.

Which region represents all possible positions of P?`;
        const correct = `The strip between two parallel lines ${d} cm either side of the line`;
        const wrongs = makeWrongAnswers(correct, [
          `A circle of radius ${d} cm centred on the line`,
          'Only the line itself',
          `The region outside two parallel lines ${d} cm either side of the line`,
        ]);
        const explanation = `Step 1: “Within ${d} cm” means distance \\le ${d} cm.

Step 2: The boundary is two lines parallel to the given line, each ${d} cm away.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 140 };
      },
      () => {
        const ab = randInt(rng, 4, 20);
        const question = `Points A and B are ${ab} cm apart.

Which construction gives the set of points that are equidistant from A and B?

A) Angle bisector
B) Perpendicular bisector
C) Parallel line
D) Circle centred at A`;
        const correct = `Perpendicular bisector`;
        const wrongs = makeWrongAnswers(correct, ['Angle bisector', 'Parallel line', 'Circle centred at A']);
        const explanation = `Step 1: Points equidistant from A and B lie on the perpendicular bisector of AB.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 };
      },
    ];

    const higherPatterns = [
      () => {
        const d1 = randInt(rng, 2, 6);
        const d2 = randInt(rng, 8, 15);
        const question = `A point P is between ${d1} cm and ${d2} cm from a fixed point A.

Which region represents all possible positions of P?`;
        const correct = `The region between two concentric circles of radius ${d1} cm and ${d2} cm centred at A`;
        const wrongs = makeWrongAnswers(correct, [
          `Inside a circle of radius ${d1} cm centred at A`,
          `Outside a circle of radius ${d2} cm centred at A`,
          `On a circle of radius ${d1} cm centred at A only`,
        ]);
        const explanation = `Step 1: “Between ${d1} cm and ${d2} cm” means ${d1} < distance < ${d2}.

Step 2: That forms an annulus between the two circles.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const ab = randInt(rng, 6, 20);
        const question = `Points A and B are ${ab} cm apart. A point P is closer to A than to B.

Which boundary separates the regions "closer to A" and "closer to B"?`;
        const correct = `The perpendicular bisector of AB`;
        const wrongs = makeWrongAnswers(correct, ['The line AB', 'A circle centred at A', 'An angle bisector at A']);
        const explanation = `Step 1: Points equidistant from A and B lie on the perpendicular bisector.

Step 2: That bisector forms the boundary between the two regions.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const d1 = randInt(rng, 2, 6);
        const d2 = randInt(rng, 8, 15);
        const question = `A point P is at most ${d2} cm from A and at least ${d1} cm from A.

Describe the region of possible positions of P.`;
        const correct = `The region between (and including) circles of radius ${d1} cm and ${d2} cm centred at A`;
        const wrongs = makeWrongAnswers(correct, [
          `Inside (and on) a circle of radius ${d1} cm centred at A`,
          `Outside (and on) a circle of radius ${d2} cm centred at A`,
          `On a circle of radius ${d1} cm centred at A only`,
        ]);
        const explanation = `Step 1: “At most ${d2} cm” means distance \\le ${d2}.

Step 2: “At least ${d1} cm” means distance \\ge ${d1}.

Step 3: Combine them to get a ring including both boundaries.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 200 };
      },
      () => {
        const d = randInt(rng, 2, 6);
        const line = randInt(rng, 1, 5);
        const question = `A point P is at least ${d} cm from a fixed point A and within ${line} cm of a straight line.

What region represents all possible positions of P?`;
        const correct = `The part of the ${line} cm strip that lies on or outside the circle of radius ${d} cm centred at A`;
        const wrongs = makeWrongAnswers(correct, [
          `The entire ${line} cm strip only`,
          `Inside the circle of radius ${d} cm only`,
          `The part of the strip that lies inside the circle of radius ${d} cm`,
        ]);
        const explanation = `Step 1: “Within ${line} cm of a line” gives a strip between parallel lines.

Step 2: “At least ${d} cm from A” means on or outside a circle radius ${d} cm centred at A.

Step 3: The answer is the intersection of those two regions.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 3, est: 220 };
      },
    ];

    const pool = tier === 'Higher Tier' ? higherPatterns : foundationPatterns;
    return pool[v % pool.length]();
  },

  congruence: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const side = randInt(rng, 5, 12);
        const question = `Triangles ABC and DEF are congruent.

AB corresponds to DE.

If AB = ${side} cm, what is DE?`;
        const correct = `${side} cm`;
        const wrongs = makeWrongAnswers(correct, [`${side * 2} cm`, `${side / 2} cm`, `${side + 3} cm`]);
        const explanation = `Step 1: Congruent triangles have equal corresponding sides.

Step 2: DE = AB = ${side} cm.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const angle = randInt(rng, 30, 120);
        const question = `Triangles PQR and XYZ are congruent.

Angle P corresponds to angle X.

If angle P = ${angle}°, what is angle X?`;
        const correct = `${angle}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - angle}°`, `${angle + 10}°`, `${angle - 10}°`]);
        const explanation = `Step 1: Congruent triangles have equal corresponding angles.

Step 2: angle X = angle P = ${angle}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const a = randInt(rng, 4, 10);
        const b = randInt(rng, 5, 12);
        const c = randInt(rng, 6, 13);
        const question = `Two triangles are congruent.

One triangle has sides ${a} cm, ${b} cm and ${c} cm.

What is the longest side of the other triangle?`;
        const correct = `${Math.max(a, b, c)} cm`;
        const wrongs = makeWrongAnswers(correct, [`${Math.min(a, b, c)} cm`, `${a + b} cm`, `${c + 2} cm`]);
        const explanation = `Step 1: Congruent triangles have identical side lengths.

Step 2: The longest side stays ${Math.max(a, b, c)} cm.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 110 };
      },
      () => {
        const per = randInt(rng, 18, 40);
        const question = `Two triangles are congruent.

If the perimeter of the first triangle is ${per} cm, what is the perimeter of the second triangle?`;
        const correct = `${per} cm`;
        const wrongs = makeWrongAnswers(correct, [`${per * 2} cm`, `${per - 4} cm`, `${per + 6} cm`]);
        const explanation = `Step 1: Congruent triangles have equal corresponding sides.

Step 2: Therefore their perimeters are equal.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 110 };
      },
      () => {
        const a = randInt(rng, 4, 10);
        const b = randInt(rng, 5, 12);
        const angle = randInt(rng, 30, 120);
        const question = `Triangle 1 has sides ${a} cm and ${b} cm with the included angle ${angle}°.
Triangle 2 has sides ${a} cm and ${b} cm with the included angle ${angle}°.

Which congruence condition applies?`;
        const correct = `SAS`;
        const wrongs = makeWrongAnswers(correct, ['SSS', 'ASA', 'RHS']);
        const explanation = `Step 1: Two sides and the included angle are equal.

Step 2: This is SAS.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 140 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  vectors: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const a = randInt(rng, 2, 6);
        const b = randInt(rng, 2, 6);
        const question = `If \\mathbf{a} = ${vectorLatex(a, b)}, what is 2\\mathbf{a}?`;
        const correct = vectorLatex(2 * a, 2 * b);
        const wrongs = makeWrongAnswers(correct, [
          vectorLatex(a + 2, b + 2),
          vectorLatex(a * a, b * b),
          vectorLatex(2 * a, b),
        ]);
        const explanation = `Step 1: Multiply each component by 2.

Step 2: 2\\mathbf{a} = ${vectorLatex(2 * a, 2 * b)}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 160 };
      },
      () => {
        const a1 = randInt(rng, -5, 5);
        const a2 = randInt(rng, -5, 5);
        const b1 = randInt(rng, -5, 5);
        const b2 = randInt(rng, -5, 5);
        const question = `If \\mathbf{a} = ${vectorLatex(a1, a2)} and \\mathbf{b} = ${vectorLatex(b1, b2)},
find \\mathbf{a} + \\mathbf{b}.`;
        const correct = vectorLatex(a1 + b1, a2 + b2);
        const wrongs = makeWrongAnswers(correct, [
          vectorLatex(a1 - b1, a2 - b2),
          vectorLatex(a1 + b2, a2 + b1),
          vectorLatex(a1 - b2, a2 - b1),
        ]);
        const explanation = `Step 1: Add corresponding components.

Step 2: (${a1} + ${b1}, ${a2} + ${b2}) = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
      () => {
        const a1 = randInt(rng, -6, 6);
        const a2 = randInt(rng, -6, 6);
        const b1 = randInt(rng, -6, 6);
        const b2 = randInt(rng, -6, 6);
        const question = `If \\mathbf{a} = ${vectorLatex(a1, a2)} and \\mathbf{b} = ${vectorLatex(b1, b2)},
find \\mathbf{a} - \\mathbf{b}.`;
        const correct = vectorLatex(a1 - b1, a2 - b2);
        const wrongs = makeWrongAnswers(correct, [
          vectorLatex(a1 + b1, a2 + b2),
          vectorLatex(b1 - a1, b2 - a2),
          vectorLatex(a1 - b2, a2 - b1),
        ]);
        const explanation = `Step 1: Subtract corresponding components.

Step 2: (${a1} - ${b1}, ${a2} - ${b2}) = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
      () => {
        const x1 = randInt(rng, -5, 5);
        const y1 = randInt(rng, -5, 5);
        const x2 = x1 + randInt(rng, 2, 7);
        const y2 = y1 + randInt(rng, -7, -2);
        const question = `Find the vector from A(${x1}, ${y1}) to B(${x2}, ${y2}).`;
        const correct = vectorLatex(x2 - x1, y2 - y1);
        const wrongs = makeWrongAnswers(correct, [
          vectorLatex(x1 - x2, y1 - y2),
          vectorLatex(x2 + x1, y2 + y1),
          vectorLatex(x2 - x1, y1 - y2),
        ]);
        const explanation = `Step 1: Vector AB = (x2 - x1, y2 - y1).

Step 2: (${x2} - ${x1}, ${y2} - ${y1}) = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 180 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  circle_theorems: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const centre = 2 * randInt(rng, 30, 85);
        const circum = centre / 2;
        const question = `An angle at the centre of a circle is ${centre}°.

Find the angle at the circumference standing on the same arc.`;
        const correct = `${circum}°`;
        const wrongs = makeWrongAnswers(correct, [`${centre}°`, `${centre * 2}°`, `${circum + 10}°`]);
        const explanation = `Step 1: Angle at centre = 2 × angle at circumference.

Step 2: ${centre}° ÷ 2 = ${circum}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 140 };
      },
      () => {
        const circum = 5 * randInt(rng, 6, 17);
        const centre = circum * 2;
        const question = `An angle at the circumference is ${circum}°.

Find the angle at the centre standing on the same arc.`;
        const correct = `${centre}°`;
        const wrongs = makeWrongAnswers(correct, [`${circum}°`, `${circum + 30}°`, `${centre + 20}°`]);
        const explanation = `Step 1: Angle at centre = 2 × angle at circumference.

Step 2: 2 × ${circum}° = ${centre}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 140 };
      },
      () => {
        const a = randInt(rng, 90, 140);
        const c = 180 - a;
        const question = `ABCD is a cyclic quadrilateral.

If angle A = ${a}°, find angle C.`;
        const correct = `${c}°`;
        const wrongs = makeWrongAnswers(correct, [`${a}°`, `${c + 10}°`, `${c - 10}°`]);
        const explanation = `Step 1: Opposite angles in a cyclic quadrilateral sum to 180°.

Step 2: angle C = 180° - ${a}° = ${c}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 150 };
      },
      () => {
        const angle = randInt(rng, 20, 70);
        const question = `A tangent touches a circle at point T. A chord through T makes an angle of ${angle}° with the tangent.

Find the angle in the opposite segment subtended by the chord.`;
        const correct = `${angle}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - angle}°`, `${angle + 20}°`, `${angle - 10}°`]);
        const explanation = `Step 1: Alternate segment theorem: the angle between a tangent and a chord equals the angle in the opposite segment.

Step 2: Therefore the opposite angle is ${angle}°.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
      () => {
        const angle = randInt(rng, 30, 90);
        const question = `Two angles are in the same segment of a circle.

If one angle is ${angle}°, what is the other angle?`;
        const correct = `${angle}°`;
        const wrongs = makeWrongAnswers(correct, [`${180 - angle}°`, `${angle + 15}°`, `${angle - 15}°`]);
        const explanation = `Step 1: Angles in the same segment are equal.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 1, est: 110 };
      },
      () => {
        const length = randInt(rng, 5, 14);
        const question = `Two tangents are drawn from a point P to a circle, touching at A and B.

If PA = ${length} cm, what is PB?`;
        const correct = `${length} cm`;
        const wrongs = makeWrongAnswers(correct, [`${length * 2} cm`, `${length - 2} cm`, `${length + 3} cm`]);
        const explanation = `Step 1: Tangents from the same external point are equal in length.

Step 2: So PB = PA = ${length} cm.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 110 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  // PROBABILITY
  basic: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const total = randInt(rng, 8, 20);
        const favorable = randInt(rng, 2, total - 2);
        const question = `A bag contains ${total} counters.
${favorable} are red and the rest are blue.

Find the probability of picking a red counter.`;
        const correct = fracLatex(favorable, total);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(total - favorable, total),
          fracLatex(favorable, total - 1),
          fracLatex(favorable + 1, total),
        ]);
        const explanation = `Step 1: Probability = \\frac{favourable}{total}.

Step 2: = \\frac{${favorable}}{${total}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 1, marks: 1, est: 90 };
      },
      () => {
        const total = randInt(rng, 5, 12);
        const favorable = randInt(rng, 1, total - 1);
        const question = `A spinner is divided into ${total} equal sections.
${favorable} sections are blue and the rest are yellow.

Find the probability of landing on blue.`;
        const correct = fracLatex(favorable, total);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(total - favorable, total),
          fracLatex(favorable + 1, total),
          fracLatex(favorable, total - 1),
        ]);
        const explanation = `Step 1: Probability = \\frac{favourable}{total}.

Step 2: = \\frac{${favorable}}{${total}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const n = randInt(rng, 10, 30);
        const evens = Math.floor(n / 2);
        const question = `A number is chosen at random from 1 to ${n}.

Find the probability that the number is even.`;
        const correct = fracLatex(evens, n);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(n - evens, n),
          fracLatex(evens + 1, n),
          fracLatex(evens, n - 1),
        ]);
        const explanation = `Step 1: There are ${evens} even numbers from 1 to ${n}.

Step 2: Probability = \\frac{${evens}}{${n}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 };
      },
      () => {
        const n = randInt(rng, 12, 40);
        const mult = pick(rng, [3, 4, 5]);
        const favorable = Math.floor(n / mult);
        const question = `A number is chosen at random from 1 to ${n}.

Find the probability that the number is a multiple of ${mult}.`;
        const correct = fracLatex(favorable, n);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(n - favorable, n),
          fracLatex(favorable + 1, n),
          fracLatex(favorable, n - 1),
        ]);
        const explanation = `Step 1: Multiples of ${mult} up to ${n}: ${favorable}.

Step 2: Probability = \\frac{${favorable}}{${n}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 };
      },
      () => {
        const total = randInt(rng, 8, 20);
        const favorable = randInt(rng, 2, total - 2);
        const question = `A bag contains ${total} counters. ${favorable} are green and the rest are red.

Find the probability of NOT picking a green counter.`;
        const correct = fracLatex(total - favorable, total);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(favorable, total),
          fracLatex(favorable, total - 1),
          fracLatex(total - favorable + 1, total),
        ]);
        const explanation = `Step 1: Not green means red counters = ${total - favorable}.

Step 2: Probability = \\frac{${total - favorable}}{${total}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 100 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  combined: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const sides = randInt(rng, 6, 12);
        const k = randInt(rng, 1, sides - 1);
        const favorable = sides - k;
        const question = `A fair ${sides}-sided die is rolled.

What is the probability of getting a number greater than ${k}?`;
        const correct = fracLatex(favorable, sides);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(k, sides),
          fracLatex(favorable + 1, sides),
          fracLatex(favorable, sides - 1),
        ]);
        const explanation = `Step 1: Numbers greater than ${k} are ${k + 1} to ${sides} (${favorable} outcomes).

Step 2: Probability = \\frac{${favorable}}{${sides}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const sides = randInt(rng, 6, 12);
        const m = pick(rng, [2, 3, 4, 5]);
        const favorable = Math.floor(sides / m);
        const question = `A fair ${sides}-sided die is rolled.

What is the probability of getting a multiple of ${m}?`;
        const correct = fracLatex(favorable, sides);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(sides - favorable, sides),
          fracLatex(1, sides),
          fracLatex(favorable + 1, sides),
        ]);
        const explanation = `Step 1: Multiples of ${m} from 1 to ${sides} = ${favorable} outcomes.

Step 2: Probability = \\frac{${favorable}}{${sides}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const coins = pick(rng, [2, 3, 4, 5]);
        const k = randInt(rng, 1, Math.min(3, coins - 1));
        const favorable = nCr(coins, k);
        const total = Math.pow(2, coins);
        const question = `A fair coin is tossed ${coins} times.

What is the probability of getting exactly ${k} head${k === 1 ? '' : 's'}?`;
        const correct = fracLatex(favorable, total);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(1, total),
          fracLatex(total - favorable, total),
          fracLatex(favorable + 1, total),
        ]);
        const explanation = `Step 1: Total outcomes = 2^${coins} = ${total}.

Step 2: Ways to get exactly ${k} head${k === 1 ? '' : 's'} = ${favorable}.

Step 3: Probability = \\frac{${favorable}}{${total}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 130 };
      },
      () => {
        const cardOptions = [
          { label: 'heart', favorable: 13, plural: 'hearts' },
          { label: 'spade', favorable: 13, plural: 'spades' },
          { label: 'club', favorable: 13, plural: 'clubs' },
          { label: 'diamond', favorable: 13, plural: 'diamonds' },
          { label: 'ace', favorable: 4, plural: 'aces' },
          { label: 'king', favorable: 4, plural: 'kings' },
          { label: 'queen', favorable: 4, plural: 'queens' },
          { label: 'jack', favorable: 4, plural: 'jacks' },
          { label: 'red card', favorable: 26, plural: 'red cards' },
          { label: 'black card', favorable: 26, plural: 'black cards' },
          { label: 'face card', favorable: 12, plural: 'face cards' },
          { label: 'number card', favorable: 36, plural: 'number cards' },
        ];
        const choice = pick(rng, cardOptions);
        const question = `A card is chosen at random from a standard 52-card deck.

What is the probability of choosing a ${choice.label}?`;
        const correct = fracLatex(choice.favorable, 52);
        const wrongs = makeWrongAnswers(correct, [fracLatex(4, 52), fracLatex(26, 52), fracLatex(13, 52)]);
        const explanation = `Step 1: There are ${choice.favorable} ${choice.plural} in a 52-card deck.

Step 2: Probability = \\frac{${choice.favorable}}{52} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const red = randInt(rng, 4, 10);
        const blue = randInt(rng, 3, 9);
        const total = red + blue;
        const question = `A bag contains ${red} red balls and ${blue} blue balls.

One ball is picked and not replaced. What is the probability of getting red then blue?`;
        const correct = fracLatex(red * blue, total * (total - 1));
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(red, total),
          fracLatex(blue, total),
          fracLatex(red * blue, total * total),
        ]);
        const explanation = `Step 1: P(red then blue) = \\frac{${red}}{${total}} \\times \\frac{${blue}}{${total - 1}}.

Step 2: = \\frac{${red * blue}}{${total * (total - 1)}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  tree_diagrams: (rng, tier, calc, v) => {
    const pNum = pick(rng, [1, 2, 3, 4]);
    const pDen = pick(rng, [5, 6, 8, 10]);
    const qNum = pick(rng, [1, 2, 3, 4]);
    const qDen = pick(rng, [5, 6, 8, 10]);

    const question = `Two events A and B are independent.

P(A) = ${fracLatex(pNum, pDen)} and P(B) = ${fracLatex(qNum, qDen)}.

Find P(A and B).`;

    const cn = pNum * qNum;
    const cd = pDen * qDen;
    const correct = fracLatex(cn, cd);
    const wrongs = makeWrongAnswers(correct, [fracLatex(pNum + qNum, pDen + qDen), fracLatex(pNum, pDen + qDen), fracLatex(cn, cd + 1)]);

    const explanation = `Step 1: For independent events, P(A and B) = P(A) \\times P(B).

Step 2: ${fracLatex(pNum, pDen)} \\times ${fracLatex(qNum, qDen)} = ${fracLatex(cn, cd)} = ${correct}.

Final answer: ${correct}`;

    return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
  },

  conditional: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const total = randInt(rng, 24, 40);
        const a = randInt(rng, 10, total - 8);
        const b = randInt(rng, 8, total - 6);
        const both = randInt(rng, 4, Math.min(a, b) - 2);
        const question = `In a class of ${total} students, ${a} play football and ${b} play basketball.
${both} students play both.

Find P(football | basketball).`;
        const correct = fracLatex(both, b);
        const wrongs = makeWrongAnswers(correct, [fracLatex(both, total), fracLatex(a, b), fracLatex(b, total)]);
        const explanation = `Step 1: P(football | basketball) = \\frac{number who play both}{number who play basketball}.

Step 2: = \\frac{${both}}{${b}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 190 };
      },
      () => {
        const red = randInt(rng, 6, 12);
        const blue = randInt(rng, 4, 10);
        const question = `A bag contains ${red} red counters and ${blue} blue counters.

One counter is taken and not replaced. Given that the first counter is red, find the probability the second counter is red.`;
        const correct = fracLatex(red - 1, red + blue - 1);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(red, red + blue),
          fracLatex(red - 1, red + blue),
          fracLatex(red, red + blue - 1),
        ]);
        const explanation = `Step 1: After taking a red counter, ${red - 1} red remain out of ${red + blue - 1} total.

Step 2: Probability = \\frac{${red - 1}}{${red + blue - 1}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  relative_frequency: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const trials = pick(rng, [20, 25, 40, 50]);
        const success = randInt(rng, 5, trials - 3);
        const rf = Number((success / trials).toFixed(3));
        const question = `An event happens ${success} times out of ${trials} trials.

Find the relative frequency.`;
        const correct = trimLongDecimal(`${rf}`);
        const wrongs = makeWrongAnswers(correct, [
          trimLongDecimal(`${trials / success}`),
          `${success - trials}`,
          `${success + trials}`,
        ]);
        const explanation = `Step 1: Relative frequency = \\frac{number of successes}{number of trials}.

Step 2: = \\frac{${success}}{${trials}} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 100 };
      },
      () => {
        const trials = pick(rng, [30, 40, 60, 80]);
        const success = randInt(rng, 6, trials - 8);
        const rf = Number((success / trials).toFixed(2));
        const question = `A spinner lands on blue ${success} times out of ${trials} spins.

Estimate the probability of landing on blue.`;
        const correct = trimLongDecimal(`${rf}`);
        const wrongs = makeWrongAnswers(correct, [
          trimLongDecimal(`${(trials - success) / trials}`),
          trimLongDecimal(`${success / (trials - 1)}`),
          `${success}`,
        ]);
        const explanation = `Step 1: Use relative frequency as an estimate of probability.

Step 2: \\frac{${success}}{${trials}} ≈ ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 110 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  venn_diagrams: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const total = 50;
        const a = randInt(rng, 18, 30);
        const b = randInt(rng, 18, 30);
        const both = randInt(rng, 5, Math.min(a, b) - 3);
        const union = a + b - both;
        const question = `In a group of ${total} students:
${a} study Maths, ${b} study Physics, and ${both} study both.

How many study Maths or Physics?`;
        const correct = `${union}`;
        const wrongs = makeWrongAnswers(correct, [`${a + b}`, `${a + b + both}`, `${total - union}`]);
        const explanation = `Step 1: Use n(M \\cup P) = n(M) + n(P) - n(M \\cap P).

Step 2: = ${a} + ${b} - ${both} = ${union}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 190 };
      },
      () => {
        const total = 60;
        const a = randInt(rng, 20, 34);
        const b = randInt(rng, 18, 30);
        const both = randInt(rng, 6, Math.min(a, b) - 4);
        const neither = total - (a + b - both);
        const question = `In a group of ${total} students:
${a} study Geography, ${b} study History, and ${both} study both.

How many study neither subject?`;
        const correct = `${neither}`;
        const wrongs = makeWrongAnswers(correct, [
          `${a + b - both}`,
          `${total - a}`,
          `${total - b}`,
        ]);
        const explanation = `Step 1: Students in at least one = ${a} + ${b} - ${both} = ${a + b - both}.

Step 2: Neither = ${total} - ${a + b - both} = ${neither}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 190 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  expected_frequency: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const den = pick(rng, [4, 5, 6, 8, 10, 12]);
        const num = randInt(rng, 1, den - 1);
        const trials = den * randInt(rng, 5, 15);
        const p = fracLatex(num, den);
        const expected = (trials * num) / den;
        const question = `The probability of an event is ${p}.

Find the expected number of times it happens in ${trials} trials.`;
        const correct = `${expected}`;
        const wrongs = makeWrongAnswers(correct, [`${trials / expected}`, `${trials - expected}`, `${expected + 1}`]);
        const explanation = `Step 1: Expected frequency = probability × number of trials.

Step 2: ${p} × ${trials} = ${expected}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 170 };
      },
      () => {
        const trials = pick(rng, [50, 80, 100, 120, 150]);
        const success = randInt(rng, 10, trials - 10);
        const expected = Math.round((success / trials) * trials);
        const question = `An event occurred ${success} times in ${trials} trials.

Use this relative frequency to estimate the expected number of successes in ${trials} trials.`;
        const correct = `${expected}`;
        const wrongs = makeWrongAnswers(correct, [
          `${success + 1}`,
          `${trials - success}`,
          `${Math.round(trials / (success / trials))}`,
        ]);
        const explanation = `Step 1: Relative frequency = ${success} ÷ ${trials}.

Step 2: Expected = relative frequency × ${trials} = ${expected}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 2, est: 150 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  independence: (rng, tier, calc, v) => templates.tree_diagrams(rng, tier, calc, v),

  mutually_exclusive: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const aNum = pick(rng, [1, 2, 3, 4]);
        const aDen = pick(rng, [5, 6, 8, 10, 12]);
        const bNum = pick(rng, [1, 2, 3, 4]);
        const bDen = pick(rng, [5, 6, 8, 10, 12]);
        const question = `Events A and B are mutually exclusive.

If P(A) = ${fracLatex(aNum, aDen)} and P(B) = ${fracLatex(bNum, bDen)}, find P(A or B).`;
        const an = aNum * bDen;
        const bn = bNum * aDen;
        const denom = aDen * bDen;
        const correct = fracLatex(an + bn, denom);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(an - bn, denom),
          fracLatex(aNum * bNum, aDen * bDen),
          fracLatex(an + bn, denom + aDen),
        ]);
        const explanation = `Step 1: For mutually exclusive events, P(A or B) = P(A) + P(B).

Step 2: ${fracLatex(aNum, aDen)} + ${fracLatex(bNum, bDen)} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 2, est: 150 };
      },
      () => {
        const den = pick(rng, [5, 6, 8, 10, 12]);
        const aNum = randInt(rng, 1, Math.max(1, den - 3));
        const bNum = randInt(rng, 1, Math.max(1, den - aNum - 1));
        const question = `Events A and B are mutually exclusive.

If P(A) = ${fracLatex(aNum, den)} and P(A or B) = ${fracLatex(aNum + bNum, den)}, find P(B).`;
        const correct = fracLatex(bNum, den);
        const wrongs = makeWrongAnswers(correct, [
          fracLatex(aNum + bNum, den),
          fracLatex(aNum, den),
          fracLatex(bNum + 1, den),
        ]);
        const explanation = `Step 1: For mutually exclusive events, P(A or B) = P(A) + P(B).

Step 2: P(B) = P(A or B) - P(A).

Step 3: ${fracLatex(aNum + bNum, den)} - ${fracLatex(aNum, den)} = ${correct}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 4, marks: 2, est: 170 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  // STATISTICS
  data: (rng, tier, calc, v) => {
    const contexts = [
      'students in a school',
      'residents in a town',
      'customers in a supermarket',
      'members of a sports club',
      'passengers using a bus service',
      'patients at a clinic',
      'visitors to a museum',
      'employees in a company',
    ];
    const patterns = [
      () => {
        const n = randInt(rng, 120, 900);
        const context = pick(rng, contexts);
        const question = `You want to survey ${context} (${n} people).

Which method gives the most representative sample?`;
        const correct = `Random sample of people`;
        const wrongs = makeWrongAnswers(correct, [
          'Ask your friends',
          'Only volunteers',
          'Only one age group',
        ]);
        const explanation = `Step 1: A representative sample avoids bias.

Step 2: A random sample is the best option.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const n = randInt(rng, 80, 400);
        const context = pick(rng, contexts);
        const question = `A survey of ${context} (${n} people) uses a voluntary response method.

Which sampling method is most likely to be biased?

A) Random sample
B) Stratified sample
C) Voluntary response sample
D) Systematic sample`;
        const correct = `Voluntary response sample`;
        const wrongs = makeWrongAnswers(correct, ['Random sample', 'Stratified sample', 'Systematic sample']);
        const explanation = `Step 1: Voluntary response tends to attract people with strong opinions.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 90 };
      },
      () => {
        const group = pick(rng, ['year groups', 'age bands', 'departments', 'classes']);
        const n = randInt(rng, 200, 1200);
        const question = `A school has ${n} students and is divided into ${group}.
Students are chosen in proportion to the size of each group.

What type of sampling is this?`;
        const correct = `Stratified sampling`;
        const wrongs = makeWrongAnswers(correct, ['Random sampling', 'Systematic sampling', 'Opportunity sampling']);
        const explanation = `Step 1: Stratified sampling uses groups and samples proportionally.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 90 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  averages: (rng, tier, calc, v) => {
    const nums = Array.from({ length: 5 }, () => randInt(rng, 2, 18));
    const sum = nums.reduce((s, x) => s + x, 0);
    const mean = sum / nums.length;
    const question = `Find the mean of: ${nums.join(', ')}.`;
    const correct = `${mean}`;
    const wrongs = makeWrongAnswers(correct, [`${sum}`, `${mean + 1}`, `${mean - 1}`]);
    const explanation = `Step 1: Add the numbers: ${nums.join(' + ')} = ${sum}.

Step 2: Divide by how many numbers (5): ${sum} \\div 5 = ${mean}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 150 };
  },

  charts: (rng, tier, calc, v) => {
    const labels = ['A', 'B', 'C', 'D'];
    const values = [];
    while (values.length < labels.length) {
      const next = randInt(rng, 4, 16);
      if (!values.includes(next)) values.push(next);
    }
    const maxVal = Math.max(...values);
    const maxIdx = values.indexOf(maxVal);
    const minVal = Math.min(...values);
    const minIdx = values.indexOf(minVal);
    const imageSvg = svgBarChart({ labels, values });
    const imageAlt = `Bar chart of books read by students ${labels.join(', ')}`;

    const patterns = [
      () => {
        const question = `The bar chart shows the number of books read by four students.

Which student read the most books?`;
        const correct = `Student ${labels[maxIdx]}`;
        const wrongs = makeWrongAnswers(correct, labels.filter((_, i) => i !== maxIdx).map((l) => `Student ${l}`));
        const explanation = `Step 1: Read the tallest bar on the chart.

Step 2: The tallest bar is for student ${labels[maxIdx]}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 120 };
      },
      () => {
        const question = `The bar chart shows the number of books read by four students.

Which student read the fewest books?`;
        const correct = `Student ${labels[minIdx]}`;
        const wrongs = makeWrongAnswers(correct, labels.filter((_, i) => i !== minIdx).map((l) => `Student ${l}`));
        const explanation = `Step 1: Read the shortest bar on the chart.

Step 2: The shortest bar is for student ${labels[minIdx]}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 120 };
      },
      () => {
        const pickIdx = v % labels.length;
        const question = `The bar chart shows the number of books read by four students.

How many books did student ${labels[pickIdx]} read?`;
        const correct = `${values[pickIdx]}`;
        const wrongPool = values.filter((_, i) => i !== pickIdx).map((val) => `${val}`);
        const wrongs = makeWrongAnswers(correct, [...wrongPool, `${values[pickIdx] + 1}`, `${values[pickIdx] - 1}`]);
        const explanation = `Step 1: Read the value above student ${labels[pickIdx]}'s bar.

Step 2: The value shown is ${values[pickIdx]}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 100 };
      },
      () => {
        const aIdx = randInt(rng, 0, labels.length - 1);
        let bIdx = randInt(rng, 0, labels.length - 1);
        while (bIdx === aIdx) bIdx = randInt(rng, 0, labels.length - 1);
        const highIdx = values[aIdx] >= values[bIdx] ? aIdx : bIdx;
        const lowIdx = highIdx === aIdx ? bIdx : aIdx;
        const diff = values[highIdx] - values[lowIdx];
        const question = `The bar chart shows the number of books read by four students.

How many more books did student ${labels[highIdx]} read than student ${labels[lowIdx]}?`;
        const correct = `${diff}`;
        const otherDiffs = [];
        for (let i = 0; i < labels.length; i += 1) {
          for (let j = i + 1; j < labels.length; j += 1) {
            if (i === highIdx && j === lowIdx) continue;
            otherDiffs.push(`${Math.abs(values[i] - values[j])}`);
          }
        }
        const wrongs = makeWrongAnswers(correct, [...otherDiffs, `${diff + 1}`, `${Math.max(0, diff - 1)}`]);
        const explanation = `Step 1: Read student ${labels[highIdx]}'s value (${values[highIdx]}) and student ${labels[lowIdx]}'s value (${values[lowIdx]}).

Step 2: Difference = ${values[highIdx]} - ${values[lowIdx]} = ${diff}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 4 : 2, marks: 2, est: 140 };
      },
    ];

    const result = patterns[v % patterns.length]();
    return { ...result, imageSvg, imageAlt };
  },

  correlation: (rng, tier, calc, v) => {
    const modes = ['positive', 'negative', 'none'];
    const mode = modes[v % modes.length];
    const points = Array.from({ length: 8 }, (_, i) => {
      const x = i + 1;
      const base = mode === 'positive' ? x * 2 : mode === 'negative' ? (18 - x * 2) : randInt(rng, 3, 15);
      const y = base + randInt(rng, -2, 2);
      return { x, y };
    });
    const contexts = [
      'hours of revision vs test score',
      'height vs arm span',
      'temperature vs ice cream sales',
      'age of a car vs its value',
      'distance run vs time',
    ];
    const context = pick(rng, contexts);
    const p1 = points[1];
    const p2 = points[6];
    const imageSvg = svgScatter({ points, labelPoints: [p1, p2] });
    const imageAlt = `Scatter graph showing ${mode} correlation`;

    const patterns = [
      () => {
        const question = `The scatter graph shows ${context}. Two labelled points are shown.

What type of correlation does it suggest?`;
        const correct =
          mode === 'positive' ? 'Positive correlation' : mode === 'negative' ? 'Negative correlation' : 'No correlation';
        const wrongs = makeWrongAnswers(correct, [
          'Positive correlation',
          'Negative correlation',
          'No correlation',
          'Cannot be determined',
        ]);
        const explanation = `Step 1: Look at the overall trend of the points.

Step 2: The points show ${mode} correlation.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 90 };
      },
      () => {
        const question = `The scatter graph shows ${context}. Two labelled points are shown.

As x increases, what happens to y?`;
        const correct =
          mode === 'positive' ? 'It tends to increase' : mode === 'negative' ? 'It tends to decrease' : 'It stays about the same';
        const wrongs = makeWrongAnswers(correct, [
          'It tends to increase',
          'It tends to decrease',
          'It stays about the same',
          'Cannot be determined',
        ]);
        const explanation = `Step 1: Identify the overall direction of the points.

Step 2: The trend shows y ${mode === 'positive' ? 'increases' : mode === 'negative' ? 'decreases' : 'stays about the same'} as x increases.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 90 };
      },
    ];

    const result = patterns[v % patterns.length]();
    return { ...result, imageSvg, imageAlt };
  },

  sampling: (rng, tier, calc, v) => {
    const patterns = [
      () => {
        const step = randInt(rng, 3, 10);
        const n = randInt(rng, 100, 600);
        const question = `A researcher has a list of ${n} people and selects every ${step}th person.

What type of sampling is this?`;
        const correct = `Systematic sampling`;
        const wrongs = makeWrongAnswers(correct, ['Random sampling', 'Stratified sampling', 'Opportunity sampling']);
        const explanation = `Step 1: Selecting every ${step}th person is systematic sampling.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const groups = pick(rng, ['year groups', 'age bands', 'departments', 'classes']);
        const n = randInt(rng, 200, 1200);
        const question = `A school has ${n} students split into ${groups}.
A sample is taken from each group in proportion to its size.

What type of sampling is this?`;
        const correct = `Stratified sampling`;
        const wrongs = makeWrongAnswers(correct, ['Random sampling', 'Systematic sampling', 'Opportunity sampling']);
        const explanation = `Step 1: Sampling proportionally from groups is stratified sampling.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 3, marks: 1, est: 100 };
      },
      () => {
        const n = randInt(rng, 15, 40);
        const place = pick(rng, ['shopping centre', 'train station', 'library', 'school canteen']);
        const question = `A student asks the first ${n} people they see in a ${place}.

What type of sampling is this?`;
        const correct = `Opportunity sampling`;
        const wrongs = makeWrongAnswers(correct, ['Random sampling', 'Stratified sampling', 'Systematic sampling']);
        const explanation = `Step 1: Sampling whoever is easiest to reach is opportunity sampling.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
      () => {
        const n = randInt(rng, 80, 300);
        const question = `From a list of ${n} people, names are chosen using a random number generator.

What type of sampling is this?`;
        const correct = `Random sampling`;
        const wrongs = makeWrongAnswers(correct, ['Systematic sampling', 'Stratified sampling', 'Opportunity sampling']);
        const explanation = `Step 1: Selecting with a random number generator gives a random sample.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: 2, marks: 1, est: 90 };
      },
    ];

    return patterns[v % patterns.length]();
  },

  frequency_tables: (rng, tier, calc, v) => {
    const a = randInt(rng, 2, 10);
    const b = randInt(rng, 2, 10);
    const c = randInt(rng, 2, 10);
    const fa = randInt(rng, 1, 8);
    const fb = randInt(rng, 1, 8);
    const fc = randInt(rng, 1, 8);
    const question = `Frequency table:

Value: ${a}, ${b}, ${c}
Frequency: ${fa}, ${fb}, ${fc}

How many values are there in total?`;
    const correct = `${fa + fb + fc}`;
    const wrongs = makeWrongAnswers(correct, [`${a + b + c}`, `${fa * fb * fc}`, `${fa + fb}`]);
    const explanation = `Step 1: Total frequency = ${fa} + ${fb} + ${fc}.

Step 2: = ${fa + fb + fc}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 90 };
  },

  spread: (rng, tier, calc, v) => {
    const min = randInt(rng, 2, 8);
    const q1 = min + randInt(rng, 3, 8);
    const med = q1 + randInt(rng, 2, 8);
    const q3 = med + randInt(rng, 2, 8);
    const max = q3 + randInt(rng, 2, 8);
    const iqr = q3 - q1;
    const question = `A box plot has lower quartile ${q1} and upper quartile ${q3}.

Find the interquartile range (IQR).`;
    const correct = `${iqr}`;
    const wrongs = makeWrongAnswers(correct, [`${max - min}`, `${q3 + q1}`, `${iqr + 1}`]);
    const explanation = `Step 1: IQR = upper quartile - lower quartile.

Step 2: ${q3} - ${q1} = ${iqr}.

Final answer: ${correct}`;
    const imageSvg = svgBoxPlot({ min, q1, med, q3, max });
    const imageAlt = `Box plot with min ${min}, q1 ${q1}, median ${med}, q3 ${q3}, max ${max}`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 90, imageSvg, imageAlt };
  },

  scatter: (rng, tier, calc, v) => templates.correlation(rng, tier, calc, v),

  histograms: (rng, tier, calc, v) => {
    const bins = [
      { label: '0-10', value: randInt(rng, 2, 7) },
      { label: '10-20', value: randInt(rng, 4, 10) },
      { label: '20-30', value: randInt(rng, 3, 9) },
      { label: '30-40', value: randInt(rng, 1, 6) },
    ];
    const maxBin = bins.reduce((best, b) => (b.value > best.value ? b : best), bins[0]);
    const minBin = bins.reduce((best, b) => (b.value < best.value ? b : best), bins[0]);
    const pickBin = bins[v % bins.length];
    const imageSvg = svgHistogram({ bins });
    const imageAlt = `Histogram with intervals ${bins.map((b) => b.label).join(', ')}`;

    const patterns = [
      () => {
        const question = `The histogram shows frequency density for four intervals.

Which interval has the highest frequency density?`;
        const correct = `${maxBin.label}`;
        const wrongs = makeWrongAnswers(correct, bins.filter((b) => b.label !== maxBin.label).map((b) => b.label));
        const explanation = `Step 1: Identify the tallest bar.

Step 2: The tallest bar corresponds to ${maxBin.label}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 130 };
      },
      () => {
        const question = `The histogram shows frequency density for four intervals.

Which interval has the lowest frequency density?`;
        const correct = `${minBin.label}`;
        const wrongs = makeWrongAnswers(correct, bins.filter((b) => b.label !== minBin.label).map((b) => b.label));
        const explanation = `Step 1: Identify the shortest bar.

Step 2: The shortest bar corresponds to ${minBin.label}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 130 };
      },
      () => {
        const question = `The histogram shows frequency density for four intervals.

What is the frequency density for the interval ${pickBin.label}?`;
        const correct = `${pickBin.value}`;
        const wrongs = makeWrongAnswers(correct, bins.filter((b) => b.label !== pickBin.label).map((b) => `${b.value}`));
        const explanation = `Step 1: Read the height of the bar for ${pickBin.label}.

Step 2: The value shown is ${pickBin.value}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 110 };
      },
    ];

    const result = patterns[v % patterns.length]();
    return { ...result, imageSvg, imageAlt };
  },

  cumulative_frequency: (rng, tier, calc, v) => {
    const start = pick(rng, [5, 10, 15]);
    const step = pick(rng, [5, 10]);
    const xVals = Array.from({ length: 5 }, (_, i) => start + step * i);
    let total = 0;
    const points = xVals.map((x) => {
      total += randInt(rng, 5, 12);
      return { x, y: total };
    });
    const targetIndex = randInt(rng, 1, points.length - 2);
    const target = points[targetIndex];
    const anchor = points[0];
    const imageSvg = svgCumulativeFrequency({ points });
    const imageAlt = `Cumulative frequency graph with final total ${total}`;

    const patterns = [
      () => {
        const question = `The cumulative frequency graph is shown.

Find the cumulative frequency at x = ${target.x}.`;
        const correct = `${target.y}`;
        const wrongs = makeWrongAnswers(correct, [
          `${target.y - randInt(rng, 3, 7)}`,
          `${target.y + randInt(rng, 3, 7)}`,
          `${total}`,
        ]);
        const explanation = `Step 1: Read the cumulative frequency at x = ${target.x}.

Step 2: The value is ${target.y}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 130 };
      },
      () => {
        const question = `The cumulative frequency graph is shown.

At what x-value is the cumulative frequency ${target.y}?`;
        const correct = `${target.x}`;
        const wrongs = makeWrongAnswers(correct, [
          `${anchor.x}`,
          `${points[points.length - 1].x}`,
          `${target.x + step}`,
        ]);
        const explanation = `Step 1: Find the point where cumulative frequency is ${target.y}.

Step 2: The corresponding x-value is ${target.x}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 2, est: 130 };
      },
      () => {
        const question = `The cumulative frequency graph is shown.

What is the total frequency?`;
        const correct = `${total}`;
        const wrongs = makeWrongAnswers(correct, [
          `${total - randInt(rng, 3, 8)}`,
          `${total + randInt(rng, 3, 8)}`,
          `${target.y}`,
        ]);
        const explanation = `Step 1: The total frequency is the final cumulative value.

Step 2: The final cumulative frequency shown is ${total}.

Final answer: ${correct}`;
        return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 1, marks: 1, est: 110 };
      },
    ];

    const result = patterns[v % patterns.length]();
    return { ...result, imageSvg, imageAlt };
  },

  box_plots: (rng, tier, calc, v) => templates.spread(rng, tier, calc, v),

  two_way_tables: (rng, tier, calc, v) => {
    const a = randInt(rng, 10, 30);
    const b = randInt(rng, 10, 30);
    const c = randInt(rng, 10, 30);
    const d = randInt(rng, 10, 30);
    const total = a + b + c + d;
    const question = `Two-way table totals:

A and B: ${a}
A and not B: ${b}
not A and B: ${c}
not A and not B: ${d}

How many are there in total?`;
    const correct = `${total}`;
    const wrongs = makeWrongAnswers(correct, [`${a + b}`, `${c + d}`, `${total + 10}`]);
    const explanation = `Step 1: Total = sum of all four cells.

Step 2: ${a} + ${b} + ${c} + ${d} = ${total}.

Final answer: ${correct}`;
    return { question, correct, wrongs, explanation, difficulty: tier === 'Higher Tier' ? 3 : 2, marks: 1, est: 120 };
  },
};

// Map each subtopic key to a template
const SUBTOPIC_TO_TEMPLATE = {
  // number
  integers: 'integers',
  decimals: 'decimals',
  fractions: 'fractions',
  fractions_decimals_percent: 'fractions_decimals_percent',
  percentages: 'percentages',
  powers: 'powers',
  factors_multiples: 'factors_multiples',
  hcf_lcm: 'hcf_lcm',
  negative_numbers: 'negative_numbers',
  bidmas: 'bidmas',
  rounding_bounds: 'rounding_bounds',
  standard_form: 'standard_form',
  surds: 'surds',
  recurring_decimals: 'recurring_decimals',
  unit_conversions: 'unit_conversions',

  // algebra
  expressions: 'expressions',
  expand: 'expand',
  factorise: 'factorise',
  substitution: 'substitution',
  rearranging: 'rearranging',
  equations: 'equations',
  inequalities: 'inequalities',
  simultaneous: 'simultaneous',
  sequences: 'sequences',
  nth_term: 'nth_term',
  graphs: 'graphs',
  gradients: 'gradients',
  quadratics: 'quadratics',
  algebraic_fractions: 'algebraic_fractions',

  // ratio
  ratio: 'ratio',
  proportion: 'proportion',
  percentage_change: 'percentage_change',
  reverse_percentages: 'reverse_percentages',
  ratio_share: 'ratio_share',
  rates: 'rates',
  speed: 'speed',
  best_buys: 'best_buys',
  growth_decay: 'growth_decay',
  compound_interest: 'compound_interest',
  direct_inverse: 'direct_inverse',
  similarity_scale: 'similarity_scale',

  // geometry
  shapes: 'shapes',
  perimeter_area: 'perimeter_area',
  area_volume: 'area_volume',
  angles: 'angles',
  polygons: 'polygons',
  trigonometry: 'trigonometry',
  pythagoras: 'pythagoras',
  circles: 'circles',
  arcs_sectors: 'arcs_sectors',
  surface_area: 'surface_area',
  volume: 'volume',
  bearings: 'bearings',
  transformations: 'transformations',
  constructions_loci: 'constructions_loci',
  congruence: 'congruence',
  vectors: 'vectors',
  circle_theorems: 'circle_theorems',

  // probability
  basic: 'basic',
  combined: 'combined',
  tree_diagrams: 'tree_diagrams',
  conditional: 'conditional',
  relative_frequency: 'relative_frequency',
  venn_diagrams: 'venn_diagrams',
  expected_frequency: 'expected_frequency',
  independence: 'independence',
  mutually_exclusive: 'mutually_exclusive',

  // statistics
  data: 'data',
  averages: 'averages',
  charts: 'charts',
  correlation: 'correlation',
  sampling: 'sampling',
  frequency_tables: 'frequency_tables',
  spread: 'spread',
  scatter: 'scatter',
  histograms: 'histograms',
  cumulative_frequency: 'cumulative_frequency',
  box_plots: 'box_plots',
  two_way_tables: 'two_way_tables',
};

// ---------- SQL helpers ----------
const sqlEscape = (s) => String(s).replace(/'/g, "''");

const arrayLiteral = (items) => {
  const escaped = items.map((x) => `'${sqlEscape(x)}'`);
  return `ARRAY[${escaped.join(', ')}]`;
};

const formatSupabaseMigrationTimestamp = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  // Supabase migration filenames are typically UTC-based.
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const insertRowSql = (row) => {
  const cols = [
    'question',
    'correct_answer',
    'wrong_answers',
    'all_answers',
    'explanation',
    'explain_on',
    'question_type',
    'subtopic',
    'tier',
    'calculator',
    'difficulty',
    'marks',
    'estimated_time_sec',
    'image_url',
    'image_alt',
  ];

  const values = [
    `'${sqlEscape(row.question)}'`,
    `'${sqlEscape(row.correct_answer)}'`,
    arrayLiteral(row.wrong_answers),
    arrayLiteral(row.all_answers),
    `'${sqlEscape(row.explanation)}'`,
    `'always'`,
    `'${sqlEscape(row.question_type)}'`,
    `'${sqlEscape(row.subtopic)}'`,
    `'${sqlEscape(row.tier)}'`,
    `'${sqlEscape(row.calculator)}'`,
    `${row.difficulty}`,
    `${row.marks}`,
    `${row.estimated_time_sec}`,
    row.image_url ? `'${sqlEscape(row.image_url)}'` : 'NULL',
    row.image_alt ? `'${sqlEscape(row.image_alt)}'` : 'NULL',
  ];

  return `INSERT INTO public.exam_questions (${cols.join(', ')})\nVALUES (${values.join(', ')});`;
};

// ---------- Build all questions ----------
const STRICT_UNIQUENESS_SUBTOPICS = new Set([
  'geometry|shapes',
  'number|unit_conversions',
]);

const SUBTOPICS_FILTER = (process.env.SUBTOPICS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PER_COMBO = Number(process.env.PER_COMBO || 2);
const STRICT_ALL = ['1', 'true', 'yes'].includes(String(process.env.STRICT_ALL || '').toLowerCase());
const DELETE_BEFORE_INSERT = ['1', 'true', 'yes'].includes(
  String(process.env.DELETE_BEFORE_INSERT || '').toLowerCase(),
);
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 60);
const IMAGE_MODE = String(process.env.IMAGE_MODE || 'none').toLowerCase();
const IMAGE_BATCH_ID = process.env.IMAGE_BATCH_ID || formatSupabaseMigrationTimestamp(new Date());
const IMAGES_OUT_DIR =
  process.env.IMAGES_OUT_DIR ||
  path.join(process.cwd(), 'supabase', 'data', 'generated', `batch_${IMAGE_BATCH_ID}`, 'images');
const IMAGE_BUCKET = process.env.IMAGE_BUCKET || 'questions';
const UPLOAD_IMAGES = ['1', 'true', 'yes'].includes(String(process.env.UPLOAD_IMAGES || '').toLowerCase());
const imagesToWrite = [];

const shouldIncludeSubtopic = (topicKey, subKey) => {
  if (!SUBTOPICS_FILTER.length) return true;
  const id = `${topicKey}|${subKey}`;
  return SUBTOPICS_FILTER.includes(id);
};

const attachImageIfNeeded = (q) => {
  if (IMAGE_MODE === 'none' || !q.imageSvg) return { image_url: null, image_alt: null };
  const imageId = randomUUID();
  const imageUrl = `generated/${IMAGE_BATCH_ID}/${imageId}.svg`;
  const imagePath = path.join(IMAGES_OUT_DIR, `${imageId}.svg`);
  imagesToWrite.push({ path: imagePath, key: imageUrl, svg: q.imageSvg });
  return { image_url: imageUrl, image_alt: q.imageAlt || 'Diagram for question' };
};

const uploadImages = async () => {
  if (!imagesToWrite.length) return;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for image upload.');
  }

  let uploaded = 0;
  for (const img of imagesToWrite) {
    const url = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${IMAGE_BUCKET}/${img.key}?upsert=true`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'image/svg+xml',
        'x-upsert': 'true',
      },
      body: fs.readFileSync(img.path),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Image upload failed (status=${res.status}) for ${img.key}: ${body}`);
    }
    uploaded += 1;
    if (uploaded % 20 === 0 || uploaded === imagesToWrite.length) {
      console.log(`Uploaded ${uploaded}/${imagesToWrite.length} images...`);
    }
  }
};

const buildQuestionsForSubtopic = ({ topicKey, subKey, subName }) => {
  const subtopicId = `${topicKey}|${subKey}`;
  const canonicalTopic = topicKeyToCanonical(topicKey);
  const strictUnique = STRICT_ALL || STRICT_UNIQUENESS_SUBTOPICS.has(subtopicId);

  const tplKey = SUBTOPIC_TO_TEMPLATE[subKey];
  const tpl = templates[tplKey];
  if (!tpl) throw new Error(`No template for subtopic ${subtopicId} (tpl=${tplKey})`);

  const perCombo = Number.isFinite(PER_COMBO) && PER_COMBO > 0 ? PER_COMBO : 2;
  const combos = [
    { tier: 'Foundation Tier', calculator: 'Calculator', count: perCombo, baseDifficulty: 2 },
    { tier: 'Foundation Tier', calculator: 'Non-Calculator', count: perCombo, baseDifficulty: 2 },
    { tier: 'Higher Tier', calculator: 'Calculator', count: perCombo, baseDifficulty: 4 },
    { tier: 'Higher Tier', calculator: 'Non-Calculator', count: perCombo, baseDifficulty: 4 },
  ];

  const out = [];
  const usedPrompts = strictUnique ? new Set() : null;
  for (const combo of combos) {
    for (let i = 0; i < combo.count; i++) {
      if (!strictUnique) {
        const seed = hashStringToSeed(`${subtopicId}|${combo.tier}|${combo.calculator}|${i}`);
        const rng = mulberry32(seed);
        const q = tpl(rng, combo.tier, combo.calculator, i);

        const question = beautifyMathText(q.question);
        const explanation = beautifyMathText(q.explanation);
        const correct = beautifyMathText(String(q.correct));
        const wrongs = q.wrongs.map((w) => beautifyMathText(String(w)));
        const all = [correct, ...wrongs].sort(() => (rng() < 0.5 ? -1 : 1));
        const image = attachImageIfNeeded(q);

        out.push({
          question,
          correct_answer: correct,
          wrong_answers: wrongs,
          all_answers: all,
          explanation,
          question_type: canonicalTopic,
          subtopic: subtopicId,
          tier: combo.tier,
          calculator: combo.calculator,
          difficulty: q.difficulty,
          marks: q.marks,
          estimated_time_sec: q.est,
          image_url: image.image_url,
          image_alt: image.image_alt,
        });
        continue;
      }

      // Strict mode: deterministically retry until we get a unique prompt.
      let chosen = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const seed = hashStringToSeed(`${subtopicId}|${combo.tier}|${combo.calculator}|${i}|${attempt}`);
        const rng = mulberry32(seed);
        const q = tpl(rng, combo.tier, combo.calculator, i);

        const question = beautifyMathText(q.question);
        if (usedPrompts.has(question)) continue;

        const explanation = beautifyMathText(q.explanation);
        const correct = beautifyMathText(String(q.correct));
        const wrongs = q.wrongs.map((w) => beautifyMathText(String(w)));
        const all = [correct, ...wrongs].sort(() => (rng() < 0.5 ? -1 : 1));
        const image = attachImageIfNeeded(q);

        chosen = {
          question,
          correct_answer: correct,
          wrong_answers: wrongs,
          all_answers: all,
          explanation,
          question_type: canonicalTopic,
          subtopic: subtopicId,
          tier: combo.tier,
          calculator: combo.calculator,
          difficulty: q.difficulty,
          marks: q.marks,
          estimated_time_sec: q.est,
          image_url: image.image_url,
          image_alt: image.image_alt,
        };

        usedPrompts.add(question);
        break;
      }

      if (!chosen) {
        throw new Error(
          `Unable to generate a unique question prompt for ${subtopicId} (${combo.tier}, ${combo.calculator}, i=${i}) after retries`,
        );
      }

      out.push(chosen);
    }
  }

  // Guardrails:
  // - For the high-risk subtopics (where we have known duplication problems), enforce strict 8/8 uniqueness.
  const uniqQuestions = new Set(out.map((x) => x.question));
  if (strictUnique && uniqQuestions.size !== out.length) {
    throw new Error(`Expected 8 unique prompts for ${subtopicId} but got ${uniqQuestions.size}.`);
  }

  const expectedCount = combos.reduce((sum, combo) => sum + combo.count, 0);
  if (out.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} questions for ${subtopicId}, got ${out.length}`);
  }
  return out;
};

const subtopicOrder = [];
const groupedQuestions = new Map();
for (const [topicKey, topic] of Object.entries(TOPIC_SUBTOPICS)) {
  for (const s of topic.subtopics) {
    if (!shouldIncludeSubtopic(topicKey, s.key)) continue;
    const subtopicId = `${topicKey}|${s.key}`;
    const qs = buildQuestionsForSubtopic({ topicKey, subKey: s.key, subName: s.name });
    subtopicOrder.push(subtopicId);
    groupedQuestions.set(subtopicId, qs);
  }
}

// ---------- Write migration ----------
const header = `-- AUTO-GENERATED on ${new Date().toISOString()}\n-- Seed: 8 questions per mini-subtopic (79 subtopics => 632 questions)\n-- Notes:\n-- - Uses strict \\frac{a}{b} vertical fractions.\n-- - Includes 3 wrong options and detailed explanations.\n\nBEGIN;\n\n`;

const footer = `\nCOMMIT;\n`;

const bodyParts = [];
for (const subtopicId of subtopicOrder) {
  if (DELETE_BEFORE_INSERT) {
    bodyParts.push(`DELETE FROM public.exam_questions WHERE subtopic = '${sqlEscape(subtopicId)}';`);
  }
  const rows = groupedQuestions.get(subtopicId) || [];
  bodyParts.push(rows.map(insertRowSql).join('\n\n'));
}
const body = bodyParts.join('\n\n');

const cliOut = process.argv[2];
const defaultName = `${formatSupabaseMigrationTimestamp(new Date())}_seed_mini_subtopic_questions.sql`;
const outPath = path.join(process.cwd(), 'supabase', 'migrations', cliOut || defaultName);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + body + footer, 'utf8');

const totalQuestions = Array.from(groupedQuestions.values()).reduce((sum, rows) => sum + rows.length, 0);
if (imagesToWrite.length) {
  fs.mkdirSync(IMAGES_OUT_DIR, { recursive: true });
  for (const img of imagesToWrite) {
    fs.writeFileSync(img.path, img.svg, 'utf8');
  }
  console.log(`Wrote ${imagesToWrite.length} images to ${IMAGES_OUT_DIR}`);
  if (UPLOAD_IMAGES) {
    await uploadImages();
  }
}
console.log(`Generated ${totalQuestions} questions into ${outPath}`);
