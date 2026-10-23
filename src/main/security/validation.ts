import { isAbsolute, normalize, relative, resolve } from 'node:path';

export const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function validateProjectName(name: string): string {
  const trimmed = name.trim();
  if (!PROJECT_NAME_PATTERN.test(trimmed) || trimmed === '.' || trimmed === '..') {
    throw new Error('Project names must be 1-64 characters and use only letters, numbers, dots, dashes, or underscores.');
  }
  return trimmed;
}

export function validateAbsolutePath(input: string): string {
  if (!input.trim() || !isAbsolute(input)) throw new Error('An absolute path is required.');
  const normalized = normalize(input);
  return normalized;
}

export function safeProjectPath(parent: string, projectName: string): string {
  const safeParent = validateAbsolutePath(parent);
  const safeName = validateProjectName(projectName);
  const destination = resolve(safeParent, safeName);
  const child = relative(safeParent, destination);
  if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Project path escapes its parent directory.');
  return destination;
}

export function validateHttpUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a valid URL.'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http:// and https:// URLs are allowed.');
  return url.toString();
}
