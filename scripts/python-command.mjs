import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function resolvePython(rootDirectory) {
  const configured = process.env.NEUROMIND_PYTHON?.trim();
  const candidates = [
    configured ? { command: configured, prefix: [] } : null,
    { command: join(rootDirectory, 'backend', '.venv', 'Scripts', 'python.exe'), prefix: [] },
    { command: join(rootDirectory, 'backend', '.venv', 'bin', 'python'), prefix: [] },
    process.platform === 'win32'
      ? { command: 'py', prefix: ['-3'] }
      : { command: 'python3', prefix: [] },
    { command: 'python', prefix: [] },
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.command.includes('/') || candidate.command.includes('\\')) {
      if (!existsSync(candidate.command)) continue;
    }
    const result = spawnSync(candidate.command, [...candidate.prefix, '--version'], {
      encoding: 'utf8',
      shell: false,
    });
    if (result.status === 0) return candidate;
  }
  return null;
}
