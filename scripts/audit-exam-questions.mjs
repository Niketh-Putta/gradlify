import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function uniq(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    const k = String(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function normalizeAnswerText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function parseNumberLike(answer) {
  const raw = normalizeAnswerText(answer);
  if (!raw) return null;

  const unitMatch = raw.match(/^(.*?)(\s*(?:%|°|cm\^2|cm2|m\^2|m2|mm|cm|m|km|g|kg|ml|l|s|min|h))$/i);
  const valuePart = unitMatch ? unitMatch[1] : raw;
  const unitPart = unitMatch ? unitMatch[2] : "";

  const cleaned = valuePart
    .replace(/,/g, "")
    .replace(/[^\d.+-]/g, "")
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "+" || cleaned === "-") return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return { num, unit: unitPart, raw };
}

function formatNumberLike({ num, unit, raw }, candidateNum) {
  const hasPercent = raw.includes("%") || unit.includes("%");
  const hasDegree = raw.includes("°") || unit.includes("°");
  const hasDecimal = /\d\.\d/.test(raw);
  const decimals = hasDecimal ? (raw.split(".")[1]?.replace(/[^\d].*$/, "")?.length ?? 0) : 0;
  const formatted =
    decimals > 0 ? candidateNum.toFixed(Math.min(decimals, 4)) : String(Math.round(candidateNum));
  const suffix = unit || (hasPercent ? "%" : hasDegree ? "°" : "");
  return `${formatted}${suffix}`;
}

function generateDistractor(correct, existing) {
  const correctNorm = normalizeAnswerText(correct);
  const existingNorm = new Set(existing.map(normalizeAnswerText));

  const numInfo = parseNumberLike(correctNorm);
  if (numInfo) {
    const candidates = [
      numInfo.num + 1,
      numInfo.num - 1,
      numInfo.num * 1.1,
      numInfo.num * 0.9,
      numInfo.num + (Math.abs(numInfo.num) >= 10 ? 5 : 0.5),
    ];
    for (const c of candidates) {
      if (!Number.isFinite(c)) continue;
      const text = formatNumberLike(numInfo, c);
      const norm = normalizeAnswerText(text);
      if (norm && norm !== correctNorm && !existingNorm.has(norm)) return text;
    }
  }

  const frac = correctNorm.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    const fracCandidates = [`${b}/${a}`, `${a + 1}/${b}`, `${a}/${b + 1}`];
    for (const text of fracCandidates) {
      const norm = normalizeAnswerText(text);
      if (norm && norm !== correctNorm && !existingNorm.has(norm)) return text;
    }
  }

  return null;
}

function checkLatexBalance(text) {
  const s = String(text ?? "");
  const dollarCount = (s.match(/(^|[^\\])\$/g) || []).length;
  const bracesOpen = (s.match(/{/g) || []).length;
  const bracesClose = (s.match(/}/g) || []).length;
  const hasUnclosed = dollarCount % 2 !== 0 || bracesOpen !== bracesClose;
  return hasUnclosed;
}

async function head(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const ct = res.headers.get("content-type") || "";
    return { ok: res.ok, status: res.status, contentType: ct };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", error: String(e) };
  }
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function sqlArrayLiteral(values) {
  // ARRAY['a','b']::text[]
  const items = values.map((v) => `'${sqlEscape(v)}'`).join(",");
  return `ARRAY[${items}]::text[]`;
}

