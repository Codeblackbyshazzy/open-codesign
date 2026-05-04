import { describe, expect, it } from 'vitest';
import type { DesignFileEntry } from './useDesignFiles';
import { previewSourceFallbackFile, withPreviewSourceFallback } from './useDesignFiles';

describe('useDesignFiles helpers', () => {
  it('creates a virtual App.jsx entry from previewSource', () => {
    expect(previewSourceFallbackFile('<html>ok</html>', '2026-05-03T00:00:00.000Z')).toEqual({
      path: 'App.jsx',
      kind: 'jsx',
      size: 15,
      updatedAt: '2026-05-03T00:00:00.000Z',
      source: 'preview-html',
    });
  });

  it('keeps real workspace files ahead of previewSource fallback', () => {
    const rows: DesignFileEntry[] = [
      {
        path: 'src/App.tsx',
        kind: 'tsx',
        size: 123,
        updatedAt: '2026-05-03T00:00:00.000Z',
        source: 'workspace',
      },
    ];

    expect(withPreviewSourceFallback(rows, '<html>fallback</html>')).toBe(rows);
  });

  it('uses previewSource when the workspace list is empty', () => {
    expect(
      withPreviewSourceFallback([], '<html>fallback</html>', '2026-05-03T00:00:00.000Z'),
    ).toEqual([
      {
        path: 'App.jsx',
        kind: 'jsx',
        size: 21,
        updatedAt: '2026-05-03T00:00:00.000Z',
        source: 'preview-html',
      },
    ]);
  });

  it('returns no files when neither workspace rows nor previewSource exist', () => {
    expect(withPreviewSourceFallback([], null)).toEqual([]);
    expect(withPreviewSourceFallback([], '')).toEqual([]);
  });
});
