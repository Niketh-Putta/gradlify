#!/usr/bin/env node
/**
 * Verify Supabase connectivity and optionally sync a personal access token into .env.
 *
 * Usage:
 *   node scripts/setup-supabase-connection.mjs
 *   node scripts/setup-supabase-connection.mjs --token sbp_...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

function loadEnv() {
  if (!fs.existsSync(envPath)) throw new Error("Missing .env in project root");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function updateEnvToken(token) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  let found = false;
  const next = lines.map((line) => {
    if (!line.startsWith("SUPABASE_ACCESS_TOKEN=")) return line;
    found = true;
    return `SUPABASE_ACCESS_TOKEN=${token}`;
  });
  if (!found) next.push(`SUPABASE_ACCESS_TOKEN=${token}`);
  fs.writeFileSync(envPath, next.join("\n"));
}

async function checkManagementApi(token, projectRef) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function checkRestApi(url, serviceRoleKey) {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function checkMcpEndpoint(projectRef, token) {
  const res = await fetch(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 120) };
}

function runSupabase(args, extraEnv = {}) {
  return spawnSync("supabase", args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
}

async function main() {
  const tokenArgIndex = process.argv.indexOf("--token");
  const tokenFromCli = tokenArgIndex >= 0 ? process.argv[tokenArgIndex + 1]?.trim() : "";
  if (tokenFromCli) updateEnvToken(tokenFromCli);

  const env = loadEnv();
  const projectRef = env.VITE_SUPABASE_PROJECT_ID;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = tokenFromCli || env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing VITE_SUPABASE_PROJECT_ID, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  console.log(`Project: ${projectRef}`);
  console.log(`URL: ${supabaseUrl}`);

  const rest = await checkRestApi(supabaseUrl, serviceRoleKey);
  console.log(rest.ok ? "REST API: OK" : `REST API: FAIL (${rest.status}) ${rest.body.slice(0, 120)}`);

  if (accessToken) {
    const mgmt = await checkManagementApi(accessToken, projectRef);
    console.log(
      mgmt.ok ? "Management API: OK" : `Management API: FAIL (${mgmt.status}) ${mgmt.body.slice(0, 120)}`,
    );
    const mcp = await checkMcpEndpoint(projectRef, accessToken);
    console.log(mcp.ok ? "MCP (PAT): OK" : `MCP (PAT): ${mcp.status} (OAuth MCP in Cursor does not need PAT)`);
  } else {
    console.log("Management API: skipped (no SUPABASE_ACCESS_TOKEN)");
  }

  const mcpOAuth = await checkMcpEndpoint(projectRef);
  console.log(
    mcpOAuth.status === 401
      ? "MCP (OAuth): ready — authorize in Cursor Settings → Tools & MCP → supabase"
      : `MCP (OAuth): HTTP ${mcpOAuth.status}`,
  );

  if (accessToken) {
    const login = runSupabase(["login", "--token", accessToken], { SUPABASE_ACCESS_TOKEN: "" });
    if (login.status === 0) {
      console.log("Supabase CLI: logged in with .env token");
      const link = runSupabase(["link", "--project-ref", projectRef, "--yes"], {
        SUPABASE_ACCESS_TOKEN: accessToken,
      });
      if (link.status === 0) console.log("Supabase CLI: project linked");
      else console.log("Supabase CLI link:", (link.stderr || link.stdout || "").trim());
    } else {
      console.log("Supabase CLI login failed — use Cursor OAuth MCP or run with a fresh --token");
    }
  }

  console.log("\nNext: Cursor → Settings → Tools & MCP → refresh → enable supabase + supabase-db");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
