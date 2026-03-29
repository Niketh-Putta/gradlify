import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MULTIPART_PREFIX = "MULTIPART::";

const shuffleInPlace = <T,>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const uniqueStrings = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = String(item ?? '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

type MultipartPart = {
  label?: string;
  prompt: string;
  correct_answer: string;
  wrong_answers: string[];
  all_answers?: string[];
};

type MultipartQuestion = {
  stem?: string;
  parts: MultipartPart[];
};

type MultipartPartInput = {
  label?: unknown;
  prompt?: unknown;
  correct_answer?: unknown;
  wrong_answers?: unknown;
  all_answers?: unknown;
};

type MultipartQuestionInput = {
  stem?: unknown;
  parts?: MultipartPartInput[];
};

type ExamQuestionRow = {
  id: string | number;
  question?: string | null;
  correct_answer?: string | null;
  wrong_answers?: string[] | string | null;
  question_type?: string | null;
  subtopic?: string | null;
  topic?: string | null;
  tier?: string | null;
  calculator?: string | boolean | null;
  marks?: number | null;
  [key: string]: unknown;
};

type MultipartPayload = {
  stem: string;
  parts: Array<{
    label: string | null;
    prompt: string;
    correct_answer: string;
    wrong_answers: string[];
    all_answers: string[];
  }>;
};

type ProcessedQuestion = {
  id: string | number;
  idx: number;
  topic: string;
  subtopic: string | null;
  tier: string | null;
  calculator: string | boolean | null;
  prompt: string;
  marks: number;
  correct_answer: string | ({ type: 'multipart' } & MultipartPayload);
  wrong_answers: string[];
  options: string[];
  question_type: string | null;
  mark_scheme: string[];
  multipart: MultipartPayload | null;
};

const parseMultipartQuestion = (questionText?: string | null): MultipartQuestion | null => {
  if (!questionText) return null;
  if (!questionText.startsWith(MULTIPART_PREFIX)) return null;

  const raw = questionText.slice(MULTIPART_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(raw) as MultipartQuestionInput;
    const partsRaw = Array.isArray(parsed.parts) ? parsed.parts : [];
    const parts = partsRaw
      .map((part: MultipartPartInput, idx: number) => {
        const prompt = String(part?.prompt || "").trim();
        const correct = String(part?.correct_answer || "").trim();
        const wrong = toStringArray(part?.wrong_answers);
        if (!prompt || !correct || wrong.length < 3) return null;
        const label = String(part?.label || `Part ${String.fromCharCode(65 + idx)}`);
        return {
          label,
          prompt,
          correct_answer: correct,
          wrong_answers: wrong,
          all_answers: part?.all_answers ? toStringArray(part.all_answers) : undefined,
        } satisfies MultipartPart;
      })
      .filter(Boolean) as MultipartPart[];

    if (parts.length === 0) return null;
    return {
      stem: parsed.stem ? String(parsed.stem) : undefined,
      parts,
    };
  } catch {
    return null;
  }
};

const groupBy = <T,>(items: T[], keyFn: (item: T) => string): Map<string, T[]> => {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }
  return buckets;
};

const roundRobin = <T,>(buckets: Map<string, T[]>, targetCount?: number): T[] => {
  const keys = shuffleInPlace(Array.from(buckets.keys()));
  const active = [...keys];
  const result: T[] = [];

  let cursor = 0;
  while (active.length > 0 && (targetCount == null || result.length < targetCount)) {
    const idx = cursor % active.length;
    const key = active[idx];
    const bucket = buckets.get(key);
    const next = bucket?.shift();
    if (next != null) result.push(next);
    if (!bucket || bucket.length === 0) {
      active.splice(idx, 1);
    } else {
      cursor += 1;
    }
  }

  return result;
};

const roundRobinWithCap = <T,>(
  buckets: Map<string, T[]>,
  targetCount: number,
  maxPerBucket: number
): T[] => {
  const keys = shuffleInPlace(Array.from(buckets.keys()));
  const active = [...keys];
  const result: T[] = [];
  const counts = new Map<string, number>();

  let cursor = 0;
  while (active.length > 0 && result.length < targetCount) {
    const idx = cursor % active.length;
    const key = active[idx];
    const bucket = buckets.get(key);
    const taken = counts.get(key) ?? 0;

    if (!bucket || bucket.length === 0) {
      active.splice(idx, 1);
      continue;
    }

    if (taken >= maxPerBucket && active.length > 1) {
      cursor += 1;
      continue;
    }

    const next = bucket.shift();
    if (next != null) {
      result.push(next);
      counts.set(key, taken + 1);
    }

    if (bucket.length === 0) {
      active.splice(idx, 1);
    } else {
      cursor += 1;
    }
  }

  return result;
};

