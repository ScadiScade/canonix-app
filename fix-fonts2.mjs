import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkDir(dir) {
  const results = [];
  for (const file of readdirSync(dir)) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const srcDir = 'd:/Projects/Canonix/canonix-app/src';
const files = walkDir(srcDir);

// Tailwind standard text sizes → +4px bracket notation
const sizeMap = {
  'text-xs': 'text-[16px]',
  'text-sm': 'text-[18px]',
  'text-base': 'text-[20px]',
  'text-lg': 'text-[22px]',
  'text-xl': 'text-[24px]',
  'text-2xl': 'text-[28px]',
  'text-3xl': 'text-[34px]',
  'text-4xl': 'text-[40px]',
  'md:text-xs': 'md:text-[16px]',
  'md:text-sm': 'md:text-[18px]',
  'md:text-base': 'md:text-[20px]',
  'md:text-lg': 'md:text-[22px]',
  'md:text-xl': 'md:text-[24px]',
  'md:text-2xl': 'md:text-[28px]',
  'md:text-3xl': 'md:text-[34px]',
  'md:text-4xl': 'md:text-[40px]',
};

let totalChanges = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  for (const [from, to] of Object.entries(sizeMap)) {
    // Use word boundary matching to avoid replacing text-ink, text-accent, etc.
    // Match the class as a standalone token in className strings
    const regex = new RegExp(`(?<=[\\s"'/])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s"'/])`, 'g');
    content = content.replace(regex, to);
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    const diff = content.length - original.length;
    console.log(`Updated ${file.replace(srcDir, 'src')} (diff: ${diff > 0 ? '+' : ''}${diff} chars)`);
    totalChanges++;
  }
}

console.log(`\nTotal files updated: ${totalChanges}`);
