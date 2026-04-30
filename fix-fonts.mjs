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

let totalChanges = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;
  
  // Replace text-[Npx] with text-[N+4px] (including responsive prefixes like md:text-[Npx])
  content = content.replace(/(?<=^(?:md:)?\S*\s.*?)(text-)\[(\d+)px\]/gm, (match, prefix, size) => {
    const newSize = parseInt(size) + 4;
    return `${prefix}[${newSize}px]`;
  });

  // Simpler approach: just replace all text-[Npx] patterns
  // Reset and use a simpler regex
  content = original;
  content = content.replace(/text-\[(\d+)px\]/g, (match, size) => {
    const newSize = parseInt(size) + 4;
    return `text-[${newSize}px]`;
  });

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    const changes = (original.match(/text-\[\d+px\]/g) || []).length;
    totalChanges += changes;
    console.log(`Updated ${changes} sizes in ${file.replace(srcDir, 'src')}`);
  }
}

console.log(`\nTotal changes: ${totalChanges}`);
