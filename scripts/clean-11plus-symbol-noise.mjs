import fs from "node:fs";
import path from "node:path";

function parseDotEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = parseDotEnv(path.resolve(process.cwd(), ".env"));
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const TABLES = ["exam_questions", "extreme_questions"];
const SELECT_FIELDS = "id,track,question,explanation,correct_answer,wrong_answers,all_answers";

function superscriptDigit(n) {
  if (n === "2") return "²";
  if (n === "3") return "³";
  return `^${n}`;
}

function sanitizeText(value) {
  let out = String(value ?? "");
  if (!out.trim()) return out;

  const dollarMatches = out.match(/\$/g) ?? [];
  const hasUnbalancedDollars = dollarMatches.length % 2 === 1;

  out = out
    .replace(/\/n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\times|\\texttimes|texttimes/gi, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\rightarrow|\\Rightarrow|rightarrow|Rightarrow|ightarrow/g, "→")
    .replace(/\\leq/g, "<=")
    .replace(/\\geq/g, ">=")
    .replace(/\\neq/g, "!=")
    .replace(/\\%/g, "%")
    .replace(/\^\{([23])\}/g, (_, exp) => superscriptDigit(exp))
    .replace(/\^([23])/g, (_, exp) => superscriptDigit(exp))
    .replace(/([A-Za-z])\{([23])\}/g, "$1$2");

  // Strip delimiters only when the source has broken/unbalanced dollar math.
  if (hasUnbalancedDollars) {
    out = out.replace(/\$/g, "");
  }

  // Restore line structure.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

function parseArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return [value];
    }
  }
  return [];
}

async function supabaseFetch(endpoint, init = {}) {
  const url = new URL(endpoint, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("apikey", SERVICE_KEY);
  return fetch(url, { ...init, headers });
}

async function fetchRows(table) {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await supabaseFetch(
      `/rest/v1/${table}?select=${SELECT_FIELDS}&track=eq.11plus&order=id.asc&offset=${offset}&limit=${limit}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to fetch ${table}: ${res.status} ${body}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    rows.push(...batch);
    offset += limit;
  }
  return rows;
}

async function patchRow(table, id, payload) {
  const res = await supabaseFetch(`/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to patch ${table} id=${id}: ${res.status} ${body}`);
  }
}

function cleanRow(row) {
  const needsCleanup = (value) => {
    const text = String(value ?? "");
    if (!text) return false;
    const dollarCount = (text.match(/\$/g) ?? []).length;
    return (
      /\\n|\/n|<br\s*\/?>|\\texttimes|texttimes|\\rightarrow|\\Rightarrow|rightarrow|Rightarrow|ightarrow|\\left|\\right|\\text\{|\\mathrm\{/.test(text) ||
      /\*\*.*\*\*/.test(text) ||
      (dollarCount % 2 === 1)
    );
  };

  const payload = {};
  let changed = false;

  for (const field of ["question", "explanation", "correct_answer"]) {
    const prev = String(row[field] ?? "");
    if (!needsCleanup(prev)) continue;
    const next = sanitizeText(prev);
    if (prev !== next) {
      payload[field] = next;
      changed = true;
    }
  }

  for (const field of ["wrong_answers", "all_answers"]) {
    const prev = parseArray(row[field]);
    if (!prev.some(needsCleanup)) continue;
    const next = prev.map((item) => sanitizeText(item));
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      payload[field] = next;
      changed = true;
    }
  }

  return { changed, payload };
}

async function processTable(table) {
  const rows = await fetchRows(table);
  let updated = 0;
  const preview = [];

  for (const row of rows) {
    const { changed, payload } = cleanRow(row);
    if (!changed) continue;
    if (!DRY_RUN) await patchRow(table, row.id, payload);
    updated += 1;
    if (preview.length < 30) {
      preview.push({
        id: row.id,
        question: payload.question ?? row.question,
        explanation: (payload.explanation ?? row.explanation ?? "").slice(0, 280),
      });
    }
  }

  return { scanned: rows.length, updated, preview };
}

async function main() {
  const summary = {};
  const preview = {};
  for (const table of TABLES) {
    const result = await processTable(table);
    summary[table] = { scanned: result.scanned, updated: result.updated };
    preview[table] = result.preview;
    console.log(
      `${table}: scanned=${result.scanned}, ${DRY_RUN ? "would_update" : "updated"}=${result.updated}`,
    );
  }

  fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_symbol_noise_cleanup_summary.json"),
    JSON.stringify({ dryRun: DRY_RUN, summary }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), "tmp", "11plus_symbol_noise_cleanup_preview.json"),
    JSON.stringify(preview, null, 2),
    "utf8",
  );
  console.log("Saved: tmp/11plus_symbol_noise_cleanup_summary.json");
  console.log("Saved: tmp/11plus_symbol_noise_cleanup_preview.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
