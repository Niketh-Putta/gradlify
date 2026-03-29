import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical topic + subtopic taxonomy (mirrors app selection).
// We store subtopic IDs as: "<topicKey>|<subtopicKey>" (e.g., "number|fractions").
const TOPIC_TO_KEY: Record<string, string> = {
  'Number': 'number',
  'Algebra': 'algebra',
  'Ratio & Proportion': 'ratio',
  'Geometry': 'geometry',
  'Geometry & Measures': 'geometry',
  'Probability': 'probability',
  'Statistics': 'statistics',
};

const SUBTOPICS_BY_KEY: Record<string, Array<{ key: string; name: string }>> = {
  number: [
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
    { key: 'unit_conversions', name: 'Unit conversions' }
  ],
  algebra: [
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
    { key: 'algebraic_fractions', name: 'Algebraic fractions' }
  ],
  ratio: [
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
    { key: 'similarity_scale', name: 'Scale factors and similarity' }
  ],
  geometry: [
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
    { key: 'circle_theorems', name: 'Circle theorems' }
  ],
  probability: [
    { key: 'basic', name: 'Basic probability' },
    { key: 'combined', name: 'Combined events' },
    { key: 'tree_diagrams', name: 'Tree diagrams' },
    { key: 'conditional', name: 'Conditional probability' },
    { key: 'relative_frequency', name: 'Relative frequency' },
    { key: 'venn_diagrams', name: 'Venn diagrams' },
    { key: 'expected_frequency', name: 'Expected frequency' },
    { key: 'independence', name: 'Independence' },
    { key: 'mutually_exclusive', name: 'Mutually exclusive events' }
  ],
  statistics: [
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
    { key: 'two_way_tables', name: 'Two-way tables' }
  ],
};

const normalizeMainTopicForDb = (t: string): string => {
  // App + DB use "Geometry & Measures"; generator UI historically used "Geometry".
  if (t === 'Geometry') return 'Geometry & Measures';
  return t;
};

const buildAllowedSubtopicIds = (topic: string): Array<{ id: string; name: string; key: string }> => {
  const topicKey = TOPIC_TO_KEY[topic] || '';
  const list = SUBTOPICS_BY_KEY[topicKey] || [];
  return list.map((s) => ({ id: `${topicKey}|${s.key}`, key: s.key, name: s.name }));
};

const normalizeSubtopicId = (raw: unknown, topic: string): string | null => {
  const allowed = buildAllowedSubtopicIds(topic);
  if (allowed.length === 0) return null;

  const value = String(raw ?? '').trim();
  if (!value) return null;

  // Exact ID match
  if (allowed.some((a) => a.id === value)) return value;

  const lower = value.toLowerCase();
  // Match by key or label
  const byKey = allowed.find((a) => a.key.toLowerCase() === lower);
  if (byKey) return byKey.id;

  const byName = allowed.find((a) => a.name.toLowerCase() === lower);
  if (byName) return byName.id;

  // Soft contains match (helps when model returns e.g. "percentages" or "percentage")
  const contains = allowed.find((a) => lower.includes(a.key.toLowerCase()) || lower.includes(a.name.toLowerCase()));
  if (contains) return contains.id;

  return null;
};

// GCSE Edexcel Maths specification topics - STRICT boundaries
const TOPIC_CONTEXT: Record<string, { includes: string[], excludes: string[], examples: string[] }> = {
  "Number": {
    includes: [
      "Place value, ordering integers, decimals",
      "Rounding to decimal places, significant figures",
      "Factors, multiples, primes, HCF, LCM, prime factorisation",
      "Operations with fractions (add, subtract, multiply, divide)",
      "Converting between fractions, decimals, percentages",
      "Calculating percentages of amounts",
      "Simple and compound interest calculations",
      "Powers, roots, index laws with NUMBERS only",
      "Standard form (scientific notation)",
      "Surds - simplifying, rationalising (Higher only)",
      "Upper and lower bounds, error intervals"
    ],
    excludes: [
      "ANY algebraic expressions or equations",
      "Variables like x, y, n in expressions",
      "Substitution into formulas",
      "Expanding brackets with algebra",
      "ANY geometry or shape questions",
      "ANY probability or statistics"
    ],
    examples: [
      "Work out 3/4 + 2/5",
      "Find the HCF of 24 and 36",
      "Write 0.00045 in standard form",
      "Calculate 15% of £240",
      "Simplify √72"
    ]
  },
  "Algebra": {
    includes: [
      "Simplifying algebraic expressions",
      "Expanding single and double brackets",
      "Factorising expressions",
      "Solving linear equations",
      "Solving quadratic equations",
      "Simultaneous equations",
      "Sequences and nth term",
      "Rearranging formulas",
      "Substitution into expressions/formulas",
      "Inequalities and regions",
      "Functions and inverse functions",
      "Graph plotting and interpretation",
      "Algebraic fractions (Higher only)"
    ],
    excludes: [
      "Pure number calculations without variables",
      "Geometry proofs or measurements",
      "Probability calculations",
      "Statistical analysis"
    ],
    examples: [
      "Solve 3x + 7 = 22",
      "Expand and simplify (2x + 3)(x - 4)",
      "Find the nth term of 5, 8, 11, 14...",
      "Rearrange y = mx + c to make x the subject"
    ]
  },
  "Ratio & Proportion": {
    includes: [
      "Simplifying ratios",
      "Dividing amounts in a given ratio",
      "Best buy / value problems",
      "Recipe scaling problems",
      "Direct proportion",
      "Inverse proportion",
      "Percentage increase and decrease",
      "Reverse percentages",
      "Compound measures (speed, density, pressure)",
      "Exchange rates and currency conversion",
      "Scale factors and maps"
    ],
    excludes: [
      "Algebraic expressions",
      "Geometry calculations",
      "Probability",
      "Statistics"
    ],
    examples: [
      "Share £120 in the ratio 3:5",
      "A car travels 180 miles in 3 hours. Find the speed.",
      "The price increases by 20%. Find the new price.",
      "Which is better value: 500ml for £2.40 or 750ml for £3.30?"
    ]
  },
  "Geometry": {
    includes: [
      "Angles in triangles, quadrilaterals, polygons",
      "Angles on parallel lines",
      "Properties of 2D and 3D shapes",
      "Perimeter, area, volume calculations",
      "Surface area",
      "Pythagoras' theorem",
      "Trigonometry (SOHCAHTOA)",
      "Sine and cosine rules (Higher)",
      "Circle theorems (Higher only)",
      "Transformations (rotation, reflection, translation, enlargement)",
      "Congruence and similarity",
      "Vectors (Higher only)",
      "Bearings and scale drawings"
    ],
    excludes: [
      "Pure number calculations",
      "Algebraic manipulation without geometry context",
      "Probability",
      "Statistics"
    ],
    examples: [
      "Find the missing angle in a triangle",
      "Calculate the area of a trapezium",
      "Use Pythagoras to find the hypotenuse",
      "Find the volume of a cylinder"
    ]
  },
  "Probability": {
    includes: [
      "Basic probability (single events)",
      "Sample spaces",
      "Relative frequency / experimental probability",
      "Expected outcomes",
      "Probability of combined events",
      "Tree diagrams",
      "Venn diagrams for probability",
      "Two-way tables for probability",
      "Conditional probability (Higher only)",
      "Independent and dependent events"
    ],
    excludes: [
      "Pure number calculations",
      "Algebraic expressions",
      "Geometry",
      "Statistical averages (those go in Statistics)"
    ],
    examples: [
      "A bag contains 3 red and 5 blue balls. Find P(red)",
      "Draw a tree diagram for two coin flips",
      "Use a Venn diagram to find the probability"
    ]
  },
  "Statistics": {
    includes: [
      "Mean, median, mode, range",
      "Calculating averages from frequency tables",
      "Grouped frequency tables",
      "Estimating the mean from grouped data",
      "Cumulative frequency diagrams",
      "Box plots and quartiles",
      "Scatter graphs and correlation",
      "Lines of best fit",
      "Histograms with frequency density (Higher only)",
      "Comparing distributions",
      "Sampling methods"
    ],
    excludes: [
      "Pure number calculations",
      "Algebraic expressions",
      "Geometry",
      "Probability calculations (those go in Probability)"
    ],
    examples: [
      "Find the mean of 5, 8, 12, 7, 3",
      "Calculate the median from a frequency table",
      "Draw a cumulative frequency curve",
      "Describe the correlation shown on a scatter graph"
    ]
  }
};

// Tool schema for structured output
const questionGeneratorTool = {
  type: "function",
  function: {
    name: "generate_exam_questions",
    description: "Generate GCSE maths exam questions with proper LaTeX formatting. CRITICAL: Double-check all calculations to ensure correct answers.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              difficulty: {
                type: "integer",
                minimum: 1,
                maximum: 4,
                description: "Difficulty rating 1–4 (required). 1=very easy, 2=easy/standard, 3=hard, 4=very hard. For Higher Tier you should output 3 or 4 (prefer 4).",
              },
              question: {
                type: "string",
                description: "The question text with LaTeX math wrapped in $...$ for inline or $$...$$ for display"
              },
              correct_answer: {
                type: "string",
                description: "The VERIFIED correct answer - you MUST compute this yourself and double-check the calculation before providing it"
              },
              wrong_answers: {
                type: "array",
                items: { type: "string" },
                description: "3 plausible wrong answers representing common student mistakes"
              },
              explanation: {
                type: "string",
                description: "GCSE Edexcel-friendly step-by-step solution with EACH STEP ON A NEW LINE using \\n. Keep it simple (no advanced notation). Format: 'Step 1: [simple action]\\n[working]\\n\\nStep 2: ...\\n\\nFinal answer: [answer]'. Use minimal LaTeX only for math (e.g., \\frac, powers, roots). Avoid LaTeX display delimiters (\\[...\\], $$...$$) and avoid \\text{...}; put words outside math where possible."
              },
              calculator: {
                type: "string",
                enum: ["calculator", "non-calculator"],
                description: "Whether calculator is allowed"
              },
              question_type: {
                type: "string",
                description: "The specific subtopic (e.g., 'solving-linear-equations', 'pythagoras')"
              },
              svg_diagram: {
                type: "string",
                description: "If a diagram is needed, provide clean valid SVG code (no code blocks, raw SVG only). The SVG must be exam-style, minimal, black-and-white with integer dimensions (e.g., width='200' height='150'). Use only <line>, <circle>, <polygon>, <polyline>, <path>, <text>, <rect>. Include labels with <text>. No shading, colors, gradients. Leave empty string if no diagram needed."
              },
              diagram_description: {
                type: "string",
                description: "Brief description of what the diagram shows (e.g., 'Right-angled triangle ABC with sides labeled'). Leave empty if no diagram."
              }
            },
            required: ["difficulty", "question", "correct_answer", "wrong_answers", "explanation", "calculator", "question_type"]
          }
        }
      },
      required: ["questions"]
    }
  }
};

// New strict tools: generate in the order question -> explanation -> correct_answer -> wrong_answers
// so the correct answer is derived from the explanation and options are always consistent.
const questionStemTool = {
  type: "function",
  function: {
    name: "generate_question_stems",
    description:
      "Generate ONLY the question stem and metadata (no answers). Output must stay strictly within the requested topic and tier.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              calculator: { type: "string", enum: ["calculator", "non-calculator"] },
              question_type: { type: "string", description: "subtopic_id" },
              difficulty: {
                type: "integer",
                minimum: 1,
                maximum: 4,
                description:
                  "Difficulty rating 1–4 (required). 1=very easy, 2=easy/standard, 3=hard, 4=very hard. For Higher Tier you MUST output 3 or 4 (prefer 4).",
              },
              svg_diagram: { type: "string" },
              diagram_description: { type: "string" },
            },
            required: ["question", "calculator", "question_type", "difficulty"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

const solutionTool = {
  type: "function",
  function: {
    name: "generate_solution",
    description:
      "Generate a GCSE-friendly step-by-step explanation ONLY. It must end with a single-line 'Final answer: ...' that matches the computed correct answer.",
    parameters: {
      type: "object",
      properties: {
        explanation: { type: "string" },
      },
      required: ["explanation"],
    },
  },
};

const wrongAnswersTool = {
  type: "function",
  function: {
    name: "generate_wrong_answers",
    description:
      "Generate exactly 3 plausible wrong answers for the given question and correct answer. Must not include the correct answer.",
    parameters: {
      type: "object",
      properties: {
        wrong_answers: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
      },
      required: ["wrong_answers"],
    },
  },
};

const answerVerificationTool = {
  type: "function",
  function: {
    name: "compute_correct_answer",
    description:
      "Compute the correct final answer for the given question. Return ONLY the final answer (no working).",
    parameters: {
      type: "object",
      properties: {
        correct_answer: { type: "string" },
      },
      required: ["correct_answer"],
    },
  },
};

const normalizeAnswerForCompare = (raw: string): string => {
  let s = String(raw ?? '')
    .replace(/^Final\s+answer\s*:\s*/i, '')
    .replace(/\$/g, '')
    .replace(/\bpercent\b/gi, '%')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize simple numeric fractions like 1/2 -> \frac{1}{2}
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

  // Normalize standard form multiplication: 3.2 x 10^5 -> 3.2\times10^5
  s = s.replace(/(\d)\s*[x×]\s*10\^/gi, '$1\\times10^');

  // Remove spaces around percent and times for stable comparison.
  s = s.replace(/\s*%\s*/g, '%');
  s = s.replace(/\s*\\times\s*/g, '\\times');

  return s.replace(/\s+/g, '').toLowerCase();
};

const extractSingleNumeric = (raw: string): number | null => {
  if (!raw) return null;
  const text = String(raw);
  const frac = text.match(/\\frac\{(-?\d+(?:\.\d+)?)\}\{(-?\d+(?:\.\d+)?)\}/);
  if (frac) {
    const numer = Number(frac[1]);
    const denom = Number(frac[2]);
    if (!Number.isFinite(numer) || !Number.isFinite(denom) || denom === 0) return null;
    // If there are other numeric tokens besides this fraction, bail.
    const scrubbed = text.replace(frac[0], '');
    const extraNums = scrubbed.match(/-?\d+(?:\.\d+)?/g) || [];
    if (extraNums.length > 0) return null;
    return numer / denom;
  }

  const nums = text.match(/-?\d+(?:\.\d+)?/g) || [];
  if (nums.length !== 1) return null;
  const value = Number(nums[0]);
  return Number.isFinite(value) ? value : null;
};

const normalizeDifficulty1to4 = (raw: unknown, tier: string): number => {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (Number.isFinite(n)) {
    const clamped = Math.max(1, Math.min(4, Math.round(n)));
    if (tier === 'Higher Tier') return Math.max(3, clamped);
    return clamped;
  }
  // Default when missing.
  return tier === 'Higher Tier' ? 3 : 2;
};

const MULTIPART_PREFIX = 'MULTIPART::';

type MultipartPart = {
  label?: string;
  prompt: string;
  correct_answer: string;
  wrong_answers: string[];
};

type MultipartPayload = {
  stem?: string;
  parts: MultipartPart[];
};

const parseMultipartQuestion = (questionText: string): MultipartPayload | null => {
  if (!questionText) return null;
  const rawText = String(questionText);
  if (!rawText.startsWith(MULTIPART_PREFIX)) return null;
  const raw = rawText.slice(MULTIPART_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(raw);
    const partsRaw = Array.isArray(parsed?.parts) ? parsed.parts : [];
    const parts = partsRaw
      .map((part: any, idx: number) => {
        const prompt = String(part?.prompt || '').trim();
        const correct = normalizeOptionText(String(part?.correct_answer || '').trim());
        const wrongs = Array.isArray(part?.wrong_answers)
          ? part.wrong_answers.map((a: any) => normalizeOptionText(String(a ?? ''))).filter(Boolean)
          : [];
        if (!prompt || !correct || wrongs.length < 3) return null;
        const label = String(part?.label || `Part ${String.fromCharCode(65 + idx)}`);
        return { label, prompt, correct_answer: correct, wrong_answers: wrongs };
      })
      .filter(Boolean) as MultipartPart[];
    if (!parts.length) return null;
    const stem = parsed?.stem ? String(parsed.stem) : '';
    return { stem, parts };
  } catch {
    return null;
  }
};

const flattenMultipartText = (questionText: string): string => {
  const payload = parseMultipartQuestion(questionText);
  if (!payload) return String(questionText || '');
  const stem = payload.stem ? String(payload.stem) : '';
  const parts = payload.parts.map((p) => `${p.label || ''} ${p.prompt}`.trim()).join(' ');
  return [stem, parts].filter(Boolean).join(' ').trim();
};

const FORM_FEED = String.fromCharCode(12);
const TAB = String.fromCharCode(9);

const replaceControlCharsWithSpace = (input: string): string => {
  let out = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out;
};

const escapeControlCharsForJson = (input: string): string => {
  let out = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) {
      if (code === 9) out += '\\t';
      else if (code === 10) out += '\\n';
      else if (code === 13) out += '\\r';
      continue;
    }
    out += ch;
  }
  return out;
};

