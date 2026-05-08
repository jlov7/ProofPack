import fs from 'node:fs';
import path from 'node:path';

const cssDir = path.join(process.cwd(), 'apps', 'web', '.next', 'static', 'css');

function collectCssFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectCssFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.css') ? [entryPath] : [];
  });
}

const css = collectCssFiles(cssDir)
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

const requiredUtilities = ['.flex', '.w-60', '.p-8', '.text-2xl', '.grid'];
const missing = requiredUtilities.filter((utility) => !css.includes(utility));

if (missing.length > 0) {
  console.error(`Tailwind utility generation failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.warn(`Tailwind utility generation verified (${requiredUtilities.join(', ')})`);