async function main() {
  const args = new Set(process.argv.slice(2));

  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) loadDotEnv(envPath);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or VITE_* fallbacks).");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const pageSize = 1000;
  let from = 0;
  let total = 0;

  const issues = [];
  const fixes = [];

  while (true) {
    const { data, error } = await admin
      .from("exam_questions")
      .select(
        "id,question,correct_answer,wrong_answers,all_answers,explanation,image_url,image_alt,subtopic,tier,calculator"
      )
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Supabase query error:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    total += data.length;

    for (const row of data) {
      const rowIssues = [];
      const id = row.id;

      const correct = normalizeAnswerText(row.correct_answer);
      const wrong = Array.isArray(row.wrong_answers) ? row.wrong_answers.map(normalizeAnswerText) : [];
      const all = Array.isArray(row.all_answers) ? row.all_answers.map(normalizeAnswerText) : [];

      const wrongUnique = uniq(wrong).filter(Boolean);
      const allUnique = uniq(all).filter(Boolean);

      if (!correct) rowIssues.push("missing_correct_answer");
      if (wrongUnique.length !== wrong.length) rowIssues.push("wrong_answers_duplicates");
      if (allUnique.length !== all.length) rowIssues.push("all_answers_duplicates");
      if (wrongUnique.includes(correct)) rowIssues.push("wrong_answers_contains_correct");

      if (wrong.length !== 3) rowIssues.push(`wrong_answers_len_${wrong.length}`);
      if (all.length !== 4) rowIssues.push(`all_answers_len_${all.length}`);
      if (correct && all.length > 0 && !all.includes(correct)) rowIssues.push("all_answers_missing_correct");

      if (checkLatexBalance(row.question) || checkLatexBalance(row.explanation)) {
        rowIssues.push("latex_unbalanced");
      }

      if (row.image_url) {
        // Only validate absolute URLs (storage). Relative paths vary by deployment.
        const url = String(row.image_url);
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const res = await head(url);
          if (!res.ok) rowIssues.push(`image_unreachable_${res.status || "error"}`);
          else if (!/^image\//.test(res.contentType) && !/svg\+xml/.test(res.contentType)) {
            rowIssues.push(`image_bad_content_type_${res.contentType || "unknown"}`);
          }
        }
      }

      // Auto-fix only the deterministic answer-array issues.
      // If missing/short, we try to generate one extra distractor (numeric/fraction) and otherwise flag for manual.
      let fixApplied = false;
      let updatedWrong = wrong.slice();
      let updatedAll = all.slice();

      if (correct) {
        // Reconstruct all_answers deterministically when possible.
        // Prefer wrong_answers as source-of-truth if len==3.
        if (wrong.length === 3) {
          updatedWrong = uniq(wrong).filter((x) => x && x !== correct);
          if (updatedWrong.length === 3) {
            updatedAll = uniq([correct, ...updatedWrong]);
          }
        } else if (all.length === 4) {
          updatedAll = uniq(all);
          updatedWrong = updatedAll.filter((x) => x !== correct);
        } else if (all.length === 3 && wrong.length === 2 && all.includes(correct)) {
          updatedWrong = all.filter((x) => x && x !== correct);
          const extra = generateDistractor(correct, [correct, ...updatedWrong]);
          if (extra) {
            updatedWrong = [...updatedWrong, extra];
            updatedAll = uniq([correct, ...updatedWrong]);
          }
        }
      }

      // If we fixed lengths or corrected membership, emit SQL update.
      const normalizedUpdatedWrong = uniq(updatedWrong).filter(Boolean).filter((x) => x !== correct);
      const normalizedUpdatedAll = uniq(updatedAll).filter(Boolean);

      const wouldBeValid =
        correct &&
        normalizedUpdatedWrong.length === 3 &&
        normalizedUpdatedAll.length === 4 &&
        normalizedUpdatedAll.includes(correct) &&
        !normalizedUpdatedWrong.includes(correct);

      const currentlyValid =
        correct &&
        wrong.length === 3 &&
        all.length === 4 &&
        all.includes(correct) &&
        uniq(all).length === 4 &&
        uniq(wrong).length === 3 &&
        !wrong.includes(correct);

      if (!currentlyValid && wouldBeValid) {
        fixApplied = true;
        fixes.push({
          id,
          wrong_answers: normalizedUpdatedWrong,
          all_answers: normalizedUpdatedAll,
        });
      } else if (!currentlyValid) {
        // Only track invalid; if it can't be fixed, keep it in issues for manual.
        rowIssues.push("needs_manual_answer_fix");
      }

      if (rowIssues.length > 0) {
        issues.push({
          id,
          subtopic: row.subtopic,
          tier: row.tier,
          calculator: row.calculator,
          issues: rowIssues,
          fixApplied,
        });
      }
    }

    from += pageSize;
  }

  const outDir = path.resolve(process.cwd(), "supabase", "data", "generated");
  fs.mkdirSync(outDir, { recursive: true });

  const reportPath = path.join(outDir, "exam_questions_audit_report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ total, issuesCount: issues.length, issues, fixesCount: fixes.length }, null, 2));

  const sqlPath = path.join(outDir, "exam_questions_fixes.sql");
  const sqlLines = [
    "-- Auto-generated fixes for exam_questions",
    "BEGIN;",
    ...fixes.map((f) => {
      return (
        "UPDATE public.exam_questions\n" +
        `SET wrong_answers = ${sqlArrayLiteral(f.wrong_answers)},\n` +
        `    all_answers = ${sqlArrayLiteral(f.all_answers)}\n` +
        `WHERE id = '${sqlEscape(f.id)}';`
      );
    }),
    "COMMIT;",
  ];
  fs.writeFileSync(sqlPath, sqlLines.join("\n\n") + "\n");

  console.log(
    JSON.stringify(
      {
        totalRowsScanned: total,
        issuesFound: issues.length,
        autoFixesGenerated: fixes.length,
        reportPath,
        sqlPath,
        applyHint: "Run the SQL file in Supabase SQL editor, or re-run with --apply to apply via API.",
      },
      null,
      2
    )
  );

  if (args.has("--apply")) {
    if (fixes.length === 0) return;
    let applied = 0;
    for (const f of fixes) {
      const { error } = await admin
        .from("exam_questions")
        .update({ wrong_answers: f.wrong_answers, all_answers: f.all_answers })
        .eq("id", f.id);
      if (error) {
        console.error("Failed to apply fix for", f.id, error.message);
        continue;
      }
      applied++;
    }
    console.log(JSON.stringify({ applied }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

