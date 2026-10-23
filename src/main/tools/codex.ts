import { mkdir, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { z } from 'zod';
import type { DexterTool } from '../agent/toolTypes';
import { RiskLevel } from '../security/permissions';
import { safeProjectPath, validateAbsolutePath, validateProjectName } from '../security/validation';
import type { CodexService } from '../services/codex';

async function ensureDirectory(path: string): Promise<void> { const info = await stat(path); if (!info.isDirectory()) throw new Error('Project path is not a directory.'); }

async function initializeGit(directory: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['init'], { cwd: directory, windowsHide: true, shell: false });
    child.on('error', () => resolve(false)); child.on('close', (code) => resolve(code === 0));
  });
}

function readableCodexLine(line: string): string {
  try {
    const event = JSON.parse(line) as Record<string, unknown>;
    const item = event.item as Record<string, unknown> | undefined;
    return String(item?.text ?? item?.command ?? event.message ?? event.type ?? line);
  } catch { return line; }
}

export function makeCheckCodexTool(codex: CodexService): DexterTool {
  return { name: 'check_codex_installation', description: 'Check whether the local Codex CLI is installed and report its version.', riskLevel: RiskLevel.SAFE,
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false }, execute: () => codex.checkInstalled() };
}

export function makeRunCodexTaskTool(codex: CodexService): DexterTool<{ projectDirectory: string; task: string }> {
  return {
    name: 'run_codex_task', description: 'Ask the installed Codex CLI to perform a software task inside an existing project. Requires confirmation.', riskLevel: RiskLevel.CONFIRM,
    inputSchema: { type: 'object', properties: { projectDirectory: { type: 'string' }, task: { type: 'string' } }, required: ['projectDirectory', 'task'], additionalProperties: false },
    confirmationSummary: (input) => ({ title: 'Start Codex task?', description: input.task, details: { projectDirectory: input.projectDirectory } }),
    async execute(raw, context) {
      const input = z.object({ projectDirectory: z.string(), task: z.string().min(3).max(12_000) }).strict().parse(raw);
      const projectDirectory = validateAbsolutePath(input.projectDirectory); await ensureDirectory(projectDirectory);
      const result = await codex.runTask({ projectDirectory, task: input.task, onOutput: (line) => context.emitActivity(readableCodexLine(line)) });
      if (result.exitCode !== 0) throw new Error(`Codex exited with code ${result.exitCode}.`);
      return result;
    },
  };
}

export function makeStartCodexProjectTool(codex: CodexService): DexterTool<{ projectName: string; parentDirectory: string; projectDescription: string }> {
  return {
    name: 'start_codex_project', description: 'Create a new project directory and ask Codex to build the described project. Requires confirmation.', riskLevel: RiskLevel.CONFIRM,
    inputSchema: { type: 'object', properties: { projectName: { type: 'string' }, parentDirectory: { type: 'string' }, projectDescription: { type: 'string' } }, required: ['projectName', 'parentDirectory', 'projectDescription'], additionalProperties: false },
    confirmationSummary: (input) => ({ title: 'Create project with Codex?', description: input.projectDescription, details: { projectName: input.projectName, destination: `${input.parentDirectory}\\${input.projectName}` } }),
    async execute(raw, context) {
      const input = z.object({ projectName: z.string(), parentDirectory: z.string(), projectDescription: z.string().min(3).max(12_000) }).strict().parse(raw);
      const name = validateProjectName(input.projectName); const parent = validateAbsolutePath(input.parentDirectory); await ensureDirectory(parent);
      const destination = safeProjectPath(parent, name);
      try { await stat(destination); throw new Error('The project destination already exists.'); } catch (error) { if (error instanceof Error && error.message.includes('already exists')) throw error; }
      await mkdir(destination);
      const gitInitialized = await initializeGit(destination);
      await writeFile(join(destination, 'AGENTS.md'), `# ${name}\n\nBuild the project described below. Keep changes inside this directory, use safe defaults, and test your work.\n\n## Project brief\n\n${input.projectDescription}\n`, 'utf8');
      context.emitActivity(`Created ${destination}${gitInitialized ? ' and initialized Git' : ''}.`);
      const prompt = `Build a working project in the current directory.\n\nProject: ${name}\nRequest: ${input.projectDescription}\n\nFollow AGENTS.md. Work autonomously, keep all files in this directory, run appropriate tests, and report what you verified.`;
      const result = await codex.runTask({ projectDirectory: destination, task: prompt, onOutput: (line) => context.emitActivity(readableCodexLine(line)) });
      if (result.exitCode !== 0) throw new Error(`Codex exited with code ${result.exitCode}. The project directory was preserved.`);
      return { ...result, destination, gitInitialized };
    },
  };
}
