import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

type UserTrack = "gcse" | "11plus";

const toJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeTrack = (value: unknown): UserTrack | null => {
  if (value === "gcse") return "gcse";
  if (value === "11plus" || value === "eleven_plus") return "11plus";
  return null;
};

const getApiPath = (url: string): string => {
  const pathname = new URL(url).pathname;
  const marker = "/api";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return "/";
  const suffix = pathname.slice(idx + marker.length);
  return suffix.length ? suffix : "/";
};

const getBearerToken = (req: Request): string | null => {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
};

const env = {
  url: Deno.env.get("SUPABASE_URL") ?? "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
};

if (!env.url || !env.anonKey || !env.serviceKey) {
  throw new Error("Missing Supabase environment variables");
}

const admin = createClient(env.url, env.serviceKey);

const getUserTrack = async (userId: string): Promise<UserTrack> => {
  const { data } = await admin
    .from("profiles")
    .select("track")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.track === "11plus" ? "11plus" : "gcse";
};

const requireAuth = async (req: Request) => {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, response: toJson({ error: "Missing bearer token" }, 401) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, response: toJson({ error: "Invalid token" }, 401) };
  return { ok: true as const, token, user: data.user };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const path = getApiPath(req.url);
  const method = req.method.toUpperCase();

  // POST /api/login
  if (method === "POST" && path === "/login") {
    let body: { email?: string; password?: string } = {};
    try {
      body = await req.json();
    } catch {
      return toJson({ error: "Invalid JSON body" }, 400);
    }

    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !password) return toJson({ error: "email and password are required" }, 400);

    const anonClient = createClient(env.url, env.anonKey);
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      return toJson({ error: error?.message ?? "Authentication failed" }, 401);
    }

    const track = await getUserTrack(data.user.id);
    return toJson({
      user: {
        id: data.user.id,
        email: data.user.email,
        track,
      },
      session: data.session,
    });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const currentUser = auth.user;
  const currentTrack = await getUserTrack(currentUser.id);

  // PATCH /api/users/{id}/settings
  const settingsMatch = path.match(/^\/users\/([0-9a-fA-F-]{36})\/settings$/);
  if (method === "PATCH" && settingsMatch) {
    const targetUserId = settingsMatch[1];
    if (targetUserId !== currentUser.id) {
      return toJson({ error: "Forbidden: you can only update your own settings" }, 403);
    }

    let body: { track?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return toJson({ error: "Invalid JSON body" }, 400);
    }

    const nextTrack = normalizeTrack(body.track);
    if (!nextTrack) {
      return toJson({ error: "track must be 'gcse' or '11plus' (eleven_plus alias accepted)" }, 400);
    }

    const { data, error } = await admin
      .from("profiles")
      .update({ track: nextTrack })
      .eq("user_id", currentUser.id)
      .select("user_id, track")
      .single();

    if (error) return toJson({ error: error.message }, 400);
    return toJson({ ok: true, settings: data });
  }

  // GET /api/practice
  if (method === "GET" && path === "/practice") {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "20") || 20));
    const questionType = url.searchParams.get("questionType");

    let query = admin
      .from("exam_questions")
      .select("id, question, question_type, subtopic, difficulty, tier, calculator, marks, track")
      // TRACK FILTER  - Ensures separation between GCSE and 11+
      .eq("track", currentTrack)
      .limit(limit)
      .order("id", { ascending: true });

    if (questionType) query = query.eq("question_type", questionType);
    const { data, error } = await query;
    if (error) return toJson({ error: error.message }, 400);
    return toJson({ track: currentTrack, items: data ?? [] });
  }

  // GET /api/mocks
  if (method === "GET" && path === "/mocks") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "20") || 20));

    let attemptsQuery = admin
      .from("mock_attempts")
      .select("id, title, mode, status, score, total_marks, created_at, track")
      .eq("user_id", currentUser.id)
      .eq("track", currentTrack)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mode) attemptsQuery = attemptsQuery.eq("mode", mode);

    const [attemptsRes, challengeRes] = await Promise.all([
      attemptsQuery,
      admin
        .from("extreme_questions")
        .select("id, question, created_at, track")
        .eq("track", currentTrack)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (attemptsRes.error) return toJson({ error: attemptsRes.error.message }, 400);
    if (challengeRes.error) return toJson({ error: challengeRes.error.message }, 400);

    return toJson({
      track: currentTrack,
      mockSessions: attemptsRes.data ?? [],
      challengeQuestionBank: challengeRes.data ?? [],
    });
  }

  // GET /api/sprints
  if (method === "GET" && path === "/sprints") {
    const [windowsRes, statsRes] = await Promise.all([
      admin
        .from("sprint_windows")
        .select("id, description, start_at, end_at, is_active, updated_at, track")
        .eq("track", currentTrack)
        .order("start_at", { ascending: false }),
      admin
        .from("sprint_stats")
        .select("sprint_id, user_id, track, active_days, questions_attempted, questions_correct, accuracy_pct, computed_at")
        .eq("user_id", currentUser.id)
        .eq("track", currentTrack)
        .order("computed_at", { ascending: false }),
    ]);

    if (windowsRes.error) return toJson({ error: windowsRes.error.message }, 400);
    if (statsRes.error) return toJson({ error: statsRes.error.message }, 400);
    return toJson({ track: currentTrack, windows: windowsRes.data ?? [], stats: statsRes.data ?? [] });
  }

  // GET /api/leaderboards
  if (method === "GET" && path === "/leaderboards") {
    const url = new URL(req.url);
    const period = (url.searchParams.get("period") ?? "month").toLowerCase();
    const scope = (url.searchParams.get("scope") ?? "global").toLowerCase();
    const fn = scope === "friends" ? "get_leaderboard_correct_friends" : "get_leaderboard_correct_global";
    const { data, error } = await admin.rpc(fn, { p_period: period });
    if (error) return toJson({ error: error.message }, 400);
    return toJson({ track: currentTrack, scope, period, items: data ?? [] });
  }

  // GET /api/study-notes
  if (method === "GET" && path === "/study-notes") {
    const { data, error } = await admin
      .from("notes_progress")
      .select("topic_slug, done, updated_at")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false });
    if (error) return toJson({ error: error.message }, 400);
    return toJson({ track: currentTrack, items: data ?? [] });
  }

  return toJson({ error: "Not found", path, method }, 404);
});
