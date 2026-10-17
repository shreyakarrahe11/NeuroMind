import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePython } from './python-command.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const backend = join(root, 'backend');
const checks = [];
const notes = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });

add('Frontend packages', existsSync(join(root, 'node_modules')), 'run npm install');
add('Frontend environment', existsSync(join(root, '.env')) || existsSync(join(root, '.env.local')), 'run npm run setup');
const backendEnvPath = join(backend, '.env');
add('Backend environment', existsSync(backendEnvPath), 'run npm run setup');

const python = resolvePython(root);
add('Python runtime', Boolean(python), 'Python 3.11+ is required');
if (python) {
  const result = spawnSync(python.command, [...python.prefix, '-c', 'import fastapi, sqlalchemy, alembic, jwt, cryptography, psycopg, uvicorn'], {
    cwd: backend,
    stdio: 'ignore',
    shell: false,
  });
  add('Backend packages', result.status === 0, 'run npm run setup');
}

let databaseTarget = null;
let clerkJwksUrl = null;
let aiModelsConfigured = false;
if (existsSync(backendEnvPath)) {
  const env = readFileSync(backendEnvPath, 'utf8');
  const value = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  add('PostgreSQL password', Boolean(value && !value.includes('YOUR_POSTGRES_PASSWORD')), 'edit backend/.env');
  if (value) {
    try {
      const parsed = new URL(value.replace(/^postgresql\+[^:]+:/, 'postgresql:'));
      databaseTarget = { host: parsed.hostname, port: Number(parsed.port || 5432) };
    } catch {
      add('DATABASE_URL format', false, 'use postgresql+psycopg://user:password@host:5432/database');
    }
  }

  const clerkIssuer = env.match(/^CLERK_ISSUER=(.*)$/m)?.[1]?.trim().replace(/\/$/, '');
  const configuredJwks = env.match(/^CLERK_JWKS_URL=(.*)$/m)?.[1]?.trim();
  const clerkJwtKey = env.match(/^CLERK_JWT_KEY=(.*)$/m)?.[1]?.trim();
  const clerkSecretKey = env.match(/^CLERK_SECRET_KEY=(.*)$/m)?.[1]?.trim();
  clerkJwksUrl = configuredJwks || (clerkIssuer ? `${clerkIssuer}/.well-known/jwks.json` : null);
  add(
    'Clerk backend verification',
    Boolean(clerkJwtKey || clerkJwksUrl),
    'set CLERK_ISSUER, CLERK_JWKS_URL, or CLERK_JWT_KEY in backend/.env',
  );
  if (!clerkSecretKey) {
    notes.push('[INFO] Clerk email fallback is not configured — add CLERK_SECRET_KEY or include email in Clerk session claims.');
  } else if (!clerkSecretKey.startsWith('sk_')) {
    add('Clerk server secret', false, 'CLERK_SECRET_KEY must be the server-only sk_ key from Clerk Dashboard > API Keys');
  } else {
    add('Clerk server secret', true, 'server-only profile fallback is configured');
  }
  const adminPassword = env.match(/^INITIAL_ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
  add(
    'Admin bootstrap password',
    Boolean(adminPassword && adminPassword.length >= 12 && !adminPassword.includes('generate-a-unique-strong-password')),
    'set a unique INITIAL_ADMIN_PASSWORD (12+ characters) in backend/.env',
  );
  const speechModel = env.match(/^SPEECH_MODEL_PATH=(.*)$/m)?.[1]?.trim();
  const fusionModel = env.match(/^MULTIMODAL_MODEL_PATH=(.*)$/m)?.[1]?.trim();
  aiModelsConfigured = Boolean(speechModel || fusionModel);
  if (aiModelsConfigured) {
    add(
      'Final model paths',
      Boolean(speechModel && fusionModel),
      'set both SPEECH_MODEL_PATH and MULTIMODAL_MODEL_PATH after Phase 1 training',
    );
  }
}

if (python && aiModelsConfigured) {
  const aiResult = spawnSync(
    python.command,
    [...python.prefix, '-c', 'import torch, transformers'],
    { cwd: backend, stdio: 'ignore', shell: false },
  );
  add('Phase 1 AI runtime', aiResult.status === 0, 'run npm run setup:ai');
}

if (databaseTarget) {
  const reachable = await new Promise((resolve) => {
    const socket = createConnection(databaseTarget);
    const finish = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
  add('PostgreSQL network', reachable, `${databaseTarget.host}:${databaseTarget.port}`);
  if (reachable && python) {
    const databaseCheck = spawnSync(
      python.command,
      [...python.prefix, '-m', 'scripts.ensure_database', '--check-only'],
      { cwd: backend, encoding: 'utf8', shell: false },
    );
    const detail = `${databaseCheck.stderr || databaseCheck.stdout || 'run npm run db:migrate'}`.trim().split(/\r?\n/).at(-1);
    add('PostgreSQL database', databaseCheck.status === 0, detail);
  }
}

if (clerkJwksUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(clerkJwksUrl, { signal: controller.signal });
    const payload = response.ok ? await response.json() : null;
    add('Clerk JWKS', Boolean(response.ok && Array.isArray(payload?.keys) && payload.keys.length), clerkJwksUrl);
  } catch {
    add('Clerk JWKS', false, `cannot reach ${clerkJwksUrl}; check internet or use CLERK_JWT_KEY`);
  } finally {
    clearTimeout(timeout);
  }
}

console.log('\nNeuroMind connection doctor\n');
for (const check of checks) {
  console.log(`${check.ok ? '[PASS]' : '[FIX ]'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}
for (const note of notes) console.log(note);
const failures = checks.filter((check) => !check.ok).length;
console.log(`\n${failures ? `${failures} item(s) need attention.` : 'Core startup prerequisites look good.'}`);
process.exitCode = failures ? 1 : 0;
