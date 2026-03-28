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

function ensurePreserve(svg) {
  return svg.replace(/<svg([^>]*)>/i, (m, attrs) => {
    if (/preserveAspectRatio\s*=\s*"[^"]+"/i.test(attrs)) return m;
    return `<svg${attrs} preserveAspectRatio="xMidYMid meet">`;
  });
}

function ensureOverflowVisible(svg) {
  return svg.replace(/<svg([^>]*)>/i, (m, attrs) => {
    if (/overflow\s*=\s*"[^"]+"/i.test(attrs)) return m;
    if (/style\s*=\s*"[^"]*overflow\s*:\s*visible[^"]*"/i.test(attrs)) return m;
    return `<svg${attrs} style="overflow:visible">`;
  });
}

function ensureViewBox(svg) {
  if (/viewBox\s*=\s*"[^"]+"/i.test(svg)) return svg;
  const m = svg.match(/<svg[^>]*width\s*=\s*"([0-9.]+)"[^>]*height\s*=\s*"([0-9.]+)"/i);
  if (!m) return svg;
  const w = Math.round(Number(m[1]));
  const h = Math.round(Number(m[2]));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return svg;
  return svg.replace(/<svg([^>]*)>/i, `<svg$1 viewBox="0 0 ${w} ${h}">`);
}

function expandViewBox(svg) {
  return svg.replace(/<svg[^>]*viewBox\s*=\s*"([^"]+)"([^>]*)>/i, (m, vb) => {
    try {
      const parts = vb.trim().split(/[ ,]+/).map(Number);
      if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return m;
      let [minX, minY, w, h] = parts;
      const padW = w * 0.12;
      const padH = h * 0.12;
      const newMinX = Math.floor(minX - padW);
      const newMinY = Math.floor(minY - padH);
      const newW = Math.ceil(w + padW * 2);
      const newH = Math.ceil(h + padH * 2);
      return m.replace(vb, `${newMinX} ${newMinY} ${newW} ${newH}`);
    } catch {
      return m;
    }
  });
}

function normalizeDarkThemeSvgs(svg) {
  // Many generated svgs use a dark background and light strokes; normalize to a light background.
  let out = svg;

  // Background: dark -> white
  out = out.replace(
    /<rect([^>]*?)fill\s*=\s*"(#0b0f1a|#0b0f1aff|#000000|#000|rgb\(0,\s*0,\s*0\))"([^>]*)\/?>/gi,
    (_m, pre, _fill, post) => `<rect${pre}fill="#ffffff"${post}/>`
  );

  // Common light text/stroke colors -> slate-900
  out = out.replace(/stroke\s*=\s*"(#f5f5f5|#e5e7eb|#ffffff|#fff)"/gi, 'stroke="#111827"');
  out = out.replace(/fill\s*=\s*"(#e5e7eb|#f5f5f5|#ffffff|#fff)"/gi, 'fill="#111827"');

  // Keep highlight colors (yellow/orange/blue) as-is.
  // If a node uses white fill for shapes that should remain white (e.g. right angle markers),
  // that’s fine on white background; they will still show via stroke.
  return out;
}

function resolveStoragePath(raw) {
  if (!raw) return null;
  const url = String(raw).trim();
  if (!url) return null;
  if (url.startsWith("http")) {
    // already public URL; can't safely map back to path
    return null;
  }
  return url.replace(/^\/+/, "").replace(/^questions\//, "");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");

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

  // Collect all image paths
  const pageSize = 1000;
  let from = 0;
  const paths = new Set();

  while (true) {
    const { data, error } = await admin
      .from("exam_questions")
      .select("image_url")
      .not("image_url", "is", null)
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("Supabase query error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      const p = resolveStoragePath(r.image_url);
      if (p && p.toLowerCase().endsWith(".svg")) paths.add(p);
    }
    from += pageSize;
  }

  const report = {
    total: paths.size,
    downloaded: 0,
    patched: 0,
    uploaded: 0,
    skipped: 0,
    failures: [],
  };

  const outDir = path.resolve(process.cwd(), "supabase", "data", "generated");
  fs.mkdirSync(outDir, { recursive: true });

  for (const p of paths) {
    try {
      const { data, error } = await admin.storage.from("questions").download(p);
      if (error || !data) {
        report.failures.push({ path: p, error: error?.message || "download_failed" });
        continue;
      }

      report.downloaded++;
      const buf = Buffer.from(await data.arrayBuffer());
      const before = buf.toString("utf8");

      let after = before;
      after = ensureViewBox(after);
      after = ensurePreserve(after);
      after = expandViewBox(after);
      after = ensureOverflowVisible(after);
      after = normalizeDarkThemeSvgs(after);

      if (after === before) {
        report.skipped++;
        continue;
      }

      report.patched++;

      if (!apply) continue;

      const uploadRes = await admin.storage
        .from("questions")
        .upload(p, Buffer.from(after, "utf8"), {
          upsert: true,
          contentType: "image/svg+xml",
          cacheControl: "3600",
        });
      if (uploadRes.error) {
        report.failures.push({ path: p, error: uploadRes.error.message || "upload_failed" });
        continue;
      }
      report.uploaded++;
    } catch (e) {
      report.failures.push({ path: p, error: String(e) });
    }
  }

  const reportPath = path.join(outDir, `exam_question_images_fix_report_${apply ? "applied" : "dry_run"}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ apply, ...report, reportPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

