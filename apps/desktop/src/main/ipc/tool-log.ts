import type { AgentEvent } from '@open-codesign/core';

type ToolExecutionEndEvent = Extract<AgentEvent, { type: 'tool_execution_end' }>;
type ToolStreamStatus = { status: 'done' | 'error'; errorMessage?: string };
const STREAM_TOOL_TEXT_LIMIT_BYTES = 8 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSetTodosItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) => key === 'text' || key === 'checked') &&
    typeof value['text'] === 'string' &&
    typeof value['checked'] === 'boolean'
  );
}

function isSetTodosTextContent(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) => key === 'type' || key === 'text') &&
    value['type'] === 'text' &&
    typeof value['text'] === 'string'
  );
}

function isSuccessfulSetTodosResult(result: unknown): boolean {
  if (!isRecord(result)) return false;
  if (!Object.keys(result).every((key) => key === 'content' || key === 'details')) return false;

  const details = result['details'];
  if (!isRecord(details)) return false;
  if (!Object.keys(details).every((key) => key === 'items')) return false;
  const items = details['items'];
  if (!Array.isArray(items) || !items.every(isSetTodosItem)) return false;

  const content = result['content'];
  return Array.isArray(content) && content.length > 0 && content.every(isSetTodosTextContent);
}

export function toolExecutionIsErrorForLog(event: ToolExecutionEndEvent): boolean {
  if (event.toolName !== 'set_todos' || !event.isError) return event.isError;
  return !isSuccessfulSetTodosResult(event.result);
}

function textFromToolResult(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const content = result['content'];
  if (!Array.isArray(content)) return undefined;
  const texts = content
    .map((item) =>
      isRecord(item) && item['type'] === 'text' && typeof item['text'] === 'string'
        ? item['text']
        : '',
    )
    .filter((text) => text.length > 0);
  return texts.length > 0 ? texts.join('\n') : undefined;
}

function withSummaryText(result: unknown, text: string): unknown {
  if (!isRecord(result)) return result;
  return {
    ...result,
    content: [{ type: 'text', text }],
  };
}

function skillSummaryFromResult(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const details = result['details'];
  if (!isRecord(details)) return undefined;
  const name = typeof details['name'] === 'string' ? details['name'] : 'skill';
  const status = details['status'];
  if (status === 'loaded') {
    const description = typeof details['description'] === 'string' ? details['description'] : '';
    const trimmedDescription = description.replace(/[.!\s]+$/u, '');
    return trimmedDescription.length > 0
      ? `Loaded skill ${name}: ${trimmedDescription}.`
      : `Loaded skill ${name}.`;
  }
  if (status === 'already-loaded') return `Skill ${name} already loaded.`;
  if (status === 'not-found') return `Skill ${name} not found.`;
  return undefined;
}

export function summarizeToolResultForStream(
  toolName: string,
  result: unknown,
  limitBytes = STREAM_TOOL_TEXT_LIMIT_BYTES,
): unknown {
  const text = textFromToolResult(result);
  if (text === undefined) return result;

  if (toolName === 'skill') {
    return withSummaryText(result, skillSummaryFromResult(result) ?? 'Skill guidance loaded.');
  }

  if (text.length <= limitBytes) return result;
  return withSummaryText(
    result,
    `${toolName} result summarized for chat history; see tool details or current workspace state.`,
  );
}

function blockedReasonFromToolResult(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const details = result['details'];
  if (!isRecord(details)) return undefined;
  if (details['status'] === 'blocked') {
    return typeof details['reason'] === 'string' ? details['reason'] : 'blocked';
  }
  const nestedResult = details['result'];
  if (!isRecord(nestedResult)) return undefined;
  if (nestedResult['blocked'] === true) {
    return typeof nestedResult['reason'] === 'string' ? nestedResult['reason'] : 'blocked';
  }
  if (nestedResult['requiresView'] === true) return 'view_required';
  return undefined;
}

export function toolExecutionStatusForStream(event: ToolExecutionEndEvent): ToolStreamStatus {
  const errorMessage = textFromToolResult(event.result);
  if (toolExecutionIsErrorForLog(event)) {
    return { status: 'error', ...(errorMessage !== undefined ? { errorMessage } : {}) };
  }

  const blockedReason = blockedReasonFromToolResult(event.result);
  if (blockedReason !== undefined) {
    return {
      status: 'error',
      errorMessage: errorMessage ?? `Tool call did not mutate the workspace: ${blockedReason}.`,
    };
  }

  return { status: 'done' };
}
