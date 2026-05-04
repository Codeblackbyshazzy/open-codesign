import path from 'node:path';
import { type ExporterFormat, type ExportOptions, exportArtifact } from '@open-codesign/exporters';
import { CodesignError, DEFAULT_SOURCE_ENTRY, ERROR_CODES } from '@open-codesign/shared';
import type { BrowserWindow } from 'electron';
import { dialog, ipcMain } from './electron-runtime';

const FORMAT_FILTERS: Record<ExporterFormat, Electron.FileFilter[]> = {
  html: [{ name: 'HTML', extensions: ['html'] }],
  pdf: [{ name: 'PDF', extensions: ['pdf'] }],
  pptx: [{ name: 'PowerPoint', extensions: ['pptx'] }],
  zip: [{ name: 'ZIP archive', extensions: ['zip'] }],
  markdown: [{ name: 'Markdown', extensions: ['md'] }],
};

function hasUrlSchemePrefix(value: string): boolean {
  const colon = value.indexOf(':');
  if (colon <= 0) return false;
  return /^[A-Za-z][A-Za-z0-9+.-]*$/u.test(value.slice(0, colon));
}

function normalizeExportSourcePath(raw: string): string {
  let normalized = raw.trim().replace(/\\/g, '/');
  while (normalized.startsWith('./')) normalized = normalized.slice(2);
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//u.test(normalized) ||
    hasUrlSchemePrefix(normalized)
  ) {
    throw new CodesignError(
      'export sourcePath must be workspace-relative',
      ERROR_CODES.IPC_BAD_INPUT,
    );
  }
  const parts = normalized.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) {
    throw new CodesignError(
      'export sourcePath must be workspace-relative',
      ERROR_CODES.IPC_BAD_INPUT,
    );
  }
  return normalized;
}

export interface ExportRequest {
  format: ExporterFormat;
  artifactSource: string;
  defaultFilename?: string;
  workspacePath?: string;
  sourcePath?: string;
}

export interface ExportResponse {
  status: 'saved' | 'cancelled';
  path?: string;
  bytes?: number;
}

export function parseRequest(raw: unknown): ExportRequest {
  if (raw === null || typeof raw !== 'object') {
    throw new CodesignError('export expects an object payload', ERROR_CODES.IPC_BAD_INPUT);
  }
  const r = raw as Record<string, unknown>;
  const format = r['format'];
  const source = r['artifactSource'];
  const defaultFilename = r['defaultFilename'];
  const workspacePath = r['workspacePath'];
  const sourcePath = r['sourcePath'];
  if (
    format !== 'html' &&
    format !== 'pdf' &&
    format !== 'pptx' &&
    format !== 'zip' &&
    format !== 'markdown'
  ) {
    throw new CodesignError(
      `Unknown export format: ${String(format)}`,
      ERROR_CODES.EXPORTER_UNKNOWN,
    );
  }
  if (typeof source !== 'string' || source.length === 0) {
    throw new CodesignError('export requires non-empty artifactSource', ERROR_CODES.IPC_BAD_INPUT);
  }
  const out: ExportRequest = { format, artifactSource: source };
  if (typeof defaultFilename === 'string' && defaultFilename.length > 0) {
    out.defaultFilename = defaultFilename;
  }
  if (typeof workspacePath === 'string' && workspacePath.length > 0) {
    out.workspacePath = workspacePath;
  }
  if (typeof sourcePath === 'string' && sourcePath.length > 0) {
    out.sourcePath = normalizeExportSourcePath(sourcePath);
  }
  return out;
}

export function exportAssetOptions(req: ExportRequest): ExportOptions {
  const sourcePath = req.sourcePath ?? DEFAULT_SOURCE_ENTRY;
  if (!req.workspacePath) return { sourcePath };
  const sourceDir = path.dirname(sourcePath);
  return {
    assetRootPath: req.workspacePath,
    assetBasePath: path.resolve(req.workspacePath, sourceDir),
    sourcePath,
  };
}

export function registerExporterIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('codesign:export', async (_evt, raw: unknown): Promise<ExportResponse> => {
    const req = parseRequest(raw);
    const win = getWindow();
    const defaultExt = req.format === 'markdown' ? 'md' : req.format;
    const opts: Electron.SaveDialogOptions = {
      title: `Export design as ${req.format.toUpperCase()}`,
      defaultPath: req.defaultFilename ?? `design.${defaultExt}`,
      filters: FORMAT_FILTERS[req.format],
    };
    const picked = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts);
    if (picked.canceled || !picked.filePath) {
      return { status: 'cancelled' };
    }

    // Export formats load their heavy deps lazily inside
    // exportArtifact. Errors propagate to the renderer as toasts (PRINCIPLES §10).
    const result = await exportArtifact(
      req.format,
      req.artifactSource,
      picked.filePath,
      exportAssetOptions(req),
    );
    return { status: 'saved', path: result.path, bytes: result.bytes };
  });
}
