import { CodesignError } from '@open-codesign/shared';
import { describe, expect, it } from 'vitest';
import { exportAssetOptions, parseRequest } from './exporter-ipc';

describe('parseRequest', () => {
  it('rejects a null payload with IPC_BAD_INPUT', () => {
    expect(() => parseRequest(null)).toThrow(CodesignError);
    expect(() => parseRequest(null)).toThrowError(
      expect.objectContaining({ code: 'IPC_BAD_INPUT' }),
    );
  });

  it('rejects an unknown format with EXPORTER_UNKNOWN', () => {
    expect(() => parseRequest({ format: 'docx', artifactSource: '<p>hi</p>' })).toThrowError(
      expect.objectContaining({ code: 'EXPORTER_UNKNOWN' }),
    );
  });

  it('rejects an empty artifactSource with IPC_BAD_INPUT', () => {
    expect(() => parseRequest({ format: 'pdf', artifactSource: '' })).toThrowError(
      expect.objectContaining({ code: 'IPC_BAD_INPUT' }),
    );
  });

  it('accepts a valid pdf request', () => {
    const result = parseRequest({
      format: 'pdf',
      artifactSource: '<html/>',
      defaultFilename: 'report.pdf',
    });
    expect(result.format).toBe('pdf');
    expect(result.artifactSource).toBe('<html/>');
    expect(result.defaultFilename).toBe('report.pdf');
  });

  it('accepts workspace source context for local asset exports', () => {
    const result = parseRequest({
      format: 'zip',
      artifactSource: '<img src="assets/logo.svg">',
      workspacePath: '/workspace',
      sourcePath: 'screens/home/index.html',
    });

    expect(result.workspacePath).toBe('/workspace');
    expect(result.sourcePath).toBe('screens/home/index.html');
    expect(exportAssetOptions(result)).toMatchObject({
      assetRootPath: '/workspace',
      assetBasePath: '/workspace/screens/home',
      sourcePath: 'screens/home/index.html',
    });
  });

  it('preserves sourcePath for export classification even without a workspace path', () => {
    const result = parseRequest({
      format: 'html',
      artifactSource: 'function App() { return <main />; }',
      sourcePath: 'App.tsx',
    });

    expect(exportAssetOptions(result)).toEqual({ sourcePath: 'App.tsx' });
  });

  it('normalizes backslash sourcePath separators before resolving assets', () => {
    const result = parseRequest({
      format: 'html',
      artifactSource: 'function App() { return <main />; }',
      workspacePath: '/workspace',
      sourcePath: 'screens\\home\\App.jsx',
    });

    expect(result.sourcePath).toBe('screens/home/App.jsx');
    expect(exportAssetOptions(result)).toMatchObject({
      assetBasePath: '/workspace/screens/home',
      sourcePath: 'screens/home/App.jsx',
    });
  });

  it('rejects unsafe sourcePath values before resolving export assets', () => {
    for (const sourcePath of ['/tmp/App.jsx', '../App.jsx', 'screens/../App.jsx', 'file:App.jsx']) {
      expect(() =>
        parseRequest({
          format: 'html',
          artifactSource: 'function App() { return <main />; }',
          sourcePath,
        }),
      ).toThrowError(expect.objectContaining({ code: 'IPC_BAD_INPUT' }));
    }
  });
});
