import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { resolvePython } from './python-command.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const backend = join(root, 'backend');
const backendEnvPath = join(backend, '.env');
const viteEntry = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(viteEntry)) {
  console.error('Frontend packages are missing. Run: npm install');
  process.exit(1);
}
if (!existsSync(backendEnvPath)) {
  console.error('Backend setup is incomplete. Run: npm run setup');
  process.exit(1);
}
const backendEnv = readFileSync(backendEnvPath, 'utf8');
if (backendEnv.includes('YOUR_POSTGRES_PASSWORD')) {
  console.error('Set your PostgreSQL password in backend/.env before starting NeuroMind.');
  process.exit(1);
}

const python = resolvePython(root);
if (!python) {
  console.error('Python or backend/.venv was not found. Run: npm run setup');
  process.exit(1);
}
const dependencyCheck = spawnSync(
  python.command,
  [...python.prefix, '-c', 'import fastapi, sqlalchemy, alembic, jwt, psycopg, uvicorn'],
  { cwd: backend, stdio: 'ignore', shell: false },
);
if (dependencyCheck.status !== 0) {
  console.error('Backend packages are missing. Run: npm run setup');
  process.exit(1);
}

console.log('Checking PostgreSQL database...');
const databaseBootstrap = spawnSync(
  python.command,
  [...python.prefix, '-m', 'scripts.ensure_database'],
  { cwd: backend, stdio: 'inherit', shell: false },
);
if (databaseBootstrap.status !== 0) {
  console.error('\nNeuroMind could not prepare PostgreSQL. Follow the [FIX] message above, then run npm run dev again.');
  process.exit(databaseBootstrap.status ?? 1);
}

console.log('Applying pending Alembic migrations...');
const migration = spawnSync(
  python.command,
  [...python.prefix, '-m', 'alembic', 'upgrade', 'head'],
  { cwd: backend, stdio: 'inherit', shell: false },
);
if (migration.status !== 0) {
  console.error('\nNeuroMind could not connect/migrate PostgreSQL. Start PostgreSQL, verify backend/.env, then run npm run doctor.');
  process.exit(migration.status ?? 1);
}

console.log('Synchronizing the configured local Admin account...');
const adminBootstrap = spawnSync(
  python.command,
  [...python.prefix, '-m', 'scripts.create_admin'],
  { cwd: backend, stdio: 'inherit', shell: false },
);
if (adminBootstrap.status !== 0) {
  console.error('\nAdmin bootstrap failed. Check INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in backend/.env.');
  process.exit(adminBootstrap.status ?? 1);
}

const children = [];
const backendProcess = spawn(
  python.command,
  [...python.prefix, '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'],
  { cwd: backend, stdio: 'inherit', shell: false },
);
children.push(backendProcess);

const frontendProcess = spawn(
  process.execPath,
  [viteEntry, '--port=3000', '--host=0.0.0.0'],
  { cwd: root, stdio: 'inherit', shell: false },
);
children.push(frontendProcess);

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.killed) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  process.exit(exitCode);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

console.log('\nNeuroMind starting:');
console.log('  Frontend: http://localhost:3000');
console.log('  Backend:  http://localhost:8000');
console.log('  API docs: http://localhost:8000/docs\n');
