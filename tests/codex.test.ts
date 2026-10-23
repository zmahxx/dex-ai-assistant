import { describe, expect, it } from 'vitest';
import { buildCodexArgs } from '../src/main/services/codex';

describe('Codex argument construction', () => {
  it('uses workspace sandbox and passes the task as one argument', () => {
    const task = 'Fix tests & do not use a shell'; const args = buildCodexArgs('D:\\Projects\\App', task);
    expect(args).toEqual(['exec', '--json', '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '-C', 'D:\\Projects\\App', '--skip-git-repo-check', task]);
    expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
  });
});