const buildBalancedMix = <T,>(
  items: T[],
  targetCount: number,
  topicKey: (item: T) => string,
  subtopicKey?: (item: T) => string
): T[] => {
  if (items.length === 0) return [];

  const topicBuckets = groupBy(items, topicKey);
  const perTopicOrdered = new Map<string, T[]>();

  for (const [topic, topicItems] of topicBuckets.entries()) {
    const bucketKey = subtopicKey
      ? (item: T) => `${topic}::${subtopicKey(item)}`
      : () => topic;
    const subBuckets = groupBy(topicItems, bucketKey);
    for (const bucket of subBuckets.values()) {
      shuffleInPlace(bucket);
    }
    perTopicOrdered.set(topic, roundRobin(subBuckets));
  }

  const cappedTarget = Math.min(targetCount, items.length);
  const topicMax = Math.ceil(cappedTarget / perTopicOrdered.size);

  return roundRobinWithCap(perTopicOrdered, cappedTarget, topicMax);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? '';
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('track')
      .eq('user_id', user.id)
      .maybeSingle();
    const userTrack = (profileData?.track === '11plus' ? '11plus' : 'gcse') as 'gcse' | '11plus';

    // Validate input with zod - support both single values and arrays
    const requestSchema = z.object({
      mode: z.enum(['mini', 'practice', 'full', 'extreme', 'topic'], { 
        errorMap: () => ({ message: 'Mode must be mini, practice, full, extreme, or topic' })
      }),
      tier: z.enum(['foundation', 'higher', 'both']).optional(),
      paperType: z.enum(['calculator', 'non-calculator', 'both']).optional(),
      // Support arrays for tiers and calculators (from MockExamsImproved)
      tiers: z.array(z.enum(['foundation', 'higher'])).optional(),
      calculators: z.array(z.enum(['calculator', 'non-calculator'])).optional(),
      topics: z.array(z.string()).optional(),
      subtopics: z.array(z.string()).optional(),
      count: z.number().int().positive().max(50).optional(),
      examMode: z.boolean().optional()
    });

    let validatedInput;
    try {
      const rawBody = await req.json();
      validatedInput = requestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorMessage = validationError.errors[0]?.message || 'Invalid input';
        console.error('Validation error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw validationError;
    }

    const { mode, tier, paperType, topics, subtopics, count, tiers, calculators } = validatedInput;
    
    console.log(`Starting ${mode} mock exam for user ${user.id}`);

    const questionCount = count || (mode === 'mini' ? 10 : mode === 'practice' ? 10 : mode === 'extreme' ? 15 : 15);

    // Enforce server-side mock limits (daily and question count)
    const { data: limitData, error: limitError } = await supabase.rpc('consume_mock_session', {
      p_question_count: questionCount,
    });
    if (limitError) {
      console.error('Error enforcing mock limits:', limitError);
      return jsonResponse({ error: 'Failed to enforce mock limits' }, 500);
    }
    if (!limitData?.allowed) {
      const message =
        (typeof limitData?.message === 'string' && limitData.message) ||
        'Daily mock exam limit reached.';
      return jsonResponse({ error: message }, 403);
    }
    
    // Fetch questions for each combination
    const allQuestions: ExamQuestionRow[] = [];
    const excludeIds: string[] = [];
    
    if (mode === 'extreme') {
      // Extreme mode: only filter by difficulty_level = 'extreme'
      const { data: questions, error: fetchError } = await supabase
        .from('exam_questions')
        .select('id, question, correct_answer, wrong_answers, question_type, subtopic, tier, calculator')
        .eq('difficulty_level', 'extreme')
        // TRACK FILTER  - Ensures separation between GCSE and 11+
        .eq('track', userTrack)
        .limit(questionCount * 3); // Fetch extra for randomization
      
      if (fetchError) {
        console.error('Error fetching extreme questions:', fetchError);
        throw new Error('Failed to fetch extreme questions');
      }
      
      if (questions && questions.length > 0) {
        const shuffled = shuffleInPlace([...questions]);
        allQuestions.push(...shuffled.slice(0, questionCount));
      }
    } else {
      // Normal mode: use tier, paperType, and topics filters
      // Support both single tier/paperType values and arrays (tiers/calculators)
      let selectedTiers: string[] = [];
      if (tiers && tiers.length > 0) {
        // Use array format from MockExamsImproved
        selectedTiers = tiers.map(t => t === 'foundation' ? 'Foundation Tier' : 'Higher Tier');
      } else if (tier) {
        // Use single value format
        selectedTiers = tier === 'both' ? ['Foundation Tier', 'Higher Tier'] : [tier === 'foundation' ? 'Foundation Tier' : 'Higher Tier'];
      } else {
        selectedTiers = ['Higher Tier']; // Default
      }
      
      let selectedPaperTypes: string[] = [];
      if (calculators && calculators.length > 0) {
        // Use array format from MockExamsImproved
        selectedPaperTypes = calculators.map(c => c === 'calculator' ? 'Calculator' : 'Non-Calculator');
      } else if (paperType) {
        // Use single value format
        selectedPaperTypes = paperType === 'both' ? ['Calculator', 'Non-Calculator'] : [paperType === 'calculator' ? 'Calculator' : 'Non-Calculator'];
      } else {
        selectedPaperTypes = ['Calculator']; // Default
      }

      const includeTierCalc = selectedTiers.length > 1 || selectedPaperTypes.length > 1;
      const mixSubtopicKey = (q: ExamQuestionRow) => {
        const base = q.subtopic || 'Unknown';
        if (includeTierCalc) {
          return `${base}::${q.tier || 'UnknownTier'}::${q.calculator || 'UnknownCalc'}`;
        }
        return base;
      };
      
      const topicsToFetch = topics && topics.length > 0 ? topics : null;
      const subtopicsToFetch = subtopics && subtopics.length > 0 ? subtopics : null;
      
      // Calculate how many questions per combination for even distribution
      const combinations = selectedTiers.length * selectedPaperTypes.length;
      const questionsPerCombo = Math.ceil(questionCount / combinations);
      
      console.log(`Fetching ${questionCount} questions with ${combinations} combinations (${questionsPerCombo} per combo)`);
      console.log(`Tiers: ${selectedTiers.join(', ')}, Paper Types: ${selectedPaperTypes.join(', ')}`);
      
      for (const tierValue of selectedTiers) {
        for (const paperTypeValue of selectedPaperTypes) {
          const calculatorRequired = paperTypeValue;
          const fetchLimit = Math.max(questionsPerCombo * 4, questionsPerCombo + 8);

          const { data: questions, error: fetchError } = await supabase
            .rpc('fetch_exam_questions_v3', {
              p_tiers: [tierValue],
              p_calculators: [calculatorRequired],
              p_question_types: topicsToFetch,
              p_subtopics: subtopicsToFetch,
              p_difficulty_min: null,
              p_difficulty_max: null,
              p_exclude_ids: excludeIds,
              p_limit: fetchLimit,
            });

          if (fetchError) {
            console.error('Error fetching questions:', fetchError);
            continue;
          }

          if (questions && questions.length > 0) {
            const questionRows = questions as ExamQuestionRow[];
            const unique = Array.from(new Map(questionRows.map((q) => [q.id, q])).values());
            const picked = buildBalancedMix(
              unique,
              questionsPerCombo,
              (q) => q.question_type || 'Mixed',
              mixSubtopicKey
            );
            allQuestions.push(...picked);
            for (const q of picked) excludeIds.push(q.id);
          }
        }
      }
    }
    
    if (allQuestions.length === 0) {
      throw new Error('No matching questions found');
    }

    const dedupedAll = Array.from(new Map(allQuestions.map((q) => [q.id, q])).values());
    const selectedQuestions = buildBalancedMix(
      dedupedAll,
      Math.min(questionCount, dedupedAll.length),
      (q) => q.question_type || 'Mixed',
      mixSubtopicKey
    );
    
    // Process questions and create multiple choice options
    const processedQuestions = selectedQuestions
      .map((q, index): ProcessedQuestion | null => {
      const rawMultipart = parseMultipartQuestion(String(q.question || ""));
      if (rawMultipart) {
        const parts = rawMultipart.parts.map((part, partIndex) => {
          const baseOptions = part.all_answers && part.all_answers.length > 0
            ? part.all_answers
            : [part.correct_answer, ...part.wrong_answers];
          const uniqueOptions = uniqueStrings(baseOptions);
          if (uniqueOptions.length < 4 || !uniqueOptions.includes(part.correct_answer)) return null;
          return {
            ...part,
            label: part.label || `Part ${String.fromCharCode(65 + partIndex)}`,
            all_answers: shuffleInPlace([...uniqueOptions]),
          };
        }).filter(Boolean) as MultipartPart[];

        if (parts.length === 0 || parts.length !== rawMultipart.parts.length) {
          return null;
        }

        const multipartPayload = {
          stem: rawMultipart.stem ?? '',
          parts: parts.map((part) => ({
            label: part.label ?? null,
            prompt: part.prompt,
            correct_answer: part.correct_answer,
            wrong_answers: part.wrong_answers,
            all_answers: part.all_answers ?? [],
          }))
        } satisfies MultipartPayload;

        return {
          id: q.id,
          idx: index + 1,
          topic: q.question_type || 'Mixed',
          subtopic: q.subtopic || null,
          tier: q.tier || null,
          calculator: q.calculator || null,
          prompt: rawMultipart.stem ?? '',
          marks: Math.max(1, parts.length),
          correct_answer: { type: 'multipart', ...multipartPayload },
          wrong_answers: [],
          options: [],
          question_type: q.question_type,
          mark_scheme: parts.map((part) => `Award 1 mark for ${part.label}: ${part.correct_answer}`),
          multipart: multipartPayload,
        } satisfies ProcessedQuestion;
      }

      // Handle wrong_answers - convert to array if it's a string
      let wrongAnswers: string[] = [];
      if (q.wrong_answers) {
        if (Array.isArray(q.wrong_answers)) {
          wrongAnswers = q.wrong_answers.map(String);
        } else if (typeof q.wrong_answers === 'string') {
          // Split by semicolon, comma, or pipe and clean up
          wrongAnswers = q.wrong_answers.split(/[;,|]/).map(ans => ans.trim()).filter(ans => ans);
        }
      }

      // Create shuffled options (correct answer + wrong answers)
      const allOptions = [q.correct_answer, ...wrongAnswers].filter(Boolean);
      // If options are invalid, skip this question by returning null.
      const correct = (q.correct_answer || '').toString().trim();
      const wrongNorm = wrongAnswers.map((x) => (x || '').toString().trim()).filter(Boolean);
      if (!correct || wrongNorm.length !== 3 || new Set(wrongNorm).size !== 3 || wrongNorm.includes(correct)) {
        return null;
      }
      const shuffledOptions = [...allOptions].sort(() => Math.random() - 0.5);
      
      return {
        id: q.id,
        idx: index + 1,
        topic: q.question_type || 'Mixed',
        subtopic: q.subtopic || null,
        tier: q.tier || null,
        calculator: q.calculator || null,
        prompt: q.question,
        marks: 1, // Default to 1 mark per question
        correct_answer: q.correct_answer,
        wrong_answers: wrongAnswers,
        options: shuffledOptions,
        question_type: q.question_type,
        mark_scheme: [`Award 1 mark for correct answer: ${q.correct_answer}`],
        multipart: null,
      } satisfies ProcessedQuestion;
    })
    .filter((q): q is ProcessedQuestion => Boolean(q));

    const totalMarks = processedQuestions.reduce((sum, q) => sum + q.marks, 0);
    if (processedQuestions.length === 0) {
      throw new Error('No valid questions found after option validation');
    }
    const focusTopics = topics?.length ? topics : ['Mixed'];
    
    const title = mode === 'mini' 
      ? `Mini Mock (${questionCount} Q)` 
      : `${tier === 'foundation' ? 'Foundation' : 'Higher'} ${paperType === 'calculator' ? 'Calculator' : 'Non-Calculator'} Mock`;

    // Create mock attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('mock_attempts')
      .insert({
        user_id: user.id,
        track: userTrack,
        mode,
        title,
        total_marks: totalMarks,
        duration_minutes: mode === 'mini' ? 10 : mode === 'practice' ? 15 : 20,
        status: 'in_progress'
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Create questions for database
    const questions = processedQuestions.map((q) => ({
      attempt_id: attempt.id,
      idx: q.idx,
      exam_question_id: q.id,
      topic: q.topic,
      subtopic: q.subtopic,
      prompt: q.prompt,
      marks: q.marks,
      correct_answer: q.correct_answer,
      mark_scheme: q.mark_scheme
    }));

    const { data: insertedQuestions, error: questionsError } = await supabaseAdmin
      .from('mock_questions')
      .insert(questions)
      .select();

    if (questionsError) throw questionsError;

    // Add the options to the returned questions for the frontend
    type InsertedQuestionRow = { subtopic?: string | null; topic?: string | null; [key: string]: unknown };
    const insertedQuestionRows = (insertedQuestions ?? []) as InsertedQuestionRow[];
    const questionsWithOptions = insertedQuestionRows.map((q, index) => ({
      ...q,
      options: processedQuestions[index]?.options ?? [],
      multipart: processedQuestions[index]?.multipart ?? null,
      tier: processedQuestions[index]?.tier ?? null,
      calculator: processedQuestions[index]?.calculator ?? null,
      subtopic: processedQuestions[index]?.subtopic ?? q.subtopic ?? null,
      topic: processedQuestions[index]?.topic ?? q.topic ?? null,
    }));

    return new Response(JSON.stringify({ 
      attempt,
      questions: questionsWithOptions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error starting mock exam:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