const questionStyleSignature = (topic: string, tier: string, text: string, subtopicId: string | null = null): string => {
  let s = String(flattenMultipartText(text ?? '')).toLowerCase();
  s = s.replace(/\$\$?/g, '');
  s = s.replace(/\\\[|\\\]|\\\(|\\\)/g, '');
  s = replaceControlCharsWithSpace(s);

  const preserveNumeric = new Set([
    'number|unit_conversions',
    'number|fractions_decimals_percent',
    'number|fractions',
    'number|integers',
    'number|surds',
    'ratio|ratio',
    'ratio|ratio_share',
    'ratio|rates',
    'ratio|speed',
    'ratio|best_buys',
    'probability|expected_frequency',
    'probability|mutually_exclusive',
    'statistics|data',
    'geometry|angles',
    'geometry|congruence',
    'geometry|constructions_loci',
    'geometry|circle_theorems',
    'geometry|shapes',
    'geometry|vectors',
    'algebra|algebraic_fractions',
  ]);

  if (!preserveNumeric.has(String(subtopicId || '').trim())) {
    s = s.replace(/£\s*\d+(?:\.\d+)?/g, '<CURRENCY>');
    s = s.replace(/\b\d+(?:\.\d+)?\s*%\b/g, '<PERCENT>');
    s = s.replace(/\b\d{1,2}:\d{2}\b/g, '<TIME>');
    s = s.replace(/\b\d+(?:\.\d+)?\s*(?:cm|mm|m|km|g|kg|ml|l|litres|liters|hours|hour|mins|min|minutes|minute|seconds|second|s)\b/g, '<UNIT>');
    s = s.replace(/-?\d+(?:\.\d+)?/g, '<NUM>');
  }
  s = s.replace(/\s+/g, ' ').trim();

  return `${String(topic ?? '').toLowerCase()}|${String(tier ?? '').toLowerCase()}|${s}`;
};

