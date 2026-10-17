import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
for (const path of [join(root, 'dist'), join(root, 'server.js')]) {
  rmSync(path, { recursive: true, force: true });
}
console.log('Removed generated frontend output.');
