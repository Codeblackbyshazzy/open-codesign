import { inspectWorkspaceFiles, type WorkspaceInspection } from '@open-codesign/core';
import { readWorkspaceFilesAt } from './workspace-reader';

export async function inspectWorkspaceAt(workspaceRoot: string): Promise<WorkspaceInspection> {
  return inspectWorkspaceFiles(await readWorkspaceFilesAt(workspaceRoot));
}
