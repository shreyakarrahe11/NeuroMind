import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolvePython } from './python-command.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const backend = join(root, 'backend');

function ensureEnvironment(example, destination) {
  if (!existsSync(destination)) copyFileSync(example, destination);
}

ensureEnvironment(join(root, '.env.example'), join(root, '.env'));
ensureEnvironment(join(backend, '.env.example'), join(backend, '.env'));

const backendEnvPath = join(backend, '.env');
let backendEnv = readFileSync(backendEnvPath, 'utf8');
if (backendEnv.includes('JWT_SECRET_KEY=replace-with-a-long-random-secret')) {
  backendEnv = backendEnv.replace(
    'JWT_SECRET_KEY=replace-with-a-long-random-secret',
    `JWT_SECRET_KEY=${randomBytes(48).toString('hex')}`,
  );
  writeFileSync(backendEnvPath, backendEnv, 'utf8');
}
if (backendEnv.includes('DATA_ENCRYPTION_KEY=generate-a-fernet-key')) {
  const fernetKey = randomBytes(32).toString('base64').replaceAll('+', '-').replaceAll('/', '_');
  backendEnv = backendEnv.replace(
    'DATA_ENCRYPTION_KEY=generate-a-fernet-key',
    `DATA_ENCRYPTION_KEY=${fernetKey}`,
  );
  writeFileSync(backendEnvPath, backendEnv, 'utf8');
}
if (backendEnv.includes('INITIAL_ADMIN_PASSWORD=generate-a-unique-strong-password')) {
  backendEnv = backendEnv.replace(
    'INITIAL_ADMIN_PASSWORD=generate-a-unique-strong-password',
    `INITIAL_ADMIN_PASSWORD=Nm!${randomBytes(24).toString('hex')}`,
  );
  writeFileSync(backendEnvPath, backendEnv, 'utf8');
}

const systemPython = resolvePython(root);
if (!systemPython) {
  console.error('Python 3.11+ is required. Install Python, then run npm run setup again.');
  process.exit(1);
}

const venvPython = process.platform === 'win32'
  ? join(backend, '.venv', 'Scripts', 'python.exe')
  : join(backend, '.venv', 'bin', 'python');
if (!existsSync(venvPython)) {
  mkdirSync(backend, { recursive: true });
  const created = spawnSync(systemPython.command, [...systemPython.prefix, '-m', 'venv', '.venv'], {
    cwd: backend,
    stdio: 'inherit',
    shell: false,
  });
  if (created.status !== 0) process.exit(created.status ?? 1);
}

const installed = spawnSync(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], {
  cwd: backend,
  stdio: 'inherit',
  shell: false,
});
if (installed.status !== 0) process.exit(installed.status ?? 1);
const requirements = spawnSync(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
  cwd: backend,
  stdio: 'inherit',
  shell: false,
});
if (requirements.status !== 0) process.exit(requirements.status ?? 1);

console.log('\nSetup complete.');
if (backendEnv.includes('YOUR_POSTGRES_PASSWORD')) {
  console.log('REQUIRED: open backend/.env and replace YOUR_POSTGRES_PASSWORD with your real PostgreSQL password.');
  console.log('Example: DATABASE_URL=postgresql+psycopg://postgres:MyPassword123@localhost:5432/neuromind');
  console.log('Do not include < > around your password and do not share it.');
}
console.log('Then run: npm run doctor');
console.log('Then run: npm run db:migrate');
console.log('Finally run: npm run dev');
console.log('Admin email and the generated local password are stored only in backend/.env.');
