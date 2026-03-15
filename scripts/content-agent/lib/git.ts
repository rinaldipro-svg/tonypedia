import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

export function commitAndPushPublishedArticles(
  repoRoot: string,
  filePaths: string[],
  articleCount: number
): void {
  const relativePaths = filePaths.map((filePath) => path.relative(repoRoot, filePath));

  runGit(repoRoot, ['config', 'user.name', 'Tonypedia Content Agent']);
  runGit(repoRoot, ['config', 'user.email', 'content-agent@tonypedia.local']);
  runGit(repoRoot, ['add', ...relativePaths]);

  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: repoRoot });

  if (diff.status === 0) {
    return;
  }

  runGit(repoRoot, ['commit', '-m', `Publish ${articleCount} Tonypedia article(s)`]);
  runGit(repoRoot, ['push', 'origin', 'HEAD:main']);
}
