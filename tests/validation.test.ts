import { describe, expect, it } from 'vitest';
import { safeProjectPath, validateAbsolutePath, validateHttpUrl, validateProjectName } from '../src/main/security/validation';

describe('security validation', () => {
  it('accepts normal project names', () => expect(validateProjectName('Server-Dashboard_2')).toBe('Server-Dashboard_2'));
  it.each(['../escape', '..', 'two/projects', 'bad name', '.hidden/child'])('rejects unsafe project name %s', (name) => expect(() => validateProjectName(name)).toThrow());
  it('requires absolute paths', () => expect(() => validateAbsolutePath('relative/path')).toThrow('absolute'));
  it('keeps project paths under their parent', () => expect(safeProjectPath('D:\\Projects', 'DexApp')).toBe('D:\\Projects\\DexApp'));
  it('accepts only HTTP protocols', () => {
    expect(validateHttpUrl('https://github.com')).toBe('https://github.com/');
    expect(() => validateHttpUrl('file:///C:/Windows')).toThrow('Only http');
    expect(() => validateHttpUrl('javascript:alert(1)')).toThrow('Only http');
  });
});
