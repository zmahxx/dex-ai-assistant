import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

export interface CodexRunOptions {
  projectDirectory: string;
  task: string;
  onOutput: (line: string) => void;
}

export function buildCodexArgs(projectDirectory: string, task: string): string[] {
  return ['exec', '--json', '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '-C', projectDirectory, '--skip-git-repo-check', task];
}

function runCommand(command: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, shell: false });
    let stdout = ''; let stderr = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`${command} timed out.`)); }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.on('close', (code) => { clearTimeout(timeout); resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? -1 }); });
  });
}

export class CodexService {
  private readonly tasks = new Map<string, ChildProcessWithoutNullStreams>();

  private async findExecutable(): Promise<string> {
    const configured = process.env.CODEX_PATH;
    if (configured) {
      try { await access(configured, constants.X_OK); return configured; } catch { /* continue discovery */ }
    }
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
      const binDirectory = join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
      try {
        const versions = await readdir(binDirectory, { withFileTypes: true });
        const candidates = await Promise.all(versions.filter((entry) => entry.isDirectory()).map(async (entry) => {
          const executable = join(binDirectory, entry.name, 'codex.exe');
          try { return { executable, modified: (await stat(executable)).mtimeMs }; } catch { return null; }
        }));
        const newest = candidates.filter((candidate): candidate is { executable: string; modified: number } => candidate !== null).sort((a, b) => b.modified - a.modified)[0];
        if (newest) return newest.executable;
      } catch { /* fall through to PATH */ }
    }
    return 'codex';
  }

  async checkInstalled(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const result = await runCommand(await this.findExecutable(), ['--version'], 10_000);
      return result.code === 0 ? { installed: true, version: result.stdout } : { installed: false, error: result.stderr || 'Codex returned an error.' };
    } catch (error) { return { installed: false, error: error instanceof Error ? error.message : 'Codex is not installed.' }; }
  }

  async runTask(options: CodexRunOptions): Promise<{ taskId: string; exitCode: number }> {
    const taskId = randomUUID();
    const child = spawn(await this.findExecutable(), buildCodexArgs(options.projectDirectory, options.task), {
      cwd: options.projectDirectory, windowsHide: true, shell: false, env: process.env,
    });
    this.tasks.set(taskId, child);
    const readLines = (chunk: Buffer) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach(options.onOutput);
    child.stdout.on('data', readLines); child.stderr.on('data', readLines);
    const completion = new Promise<{ taskId: string; exitCode: number }>((resolve, reject) => {
      child.on('error', (error) => { this.tasks.delete(taskId); reject(error); });
      child.on('close', (code) => { this.tasks.delete(taskId); resolve({ taskId, exitCode: code ?? -1 }); });
    });
    return completion;
  }

  cancelTask(taskId: string): boolean { const task = this.tasks.get(taskId); return task ? task.kill() : false; }
}
