import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z
  .object({
    force: z.boolean().optional(),
  })
  .optional();

const TOPIC_KEY_TO_QUESTION_TYPE: Record<string, string> = {
  number: "Number",
  algebra: "Algebra",
  ratio: "Ratio & Proportion",
  geometry: "Geometry & Measures",
  probability: "Probability",
  statistics: "Statistics",
};

const QUESTION_TYPE_TO_READINESS_TOPIC: Record<string, string> = {
  "Number": "Number",
  "Algebra": "Algebra",
  "Ratio & Proportion": "Ratio & Proportion",
  "Geometry & Measures": "Geometry",
  "Probability": "Probability",
  "Statistics": "Statistics",
};

const READINESS_TOPIC_TO_KEY: Record<string, string> = {
  Number: "number",
  Algebra: "algebra",
  "Ratio & Proportion": "ratio",
  Geometry: "geometry",
  Probability: "probability",
  Statistics: "statistics",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeText(s: unknown): string {
  return String(s ?? "").trim();
}

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}
type SubtopicInfo = {
  topic_key: string;
  subtopic_key: string;
  subtopic: string;
  title: string;
  order_index: number;
  score: number;
};

type ChosenPack = {
  topic_key: string;
  readiness_topic: string;
  question_type: string;
  subtopic: SubtopicInfo;
  next_subtopic_title: string | null;
  question_ids: string[];
  question_bank_count: number;
  avg_marks: number;
  avg_time_min: number;
  recent_wrong_count: number;
};

function buildSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = buildSeededRandom(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, code: "NO_AUTH", message: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ ok: false, code: "INVALID_AUTH", message: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authData.user.id;
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("track")
      .eq("user_id", userId)
      .maybeSingle();
    const userTrack = profileRow?.track === "11plus" ? "11plus" : "gcse";

    type QuestionRow = {
      id: string | number;
      question_type?: string | null;
      subtopic?: string | null;
      marks?: number | null;
      estimated_time_sec?: number | null;
      [key: string]: unknown;
    };

    let body: unknown = undefined;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    const parsed = requestSchema.parse(body);
    const force = Boolean(parsed?.force);

    // Pull current signals
    const [topicReadinessRes, catalogRes, subtopicProgressRes, recentEventsRes] = await Promise.all([
      supabase
        .from("v_topic_readiness")
        .select("topic, readiness")
        .eq("user_id", userId),
      supabase
        .from("topic_catalog")
        .select("topic_key, subtopic_key, title, order_index")
        .order("topic_key", { ascending: true })
        .order("order_index", { ascending: true }),
      supabase
        .from("subtopic_progress")
        .select("topic_key, subtopic_key, score, updated_at")
        .eq("user_id", userId),
      supabase
        .from("mindprint_events")
        .select("question_id, correct, created_at, topic")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const topicReadinessRows = (topicReadinessRes.data ?? []) as Array<{ topic: string; readiness: number }>;

    // overall readiness from six canonical topics (if missing, average what we have)
    const overallReadiness = topicReadinessRows.length
      ? Math.round(topicReadinessRows.reduce((s, r) => s + safeNumber(r.readiness, 0), 0) / topicReadinessRows.length)
      : 0;

    // compute recent accuracy by topic from mindprint_events
    const recentEvents = (recentEventsRes.data ?? []) as Array<{ question_id: string | null; correct: boolean; created_at: string | null; topic: string }>;
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24;
    const accByTopic: Record<string, { correct: number; total: number }> = {};

    for (const e of recentEvents) {
      const topic = normalizeText(e.topic);
      if (!topic) continue;
      if (!accByTopic[topic]) accByTopic[topic] = { correct: 0, total: 0 };
      accByTopic[topic].total += 1;
      if (e.correct) accByTopic[topic].correct += 1;
    }

    const recentAccuracyByTopic: Record<string, number> = {};
    for (const [topic, s] of Object.entries(accByTopic)) {
      recentAccuracyByTopic[topic] = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    }

    // join wrong events with exam_questions for subtopic attribution
    const wrongQuestionIds = recentEvents
      .filter((e) => e.correct === false && e.question_id)
      .map((e) => String(e.question_id));

    const uniqueWrongIds = Array.from(new Set(wrongQuestionIds)).slice(0, 100);
    const wrongBySubtopicKey = new Map<string, number>();

    if (uniqueWrongIds.length) {
      const { data: wrongQs } = await supabase
        .from("exam_questions")
        .select("id, question_type, subtopic")
        .in("id", uniqueWrongIds)
        .eq("track", userTrack);

      const qMap = new Map<string, { question_type: string | null; subtopic: string | null }>();
      const wrongQuestionRows = (wrongQs ?? []) as QuestionRow[];
      wrongQuestionRows.forEach((q) => {
        qMap.set(String(q.id), { question_type: q.question_type ?? null, subtopic: q.subtopic ?? null });
      });

      for (const e of recentEvents) {
        if (e.correct !== false || !e.question_id) continue;
        const q = qMap.get(String(e.question_id));
        if (!q?.question_type || !q?.subtopic) continue;
        const key = `${q.question_type}|||${q.subtopic}`;
        wrongBySubtopicKey.set(key, (wrongBySubtopicKey.get(key) ?? 0) + 1);
      }
    }

    const recentQuestionIds = Array.from(new Set(
      recentEvents
        .filter((e) => e.question_id && e.created_at && Date.parse(String(e.created_at)) >= recentCutoff)
        .map((e) => String(e.question_id)),
    )).slice(0, 120);

    const recentSubtopicIds = new Set<string>();
    if (recentQuestionIds.length) {
      const { data: recentQs } = await supabase
        .from("exam_questions")
        .select("id, subtopic")
        .in("id", recentQuestionIds)
        .eq("track", userTrack);
      const recentQuestionRows = (recentQs ?? []) as QuestionRow[];
      recentQuestionRows.forEach((q) => {
        if (q?.subtopic) recentSubtopicIds.add(String(q.subtopic));
      });
    }

    const catalog = (catalogRes.data ?? []) as Array<{ topic_key: string; subtopic_key: string; title: string; order_index: number }>;
    const progress = (subtopicProgressRes.data ?? []) as Array<{ topic_key: string; subtopic_key: string; score: number; updated_at: string }>;

    const progressMap = new Map(progress.map((p) => [`${p.topic_key}|||${p.subtopic_key}`, p]));
    const subtopics = catalog
      .map((c) => {
        const p = progressMap.get(`${c.topic_key}|||${c.subtopic_key}`);
        const lastUpdated = p?.updated_at ? Date.parse(String(p.updated_at)) : null;
        if (lastUpdated && lastUpdated >= recentCutoff) {
          recentSubtopicIds.add(`${c.topic_key}|${c.subtopic_key}`);
        }
        return {
          topic_key: c.topic_key,
          subtopic_key: c.subtopic_key,
          subtopic: `${c.topic_key}|${c.subtopic_key}`,
          title: normalizeText(c.title),
          order_index: safeNumber(c.order_index, 0),
          score: safeNumber(p?.score, 0),
        } as SubtopicInfo;
      })
      .filter((s) => s.title);

    const { data: existing } = await supabase
      .from("ai_practice_recommendations")
      .select("id, inputs_hash, recommendation_json, model, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fallbackRecommendation = existing?.recommendation_json
      ? { ...existing.recommendation_json, created_at: existing.created_at }
      : null;
    const respondNoCandidates = () =>
      new Response(
        JSON.stringify(
          fallbackRecommendation
            ? { ok: true, data: fallbackRecommendation }
            : { ok: false, code: "NO_CANDIDATES", message: "No recommendation candidates available" },
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    if (!subtopics.length) {
      return respondNoCandidates();
    }

    const subtopicsByTopic = new Map<string, SubtopicInfo[]>();
    const topicOrder: string[] = [];
    for (const s of subtopics) {
      if (!subtopicsByTopic.has(s.topic_key)) {
        subtopicsByTopic.set(s.topic_key, []);
        topicOrder.push(s.topic_key);
      }
      subtopicsByTopic.get(s.topic_key)!.push(s);
    }
    subtopicsByTopic.forEach((list) => list.sort((a, b) => a.order_index - b.order_index));
    const topicOrderIndex = new Map(topicOrder.map((key, index) => [key, index]));

    const lastRec = (existing?.recommendation_json ?? {}) as Record<string, unknown>;
    const lastRecSubtopic = normalizeText(lastRec.subtopic);
    const lastRecTopic = normalizeText(lastRec.topic);
    const lastRecTopicKey = READINESS_TOPIC_TO_KEY[lastRecTopic] ?? "";
    const avoidSubtopics = new Set(recentSubtopicIds);
    if (lastRecSubtopic) avoidSubtopics.add(lastRecSubtopic);

    const rankedCandidates = subtopics
      .filter((s) => s.score < 100)
      .sort((a, b) => {
        const scoreDiff = a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff;
        const topicDiff = (topicOrderIndex.get(a.topic_key) ?? 999) - (topicOrderIndex.get(b.topic_key) ?? 999);
        if (topicDiff !== 0) return topicDiff;
        return a.order_index - b.order_index;
      });

    if (!rankedCandidates.length) {
      return respondNoCandidates();
    }

    const rotationBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
    const seedHex = await sha256Hex(`${userId}:${rotationBucket}`);
    const seed = parseInt(seedHex.slice(0, 8), 16) || 1;

    let chosenPack: ChosenPack | null = null;

    const subtopicsByTopicScore = new Map<string, SubtopicInfo[]>();
    for (const [topicKey, list] of subtopicsByTopic.entries()) {
      const sorted = [...list].sort((a, b) => {
        const scoreDiff = a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.order_index - b.order_index;
      });
      subtopicsByTopicScore.set(topicKey, sorted);
    }

    const topicReadinessByKey = new Map<string, number>();
    for (const row of topicReadinessRows) {
      const key = READINESS_TOPIC_TO_KEY[normalizeText(row.topic)];
      if (!key) continue;
      topicReadinessByKey.set(key, safeNumber(row.readiness, 0));
    }

    const topicReadinessList = topicOrder.map((topicKey) => {
      const readiness = topicReadinessByKey.get(topicKey);
      if (Number.isFinite(readiness)) {
        return { topic_key: topicKey, readiness: readiness ?? 0 };
      }
      const list = subtopicsByTopic.get(topicKey) ?? [];
      const avgScore = list.length ? list.reduce((s, r) => s + r.score, 0) / list.length : 0;
      return { topic_key: topicKey, readiness: Math.round(avgScore) };
    });

    const sortedTopicsByReadiness = [...topicReadinessList].sort((a, b) => a.readiness - b.readiness);
    const minReadiness = sortedTopicsByReadiness[0]?.readiness ?? 0;
    const diversityCutoff = minReadiness + 12;
    const diversityPool = sortedTopicsByReadiness.filter((t) => t.readiness <= diversityCutoff);
    const basePool = diversityPool.length >= 2 ? diversityPool : sortedTopicsByReadiness.slice(0, 3);
    const shuffledTopicKeys = shuffleWithSeed(basePool.map((t) => t.topic_key), seed);
    const candidateTopicKeys = lastRecTopicKey
      ? [...shuffledTopicKeys.filter((k) => k !== lastRecTopicKey), lastRecTopicKey]
      : shuffledTopicKeys;

    const pickPack = async (candidates: SubtopicInfo[], allowAvoid: boolean) => {
      for (let i = 0; i < candidates.length; i += 1) {
        const subtopic = candidates[i];
        if (!allowAvoid && avoidSubtopics.has(subtopic.subtopic)) continue;

        const questionType = TOPIC_KEY_TO_QUESTION_TYPE[subtopic.topic_key] ?? "";
        if (!questionType) continue;

        const { data: qStatsRows } = await supabase
          .from("exam_questions")
          .select("id, marks, estimated_time_sec")
          .eq("question_type", questionType)
          .eq("subtopic", subtopic.subtopic)
          .eq("track", userTrack)
          .limit(60);

        const qStatsRowsTyped = (qStatsRows ?? []) as QuestionRow[];
        const ids = qStatsRowsTyped.map((r) => String(r.id)).filter(Boolean);
        if (!ids.length) continue;

        const marksList = qStatsRowsTyped
          .map((r) => safeNumber(r.marks, 1))
          .filter((n) => Number.isFinite(n));
        const timeList = qStatsRowsTyped
          .map((r) => safeNumber(r.estimated_time_sec, 90))
          .filter((n) => Number.isFinite(n));
        const questionBankCount = marksList.length;
        const avgMarks = questionBankCount ? marksList.reduce((a, b) => a + b, 0) / questionBankCount : 1;
        const avgTimeMin = timeList.length
          ? Math.round((timeList.reduce((a, b) => a + b, 0) / timeList.length) / 60)
          : 2;

        const nextSubtopic = candidates.find((s) => s.subtopic !== subtopic.subtopic) ?? null;
        const wrongKey = `${questionType}|||${subtopic.subtopic}`;
        const recentWrongCount = wrongBySubtopicKey.get(wrongKey) ?? 0;

        const shuffledIds = shuffleWithSeed(ids, seed + i);
        const questionIds = shuffledIds.slice(0, 10);

        return {
          topic_key: subtopic.topic_key,
          readiness_topic: QUESTION_TYPE_TO_READINESS_TOPIC[questionType] ?? questionType,
          question_type: questionType,
          subtopic,
          next_subtopic_title: nextSubtopic?.title ?? null,
          question_ids: questionIds,
          question_bank_count: questionBankCount,
          avg_marks: Math.round(avgMarks * 10) / 10,
          avg_time_min: clamp(avgTimeMin, 1, 30),
          recent_wrong_count: recentWrongCount,
        } satisfies ChosenPack;
      }

      return null;
    };

    for (const topicKey of candidateTopicKeys) {
      const candidates = subtopicsByTopicScore.get(topicKey) ?? [];
      if (!candidates.length) continue;
      chosenPack = await pickPack(candidates, false);
      if (chosenPack) break;
    }
    if (!chosenPack) {
      chosenPack = await pickPack(rankedCandidates, false);
    }
    if (!chosenPack) {
      chosenPack = await pickPack(rankedCandidates, true);
    }

    if (!chosenPack) {
      return respondNoCandidates();
    }

    const chosenTopicSubtopics = subtopicsByTopic.get(chosenPack.topic_key) ?? [];
    const readinessRow = topicReadinessRows.find((r) => normalizeText(r.topic) === chosenPack.readiness_topic);
    const topicReadiness = safeNumber(readinessRow?.readiness, 0);

    const inputsHash = await sha256Hex(
      JSON.stringify({
        strategy: "lowest-ready-v1",
        rotationBucket,
        overallReadiness,
        topicReadinessRows,
        subtopic: chosenPack.subtopic.subtopic,
        topicProgress: chosenTopicSubtopics.map((s) => ({ key: s.subtopic, score: s.score })),
        recentSubtopics: Array.from(recentSubtopicIds).sort().slice(0, 40),
        recentAccuracyByTopic,
      }),
    );

    if (!force && existing?.inputs_hash === inputsHash) {
      return new Response(
        JSON.stringify({ ok: true, data: { ...existing.recommendation_json, created_at: existing.created_at } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const avgMarks = chosenPack.avg_marks;
    const freqFactor = clamp(chosenPack.question_bank_count / 30, 1, 3);
    const marksAtStake = Math.max(0, Math.round(avgMarks * freqFactor));

    const topicAcc = recentAccuracyByTopic[chosenPack.readiness_topic] ?? 60;
    const expectedCorrect = clamp(topicAcc / 100, 0.3, 0.9);
    const expectedDeltaPerQuestion = 15 * expectedCorrect - 5;
    const expectedGainRaw = expectedDeltaPerQuestion * Math.max(1, chosenPack.question_ids.length || 10);
    const readinessGainPct = clamp(Math.round(expectedGainRaw / 8), 3, 20);

    const estimatedTimeMin = clamp(
      Math.round((chosenPack.avg_time_min * Math.max(1, chosenPack.question_ids.length || 10)) / 3),
      5,
      45,
    );

    const subtopicScore = Math.round(chosenPack.subtopic.score);
    const nextLabel = chosenPack.next_subtopic_title
      ? `Next up: ${chosenPack.next_subtopic_title}.`
      : "Next up: another low-readiness subtopic.";

    const recommendationPayload = {
      topic: chosenPack.readiness_topic,
      subtopic: chosenPack.subtopic.subtopic,
      subtopic_title: chosenPack.subtopic.title,
      title: `${chosenPack.readiness_topic}: ${chosenPack.subtopic.title}`,
      rationale:
        `This is your lowest-readiness mini-topic right now. ` +
        `${chosenPack.subtopic.title} is at ${subtopicScore}% readiness, so clearing it raises your baseline.`,
      focus: `Aim for 100% on this mini-topic. ${nextLabel}`,
      estimated_time_min: estimatedTimeMin,
      readiness_gain_pct: readinessGainPct,
      marks_at_stake: marksAtStake,
      question_type: chosenPack.question_type,
      question_ids: chosenPack.question_ids,
      inputs_hash: inputsHash,
    };

    const createdAt = new Date().toISOString();

    // Cache to DB
    const modelName = "lowest-ready-v1";
    await supabase
      .from("ai_practice_recommendations")
      .insert({
        user_id: userId,
        inputs_hash: inputsHash,
        recommendation_json: recommendationPayload,
        model: modelName,
      });

    return new Response(
      JSON.stringify({ ok: true, data: { ...recommendationPayload, created_at: createdAt } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in practice-recommendation:", err);
    const msg = err instanceof z.ZodError ? "Invalid request" : "An error occurred";
    return new Response(
      JSON.stringify({ ok: false, message: msg }),
      { status: err instanceof z.ZodError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
