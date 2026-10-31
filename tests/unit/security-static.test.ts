import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Static Security Check (SEC-12)', () => {
  it('SEC-12: grep service_role over app/, components/, lib/ returns nothing', () => {
    const rootDir = process.cwd();
    const targetDirs = ['app', 'components', 'lib'];

    function searchFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(searchFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('service_role')) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const matches: string[] = [];
    for (const dir of targetDirs) {
      const fullDir = path.join(rootDir, dir);
      if (fs.existsSync(fullDir)) {
        matches.push(...searchFiles(fullDir));
      }
    }

    expect(matches, `Found service_role in: ${matches.join(', ')}`).toEqual([]);
  });
});

