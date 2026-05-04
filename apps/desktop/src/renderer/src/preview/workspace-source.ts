import {
  classifyRenderableSource,
  findArtifactSourceReference,
  resolveArtifactSourceReferencePath,
} from '@open-codesign/runtime';
import { DEFAULT_SOURCE_ENTRY, LEGACY_SOURCE_ENTRY } from '@open-codesign/shared';

export interface WorkspacePreviewReadResult {
  content: string;
  path: string;
}

export type WorkspacePreviewRead = (
  designId: string,
  path: string,
) => Promise<WorkspacePreviewReadResult>;

export function hasWorkspaceSourceReference(
  source: string,
  path: string = LEGACY_SOURCE_ENTRY,
): boolean {
  return resolveReferencedWorkspacePreviewPath(source, path) !== null;
}

function looksLikeLegacyHtmlFragment(source: string): boolean {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith('<')) return false;
  const next = trimmed[1];
  return next === '!' || next === '/' || next === undefined || !/[A-Z]/u.test(next);
}

export function inferPreviewSourcePath(source: string): string {
  const kind = classifyRenderableSource(source);
  if (kind === 'html') return LEGACY_SOURCE_ENTRY;
  if (kind === 'unknown' && looksLikeLegacyHtmlFragment(source)) return LEGACY_SOURCE_ENTRY;
  return DEFAULT_SOURCE_ENTRY;
}

function looksLikeJsxModule(source: string): boolean {
  return (
    /\bReactDOM\.createRoot\s*\(/.test(source) ||
    /EDITMODE-BEGIN/.test(source) ||
    /(?:^|\n)\s*(?:function|const|let)\s+_?App\b/.test(source)
  );
}

export function resolveReferencedWorkspacePreviewPath(source: string, path: string): string | null {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.html') && !lower.endsWith('.htm')) return null;
  if (looksLikeJsxModule(source)) return null;
  const reference = findArtifactSourceReference(source);
  return reference === null ? null : resolveArtifactSourceReferencePath(path, reference);
}

export async function readWorkspacePreviewSource(input: {
  designId: string;
  path: string;
  read: WorkspacePreviewRead;
}): Promise<WorkspacePreviewReadResult> {
  const result = await input.read(input.designId, input.path);
  return resolveWorkspacePreviewSource({
    designId: input.designId,
    source: result.content,
    path: result.path,
    read: input.read,
  });
}

export async function resolveWorkspacePreviewSource(input: {
  designId: string;
  source: string;
  path?: string | undefined;
  read?: WorkspacePreviewRead | undefined;
  requireReferencedSource?: boolean | undefined;
}): Promise<WorkspacePreviewReadResult> {
  const path = input.path ?? inferPreviewSourcePath(input.source);
  const referencedPath = resolveReferencedWorkspacePreviewPath(input.source, path);
  if (referencedPath === null) return { content: input.source, path };
  if (!input.read) {
    if (input.requireReferencedSource) {
      throw new Error(
        `Cannot resolve referenced preview source without files API: ${referencedPath}`,
      );
    }
    return { content: input.source, path };
  }
  let referenced: WorkspacePreviewReadResult;
  try {
    referenced = await input.read(input.designId, referencedPath);
  } catch (err) {
    if (input.requireReferencedSource) throw err;
    console.warn('Failed to read referenced preview source; falling back to original.', err);
    return { content: input.source, path };
  }
  if (referenced.content.trim().length === 0) {
    console.warn('Referenced preview source is empty; falling back to original.', {
      path: referenced.path,
    });
    return { content: input.source, path };
  }
  return { content: referenced.content, path: referenced.path };
}