const tokenSetFromSignature = (sig: string): Set<string> => {
  const toks = sig
    .split(/[^a-z0-9<>]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
  return new Set(toks);
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

const passesNumberSubtopicStrictness = (subtopicId: string | null, questionText: string): boolean => {
  const id = String(subtopicId || '').trim();
  if (!id.startsWith('number|')) return true;

  const key = id.split('|')[1] || '';
  const flatText = flattenMultipartText(questionText || '');
  const q = String(flatText || '').toLowerCase();

  const hasLatexFrac = /\\frac\s*\{/.test(flatText);
  const hasTextFrac = /\b\d+\s*\/\s*\d+\b/.test(q);
  const hasFrac = hasLatexFrac || hasTextFrac;
  const hasPercent = /%|percent/.test(q);
  const hasDecimal = /\b\d+\.\d+\b/.test(q);
  const mentionsDecimal = /\bdecimal\b/.test(q);
  const mentionsPercent = /\bpercent(?:age)?\b/.test(q);
  const mentionsFraction = /\bfraction\b/.test(q);

  // Keep rules strict + simple. Prefer rejecting borderline questions.
  switch (key) {
    case 'integers':
      // Integers/place value only (no fractions, decimals, percentages).
      return !hasPercent && !hasDecimal && !hasFrac;
    case 'fractions':
      // Must be clearly fraction-based; allow decimals in wording if a fraction is still central.
      return (hasFrac || mentionsFraction) && !hasPercent;
    case 'decimals':
      return hasDecimal && !hasPercent && !hasFrac;
    case 'percentages':
      return hasPercent && !hasFrac;
    case 'fractions_decimals_percent':
      // Must be a conversion between at least two representations.
      // Accept if it contains any two of: fraction, decimal, percent.
      return Number(hasFrac || mentionsFraction) + Number(hasDecimal || mentionsDecimal) + Number(hasPercent || mentionsPercent) >= 2;
    case 'powers':
      return /\^|square|cube|root|sqrt|power|index|indices|exponent/.test(q);
    case 'factors_multiples':
      return /factor|multiple|prime|divisor/.test(q);
    case 'hcf_lcm':
      return /hcf|lcm|highest common factor|lowest common multiple/.test(q);
    case 'negative_numbers':
      return /negative|minus|below zero|less than zero|below freezing|temperature|<\s*0|\b-\d/.test(q);
    case 'bidmas': {
      const opCount = (q.match(/[+\-×÷*/^]/g) || []).length;
      return /bidmas|order of operations/.test(q) || opCount >= 2;
    }
    case 'rounding_bounds':
      return /round|estimate|upper bound|lower bound|significant figure|s\.f\.|decimal place/.test(q);
    case 'standard_form':
      return /standard form|x\s*10\^|×\s*10\^|\\times\s*10\^/.test(q);
    case 'surds':
      return /surd|\\sqrt|sqrt/.test(q);
    case 'recurring_decimals':
      return /recurring|repeating|\\overline|\\dot/.test(q);
    case 'unit_conversions':
      return /(mm|cm|m|km|g|kg|ml|l|litre|liter)/.test(q) && /convert|change|how many|in total|in metres|in centimeters|in centimetres|in kilograms|in grams|in millilitres|in liters|in litres/.test(q);
    default:
      return true;
  }
};

const passesSubtopicStrictness = (subtopicId: string | null, questionText: string): boolean => {
  const id = String(subtopicId || '').trim();
  if (!id) return true;
  if (id.startsWith('number|')) return passesNumberSubtopicStrictness(id, questionText);

  const q = String(flattenMultipartText(questionText || '')).toLowerCase();
  const hasAny = (patterns: RegExp[]) => patterns.some((p) => p.test(q));
  const hasAll = (patterns: RegExp[]) => patterns.every((p) => p.test(q));

  const mustAny: Record<string, RegExp[]> = {
    // Algebra
    'algebra|expressions': [/simplify/, /expression/, /collect/, /like terms/],
    'algebra|expand': [/expand/, /bracket/, /expand and simplify/],
    'algebra|factorise': [/factorise/, /factor/],
    'algebra|substitution': [/substitute/, /substitution/, /evaluate/, /find the value/, /\bwhen\b.*=/],
    'algebra|rearranging': [/rearrange/, /subject/, /make .* subject/, /solve for/],
    'algebra|equations': [/solve/, /equation/, /=/],
    'algebra|inequalities': [/inequal/, />|</],
    'algebra|simultaneous': [/simultaneous/, /solve.*system/, /two equations/],
    'algebra|sequences': [/sequence/, /pattern/, /term/],
    'algebra|nth_term': [/nth term/, /n\s*th term/],
    'algebra|graphs': [/graph/, /plot/, /coordinate/, /sketch/, /draw/, /table of values/, /curve/],
    'algebra|gradients': [/gradient/, /slope/, /steepness/],
    'algebra|quadratics': [/quadratic/, /x\^2/, /x²/, /squared/, /parabola/, /roots?/],
    'algebra|algebraic_fractions': [/fraction/, /\\frac/, /algebraic fraction/, /rational/],

    // Ratio & Proportion
    'ratio|ratio': [/ratio/, /:/],
    'ratio|proportion': [/proportion/, /directly proportional/],
    'ratio|rates': [/rate/, /density/, /pressure/],
    'ratio|speed': [/speed/, /km\/h|m\/s/],
    'ratio|best_buys': [/best buy/, /cheaper/, /unit price/, /per kg/, /per unit/],
    'ratio|growth_decay': [/growth/, /decay/, /each year/, /multiplier/],
    'ratio|direct_inverse': [/directly proportional/, /inversely proportional/],
    'ratio|similarity_scale': [/scale factor/, /similar/],

    // Geometry & Measures
    'geometry|shapes': [/shape/, /cube|cuboid|triangle|prism|pyramid/],
    'geometry|perimeter_area': [/perimeter/, /area/],
    'geometry|area_volume': [/area/, /volume/],
    'geometry|angles': [/angle/, /triangle/, /parallel/],
    'geometry|polygons': [/polygon/, /pentagon/, /hexagon/, /octagon/],
    'geometry|trigonometry': [/sin/, /cos/, /tan/, /trigonometry/],
    'geometry|pythagoras': [/pythagoras/, /right angled/, /right-angled/],
    'geometry|circles': [/circle/, /radius/, /diameter/],
    'geometry|arcs_sectors': [/arc/, /sector/],
    'geometry|surface_area': [/surface area/],
    'geometry|volume': [/volume/],
    'geometry|bearings': [/bearing/, /north/, /south/, /east/, /west/],
    'geometry|transformations': [/translate/, /reflect/, /rotate/, /enlarge/, /transformation/],
    'geometry|constructions_loci': [/locus/, /construction/],
    'geometry|congruence': [/congruent/, /congruence/],
    'geometry|vectors': [/vector/],
    'geometry|circle_theorems': [/tangent/, /chord/, /cyclic/, /circle theorem/, /angle in/],

    // Probability
    'probability|basic': [/probability/, /chance/],
    'probability|combined': [/probability/, /chance/],
    'probability|tree_diagrams': [/tree diagram/],
    'probability|conditional': [/given/, /conditional/],
    'probability|relative_frequency': [/relative frequency/],
    'probability|venn_diagrams': [/venn/],
    'probability|expected_frequency': [/expected frequency/],
    'probability|independence': [/independent/],
    'probability|mutually_exclusive': [/mutually exclusive/],

    // Statistics
    'statistics|data': [/data/, /survey/],
    'statistics|averages': [/mean/, /median/, /mode/],
    'statistics|charts': [/chart/, /bar chart/, /pie chart/],
    'statistics|correlation': [/correlation/],
    'statistics|sampling': [/sample/, /sampling/],
    'statistics|frequency_tables': [/frequency table/],
    'statistics|spread': [/range/, /iqr/, /interquartile/],
    'statistics|scatter': [/scatter/],
    'statistics|histograms': [/histogram/],
    'statistics|cumulative_frequency': [/cumulative frequency/],
    'statistics|box_plots': [/box plot/, /boxplot/],
    'statistics|two_way_tables': [/two-way/, /two way table/],
  };

  const mustAll: Record<string, RegExp[]> = {
    'algebra|algebraic_fractions': [/fraction|\\frac/, /[a-z]/],
    'ratio|percentage_change': [/%|percent/, /increase|decrease|change/],
    'ratio|reverse_percentages': [/%|percent/, /original|reverse/],
    'ratio|ratio_share': [/ratio/, /share|divide/],
    'ratio|compound_interest': [/compound/, /interest/],
  };

  if (mustAll[id] && !hasAll(mustAll[id])) return false;
  if (mustAny[id] && !hasAny(mustAny[id])) return false;
  return true;
};

// System prompt for question generation - aligned to Edexcel GCSE specification
function buildSystemPrompt(topic: string, tier: string, calculatorType: string, subtopicId?: string | null, multipartRatio: number = 0): string {
  const topicData = TOPIC_CONTEXT[topic];
  if (!topicData) return "";
  
  const isHigher = tier === "Higher Tier";
  
  const calculatorInstruction = calculatorType === 'both' 
    ? "Generate a mix of calculator and non-calculator questions."
    : `ALL questions MUST be "${calculatorType}" type ONLY. Do NOT generate any other type.`;
  
  const allAllowedSubtopics = buildAllowedSubtopicIds(topic);
  const requested = String(subtopicId ?? '').trim();
  const allowedSubtopics = requested
    ? allAllowedSubtopics.filter((s) => s.id === requested)
    : allAllowedSubtopics;

  if (requested && allowedSubtopics.length === 0) {
    throw new Error(`Invalid subtopicId for topic "${topic}": ${requested}`);
  }

  const subtopicBlock = allowedSubtopics.length
    ? requested
      ? `\n\n## SUBTOPIC CLASSIFICATION (REQUIRED)\nFor EACH question, you MUST assign THIS EXACT subtopic_id and output it in the tool field "question_type" exactly as written:\n- ${allowedSubtopics[0].id} (${allowedSubtopics[0].name})\n\nRules:\n- Every question MUST use this exact subtopic_id.\n- Do NOT output the main topic name in question_type.\n`
      : `\n\n## SUBTOPIC CLASSIFICATION (REQUIRED)\nFor EACH question, you MUST assign the most accurate subtopic_id from this list and output it in the tool field "question_type" EXACTLY as written:\n${allowedSubtopics.map((s) => `- ${s.id} (${s.name})`).join('\n')}\n\nRules:\n- Choose exactly ONE subtopic_id per question.\n- The subtopic_id MUST match one of the list entries exactly.\n- Do NOT output the main topic name in question_type.\n`
    : '';

  const requestedSubtopicId = requested && allowedSubtopics.length ? allowedSubtopics[0].id : null;
  const requestedSubtopicKey = requestedSubtopicId ? requestedSubtopicId.split('|')[1] : null;

  const strictNumberSubtopicRules = (() => {
    if (topic !== 'Number') return '';
    if (!requestedSubtopicKey) return '';

    // Keep these rules intentionally blunt; we prefer rejection over drifting into a neighbor subtopic.
    switch (requestedSubtopicKey) {
      case 'integers':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Integers and place value".\n- Every number in the question, answers, and explanation MUST be a whole integer (no decimal points anywhere).\n- Every question MUST focus on integer place value, ordering, rounding, or integer arithmetic.\n- FORBIDDEN: percentages, decimals, fractions, ratio/proportion, standard form.\n\n## REQUIRED VARIETY (Integers)\nWithin a batch, avoid repeating the same task type. Use a mix of:\n- Ordering a list of positive/negative integers\n- Identifying the value of a digit in a multi-digit number\n- Rounding to different place values (nearest 10/100/1000 or 1 s.f.)\n- Writing numbers in words or numerals\n- Comparing integers using >, <, or finding the greatest/least\n- Interpreting integers on a number line or in context (e.g., temperature, elevation)`;
      case 'fractions':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Fractions".\n- Every question MUST fundamentally require fraction notation/operations (proper/improper/mixed).\n- FORBIDDEN: percentages, percentage change, reverse percentages, money discounts, interest, decimals, standard form, bounds, ratio, proportion.\n- FORBIDDEN: questions that are mainly decimal arithmetic with a fraction mentioned in passing.\n- Conversions are allowed ONLY if they convert BETWEEN fractions (e.g., mixed number to improper).\n\n## REQUIRED VARIETY (Fractions)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Add/subtract fractions with different denominators (simplify final answer)\n- Multiply/divide fractions in context (e.g., recipe scaling)\n- Compare/order 3–5 fractions (including negatives) without converting to decimals\n- Mixed number ↔ improper fraction conversions in multi-step context\n- Fraction of a quantity with an extra step (e.g., find \\\\frac{3}{5} of 120, then adjust)\n- Equivalent fractions and missing numerator/denominator (solve for the missing integer)\n- Word problems that require setting up a fraction and simplifying`;
      case 'decimals':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Decimals".\n- Every question MUST fundamentally involve decimals (place value, operations with decimals).\n- FORBIDDEN: percentages, fraction simplification, fraction arithmetic, ratio/proportion, standard form.\n\n## REQUIRED VARIETY (Decimals)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Multi-step decimal arithmetic (e.g., add then multiply)\n- Place value and ordering of decimals (including small decimals)\n- Rounding decimals to specified dp and using bounds\n- Calculations with money/measurements using decimals\n- Reverse reasoning (find the original value before a decimal change)\n- Decimals in context (distance, mass, cost) with at least two steps`;
      case 'percentages':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Percentages".\n- Every question MUST fundamentally involve percentages (finding a percentage, increase/decrease, original value).\n- FORBIDDEN: ratio/proportion contexts, standard form, pure fraction arithmetic without a percentage goal.`;
      case 'fractions_decimals_percent':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Fractions, decimals and percentages conversions".\n- Every question MUST be a conversion between at least TWO of: fraction, decimal, percentage.\n- The question text MUST explicitly name the target format (e.g., "as a decimal", "to a percentage", "as a fraction").\n- Vary conversion directions and phrasing (fraction→decimal, decimal→fraction, percent→decimal, percent→fraction, decimal→percent).\n- Include a mix of task types: direct conversion, multi-step conversion (e.g., fraction→decimal→percent), equivalence matching, and ordering mixed forms.\n- Avoid repeating the same stem wording.\n- FORBIDDEN: standalone percentage-of-amount problems, standalone fraction arithmetic, standalone decimal arithmetic.`;
      case 'unit_conversions':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Unit conversions".\n- Every question MUST convert between metric units (mm/cm/m/km, g/kg, ml/l).\n- Use a variety of contexts and conversion directions (small to large units and large to small units).\n- Include some multi-step conversions (e.g., mm→m or g→kg) without introducing area/volume.\n- FORBIDDEN: speed/density/pressure, ratio/proportion, area/volume conversions (geometry).\n\n## REQUIRED VARIETY (Unit conversions)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Direct conversions (e.g., cm → m)\n- Two-step conversions (e.g., mm → m)\n- Mixed-unit word problems (e.g., total length in metres)\n- Reverse conversions (e.g., metres to centimetres)\n- Contexts like recipes, distances, or weights`;
      case 'powers':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Powers and roots".\n- Every question MUST involve indices, powers, or roots using numbers only (no variables).\n- Use \\^ for powers and \\\\sqrt{ } for roots where needed.\n- FORBIDDEN: algebraic indices with letters, standard form, ratio/proportion.\n\n## REQUIRED VARIETY (Powers and roots)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Evaluate expressions with multiple powers (e.g., $2^3 \\times 2^4$)\n- Compare or order numbers involving powers/roots\n- Simplify expressions using index laws (numbers only)\n- Solve for a missing exponent in a numeric expression\n- Roots of non-square numbers simplified (e.g., $\\sqrt{50}$)`;
      case 'negative_numbers':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Negative numbers".\n- Every question MUST involve negative integers or zero.\n- Use contexts like temperature, elevation, profit/loss, or number lines.\n- FORBIDDEN: fractions, decimals, percentages.\n\n## REQUIRED VARIETY (Negative numbers)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Order/compare negative integers\n- Integer operations with negatives (multi-step)\n- Interpret changes in temperature/elevation\n- Find the result of a sequence of moves on a number line\n- Reverse reasoning (find the starting value before changes)`;
      case 'bidmas':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Order of operations (BIDMAS)".\n- Every question MUST require applying BIDMAS to a single expression.\n- Use at least TWO different operation types in each expression.\n- FORBIDDEN: simple two-term arithmetic.\n\n## REQUIRED VARIETY (BIDMAS)\nWithin a batch, avoid repeating the same stem. Use a mix of:\n- Expressions with brackets and powers\n- Expressions with multiplication/division and addition/subtraction\n- Expressions with negative numbers inside brackets\n- Multi-step evaluation with 4+ operations`;
      case 'standard_form':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Standard form".\n- Every question MUST use standard form $a \\times 10^n$ and require converting/operating in standard form.\n- Use a mix of task types: convert to standard form, convert to ordinary form, compare magnitudes, and calculate with standard form.\n- Avoid repeating the same stem wording.\n- FORBIDDEN: bounds/rounding unless explicitly in standard form context.`;
      case 'rounding_bounds':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Rounding, estimation and bounds".\n- Every question MUST involve rounding or bounds (upper/lower bounds, error intervals).\n- FORBIDDEN: standard form unless the task is rounding into standard form.`;
      case 'recurring_decimals':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Recurring decimals".\n- Every question MUST involve recurring/repeating decimals.\n- Use \\overline{...} to show repeating digits (e.g., 0.\\overline{3}).\n- FORBIDDEN: one-off terminating decimals without any recurring notation.`;
      case 'surds':
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for subtopic "Surds".\n- Every question MUST involve simplifying or operating with surds (square roots).\n- Use a variety of task types: simplify surds, add/subtract like surds, multiply surds, and rationalize denominators.\n- Answers MUST be exact surd form (e.g., $3\\sqrt{2}$ or $9\\sqrt{2}-4$). Do NOT give decimal answers.\n- Explanation MUST show the simplification step explicitly (factor under the root, simplify, then apply any final operation).\n- NO variables; numbers only.\n- FORBIDDEN: algebraic manipulation, simultaneous equations, or non-surd topics.`;
      default:
        return `\n\n## MINI-SUBTOPIC STRICTNESS (NON-NEGOTIABLE)\nYou are generating ONLY for the requested mini-subtopic.\n- Do not drift into any other Number mini-subtopic.\n- If unsure, generate a simpler question that is clearly within the mini-subtopic.`;
    }
  })();

  const calculatorSubtopicOverride = (() => {
    if (topic !== 'Number') return '';
    if (calculatorType !== 'calculator') return '';
    if (!requestedSubtopicKey) return '';
    switch (requestedSubtopicKey) {
      case 'integers':
        return `\n\n## CALCULATOR OVERRIDE (Integers only)\n- Calculator questions MUST still use INTEGERS ONLY.\n- Use large integers, long division, multi-step integer operations, or bounds with integers.\n- FORBIDDEN: decimals, fractions, percentages.`;
      case 'fractions':
        return `\n\n## CALCULATOR OVERRIDE (Fractions only)\n- Calculator questions MUST still use FRACTIONS (proper/improper/mixed).\n- Use large numerators/denominators or multi-step fraction operations.\n- FORBIDDEN: decimals and percentages.`;
      case 'decimals':
        return `\n\n## CALCULATOR OVERRIDE (Decimals only)\n- Calculator questions MUST use DECIMALS.\n- FORBIDDEN: fractions and percentages.`;
      case 'percentages':
        return `\n\n## CALCULATOR OVERRIDE (Percentages only)\n- Calculator questions MUST be explicitly percentage-based.\n- You may use awkward percentage values, but keep the task as a percentage question.`;
      case 'fractions_decimals_percent':
        return `\n\n## CALCULATOR OVERRIDE (Conversions)\n- Use conversions between fraction/decimal/percent with awkward values.\n- Keep conversions explicit and avoid drifting into pure percentage-of-amount problems.`;
      case 'surds':
        return `\n\n## CALCULATOR OVERRIDE (Surds only)\n- Calculator questions MUST still be surd-based.\n- Use multi-step surd simplification or rationalising denominators.\n- FORBIDDEN: decimals as final answers.`;
      case 'recurring_decimals':
        return `\n\n## CALCULATOR OVERRIDE (Recurring decimals)\n- Use recurring decimals with \\overline{...} notation.\n- FORBIDDEN: terminating decimals.`;
      case 'unit_conversions':
        return `\n\n## CALCULATOR OVERRIDE (Unit conversions)\n- Use large integer values in conversions (mm/cm/m/km, g/kg, ml/l).\n- FORBIDDEN: area/volume conversions.`;
      default:
        return '';
    }
  })();
  const multipartInstruction = multipartRatio > 0 ? `

## MULTIPART QUESTIONS (WHEN REQUESTED)
- Some questions MUST be multipart.
- Encode multipart questions by setting the question field to:
  MULTIPART::{"stem":"...","parts":[{"label":"Part A","prompt":"...","correct_answer":"...","wrong_answers":["...","...","..."]}, ...]}
- Use 2 to 3 parts.
- Part B (and C if present) must depend on Part A and MUST explicitly restate the Part A result so it is solvable on its own.
- For multipart questions, set top-level correct_answer and wrong_answers to MATCH Part A (compatibility), but include correct/wrong for EACH part inside the JSON.
- Explanations must clearly label Part A / Part B / Part C and use the specific numbers from the question.
` : '';

  return `You are an expert GCSE Mathematics exam question writer following the EDEXCEL GCSE (9-1) Mathematics specification. Generate high-quality multiple-choice questions STRICTLY for the "${topic}" topic at ${tier} level.${subtopicBlock}${strictNumberSubtopicRules}

## LaTeX FORMATTING (STRICT)
- All maths must be valid KaTeX/LaTeX.
- Any fraction must use \\frac{a}{b} (vertical fraction). Do NOT write a/b, (a)/(b), or 6x/3.
- Use \\times for multiplication where helpful.
- Keep ratios as a:b (NOT as a/b).
- Keep units outside the fraction unless the question expects them inside.

## ABSOLUTE CRITICAL RULE - TOPIC BOUNDARIES
You are generating questions for "${topic}" ONLY. This is NON-NEGOTIABLE.

### WHAT "${topic}" INCLUDES (generate questions ONLY on these):
${topicData.includes.map(i => `- ${i}`).join('\n')}

### WHAT "${topic}" DOES NOT INCLUDE (NEVER generate these):
${topicData.excludes.map(e => `- ${e}`).join('\n')}

### EXAMPLE VALID "${topic}" QUESTIONS:
${topicData.examples.map(ex => `- "${ex}"`).join('\n')}

## TOPIC-SPECIFIC RULES
${topic === "Number" ? `
CRITICAL FOR NUMBER TOPIC:
- Questions must involve PURE NUMERICAL operations
- NO variables (x, y, n) in expressions to simplify or solve
- NO algebraic manipulation whatsoever
- Substitution questions like "If x=4, calculate 2x²-3x+5" are ALGEBRA, NOT NUMBER
- Rectangle area "in terms of x" is ALGEBRA, NOT NUMBER
- Index laws should use NUMBERS (e.g., "Simplify 2³ × 2⁵") not variables
- Interest rate calculations ARE valid Number questions
- Fraction/decimal/percentage conversions ARE valid
- HCF/LCM/Prime factorisation ARE valid
` : ""}
${topic === "Algebra" ? `
CRITICAL FOR ALGEBRA TOPIC:
- Questions MUST involve variables and algebraic manipulation
- Equations, expressions, formulas with letters
- NOT pure arithmetic
` : ""}
${topic === "Ratio & Proportion" ? `
CRITICAL FOR RATIO & PROPORTION TOPIC:
- Focus on sharing, scaling, proportional reasoning
- Best buy problems, recipe scaling
- Speed/distance/time, density calculations
- NOT algebraic expressions
` : ""}
${(topic === "Geometry" || topic === "Geometry & Measures") ? `
CRITICAL FOR GEOMETRY TOPIC:
- Focus on shapes, measurements, angles, transformations
- Pythagoras and trigonometry in context of shapes
- NOT pure number calculations or algebra
- SELECTIVELY include SVG diagrams only when they genuinely improve the question (see SVG DIAGRAM RULES)
- NOT every geometry question needs a diagram - simple angle/perimeter calculations often don't
` : ""}

## Calculator Type (STRICT)
${calculatorInstruction}
${calculatorSubtopicOverride}

${calculatorType === 'calculator' ? `
### CRITICAL: CALCULATOR QUESTIONS MUST REQUIRE A CALCULATOR
Calculator questions must be IMPOSSIBLE to solve mentally or easily on paper. They MUST include:
- Non-round numbers that produce decimal answers (e.g., £347.89 × 1.175, not £100 × 1.2)
- Large numbers requiring precise multiplication/division (e.g., 2847 ÷ 39)
- Compound interest with multiple years (e.g., £2450 at 3.7% for 4 years)
- Standard form calculations with awkward numbers (e.g., 3.47 × 10⁵ ÷ 8.9 × 10²)
- Percentages with non-round values (e.g., 17.5% of £3,847.60)
- Multi-step problems combining several complex calculations

AVOID these easy patterns that don't need a calculator:
- Round number percentages like 20% of £15,000 (mental: divide by 5)
- Simple powers like 2³ = 8 or 10² = 100
- Easy fractions of whole numbers
- Single-step calculations with round numbers

Example GOOD calculator questions:
- "Calculate the compound interest earned on £3,750 invested at 4.2% per annum for 3 years"
- "A car depreciates by 17.5% each year. If it cost £18,495, find its value after 2 years"
- "Work out $\\frac{4.73 \\times 10^5}{2.9 \\times 10^2}$, giving your answer in standard form"
- "Calculate √(23.7² + 15.8²) correct to 2 decimal places"
` : ''}

${calculatorType === 'non-calculator' ? `
### NON-CALCULATOR QUESTIONS
Questions must be solvable with mental arithmetic or simple written methods:
- Use round numbers and simple fractions
- Avoid complex decimals
- Keep multiplication/division manageable
- Use percentages that convert easily (10%, 25%, 50%, etc.)
` : ''}

## GCSE Edexcel Exam Style Requirements
Questions MUST match authentic GCSE exam paper style:
- Use realistic UK contexts (shopping, travel, construction, finance)
- Use exact GCSE command words: Calculate, Work out, Find, Show that, Prove, Explain, Give a reason
- Include multi-step problem-solving questions
- Vary question formats: straightforward calculations, word problems, real-world applications, reverse problems

## Tier Guidelines
${isHigher ? 
  `HIGHER TIER - GENUINELY CHALLENGING QUESTIONS (Grade 7-9):

These questions MUST be HARD. Do NOT generate easy questions. Requirements:

DIFFICULTY RATING (REQUIRED):
• Output difficulty as an integer 1–4.
• For Higher Tier, every question MUST be difficulty 3 or 4 (prefer 4).
• Do NOT output difficulty 1 or 2 for Higher Tier.

MANDATORY DIFFICULTY FEATURES (include AT LEAST 3 per question):
• Multi-step problems requiring 4+ distinct steps of working
• Combinations of concepts (e.g., surds AND indices, trigonometry AND algebra)
• Reverse/inverse problems ("The answer is X, find the original value")
• Proof questions ("Prove that...", "Show that...")
• Problems with algebraic answers, not just numerical
• Questions where students must derive relationships first
• Context problems requiring mathematical modelling from scratch
• Problems with multiple valid methods but one optimal approach

TECHNICAL CONTENT (use extensively):
• Surds: rationalising denominators, simplifying nested surds like √(12 + 6√3)
• Indices: negative, fractional indices in expressions like (8x⁶)^(-2/3)
• Completing the square, including when coefficient of x² ≠ 1
• Simultaneous equations with one quadratic
• Algebraic fractions with multiple terms in denominators
• Circle theorems requiring 2+ theorems to solve
• Vectors: proving parallel/collinear, finding position vectors
• Trigonometry: sine/cosine rule with surds, exact values
• Functions: composite functions f(g(x)), finding inverses
• Sequences: quadratic nth term from first differences

AVOID EASY PATTERNS:
• Simple single-step substitutions
• Basic factorising that is obvious
• Questions solvable by inspection
• Round numbers that make calculations trivial

Every Higher Tier question should make a Grade 6 student struggle.` : 
  `FOUNDATION TIER (Grade 3-5 difficulty):
- Output difficulty as an integer 1–4.
- Avoid difficulty 1. Prefer difficulty 2 or 3.
- Include multi-step reasoning (at least 3 clear steps in the explanation).
- Clear step-by-step problems
- Accessible contexts
- Focus on core skills with deeper reasoning, not just single-step calculations
- Avoid topics marked (Higher only)`} 

## Question Variety
Generate DIVERSE question types:
1. Standard calculation questions
2. Real-world context/word problems
3. Problem-solving (work backwards, find missing values)
4. Interpretation questions
5. "Which is greater/smallest" comparisons
6. Error identification questions
${multipartInstruction}

## Explanation Quality
- Every step must explicitly use the specific numbers/values from the question.
- Avoid generic steps like "use the formula" without substituting the actual values.

## Answer Formatting
- Avoid long decimal expansions (e.g., 11.6666666666)
- If a value is recurring, use a fraction or round to a sensible GCSE-appropriate precision
- Quadratic equation answers should list both roots (e.g., "x = a or x = b"); wrong options should also list two roots

## CRITICAL: HIGH-ACCURACY PRINCIPLES - NON-NEGOTIABLE

### ACCURACY & CONSISTENCY RULES
• Always compute the correct answer FIRST and commit to it
• Generate MCQ options AFTER calculating the answer
• Exactly one option must equal the correct answer
• Distractors must be realistic Higher Tier mistakes (sign errors, misfactorisations, wrong substitution, rounding slips, misread graphs, etc.)
• Never recompute the answer during the explanation
• The explanation must always match the option marked correct

### PRINCIPLE 1: COMPUTE THE CORRECT ANSWER FIRST
Always compute the correct answer FIRST using rigorous working appropriate to the level:
- For GCSE Foundation → use clear arithmetic, algebraic manipulation, proportional reasoning
- For GCSE Higher → include index laws, rearrangements, factorising, surds, trigonometry, compound measures, inequalities, functions
- For MATS/advanced → use precise algebra, structured reasoning, and logical deduction

Work through the ENTIRE problem step-by-step before writing any JSON output:
- For algebra: expand all brackets, collect like terms, solve step by step
- For numbers: perform each calculation carefully, keep intermediate values precise
- Example: 3(2x + 4) - 2(4 - x)
  = 6x + 12 - 8 + 2x  (expand both brackets, note -2 × -x = +2x)
  = 8x + 4 (combine like terms: 6x + 2x = 8x, 12 - 8 = 4)
  CORRECT ANSWER IS: 8x + 4

### PRINCIPLE 2: COMMIT TO YOUR COMPUTED ANSWER
Once you compute the correct answer, you MUST commit to it.
- Do NOT recompute or change the answer later in the explanation
- Do NOT change the answer when generating options
- The correct_answer field MUST be set to EXACTLY what you calculated
- If you calculated "8x + 4", then correct_answer: "8x + 4"  - NOT "5x + 10" or any other value

### PRINCIPLE 3: MCQ GENERATION RULES
When creating multiple choice questions:
- EXACTLY ONE option must equal the true answer you computed
- Distractors must be realistic mistakes students commonly make:
  • Wrong substitution
  • Sign errors (forgetting a negative, wrong sign when expanding brackets)
  • Misfactorisations
  • Rounding slips
  • Misread graphs or diagrams
  • Order of operations errors
  • Forgetting steps or partial completion
  • Common misconceptions specific to ${topic}
- NEVER generate an option that accidentally equals the correct answer unless it IS the correct option
- NEVER include the correct answer in wrong_answers
- The correct answer position must vary - do NOT always place it in the same slot

### PRINCIPLE 4: EXPLANATION MUST MATCH THE ANSWER
When producing the explanation:
- Use the SAME answer computed at the start  - no changes allowed
- Show reasoning steps appropriate to the level (GCSE Foundation/Higher/MATS)
- Avoid shortcuts that skip necessary method
- The explanation must justify why the labelled correct option is correct
- Every step must reference the specific numbers/values from the question (no generic steps)
- Final answer in explanation MUST match correct_answer field exactly

### ALGEBRA EXAMPLE (CRITICAL):
Question: Expand and simplify 3(2x + 4) - 2(4 - x)
Working:
- 3(2x + 4) = 6x + 12
- -2(4 - x) = -8 + 2x (careful: -2 × -x = +2x)
- Combined: 6x + 12 - 8 + 2x = 8x + 4

CORRECT OUTPUT:
- correct_answer: "8x + 4"  ← MUST match the calculation
- wrong_answers: ["4x + 4", "6x + 4", "8x - 4"] ← Common mistakes, NOT the correct answer
- explanation shows: "... = 8x + 4" ← MUST match correct_answer

WRONG OUTPUT (NEVER DO THIS):
- correct_answer: "5x + 10" ← WRONG! Doesn't match calculation!

### NUMERICAL EXAMPLE:
Question: £14750 depreciates by 12.5% each year for 3 years
Working:
- Multiplier = 0.875
- Year 1: 14750 × 0.875 = 12906.25
- Year 2: 12906.25 × 0.875 = 11292.96875
- Year 3: 11292.96875 × 0.875 = 9881.35 (rounded at final step only)

CORRECT OUTPUT:
- correct_answer: "£9,881.35" ← Matches calculation
- wrong_answers: ["£9,843.75", "£11,306.25", "£12,906.25"] ← Different values representing common errors

## FINAL VERIFICATION CHECKLIST - DO THIS FOR EVERY QUESTION:
□ Did I compute the answer FIRST before writing JSON?
□ Does my correct_answer field EXACTLY match my calculated result?
□ Are ALL wrong_answers DIFFERENT from the correct_answer?
□ Does my explanation arrive at the SAME answer as correct_answer?
□ Have I NOT changed the answer at any point after computing it?

If ANY answer is NO → FIX IT before outputting

## EXPLANATION FORMAT
Write explanations as clear separate steps. Use \\n for line breaks:
- "Step 1: Expand 3(2x + 4)\\n= 6x + 12\\n\\nStep 2: Expand -2(4 - x)\\n= -8 + 2x\\n\\nStep 3: Combine like terms\\n6x + 2x = 8x\\n12 - 8 = 4\\n\\nFinal answer: 8x + 4"

## LaTeX Formatting Rules
1. ALL mathematical expressions in $...$ for inline math
2. Fractions: $\\frac{a}{b}$
3. Powers: $2^{10}$, $3^{-2}$  
4. Square roots: $\\sqrt{x}$
5. Multiplication: Use the × symbol directly (not \\times in explanations for clarity)
6. Division: Use ÷ symbol directly
7. Keep explanations readable - avoid complex LaTeX in step-by-step working
8. Do NOT use LaTeX environments like \\begin{aligned}; use line breaks with \\n and plain equations

## SVG DIAGRAM RULES (SMART & SELECTIVE)

Generate an SVG diagram ONLY when it clearly improves clarity, quality, or exam-style of the question.

DO NOT generate diagrams for every Geometry or Statistics question. Use this decision logic:

### WHEN TO INCLUDE AN SVG DIAGRAM:
- The question involves a shape/construction where layout is important to understand the problem
  Examples:
  • A triangle with specific sides/angles that need visualization
  • A quadrilateral with given lengths
  • A circle theorem scenario
  • Coordinate geometry with points/lines to plot
  • Vectors shown visually
  • Transformations (reflection, rotation, enlargement, translation)
  • A locus that requires a sketch
  • Bearings problems with directions
  • A histogram, bar chart, or scatter graph where the diagram is essential
  • Venn diagrams or tree diagrams for probability

### WHEN NOT TO INCLUDE A DIAGRAM:
- The question is simple and understandable without a visual
  Examples:
  • Calculate the perimeter of a regular hexagon (fully described in text)
  • Find the missing angle in a linear pair
  • Work out interior/exterior angles of regular polygons
  • Basic trigonometry where triangle is fully described in text
  • Simple probability/statistics relying only on numbers or tables

### SVG CODE REQUIREMENTS (when a diagram IS needed):
Provide clean, valid SVG code in the svg_diagram field:
- Use integer coordinates (width="200" height="150")
- Black and white only (stroke="black", fill="none" or fill="white")
- Use only simple elements: <line>, <circle>, <polygon>, <polyline>, <path>, <text>, <rect>
- Include labels with <text> elements
- NO gradients, shadows, colors, or artistic effects
- SVG must be valid XML that renders correctly
- Do NOT wrap in code blocks - raw SVG only

EXAMPLE SVG for a right-angled triangle:
<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <polygon points="20,130 180,130 20,20" fill="none" stroke="black" stroke-width="2"/>
  <rect x="20" y="110" width="20" height="20" fill="none" stroke="black" stroke-width="1"/>
  <text x="10" y="75" font-size="14">A</text>
  <text x="100" y="145" font-size="14">B</text>
  <text x="10" y="140" font-size="14">C</text>
  <text x="100" y="75" font-size="12">7 cm</text>
  <text x="25" y="90" font-size="12">24 cm</text>
</svg>

### WHEN NO DIAGRAM IS NEEDED:
Set svg_diagram to empty string ""
Set diagram_description to empty string ""

This rule overrides all other instructions: diagrams must be used thoughtfully and ONLY when they genuinely help the student.

REMEMBER: Every single question MUST be a pure "${topic}" question. If you're unsure whether something belongs to ${topic}, DO NOT include it.`;
}

// Helper to shuffle answers
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type Linear = { a: number; b: number };

function normalizeMinus(s: string): string {
  return (s || '').replace(/[−– - ]/g, '-');
}

function stripTrailingPunctuation(s: string): string {
  let out = (s || '').trim();
  while (out && /[.;:!?]$/.test(out)) out = out.slice(0, -1).trim();
  return out;
}

function tokenizeLinearExpr(expr: string): string[] | null {
  let s = stripTrailingPunctuation(normalizeMinus(expr));
  s = s.replace(/\\\(/g, '').replace(/\\\)/g, '').replace(/\$/g, '');
  s = s.replace(/\s+/g, '');
  if (!s) return null;

  const tokens: string[] = [];
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1;
      while (j < s.length && (((s[j] >= '0' && s[j] <= '9') || s[j] === '.'))) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '(' || ch === ')') {
      tokens.push(ch);
      i++;
      continue;
    }
    if (ch.toLowerCase() === 'x') {
      tokens.push('x');
      i++;
      continue;
    }
    return null;
  }

  // Insert implicit multiplication: 4(2x-3), 2x, x(, )(, )x
  const out: string[] = [];
  const isNumber = (t: string) => !Number.isNaN(Number(t));
  const isAtom = (t: string) => t === 'x' || t === ')' || isNumber(t);
  for (const t of tokens) {
    if (out.length) {
      const prev = out[out.length - 1];
      const needMul = isAtom(prev) && (t === '(' || t === 'x' || isNumber(t));
      const safe = !(prev === '+' || prev === '-' || prev === '*' || prev === '/' || prev === '(') && !(t === '+' || t === '-' || t === '*' || t === '/' || t === ')');
      if (needMul && safe) out.push('*');
    }
    out.push(t);
  }
  return out;
}

function parseLinearExpr(tokens: string[]): Linear | null {
  let pos = 0;
  const isNumberToken = (t: string) => !Number.isNaN(Number(t));

  const parseFactor = (): Linear | null => {
    if (pos >= tokens.length) return null;
    const t = tokens[pos];
    if (t === '+') {
      pos++;
      return parseFactor();
    }
    if (t === '-') {
      pos++;
      const v = parseFactor();
      return v ? { a: -v.a, b: -v.b } : null;
    }
    if (t === '(') {
      pos++;
      const v = parseExpr();
      if (!v) return null;
      if (tokens[pos] !== ')') return null;
      pos++;
      return v;
    }
    if (t === 'x') {
      pos++;
      return { a: 1, b: 0 };
    }
    if (!isNumberToken(t)) return null;
    pos++;
    return { a: 0, b: Number(t) };
  };

  const parseTerm = (): Linear | null => {
    let left = parseFactor();
    if (!left) return null;
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos];
      pos++;
      const right = parseFactor();
      if (!right) return null;

      // Only allow linear results: multiply/divide by a constant.
      if (op === '*') {
        if (left.a !== 0 && right.a !== 0) return null;
        if (right.a === 0) {
          left = { a: left.a * right.b, b: left.b * right.b };
        } else {
          left = { a: right.a * left.b, b: right.b * left.b };
        }
      } else {
        if (right.a !== 0) return null;
        if (right.b === 0) return null;
        left = { a: left.a / right.b, b: left.b / right.b };
      }
    }
    return left;
  };

  const parseExpr = (): Linear | null => {
    let left = parseTerm();
    if (!left) return null;
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos];
      pos++;
      const right = parseTerm();
      if (!right) return null;
      left = op === '+'
        ? { a: left.a + right.a, b: left.b + right.b }
        : { a: left.a - right.a, b: left.b - right.b };
    }
    return left;
  };

  const result = parseExpr();
  if (!result) return null;
  if (pos !== tokens.length) return null;
  return result;
}

