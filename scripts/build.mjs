import { cp, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');

// dist/ contains only generated site files and is replaced on each build.
await rm(output, { recursive: true, force: true });
await cp(path.join(root, 'public'), output, { recursive: true });
await mkdir(path.join(output, 'src'), { recursive: true });
await copyFile(path.join(root, 'src/model.js'), path.join(output, 'src/model.js'));
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Static site built in dist/');
