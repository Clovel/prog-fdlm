/* eslint-disable */
/**
 * One-off migration script: converts the JSX `description: (...)` blocks
 * in src/fixtures/events-*.tsx to markdown template literals.
 *
 * Best-effort. Handles the common cases; flags events that need manual
 * review (img, code-wrapping-bold, attributed spans).
 *
 * Run with: pnpm dlx tsx scripts/html-to-markdown.ts
 */
import fs from 'node:fs';

const FIXTURES = [
  'src/fixtures/events-2024.tsx',
  'src/fixtures/events-2023.tsx',
];

const htmlToMd = (raw: string): string => {
  let s = raw;

  // 1. JSX text padding and literal-string interpolations.
  s = s.replace(/\{' '\}/g, ' ');
  s = s.replace(/\{\s*'([^']*?)'\s*\}/g, '$1');
  s = s.replace(/\{\s*"([^"]*?)"\s*\}/g, '$1');

  // 2. Self-closing tags.
  s = s.replace(/<br\s*\/?\s*>/gi, '  \n');
  s = s.replace(/<hr\s*\/?\s*>/gi, '\n\n---\n\n');

  // 3. Inline formatting. Iterate to a fixed point so nested tags resolve
  //    (e.g. <b><i>x</i></b> → ***x***).
  let prev = '';
  while(s !== prev) {
    prev = s;
    s = s.replace(/<a\s+href="([^"]+)"[\s\S]*?>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    s = s.replace(/<strong>\s*([\s\S]*?)\s*<\/strong>/gi, '**$1**');
    s = s.replace(/<b>\s*([\s\S]*?)\s*<\/b>/gi, '**$1**');
    s = s.replace(/<em>\s*([\s\S]*?)\s*<\/em>/gi, '*$1*');
    s = s.replace(/<i>\s*([\s\S]*?)\s*<\/i>/gi, '*$1*');
    s = s.replace(/<code>\s*([\s\S]*?)\s*<\/code>/gi, '`$1`');
    s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  }

  // 4. Lists (process before paragraphs so nested <ul> inside <p> works).
  s = s.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = inner.replace(/<li>\s*([\s\S]*?)\s*<\/li>/gi, '- $1\n');
    return '\n' + items + '\n';
  });
  s = s.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let n = 0;
    const items = inner.replace(/<li>\s*([\s\S]*?)\s*<\/li>/gi, () => `${++n}. $1\n`);
    return '\n' + items + '\n';
  });

  // 5. Paragraphs → blank-line separated.
  s = s.replace(/<p>\s*([\s\S]*?)\s*<\/p>/gi, '$1\n\n');

  // 6. Normalize whitespace:
  //    - Trim each line's leading whitespace (JSX indentation noise).
  //    - Collapse 3+ consecutive newlines to 2.
  //    - Trim overall.
  s = s.split('\n').map((l) => l.replace(/^\s+/, '').replace(/\s+$/, '')).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();

  return s;
};

const escapeTemplate = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const isManualCase = (jsx: string): boolean => {
  if(/<img/.test(jsx)) return true;
  if(/<code>[\s\S]*?<b>[\s\S]*?<\/b>[\s\S]*?<\/code>/.test(jsx)) return true;
  if(/<span\s+[a-zA-Z]/.test(jsx)) return true;
  return false;
};

const findEventId = (text: string, pos: number): string => {
  const before = text.slice(0, pos);
  const matches = [ ...before.matchAll(/id:\s*'([^']+)'/g) ];
  return matches.length > 0 ? matches[matches.length - 1][1] : '(unknown)';
};

const processFile = (filePath: string): void => {
  const text = fs.readFileSync(filePath, 'utf8');
  const out: string[] = [];
  let count = 0;
  const manual: string[] = [];
  let lastEnd = 0;

  const re = /description: \(/g;
  let m: RegExpExecArray | null;
  while((m = re.exec(text)) !== null) {
    const start = m.index;
    let depth = 0;
    let j = start + 'description: '.length;
    while(j < text.length) {
      const c = text[j];
      if(c === '(') depth++;
      else if(c === ')') {
        depth--;
        if(depth === 0) break;
      }
      j++;
    }
    const blockEnd = j + 1;
    const inner = text.slice(start + 'description: ('.length, blockEnd - 1);

    let jsx = inner.trim();
    if(jsx.startsWith('<>') && jsx.endsWith('</>')) {
      jsx = jsx.slice(2, -3).trim();
    }

    if(isManualCase(jsx)) {
      manual.push(findEventId(text, start));
    }

    const md = htmlToMd(jsx);
    const escaped = escapeTemplate(md);

    out.push(text.slice(lastEnd, start));
    out.push(`description: \`${escaped}\``);
    lastEnd = blockEnd;
    count++;
  }
  out.push(text.slice(lastEnd));

  fs.writeFileSync(filePath, out.join(''));

  console.log(`${filePath}: ${count} descriptions converted`);
  if(manual.length > 0) {
    console.log(`  Manual review needed for event IDs: ${manual.join(', ')}`);
  }
};

for(const fp of FIXTURES) {
  processFile(fp);
}