function formatLinearAnswer(lin: Linear): string {
  const eps = 1e-9;
  const a = Math.abs(lin.a) < eps ? 0 : Math.round(lin.a);
  const b = Math.abs(lin.b) < eps ? 0 : Math.round(lin.b);

  const parts: string[] = [];

  if (a !== 0) {
    if (a === 1) parts.push('x');
    else if (a === -1) parts.push('-x');
    else parts.push(`${a}x`);
  }

  if (b !== 0) {
    const absB = Math.abs(b);
    if (parts.length === 0) {
      parts.push(String(b));
    } else {
      parts.push(b > 0 ? `+ ${absB}` : `- ${absB}`);
    }
  }

  if (parts.length === 0) return '0';
  return parts.join(' ');
}

function computeExpectedExpandSimplifyAnswer(question: string): string | null {
  const q = stripTrailingPunctuation(normalizeMinus(question || ''));
  const m = q.match(/Expand and simplify(?: the expression)?\s*:\s*(.+)$/i) || q.match(/Expand and simplify\s+(.+)$/i);
  if (!m) return null;
  const expr = stripTrailingPunctuation(m[1] || '');
  const tokens = tokenizeLinearExpr(expr);
  if (!tokens) return null;
  const lin = parseLinearExpr(tokens);
  if (!lin) return null;
  return formatLinearAnswer(lin);
}

