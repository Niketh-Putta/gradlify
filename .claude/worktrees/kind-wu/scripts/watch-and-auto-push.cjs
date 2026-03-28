#!/usr/bin/env node
const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: repoRoot, env: process.env }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

let timer = null;
const debounceMs = 2000;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function commitAndPush() {
  try {
    const { stdout: status } = await run('git status --porcelain');
    if (!status.trim()) {
      log('No changes to commit.');
      return;
    }

    const { stdout: branchOut } = await run('git rev-parse --abbrev-ref HEAD');
    const branch = branchOut.trim() || 'main';

    const msg = `autosave: update ${new Date().toISOString()}`;
    log('Staging changes...');
    await run('git add -A');
    try {
      await run(`git commit -m "${msg}"`);
      log('Committed:', msg);
    } catch (e) {
      log('Commit step failed or nothing to commit');
    }

    log(`Pushing to origin/${branch}...`);
    await run(`git push origin ${branch}`);
    log('Push complete.');
  } catch (e) {
    log('Error during auto-push:', e.stderr || e.err || e);
  }
}

const watcher = chokidar.watch([
  'src',
  'public',
  'supabase/functions',
  'supabase/import',
  'package.json',
  'package-lock.json',
  'tsconfig.json'
], {
  ignored: /(^|[\/\\])\..|node_modules|\.git|dist|build|\.vscode/,
  ignoreInitial: true,
  persistent: true,
});

watcher.on('all', (event, p) => {
  log('File change detected:', event, p);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    commitAndPush().catch((err) => log('commitAndPush error', err));
  }, debounceMs);
});

process.on('SIGINT', () => {
  log('Watcher exiting');
  watcher.close();
  process.exit(0);
});

log('Auto-commit watcher started (CJS). Watching src/ and key files. Press Ctrl+C to stop.');
