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

function configureGitUser(repoRoot: string): void {
  runGit(repoRoot, ['config', 'user.name', 'Tonypedia Content Agent']);
  runGit(repoRoot, ['config', 'user.email', 'content-agent@tonypedia.local']);
}

export function getDraftBranchName(batchId: string): string {
  return `draft/${batchId}`;
}

export function commitDraftBranch(repoRoot: string, batchId: string, filePaths: string[]): void {
  const branch = getDraftBranchName(batchId);
  const relativePaths = filePaths.map((filePath) => path.relative(repoRoot, filePath));

  configureGitUser(repoRoot);
  runGit(repoRoot, ['checkout', '-b', branch]);
  runGit(repoRoot, ['add', ...relativePaths]);
  runGit(repoRoot, ['commit', '-m', `content: draft batch ${batchId}`]);
  runGit(repoRoot, ['push', 'origin', branch]);
}

export function checkoutDraftFile(repoRoot: string, batchId: string, draftPath: string): void {
  const branch = getDraftBranchName(batchId);

  runGit(repoRoot, ['fetch', 'origin', `${branch}:refs/remotes/origin/${branch}`]);
  runGit(repoRoot, ['checkout', `origin/${branch}`, '--', draftPath]);
}

export function deleteDraftBranch(repoRoot: string, batchId: string): void {
  try {
    runGit(repoRoot, ['push', 'origin', '--delete', getDraftBranchName(batchId)]);
  } catch {
    // Best effort: a leftover draft branch is harmless.
  }
}