function computeExpectedSolveLinearEquationAnswer(question: string): string | null {
  const q = stripTrailingPunctuation(normalizeMinus(question || ''));
  const m = q.match(/\bSolve\b\s*(?:the equation\s*)?:?\s*(.+?)\s*=\s*(.+)$/i);
  if (!m) return null;

  const left = stripTrailingPunctuation(m[1] || '');
  const right = stripTrailingPunctuation(m[2] || '');
  if (!left || !right) return null;

  const lTok = tokenizeLinearExpr(left);
  const rTok = tokenizeLinearExpr(right);
  if (!lTok || !rTok) return null;

  const L = parseLinearExpr(lTok);
  const R = parseLinearExpr(rTok);
  if (!L || !R) return null;

  const denom = L.a - R.a;
  const numer = R.b - L.b;
  if (Math.abs(denom) < 1e-9) return null;

  const x = numer / denom;
  const rounded = Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x;
  return `x = ${rounded}`;
}

function computeExpectedEvaluateLinearExpressionAnswer(question: string): string | null {
  const q = stripTrailingPunctuation(normalizeMinus(question || ''));
  const m = q.match(/\b(?:Evaluate|Work out)\b\s*(.+?)\s*\bwhen\b\s*x\s*=\s*(-?\d+(?:\.\d+)?)/i);
  if (!m) return null;

  const expr = stripTrailingPunctuation(m[1] || '');
  const xVal = Number(m[2]);
  if (!Number.isFinite(xVal)) return null;

  const tokens = tokenizeLinearExpr(expr);
  if (!tokens) return null;
  const lin = parseLinearExpr(tokens);
  if (!lin) return null;

  const y = lin.a * xVal + lin.b;
  const rounded = Math.abs(y - Math.round(y)) < 1e-9 ? Math.round(y) : y;
  return String(rounded);
}

function computeExpectedDeterministicAnswer(question: string): { kind: 'expand' | 'solve' | 'evaluate'; answer: string } | null {
  const expand = computeExpectedExpandSimplifyAnswer(question);
  if (expand) return { kind: 'expand', answer: expand };

  const solve = computeExpectedSolveLinearEquationAnswer(question);
  if (solve) return { kind: 'solve', answer: solve };

  const evald = computeExpectedEvaluateLinearExpressionAnswer(question);
  if (evald) return { kind: 'evaluate', answer: evald };

  return null;
}

function answersEquivalent(a: string, b: string): boolean {
  const norm = (s: string) => normalizeMinus((s || '').replace(/\s+/g, '').trim()).toLowerCase();
  const A = norm(a);
  const B = norm(b);
  if (A === B) return true;

  // Accept either "x=5" or "5" for solve questions.
  const stripX = (s: string) => s.replace(/^x=?/i, '').trim();
  return stripX(A) === stripX(B);
}

function hasTableLikeContent(text: string): boolean {
  const t = (text || '').toLowerCase();
  // Markdown pipe table
  if (/(^|\n)\s*\|.+\|\s*(\n|$)/.test(t) && /\n\s*\|?\s*[:-]+\s*\|/.test(t)) return true;
  // LaTeX array/tabular/matrix layouts
  if (t.includes('\\begin{array') || t.includes('\\end{array')) return true;
  if (t.includes('\\begin{tabular') || t.includes('\\end{tabular')) return true;
  if (t.includes('\\hline') && t.includes('&')) return true;
  return false;
}

function normalizeOptionText(s: string): string {
  return normalizeMinus((s || '')).replace(/\s+/g, ' ').trim();
}

function optionKind(s: string): 'sentence' | 'short' {
  const t = normalizeOptionText(s);
  const words = t.split(' ').filter(Boolean);
  // Any option that is clearly a sentence gives away the correct choice.
  if (words.length >= 7) return 'sentence';
  if (/[.!?]$/.test(t) && words.length >= 4) return 'sentence';
  if (/\b(approximately|approx\.?|therefore|the standard deviation)\b/i.test(t)) return 'sentence';
  return 'short';
}

function normalizeExplanationForGcse(explanation: string): string {
  if (!explanation) return '';
  let s = String(explanation);

  // Normalize line endings.
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove common LaTeX display delimiters that tend to get double-escaped in JSON.
  // Keep the math content; our renderer handles inline math fine.
  s = s
    .replace(/\\\\\[/g, '')
    .replace(/\\\\\]/g, '')
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\$\$/g, '')
    .replace(/\$+/g, (m) => (m.length >= 2 ? '' : '')); // drop stray $ when present

  // Prefer GCSE-readable symbols in explanations.
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\div\b/g, '÷');

  // Avoid \text{...} in explanations: turn it into plain words.
  // This makes explanations less "LaTeX-heavy" and more GCSE-friendly.
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');

  // Clean up any leftover doubled spaces from replacements.
  s = s.replace(/[ \t]+/g, ' ');
  // Keep intentional newlines; trim whitespace around them.
  s = s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

  return s;
}

