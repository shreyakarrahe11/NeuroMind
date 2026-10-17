import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { resolvePython } from './python-command.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const backend = join(root, 'backend');
const python = resolvePython(root);
const task = process.argv[2] || 'serve';

if (!python) {
  console.error('Python 3 was not found. Install Python 3.11+ or set NEUROMIND_PYTHON.');
  process.exit(1);
}
if (!existsSync(join(backend, '.env'))) {
  console.error('backend/.env is missing. Run: npm run setup');
  process.exit(1);
}

const backendEnvPath = join(backend, '.env');
const backendEnv = readFileSync(backendEnvPath, 'utf8');
if (backendEnv.includes('YOUR_POSTGRES_PASSWORD')) {
  console.error('PostgreSQL is not configured yet.');
  console.error('Open backend/.env and replace YOUR_POSTGRES_PASSWORD with your real local PostgreSQL password.');
  console.error('Do not include < > around the password, and do not share the password with anyone.');
  process.exit(1);
}

const tasks = {
  serve: ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'],
  migrate: ['-m', 'alembic', 'upgrade', 'head'],
  admin: ['-m', 'scripts.create_admin'],
  models: ['-m', 'scripts.model_status'],
  test: ['-m', 'pytest', '-q'],
  'auth-test': ['-m', 'pytest', '-q', 'tests/test_role_auth_flow.py'],
  check: ['-m', 'scripts.check_backend'],
  'ai-install': ['-m', 'pip', 'install', '-r', 'requirements-ai.txt'],
  preflight: ['-m', 'scripts.production_preflight'],
};

if (!tasks[task]) {
  console.error(`Unknown backend task: ${task}`);
  process.exit(1);
}

if (task === 'migrate') {
  const databaseBootstrap = spawnSync(
    python.command,
    [...python.prefix, '-m', 'scripts.ensure_database'],
    { cwd: backend, env: process.env, stdio: 'inherit', shell: false },
  );
  if (databaseBootstrap.status !== 0) {
    console.error('Database preparation failed. Follow the [FIX] message above.');
    process.exit(databaseBootstrap.status ?? 1);
  }
}

const child = spawn(python.command, [...python.prefix, ...tasks[task]], {
  cwd: backend,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
