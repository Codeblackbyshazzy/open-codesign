import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectWorkspaceAt } from './workspace-inspection';

describe('inspectWorkspaceAt', () => {
  it('builds a bounded workspace inspection from the bound workspace files', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'codesign-workspace-inspect-'));
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(path.join(root, 'App.jsx'), 'function App() {}', 'utf8');
    await writeFile(path.join(root, 'DESIGN.md'), '---\nversion: alpha\n---', 'utf8');
    await writeFile(path.join(root, 'docs', 'brief.md'), '# Brief', 'utf8');

    const inspection = await inspectWorkspaceAt(root);

    expect(inspection.entryCandidates).toEqual(['App.jsx']);
    expect(inspection.designDocs).toContain('DESIGN.md');
    expect(inspection.referenceDocs).toContain('docs/brief.md');
  });
});