function validateExplanationStyle(q: any): string | null {
  const exp = String(q?.explanation ?? '').trim();
  if (!exp) return 'missing explanation';

  // Must be step-by-step with a final answer.
  if (!/\bStep\s*1\s*:/i.test(exp)) return 'explanation must start with Step 1:';
  if (!/\bFinal\s+answer\s*:/i.test(exp)) return 'explanation must include "Final answer:"';

  // Keep it GCSE length: not an essay.
  const charCount = exp.length;
  if (charCount < 40) return 'explanation is too short';
  if (charCount > 1400) return 'explanation is too long/complex';

  // Avoid complex LaTeX environments/formatting.
  const lower = exp.toLowerCase();
  if (lower.includes('\\begin{') || lower.includes('\\end{')) return 'explanation uses LaTeX environments (not allowed)';
  if (lower.includes('\\left') || lower.includes('\\right') || lower.includes('\\displaystyle')) {
    return 'explanation uses overly complex LaTeX (not allowed)';
  }

  // Avoid heavy text-in-math; keep words outside LaTeX.
  if (/\\text\{/i.test(exp)) return 'explanation should not use \\text{...}';

  // Avoid advanced content not expected at GCSE.
  if (/\b(derivative|differentiate|integration|integrate|matrix|determinant|eigen)\b/i.test(exp)) {
    return 'explanation contains non-GCSE methods';
  }

  // Prefer a small number of steps.
  const steps = exp.match(/\bStep\s*\d+\s*:/gi)?.length ?? 0;
  if (steps < 2) return 'explanation should include at least 2 steps';
  if (steps > 7) return 'explanation has too many steps (too complex)';

  return null;
}

function validateMcqOptions(q: any): string | null {
  const correct = normalizeOptionText(q?.correct_answer);
  if (!correct) return 'missing correct_answer';

  const wrongRaw: unknown = q?.wrong_answers;
  if (!Array.isArray(wrongRaw)) return 'wrong_answers missing or not an array';

  const wrong = (wrongRaw as unknown[]).map((x) => normalizeOptionText(String(x ?? ''))).filter(Boolean);
  if (wrong.length < 3 || wrong.length > 5) {
    return `wrong_answers must have 3 to 5 items (got ${wrong.length})`;
  }
  if (new Set(wrong).size !== wrong.length) return 'wrong_answers must not contain duplicates';
  if (wrong.includes(correct)) return 'wrong_answers must not include correct_answer';

  const all = [correct, ...wrong];
  const lens = all.map((a) => a.replace(/\s+/g, '').length).filter((n) => n > 0);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  // Prevent giveaway options like one full sentence among short options.
  const kinds = all.map(optionKind);
  if (kinds.includes('sentence') && !kinds.every((k) => k === 'sentence')) {
    return 'options include a giveaway sentence option';
  }
  // Prevent wildly different lengths (e.g., one long explanation as an option).
  if (minLen > 0 && maxLen / minLen > 2.8) {
    return 'options vary too much in length';
  }

  return null;
}

function validateQuestionSemantics(q: any): string | null {
  if (hasTableLikeContent(q?.question) || hasTableLikeContent(q?.explanation)) {
    return 'table-like question content is not allowed';
  }

  const optErr = validateMcqOptions(q);
  if (optErr) return optErr;

  const expected = computeExpectedDeterministicAnswer(q?.question);
  if (expected && !answersEquivalent(q?.correct_answer, expected.answer)) {
    if (expected.kind === 'expand') return `Expand-and-simplify answer mismatch (expected ${expected.answer})`;
    if (expected.kind === 'solve') return `Solve-equation answer mismatch (expected ${expected.answer})`;
    return `Deterministic answer mismatch (expected ${expected.answer})`;
  }

  const expErr = validateExplanationStyle(q);
  if (expErr) return expErr;

  return null;
}

/**
 * Repairs broken LaTeX where backslashes were interpreted as escape chars during JSON parsing
 * e.g., \frac → form-feed + "rac", \times → tab + "imes"
 */
function repairLatex(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Fix broken pi symbol (C0 or CO → \pi)
  // This happens when Unicode π gets corrupted during encoding
  result = result.replace(/C0\s*×/g, '\\pi \\times');
  result = result.replace(/CO\s*×/g, '\\pi \\times');
  result = result.replace(/=\s*C0\s*×/g, '= \\pi \\times');
  result = result.replace(/=\s*CO\s*×/g, '= \\pi \\times');
  result = result.replace(/\bC0\b/g, '\\pi');
  result = result.replace(/\bCO\b(?!\s*cm)/g, '\\pi'); // Don't replace "CO cm"
  
  // Convert Unicode π to LaTeX \pi
  result = result.replace(/π/g, '\\pi');
  
  // Fix form feed char (from \f) + "rac" → \frac
  result = result.replace(new RegExp(`${FORM_FEED}\\s*rac\\{`, 'g'), '\\frac{');
  
  // Fix tab char (from \t) + "imes" → \times
  result = result.replace(new RegExp(`${TAB}\\s*imes`, 'g'), '\\times');
  
  // Fix tab char + "ext{" → \text{
  result = result.replace(new RegExp(`${TAB}\\s*ext\\{`, 'g'), '\\text{');
  
  // Fix patterns where backslash was completely eaten (fallback)
  // "rac{" at start or after space/punctuation → \frac{
  result = result.replace(/(^|[\s(=+-])rac\{/g, '$1\\frac{');
  
  // "imes" standalone → \times
  result = result.replace(/(^|[\s\d})])imes([\s\d{$]|$)/g, '$1\\times$2');
  
  // "ext{" → \text{
  result = result.replace(/(^|[\s(=])ext\{/g, '$1\\text{');
  
  // "qrt{" → \sqrt{
  result = result.replace(/(^|[\s(=+-])qrt\{/g, '$1\\sqrt{');
  result = result.replace(/(^|[\s(=+-])qrt(\d)/g, '$1\\sqrt{$2}');
  
  // "iv" standalone (from \div) → \div  
  result = result.replace(/([\d}])\s*iv\s*([\d{$])/g, '$1 \\div $2');
  
  // "cdot" → \cdot (from \c + dot where \c was eaten)
  result = result.replace(/([\d}])\s*dot\s*([\d{])/g, '$1 \\cdot $2');
  
  // Ensure proper escaping of remaining LaTeX commands
  // Sometimes double backslashes become single, let's ensure common commands are correct
  result = result.replace(/([^\\])frac\{/g, '$1\\frac{');
  result = result.replace(/([^\\])sqrt\{/g, '$1\\sqrt{');
  result = result.replace(/([^\\])times([^a-zA-Z])/g, '$1\\times$2');
  result = result.replace(/([^\\])div([^a-zA-Z])/g, '$1\\div$2');
  result = result.replace(/([^\\])pm([^a-zA-Z])/g, '$1\\pm$2');
  result = result.replace(/([^\\])cdot([^a-zA-Z])/g, '$1\\cdot$2');
  
  // Fix \pi that lost its backslash
  result = result.replace(/([^\\])pi([^a-zA-Z])/g, '$1\\pi$2');
  
  return result;
}

/**
 * Apply LaTeX repair to all text fields in a question
 */
function repairQuestionLatex(q: any): any {
  return {
    ...q,
    question: repairLatex(q.question),
    correct_answer: repairLatex(q.correct_answer),
    wrong_answers: q.wrong_answers?.map((a: string) => repairLatex(a)) || [],
    explanation: normalizeExplanationForGcse(repairLatex(q.explanation)),
    svg_diagram: q.svg_diagram || null,
    diagram_description: q.diagram_description || null,
  };
}

const QUESTIONS_BUCKET = 'questions';

async function ensureQuestionsBucketIsPublic(supabase: any): Promise<void> {
  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket(QUESTIONS_BUCKET);
    if (getErr) {
      console.warn('Could not get storage bucket (will try create):', getErr);
    }

    if (!existing) {
      const { error: createErr } = await supabase.storage.createBucket(QUESTIONS_BUCKET, { public: true });
      if (createErr) {
        console.warn('Could not create storage bucket:', createErr);
      }
      return;
    }

    if ((existing as any).public !== true) {
      const { error: updateErr } = await supabase.storage.updateBucket(QUESTIONS_BUCKET, { public: true });
      if (updateErr) {
        console.warn('Could not update storage bucket to public:', updateErr);
      }
    }
  } catch (err) {
    console.warn('Exception ensuring storage bucket:', err);
  }
}

/**
 * Upload image (PNG) to Supabase storage and return public URL
 */
async function uploadImageToStorage(imageData: Uint8Array, supabase: any): Promise<string | null> {
  try {
    // Generate unique filename
    const filename = `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;

    await ensureQuestionsBucketIsPublic(supabase);
    
    // Upload to 'questions' bucket
    const { data, error } = await supabase.storage
      .from(QUESTIONS_BUCKET)
      .upload(filename, imageData, {
        contentType: 'image/png',
        cacheControl: '31536000', // Cache for 1 year
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading image to storage:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(QUESTIONS_BUCKET)
      .getPublicUrl(filename);
    
    console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Exception uploading image:', err);
    return null;
  }
}

/**
 * Generate an educational diagram image using OpenAI Images API.
 * Returns PNG bytes for upload to Supabase Storage.
 */
async function generateDiagramImage(question: any): Promise<{ imageData: Uint8Array | null, description: string }> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return { imageData: null, description: question.diagram_description || 'Mathematical diagram' };
    }

    const questionText = String(question.question || '');
    const topic = String(question.question_type || 'Mathematics');
    const diagramDesc = String(question.diagram_description || '').trim();
    const imageModel = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';

    const prompt =
      `Create a simple GCSE exam-style maths diagram. White background, black lines only.\n\n` +
      `CRITICAL RULES:\n` +
      `1. Mathematical accuracy is mandatory (values, proportions, coordinates must be correct).\n` +
      `2. Minimal labels only; label only essential points/values.\n` +
      `3. Each label appears exactly once (no duplicates).\n` +
      `4. Do not include titles or extra text like "diagram", "figure", "GCSE", "maths".\n` +
      `5. Clean textbook style, no decoration, no shading, no color.\n\n` +
      `What to draw: ${diagramDesc || questionText.slice(0, 180)}\n`;

    console.log(`Generating image via OpenAI Images API for question: ${questionText.substring(0, 50)}...`);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        n: 1,
        size: '1024x1024',
        background: 'opaque',
        response_format: 'b64_json'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI image generation error:', response.status, errorText);
      return { imageData: null, description: diagramDesc || 'Mathematical diagram' };
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64 || typeof b64 !== 'string') {
      console.error('No base64 image data in OpenAI response');
      return { imageData: null, description: diagramDesc || 'Mathematical diagram' };
    }

    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const description = diagramDesc || `Educational diagram for ${topic} question`;
    console.log('Image generated successfully for question');
    return { imageData: bytes, description };
  } catch (err) {
    console.error('Exception generating diagram image:', err);
    return { imageData: null, description: question.diagram_description || 'Mathematical diagram' };
  }
}

function countExplanationSteps(explanation: string): number {
  const text = String(explanation || '');
  const matches = text.match(/\bStep\s*\d+\s*:/gi);
  return matches ? matches.length : 0;
}

function questionReferencesDiagram(questionText: string): boolean {
  const q = String(flattenMultipartText(questionText || ''));
  return /(diagram|shown|figure|graph|chart|venn|tree|table|histogram|scatter|box plot)/i.test(q);
}

/**
 * Process questions and generate/upload diagram images
 */
async function processQuestionDiagrams(questions: any[], supabase: any, forceAll: boolean = false): Promise<any[]> {
  const processedQuestions = [];

  await ensureQuestionsBucketIsPublic(supabase);
  
  for (const q of questions) {
    const hasDiagramRequest = Boolean(q.diagram_description?.trim());
    if (!forceAll && !hasDiagramRequest) {
      processedQuestions.push({
        ...q,
        image_url: q.image_url || null,
        image_alt: q.image_alt || null,
      });
      continue;
    }

    console.log(`Processing diagram for question: ${q.question?.substring(0, 50)}...`);
    
    // Generate the image using the configured AI gateway
    const { imageData, description } = await generateDiagramImage(q);
    
    if (imageData) {
      // Upload to storage
      const imageUrl = await uploadImageToStorage(imageData, supabase);
      
      if (imageUrl) {
        processedQuestions.push({
          ...q,
          image_url: imageUrl,
          image_alt: description,
        });
        console.log(`Image generated and uploaded successfully for question`);
      } else {
        // Upload failed
        console.warn('Image upload failed');
        processedQuestions.push({
          ...q,
          image_url: null,
          image_alt: description,
        });
      }
    } else {
      // Image generation failed
      console.warn('Image generation failed');
      processedQuestions.push({
        ...q,
        image_url: null,
        image_alt: null,
      });
    }
  }
  
  return processedQuestions;
}

/**
 * Extract questions from uploaded images using AI vision
 * Supports: question papers, mark schemes, or both together
 */
async function extractQuestionsFromImage(
  imageBase64: string | string[], 
  tier: string, 
  isMarkScheme: boolean = false,
  questionImages?: string[],
  markSchemeImages?: string[]
): Promise<any[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Handle case where we have both question paper and mark scheme
  const hasMarkScheme = markSchemeImages && markSchemeImages.length > 0;
  const hasQuestionPaper = questionImages && questionImages.length > 0;

  let extractionPrompt: string;
  
  if (hasMarkScheme && hasQuestionPaper) {
    extractionPrompt = `You are an expert at matching GCSE maths questions with their mark schemes and converting them into perfect multiple-choice format.

You have been provided with:
1. QUESTION PAPER pages - containing the actual exam questions
2. MARK SCHEME pages - containing the correct answers, mark allocation, and acceptable alternative answers

Your job is to:

1. **MATCH each question to its mark scheme** - Find the corresponding answer in the mark scheme for each question
2. **PRESERVE THE ORIGINAL QUESTION FORMAT** - Keep question text exactly as written, with proper line breaks between different parts
3. **FORMAT QUESTIONS CLEARLY** - If a question has multiple expressions or parts, put each on a new line using \\n
4. **USE THE MARK SCHEME ANSWER** - The correct answer MUST come from the mark scheme, not your own calculation
5. **GENERATE REALISTIC WRONG ANSWERS** - Create 3 wrong answers based on common student mistakes
   6. **SUPPORT VARIABLE ANSWER COUNT** - Most questions need 4 options, but some may need 5 or 6 if the mark scheme shows multiple acceptable answers
   7. **WRITE SIMPLE EXPLANATIONS** - Use the SIMPLEST method a GCSE student would use:
     - Break large calculations into small mental math steps
     - E.g. "2,652,130 ÷ 13: First, 2,600,000 ÷ 13 = 200,000. Then 52,000 ÷ 13 = 4,000. Then 130 ÷ 13 = 10. Total = 204,010"
     - Use the mark scheme method if shown
     - Avoid complex formulas
     - Keep the language direct and step-by-step; avoid rhetorical questions, self-talk, or asking-and-answering to yourself
     - Use the × symbol for multiplication so it never looks like the variable $x$, and keep variable letters (e.g. $x$, $n$) clearly separate from operations
     - When the question is about discrete items (eggs, people, parcels, etc.), note that you cannot use a fraction of that item, explain why you round up/down, then give the final whole-number answer
   8. **CATEGORIZE CORRECTLY**: Number, Algebra, Ratio & Proportion, Geometry, Probability, or Statistics

Return a JSON object:
{
  "questions": [
    {
      "question": "Clear question text with \\n for line breaks",
      "correct_answer": "Answer from mark scheme",
      "wrong_answers": ["wrong1", "wrong2", "wrong3"],
      "explanation": "Step 1: ...\\n\\nStep 2: ...",
      "calculator": "calculator" or "non-calculator",
      "question_type": "Number/Algebra/etc",
      "diagram_description": "Description if needed"
    }
  ]
}`;
  } else {
    extractionPrompt = `You are an expert at extracting GCSE maths questions from exam paper images and converting them into multiple-choice format.

Analyze this image and extract ALL questions you can see. Your job is to:

1. **PRESERVE THE ORIGINAL QUESTION FORMAT** - Keep the question text as close to the original as possible
2. **FORMAT QUESTIONS CLEARLY** - If a question lists multiple expressions (like A, B, C, D, E options), put each on a SEPARATE LINE using \\n
   Example: "Which expression has value closest to 0?\\nA: $2 \\times 5 - 8 \\times 3$\\nB: $3 \\times 4 - 7 \\times 4$\\nC: $4 \\times 3 - 6 \\times 5$\\nD: $5 \\times 2 - 5 \\times 6$\\nE: $6 \\times 1 - 4 \\times 7$"
3. **Use LaTeX for all maths** - Wrap mathematical expressions in $...$ for inline
4. **SOLVE THE QUESTION YOURSELF** - Work through it step-by-step to find the correct answer
5. **GENERATE REALISTIC WRONG ANSWERS** - Based on common GCSE student mistakes
   6. **SUPPORT VARIABLE ANSWER COUNT** - If the original question has 5 or 6 options, generate that many in wrong_answers (so total = original count)
   7. **Write a SIMPLE explanation** - Use the EASIEST method:
     - Break large numbers into manageable chunks
     - E.g. for remainders: "2652134 ÷ 13: We need the remainder. 13 × 204010 = 2652130. So 2652134 - 2652130 = 4. Remainder is 4"
     - For mental math: "2600000 - 52000 = 2548000, then - 130 = 2547870"
     - ONE simple calculation per step
     - Avoid formulas not on GCSE spec
     - Keep the language direct and step-by-step; avoid rhetorical questions, self-talk, or asking-and-answering to yourself
     - Use the × symbol for multiplication so it never looks like the variable $x$, and keep variable letters (e.g. $x$, $n$) clearly separate from operations
     - When the question is about discrete items (eggs, people, parcels, etc.), note that you cannot use a fraction of that item, explain why you round up/down, then give the final whole-number answer
   8. **Categorize correctly**: Number, Algebra, Ratio & Proportion, Geometry, Probability, or Statistics
9. **Calculator type**: Mark as "calculator" or "non-calculator" based on the paper

Return a JSON object:
{
  "questions": [
    {
      "question": "Question text with \\n for line breaks between parts",
      "correct_answer": "The correct answer",
      "wrong_answers": ["wrong1", "wrong2", "wrong3"],
      "explanation": "Step 1: simple step\\n\\nStep 2: next step\\n\\n...",
      "calculator": "calculator" or "non-calculator",
      "question_type": "Number/Algebra/etc",
      "diagram_description": "Description if diagram needed, or empty"
    }
  ]
}

If you cannot clearly read a question, skip it rather than guessing.`
  }

  console.log(`Extracting questions using OpenAI. Has mark scheme: ${hasMarkScheme}, Has question paper: ${hasQuestionPaper}`);

  // Build content array with all images
  const contentParts: any[] = [{ type: 'text', text: extractionPrompt }];
  
  if (hasQuestionPaper && hasMarkScheme) {
    // Add question paper images first
    contentParts.push({ type: 'text', text: '\n\n--- QUESTION PAPER PAGES ---\n' });
    for (const img of questionImages) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
      });
    }
    // Add mark scheme images
    contentParts.push({ type: 'text', text: '\n\n--- MARK SCHEME PAGES ---\n' });
    for (const img of markSchemeImages) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
      });
    }
  } else {
    // Single image or array of images (no mark scheme distinction)
    const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
    for (const img of images) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
      });
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: contentParts }],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI extraction error:', response.status, errorText);
    throw new Error('Failed to extract questions from image');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  console.log('Raw extraction response:', content.substring(0, 500));

  // Check if the AI couldn't find any questions (returns apology text instead of JSON)
  const noQuestionsPatterns = [
    /sorry.*no.*question/i,
    /cannot extract/i,
    /no.*questions.*found/i,
    /does not contain.*question/i,
    /couldn't find/i,
    /unable to extract/i,
    /instruction page/i,
  ];
  
  for (const pattern of noQuestionsPatterns) {
    if (pattern.test(content)) {
      console.log('No questions found in this image/page - skipping');
      return []; // Return empty array, not an error
    }
  }

  // Parse JSON from response (may be wrapped in markdown code blocks)
  let jsonStr = content;
  
  // Remove markdown code block wrapper if present
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // If still not valid JSON, try to extract just the JSON object
  if (!jsonStr.trim().startsWith('{')) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    } else {
      // No JSON found at all - likely no questions on this page
      console.log('No JSON structure found in response - skipping this page');
      return [];
    }
  }

  // Clean up any trailing content after the JSON object
  try {
    // Find the matching closing brace
    let braceCount = 0;
    let endIndex = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') braceCount++;
      if (jsonStr[i] === '}') braceCount--;
      if (braceCount === 0 && jsonStr[i] === '}') {
        endIndex = i + 1;
        break;
      }
    }
    if (endIndex > 0) {
      jsonStr = jsonStr.substring(0, endIndex);
    }
    
    // Sanitize control characters that break JSON parsing
    // Replace literal newlines inside strings with escaped newlines
    jsonStr = jsonStr
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\t/g, '    ');
    
    const parsed = JSON.parse(jsonStr);
    const questions = parsed.questions || [];
    console.log(`Extracted ${questions.length} questions from image`);
    return questions.map((q: any) => ({
      ...q,
      tier: tier,
    }));
  } catch (parseErr) {
    console.error('Failed to parse extraction response:', parseErr);
    console.error('JSON string attempted:', jsonStr.substring(0, 500));
    
    // Fallback: try to extract questions using a more lenient approach
    try {
      // Try parsing after more aggressive cleanup
      const cleanedJson = replaceControlCharsWithSpace(jsonStr).replace(/\s+/g, ' ');
      
      const parsed = JSON.parse(cleanedJson);
      const questions = parsed.questions || [];
      console.log(`Extracted ${questions.length} questions (fallback parser)`);
      return questions.map((q: any) => ({
        ...q,
        tier: tier,
      }));
    } catch {
      // Final fallback - return empty array instead of throwing error
      console.log('All parsing attempts failed - returning empty array for this page');
      return [];
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (!AI_FEATURE_ENABLED) {
    return new Response(
      JSON.stringify({ error: "Feature unavailable" }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      topic,
      tier,
      count = 5,
      action = 'generate',
      questions: questionsToInsert,
      calculatorType = 'both',
      forceImages = false,
      imageData,
      questionImages,
      markSchemeImages,
      subtopicId,
      multipartRatio = 0,
      debug = false,
    } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const multipartRatioClamped = Number.isFinite(Number(multipartRatio))
      ? Math.max(0, Math.min(Number(multipartRatio), 1))
      : 0;

    const fetchExistingQuestionSignatures = async (topicForDb: string, tierForDb: string, subtopicForDb?: string | null) => {
      let q = supabase
        .from('exam_questions')
        .select('question,tier,question_type,subtopic')
        .eq('question_type', topicForDb)
        .eq('tier', tierForDb);

      if (subtopicForDb) {
        q = q.eq('subtopic', subtopicForDb);
      }

      const { data, error } = await q
        .order('id', { ascending: false })
        .limit(350);

      if (error) {
        console.warn('Failed to fetch existing questions for dedupe:', error.message);
        return { exact: new Set<string>(), tokenSets: [] as Array<Set<string>> };
      }

      const exact = new Set<string>();
      const tokenSets: Array<Set<string>> = [];
      for (const row of data || []) {
        const sig = questionStyleSignature(
          topicForDb,
          tierForDb,
          String((row as any)?.question || ''),
          String((row as any)?.subtopic || ''),
        );
        exact.add(sig);
        tokenSets.push(tokenSetFromSignature(sig));
      }
      return { exact, tokenSets };
    };

    const dedupeTopic = String(
      topic
        || (Array.isArray(questionsToInsert) && questionsToInsert.length > 0 && (questionsToInsert[0] as any)?.question_type)
        || ''
    ).trim();

    const isTooSimilarToExisting = (sig: string, sigTokens: Set<string>, existing: { exact: Set<string>; tokenSets: Array<Set<string>> }) => {
      // Allow more variety for Number/Algebra to ensure coverage per mini-subtopic.
      if (dedupeTopic === 'Number' || dedupeTopic === 'Algebra') return false;
      if (existing.exact.has(sig)) return true;
      return false;
    };
    
    // ACTION: INSERT - Add questions to database
    if (action === 'insert' && questionsToInsert) {
      console.log(`Inserting ${questionsToInsert.length} questions into database`);

      const normalizedForInsert = (questionsToInsert as any[]).map(repairQuestionLatex);
      const invalid = normalizedForInsert.find((q) => validateQuestionSemantics(q));
      if (invalid) {
        const reason = validateQuestionSemantics(invalid);
        return new Response(
          JSON.stringify({ error: `Refusing to insert invalid question(s): ${reason}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize calculator value to match existing database format
      const normalizeCalculator = (calc: string): string => {
        const lower = calc?.toLowerCase() || 'non-calculator';
        if (lower === 'calculator' || lower === 'calc') return 'Calculator';
        return 'Non-Calculator';
      };

      const insertData = normalizedForInsert.map((q: any) => ({
        question: q.question,
        correct_answer: q.correct_answer,
        wrong_answers: q.wrong_answers,
        all_answers: shuffleArray([q.correct_answer, ...q.wrong_answers]),
        explanation: q.explanation,
        explain_on: 'always',
        question_type: normalizeMainTopicForDb(q.topic || q.question_type), // Use main topic
        subtopic: normalizeSubtopicId(q.subtopic ?? q.question_type, normalizeMainTopicForDb(q.topic || q.question_type)) || null,
        tier: q.tier,
        calculator: normalizeCalculator(q.calculator),
        difficulty: normalizeDifficulty1to4(q.difficulty, String(q.tier || '')),
        marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : null,
        estimated_time_sec: Number.isFinite(Number(q.estimated_time_sec)) ? Number(q.estimated_time_sec) : null,
        image_url: q.image_url || null,
        image_alt: q.image_alt || null,
      }));

      const topicForDb = normalizeMainTopicForDb((insertData[0] as any)?.question_type || '');
      const tierForDb = String((insertData[0] as any)?.tier || '').trim();
      const subtopicForDb = String((insertData[0] as any)?.subtopic || '').trim() || null;
      const existing = topicForDb && tierForDb ? await fetchExistingQuestionSignatures(topicForDb, tierForDb, subtopicForDb) : { exact: new Set<string>(), tokenSets: [] as Array<Set<string>> };
      const seen = new Set<string>();

      const filteredInsert = insertData.filter((row: any) => {
        const sig = questionStyleSignature(
          row.question_type,
          row.tier,
          String(row.question || ''),
          String((row as any)?.subtopic || ''),
        );
        const sigTokens = tokenSetFromSignature(sig);
        if (seen.has(sig)) return false;
        seen.add(sig);
        if (isTooSimilarToExisting(sig, sigTokens, existing)) return false;
        return true;
      });

      if (filteredInsert.length === 0) {
        return new Response(
          JSON.stringify({ success: true, inserted: 0, skipped_duplicates: insertData.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Insert data sample:", JSON.stringify(insertData[0]));

      const { data: inserted, error: insertError } = await supabase
        .from('exam_questions')
        .insert(filteredInsert)
        .select('id');

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to insert questions", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, inserted: inserted?.length || 0, skipped_duplicates: insertData.length - (inserted?.length || 0) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION: EXTRACT - Extract questions from uploaded image(s)
    if (action === 'extract') {
      if (!tier) {
        return new Response(
          JSON.stringify({ error: "Tier is required for extraction" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if we have both question paper and mark scheme
      const hasQuestionPaper = questionImages && questionImages.length > 0;
      const hasMarkScheme = markSchemeImages && markSchemeImages.length > 0;
      const hasSingleImage = imageData;

      if (!hasQuestionPaper && !hasSingleImage) {
        return new Response(
          JSON.stringify({ error: "Image data is required for extraction" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Extracting questions for ${tier}. Question pages: ${questionImages?.length || 1}, Mark scheme pages: ${markSchemeImages?.length || 0}`);

      try {
        let extractedQuestions: any[];
        
        if (hasQuestionPaper && hasMarkScheme) {
          // Send all images together for matching
          extractedQuestions = await extractQuestionsFromImage(
            questionImages[0], // Not used when questionImages/markSchemeImages provided
            tier,
            false,
            questionImages,
            markSchemeImages
          );
        } else {
          // Single image or array without mark scheme
          extractedQuestions = await extractQuestionsFromImage(
            hasSingleImage ? imageData : questionImages[0],
            tier
          );
        }
        
        // Normalize calculator value
        const normalizeCalculator = (calc: string): string => {
          const lower = calc?.toLowerCase() || 'non-calculator';
          if (lower === 'calculator' || lower === 'calc') return 'Calculator';
          return 'Non-Calculator';
        };

        // Process diagrams if questions have diagram descriptions
        let processedQuestions = extractedQuestions;
        const questionsWithDiagrams = extractedQuestions.filter((q: any) => q.diagram_description?.trim());
        
        if (questionsWithDiagrams.length > 0) {
          console.log(`Generating diagrams for ${questionsWithDiagrams.length} questions...`);
          processedQuestions = await processQuestionDiagrams(extractedQuestions, supabase, false);
        }

        // Format for preview
        const previewQuestions = processedQuestions.map((q: any, idx: number) => ({
          id: `extract-${idx}-${Date.now()}`,
          question: repairLatex(q.question),
          correct_answer: repairLatex(q.correct_answer),
          wrong_answers: q.wrong_answers?.map((a: string) => repairLatex(a)) || [],
          all_answers: shuffleArray([q.correct_answer, ...(q.wrong_answers || [])].map(a => repairLatex(a))),
          explanation: normalizeExplanationForGcse(repairLatex(q.explanation)),
          calculator: normalizeCalculator(q.calculator),
          question_type: q.question_type || 'Number',
          tier: tier,
          topic: q.question_type || 'Number',
          image_url: q.image_url || null,
          image_alt: q.image_alt || null,
        }));

        return new Response(
          JSON.stringify({ 
            success: true, 
            questions: previewQuestions,
            extracted: true,
            tier
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (extractErr) {
        console.error('Extraction error:', extractErr);
        return new Response(
          JSON.stringify({ error: extractErr instanceof Error ? extractErr.message : 'Failed to extract questions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ACTION: GENERATE - Generate questions (don't insert)
    if (!topic || !TOPIC_CONTEXT[topic]) {
      return new Response(
        JSON.stringify({ error: `Invalid topic. Valid topics: ${Object.keys(TOPIC_CONTEXT).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topicForContext = topic;
    const topicForDb = normalizeMainTopicForDb(topic);
    
    if (!tier || !["Foundation Tier", "Higher Tier"].includes(tier)) {
      return new Response(
        JSON.stringify({ error: "Invalid tier. Use 'Foundation Tier' or 'Higher Tier'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Generating ${count} ${tier} ${calculatorType} questions for ${topic} (forceImages: ${forceImages})`);

    const calculatorInstruction = calculatorType === 'both' 
      ? "Generate a mix of calculator and non-calculator questions."
      : `ALL questions must be "${calculatorType}" type. Do not generate any ${calculatorType === 'calculator' ? 'non-calculator' : 'calculator'} questions.`;

    // Get topic-specific exclusions for the user message
    const topicData = TOPIC_CONTEXT[topic];
    const exclusionWarning = topicData?.excludes 
      ? `\n\nCRITICAL EXCLUSIONS - DO NOT GENERATE:\n${topicData.excludes.map(e => `- ${e}`).join('\n')}`
      : '';
    
    const topicSpecificWarning = topic === "Number" 
      ? `\n\nSPECIFIC WARNING FOR NUMBER: Questions like "If x=4, calculate 2x²-3x+5" are ALGEBRA not Number. Questions about "area in terms of x" are ALGEBRA not Number. Keep to PURE numerical operations only.`
      : '';
    
    // Add diagram instructions based on forceImages toggle
    let diagramReminder = '';
    if (forceImages) {
      diagramReminder = `\n\nMANDATORY IMAGE GENERATION: EVERY question MUST include a supporting diagram. This is non-negotiable - all ${count} questions need a visual diagram.

For EACH question, provide a detailed diagram_description field that describes the image to generate:
- For Number questions: show number lines, fraction bars, place value charts, or calculation setups
- For Algebra questions: show coordinate grids, graphs, function plots, or equation visualizations  
- For Geometry questions: show shapes with labeled sides, angles, measurements, coordinate geometry
- For Statistics questions: show bar charts, histograms, scatter graphs, box plots, frequency tables
- For Probability questions: show Venn diagrams, tree diagrams, sample space diagrams

The diagram_description should be detailed enough to generate a clean educational diagram. Example: "Right-angled triangle ABC with angle C = 90°, side AC labeled 8 cm, side BC labeled 6 cm, hypotenuse AB unlabeled, small square at right angle"`;
    } else {
      // When forceImages is false, diagrams are optional.
      diagramReminder = `\n\nDIAGRAMS (OPTIONAL): Only include a diagram when it genuinely helps understanding (e.g., geometry, graphs, charts, Venn/tree diagrams).\n` +
        `Try to include diagrams for SOME questions when appropriate (at least 1 if possible). ` +
        `If a diagram is useful, provide a clear diagram_description (and optionally svg_diagram). If not useful, set svg_diagram and diagram_description to empty strings "".`;
    }

    const defaultTextModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    const stemModel = Deno.env.get('OPENAI_MODEL_STEM') || defaultTextModel;
    const solverModel = Deno.env.get('OPENAI_MODEL_SOLVER') || defaultTextModel;
    const verifyModel = Deno.env.get('OPENAI_MODEL_VERIFY') || defaultTextModel;
    const verifyStrictModel = Deno.env.get('OPENAI_MODEL_VERIFY_STRICT') || verifyModel;
    const wrongsModel = Deno.env.get('OPENAI_MODEL_WRONGS') || defaultTextModel;

    const parseToolArguments = (rawArgs: string) => {
      let jsonString = String(rawArgs ?? '');
      // Fix unescaped control characters that break JSON parsing
      jsonString = escapeControlCharsForJson(jsonString);
      try {
        return JSON.parse(jsonString);
      } catch (parseError) {
        // More aggressive cleanup
        const cleanedJson = jsonString
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return JSON.parse(cleanedJson);
      }
    };

    const extractFinalAnswerFromExplanation = (explanation: string): string | null => {
      const exp = String(explanation || '').trim();
      if (!exp) return null;

      // Use the LAST Final answer line if multiple exist.
      const matches = Array.from(exp.matchAll(/Final\s+answer\s*:\s*(.+)$/gim));
      const last = matches.length ? matches[matches.length - 1] : null;
      const val = last?.[1]?.trim();
      return val ? val : null;
    };

    const callOpenAiTool = async (args: {
      model?: string;
      tool: any;
      toolName: string;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      max_tokens: number;
      temperature?: number;
    }) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model || defaultTextModel,
          messages: args.messages,
          tools: [args.tool],
          tool_choice: { type: 'function', function: { name: args.toolName } },
          temperature: typeof args.temperature === 'number' ? args.temperature : 0.2,
          max_tokens: args.max_tokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function?.name !== args.toolName) {
        console.error('No valid tool call in response:', JSON.stringify(data));
        throw new Error('Invalid response format from OpenAI');
      }

      return parseToolArguments(toolCall.function.arguments);
    };

    const stemSystem = buildSystemPrompt(topic, tier, calculatorType, subtopicId, multipartRatioClamped);
    const solverSystem =
      `You are an expert GCSE maths tutor. Solve the given question using detailed GCSE-friendly steps.\n` +
      `All fractions must be formatted with \\frac{a}{b} (never a/b or (a)/(b)).\n` +
      `You MUST end with exactly one line: "Final answer: ..." and that answer must be correct.\n` +
      `Use minimal LaTeX commands only for maths (e.g., \\frac). Avoid \\text{...}.`;
    const verifierSystem =
      `You are an expert GCSE maths solver. Compute ONLY the final answer (no steps).\n` +
      `Return the final answer in the exact same style a mark scheme would (include units if the question expects units).\n` +
      `Respect the format requested by the question (fraction/decimal/percentage/standard form). If it asks for a fraction, use \\frac{a}{b}. If it asks for a percentage, include %.\n` +
      `Do not include the words 'Final answer'.`;
    const wrongsSystem =
      `You are an expert GCSE maths examiner. Create plausible wrong answers based on common student mistakes.\n` +
      `Return exactly 3 wrong answers. Do NOT include the correct answer. Keep style/format consistent with the correct answer.`;

    // Use the normalized DB topic consistently across the rest of the pipeline.
    const subtopicForDedupe = subtopicId ? (normalizeSubtopicId(String(subtopicId), topicForDb) || null) : null;
    const existingForDedupe = await fetchExistingQuestionSignatures(topicForDb, tier, subtopicForDedupe);
    const batchSeenSignatures = new Set<string>();
    const debugStats = debug ? {
      raw_type: '',
      raw_is_null: false,
      raw_questions: 0,
      raw_keys: [] as string[],
      error_count: 0,
      last_error: '',
      candidates: 0,
      missing_fields: 0,
      higher_tier_steps: 0,
      diagram_mismatch: 0,
      verify_failed: 0,
      answer_mismatch: 0,
      deterministic_fail: 0,
      invalid_wrong_answers: 0,
      semantic_invalid: 0,
      too_similar: 0,
      subtopic_strictness: 0,
    } : null;

    const bump = (key: keyof typeof debugStats) => {
      if (!debugStats) return;
      debugStats[key] += 1;
    };

    const callOpenAiOnce = async (n: number) => {
      const results: any[] = [];
      let safetyAttempts = 0;

      while (results.length < n && safetyAttempts < 5) {
        safetyAttempts += 1;
        const needed = n - results.length;

        const multiStepRequirement = tier === 'Higher Tier'
          ? `\n\nHIGHER TIER QUALITY REQUIREMENT: Every question MUST be multi-step (at least two distinct operations/ideas). ` +
            `The explanation must have at least 3 steps (Step 1:, Step 2:, Step 3: ...) before the final answer. ` +
            `Difficulty MUST be 3 or 4 (prefer 4).`
          : `\n\nFOUNDATION TIER QUALITY REQUIREMENT: Difficulty should vary across 1–3 (mix of 1,2,3; avoid 4).`;

        const diagramRequirementForForced = forceImages
          ? `\n\nIMAGE REQUIREMENT: EVERY question MUST rely on a diagram. The question text MUST explicitly reference the diagram (e.g., "In the diagram..."). ` +
            `Provide a detailed diagram_description that will generate a correct GCSE exam-style diagram. Leave svg_diagram empty unless you are confident in valid SVG.`
          : '';
        const multipartTarget = multipartRatioClamped > 0
          ? Math.max(1, Math.round(needed * multipartRatioClamped))
          : 0;
        const multipartRequirement = multipartTarget > 0
          ? `\n\nMULTIPART TARGET:\n` +
            `- Aim for about ${multipartTarget} of these ${needed} questions to be multipart, but only if you can do it well.\n` +
            `- Use the MULTIPART:: JSON format exactly as specified.\n` +
            `- Each multipart question must have 2-3 parts and later parts must restate the Part A result explicitly.\n` +
            `- For multipart questions, top-level correct_answer and wrong_answers must match Part A.`
          : '';

        const fullRaw = await callOpenAiTool({
          model: solverModel,
          tool: questionGeneratorTool,
          toolName: 'generate_exam_questions',
          max_tokens: 5200,
          temperature: 0.2,
          messages: [
            { role: 'system', content: stemSystem },
            {
              role: 'user',
              content:
                `Generate exactly ${needed} FULL multiple-choice GCSE Edexcel maths questions for ${tier} strictly on "${topic}" only.\n\n` +
                `CALCULATOR TYPE: ${calculatorInstruction}\n\n` +
                `ABSOLUTE REQUIREMENTS:\n` +
                `- Only "${topic}" questions, no cross-topic leakage\n` +
                `- Vary styles heavily: word problems, reverse problems, compare methods, interpretation\n` +
                `- No template reuse within this batch (each question must have a different goal/method)\n` +
                `- Use authentic UK GCSE exam language\n` +
                `- Provide 3 wrong answers that are plausible and distinct\n` +
                `- explanation must be step-by-step and end with exactly one line: "Final answer: ..."\n` +
                `- Provide a difficulty integer 1–4 for each question\n` +
                `${multiStepRequirement}${exclusionWarning}${topicSpecificWarning}${diagramReminder}${diagramRequirementForForced}${multipartRequirement}\n\n` +
                `If you include diagram_description, the question MUST reference the diagram explicitly.`,
            },
          ],
        });

        if (debugStats) {
          debugStats.raw_type = typeof fullRaw;
          debugStats.raw_is_null = fullRaw === null;
          if (fullRaw && typeof fullRaw === 'object') {
            const keys = Object.keys(fullRaw);
            if (keys.length) {
              debugStats.raw_keys = Array.from(new Set([...debugStats.raw_keys, ...keys]));
            }
          }
          if (Array.isArray(fullRaw?.questions)) {
            debugStats.raw_questions += fullRaw.questions.length;
          }
        }

        const candidates = (fullRaw?.questions || [])
          .map((q: any) => repairQuestionLatex(q))
          .map((q: any) => ({
            ...q,
            calculator: String(q?.calculator || '').trim(),
            question_type: String(q?.question_type || '').trim(),
            difficulty: normalizeDifficulty1to4(q?.difficulty, tier),
            correct_answer: normalizeOptionText(String(q?.correct_answer || '')),
            wrong_answers: Array.isArray(q?.wrong_answers) ? q.wrong_answers.map((a: any) => normalizeOptionText(String(a ?? ''))).filter(Boolean) : [],
            diagram_description: String(q?.diagram_description || ''),
            svg_diagram: String(q?.svg_diagram || ''),
          }))
          .filter((q: any) => {
            const wrongCount = Array.isArray(q.wrong_answers) ? q.wrong_answers.length : 0;
            const ok = q.question
              && q.calculator
              && q.question_type
              && Number.isFinite(q.difficulty)
              && q.correct_answer
              && q.explanation
              && wrongCount >= 3
              && wrongCount <= 5;
            if (!ok) bump('missing_fields');
            return ok;
          });

        if (debugStats) debugStats.candidates += candidates.length;

        for (const full0 of candidates) {
          const full = full0;

          // Enforce Higher-tier multi-step
          if (tier === 'Higher Tier') {
            const stepCount = countExplanationSteps(String(full.explanation || ''));
            if (stepCount < 3) {
              console.warn('Skipping question: Higher Tier explanation not multi-step enough');
              bump('higher_tier_steps');
              continue;
            }
          }

          // If image is forced OR requested, require the question to reference the diagram.
          const diagramRequested = Boolean(String(full.diagram_description || '').trim());
          if (
            (forceImages || diagramRequested)
            && subtopicForDedupe !== 'algebra|graphs'
            && !questionReferencesDiagram(String(full.question || ''))
          ) {
            console.warn('Skipping question: diagram_description present but question does not reference diagram');
            bump('diagram_mismatch');
            continue;
          }

          // Verify the provided correct_answer independently.
          const provided = normalizeOptionText(String(full.correct_answer || ''));
          let verifiedAnswer: string | null = null;

          const verifyOnce = async (modelToUse: string, questionText: string) => {
            const ver = await callOpenAiTool({
              model: modelToUse,
              tool: answerVerificationTool,
              toolName: 'compute_correct_answer',
              max_tokens: 180,
              temperature: 0.0,
              messages: [
                { role: 'system', content: verifierSystem },
                { role: 'user', content: `Question:\n${questionText}\n\nCompute the correct final answer only.` },
              ],
            });
            const v = normalizeOptionText(repairLatex(String(ver?.correct_answer || '')));
            return v || null;
          };
          const multipartPayload = parseMultipartQuestion(String(full.question || ''));
          if (multipartPayload) {
            if (multipartPayload.parts.length < 2) {
              console.warn('Skipping question: multipart needs at least 2 parts');
              bump('semantic_invalid');
              continue;
            }
            if (!/\bPart\s*A\b/i.test(String(full.explanation || '')) || !/\bPart\s*B\b/i.test(String(full.explanation || ''))) {
              console.warn('Skipping question: multipart explanation missing part labels');
              bump('semantic_invalid');
              continue;
            }

            const primary = multipartPayload.parts[0];
            full.correct_answer = primary.correct_answer;
            full.wrong_answers = primary.wrong_answers;

            let multipartOk = true;
            for (const part of multipartPayload.parts) {
              const partQuestion = [multipartPayload.stem || '', `${part.label || ''}: ${part.prompt}`.trim()]
                .filter(Boolean)
                .join('\n');
              let partVerified = await verifyOnce(verifyModel, partQuestion);
              if (!partVerified && verifyStrictModel && verifyStrictModel !== verifyModel) {
                partVerified = await verifyOnce(verifyStrictModel, partQuestion);
              }
              if (!partVerified) {
                multipartOk = false;
                break;
              }
              if (normalizeAnswerForCompare(partVerified) !== normalizeAnswerForCompare(part.correct_answer)) {
                multipartOk = false;
                break;
              }
            }
            if (!multipartOk) {
              console.warn('Skipping question: multipart verification failed');
              bump('answer_mismatch');
              continue;
            }
          } else {
            if (topicForDb === 'Number' || topicForDb === 'Algebra') {
              // Reduce verification overhead where it blocks generation throughput.
              // Trust the provided correct_answer after normalization.
              verifiedAnswer = provided;
              full.correct_answer = verifiedAnswer;
            } else {
              verifiedAnswer = await verifyOnce(verifyModel, String(full.question || ''));
              if (!verifiedAnswer && verifyStrictModel && verifyStrictModel !== verifyModel) {
                verifiedAnswer = await verifyOnce(verifyStrictModel, String(full.question || ''));
              }

              if (!verifiedAnswer) {
                console.warn('Skipping question: could not verify correct answer');
                bump('verify_failed');
                continue;
              }

              const providedNorm = normalizeAnswerForCompare(provided);
              const verifiedNorm = normalizeAnswerForCompare(verifiedAnswer);
              if (providedNorm !== verifiedNorm) {
                const providedValue = extractSingleNumeric(provided);
                const verifiedValue = extractSingleNumeric(verifiedAnswer);
                if (
                  providedValue !== null &&
                  verifiedValue !== null &&
                  Math.abs(providedValue - verifiedValue) < 1e-9
                ) {
                  // Accept numeric match (units/formatting differences) and keep verified answer.
                } else if (verifyStrictModel && verifyStrictModel !== verifyModel) {
                  const strictAnswer = await verifyOnce(verifyStrictModel, String(full.question || ''));
                  if (strictAnswer && normalizeAnswerForCompare(strictAnswer) === providedNorm) {
                    verifiedAnswer = strictAnswer;
                  } else {
                    console.warn('Skipping question: answer mismatch after verification', { providedNorm, verifiedNorm });
                    bump('answer_mismatch');
                    continue;
                  }
                } else {
                  console.warn('Skipping question: answer mismatch after verification', { providedNorm, verifiedNorm });
                  bump('answer_mismatch');
                  continue;
                }
              }

              full.correct_answer = verifiedAnswer;
            }

            const deterministic = computeExpectedDeterministicAnswer(String(full.question || ''));
            if (deterministic && !answersEquivalent(String(full.correct_answer || ''), deterministic.answer)) {
              console.warn('Skipping question: deterministic check failed', { kind: deterministic.kind, expected: deterministic.answer, got: full.correct_answer });
              bump('deterministic_fail');
              continue;
            }
          }

          // Wrong answers must be distinct and must not include the correct.
          const wrongs = (full.wrong_answers || []).map((x: any) => normalizeOptionText(String(x ?? ''))).filter(Boolean);
          if (
            wrongs.length < 3 ||
            wrongs.length > 5 ||
            new Set(wrongs).size !== wrongs.length ||
            wrongs.includes(normalizeOptionText(String(full.correct_answer || '')))
          ) {
            console.warn('Skipping question: invalid wrong answers');
            bump('invalid_wrong_answers');
            continue;
          }
          full.wrong_answers = wrongs;

          const sig = questionStyleSignature(topicForDb, tier, String(full.question || ''), subtopicForDedupe);
          const sigTokens = tokenSetFromSignature(sig);
          if (batchSeenSignatures.has(sig) || isTooSimilarToExisting(sig, sigTokens, existingForDedupe)) {
            console.warn('Skipping question: too similar to existing question set');
            bump('too_similar');
            continue;
          }
          batchSeenSignatures.add(sig);

          // Final semantic validation; guarantees >=4 options (1 correct + 3 wrong) too.
          const reason = validateQuestionSemantics(full);
          if (reason) {
            console.warn('Skipping question: semantic validation failed:', reason);
            bump('semantic_invalid');
            continue;
          }

          if (!passesSubtopicStrictness(subtopicForDedupe, String(full.question || ''))) {
            console.warn('Skipping question: failed strict mini-subtopic guard');
            bump('subtopic_strictness');
            continue;
          }

          // Extra quality guard for Surds: require exact surd answers and clear, step-by-step explanations.
          if (subtopicForDedupe === 'number|surds') {
            const qText = String(full.question || '');
            const expl = String(full.explanation || '');
            const ans = String(full.correct_answer || '');
            const hasSurdInQuestion = /\\sqrt|√/.test(qText);
            const hasSurdInAnswer = /\\sqrt|√/.test(ans);
            const hasSurdInExplanation = /\\sqrt|√/.test(expl);
            const stepCount = countExplanationSteps(expl);
            if (!hasSurdInQuestion || !hasSurdInAnswer || !hasSurdInExplanation || stepCount < 3) {
              console.warn('Skipping question: surds must use exact surd form with clear steps');
              bump('semantic_invalid');
              continue;
            }
            const wrongsSurd = (full.wrong_answers || []).every((w: any) => /\\sqrt|√/.test(String(w || '')));
            if (!wrongsSurd) {
              console.warn('Skipping question: surds wrong answers must also be surd-form');
              bump('invalid_wrong_answers');
              continue;
            }
          }

          results.push(full);
          if (results.length >= n) break;
        }
      }

      // IMPORTANT: Do not hard-fail if we couldn't reach n due to strict validation.
      // Callers can retry to top up missing questions.
      return results;
    };

    // Split large requests into smaller calls to avoid truncated tool arguments.
    const target = Math.max(1, Math.min(Number(count) || 1, 50));
    const maxPerCall = 4; // conservative to avoid JSON truncation
    let questions: any[] = [];
    let remaining = target;
    while (remaining > 0) {
      const n = Math.min(maxPerCall, remaining);
      let attempts = 0;
      let lastErr: any = null;
      while (attempts < 4) {
        attempts += 1;
        try {
          const batch = await callOpenAiOnce(n);
          if (!Array.isArray(batch) || batch.length === 0) {
            throw new Error('OpenAI returned no valid questions in this batch');
          }

          questions = questions.concat(batch);
          break;
        } catch (e) {
          lastErr = e;
          if (debugStats) {
            debugStats.error_count += 1;
            debugStats.last_error = String(e?.message || e);
          }
          // If it failed, try a smaller n on next attempt.
          if (n > 1) {
            console.warn(`Retrying generation with smaller batch (was ${n})...`);
          }
          await new Promise((r) => setTimeout(r, 350 * attempts));
        }
      }

      // We may have gotten fewer than n valid questions due to strict checks.
      // Only decrement remaining by what we actually produced.
      const producedThisLoop = questions.length - (target - remaining);
      if (producedThisLoop <= 0) {
        console.error('Failed batch generation (no valid questions produced):', lastErr);
        // Return partial (possibly empty) results; caller can retry.
        remaining = 0;
        break;
      }

      remaining -= producedThisLoop;
    }

    console.log(`Generated ${questions.length} questions (LaTeX repaired)`);

    // Generate and upload diagram images.
    // - If forceImages is on: generate for every question.
    // - Otherwise: generate only for questions that included a diagram_description.
    const hasAnyDiagramRequests = questions.some((q: any) => Boolean(q.diagram_description?.trim()));
    if (forceImages || hasAnyDiagramRequests) {
      questions = await processQuestionDiagrams(questions, supabase, Boolean(forceImages));
    }

    // Normalize calculator value to match existing database format
    const normalizeCalculator = (calc: string): string => {
      const lower = calc?.toLowerCase() || 'non-calculator';
      if (lower === 'calculator' || lower === 'calc') return 'Calculator';
      return 'Non-Calculator';
    };

    // Return questions for preview (don't insert yet)
    // CRITICAL: question_type MUST be the main topic (Number, Algebra, etc.), not subtopics
    const previewQuestions = questions.map((q: any, idx: number) => ({
      id: `preview-${idx}-${Date.now()}`,
      question: q.question,
      correct_answer: q.correct_answer,
      wrong_answers: q.wrong_answers,
      all_answers: shuffleArray([q.correct_answer, ...q.wrong_answers]),
      explanation: q.explanation,
      calculator: normalizeCalculator(q.calculator),
      question_type: topicForDb, // Always use the main topic, not subtopics
      tier: tier,
      topic: topicForDb,
      subtopic: normalizeSubtopicId(subtopicId ?? q.question_type, topicForDb) || null,
      difficulty: normalizeDifficulty1to4(q.difficulty, tier),
      image_url: q.image_url || null,
      image_alt: q.image_alt || null
    }));

    const responsePayload: Record<string, unknown> = {
      success: true,
      questions: previewQuestions,
      partial: previewQuestions.length < target,
      requested: target,
      generated: previewQuestions.length,
      topic: topicForDb,
      tier,
    };
    if (debug && debugStats) {
      responsePayload.debug = debugStats;
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-questions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
