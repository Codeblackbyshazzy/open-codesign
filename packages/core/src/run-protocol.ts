import type { DesignRunPreferencesV1 } from '@open-codesign/shared';
import type { AskAnswer, AskInput } from './tools/ask.js';

export interface RunProtocolWorkspaceState {
  hasSource: boolean;
}

export interface RunProtocolPreflightInput {
  prompt: string;
  historyCount: number;
  workspaceState: RunProtocolWorkspaceState;
  runPreferences: DesignRunPreferencesV1;
  routerQuestions?: AskInput['questions'] | undefined;
  attachmentCount?: number | undefined;
  hasReferenceUrl?: boolean | undefined;
  hasDesignSystem?: boolean | undefined;
}

export interface RunProtocolPreflightResult {
  requiresClarification: boolean;
  clarificationQuestions: AskInput['questions'];
  requiresTodosBeforeMutation: boolean;
  preflightNotes: string[];
}

export interface RunProtocolState {
  requiresTodosBeforeMutation: boolean;
  todosSet: boolean;
}

const ARTIFACT_KEYWORDS = [
  'app',
  'screen',
  'page',
  'landing',
  'website',
  'dashboard',
  'deck',
  'slide',
  'poster',
  'report',
  'brief',
  'document',
  'email',
  'watch',
  '界面',
  '页面',
  '屏幕',
  '海报',
  '报告',
  '文档',
  '演示',
  '幻灯片',
];

const VISUAL_KEYWORDS = [
  'apple watch',
  'style',
  '风格',
  'minimal',
  'modern',
  'bold',
  'editorial',
  'professional',
  'playful',
  'high contrast',
  '强对比',
  '圆形',
  'glanceable',
  'watchos',
];

function includesAny(input: string, keywords: readonly string[]): boolean {
  const normalized = input.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function isFreshEmpty(input: RunProtocolPreflightInput): boolean {
  return input.historyCount === 0 && !input.workspaceState.hasSource;
}

function deterministicQuestions(input: RunProtocolPreflightInput): AskInput['questions'] {
  if (!isFreshEmpty(input)) return [];
  if (input.attachmentCount || input.hasReferenceUrl || input.hasDesignSystem) return [];
  const prompt = input.prompt.trim();
  if (prompt.length === 0) return [];

  const questions: AskInput['questions'] = [];
  if (!includesAny(prompt, ARTIFACT_KEYWORDS)) {
    questions.push({
      id: 'artifactType',
      type: 'text-options',
      prompt: 'What should Open CoDesign produce?',
      options: ['mobile-app-screen', 'landing-page', 'document-brief', 'slide-deck'],
    });
  }
  if (!includesAny(prompt, VISUAL_KEYWORDS)) {
    questions.push({
      id: 'visualDirection',
      type: 'text-options',
      prompt: 'Which visual direction should guide the first pass?',
      options: ['professional', 'editorial', 'bold', 'custom'],
    });
  }
  return questions.slice(0, 2);
}

function mergeQuestions(
  primary: AskInput['questions'] | undefined,
  secondary: AskInput['questions'],
): AskInput['questions'] {
  const merged: AskInput['questions'] = [];
  const seen = new Set<string>();
  for (const question of [...(primary ?? []), ...secondary]) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    merged.push(question);
    if (merged.length >= 2) break;
  }
  return merged;
}

export function buildRunProtocolPreflight(
  input: RunProtocolPreflightInput,
): RunProtocolPreflightResult {
  const questions = mergeQuestions(input.routerQuestions, deterministicQuestions(input));
  const requiresTodosBeforeMutation = isFreshEmpty(input) && input.prompt.trim().length > 0;
  return {
    requiresClarification: questions.length > 0,
    clarificationQuestions: questions,
    requiresTodosBeforeMutation,
    preflightNotes: requiresTodosBeforeMutation ? ['fresh-empty-workspace'] : [],
  };
}

export function formatRunProtocolPreflightAnswers(
  answers: Pick<AskAnswer, 'questionId' | 'value'>[],
): string[] {
  const lines = answers
    .filter((answer) => typeof answer.value === 'string' && answer.value.trim().length > 0)
    .map((answer) => `- ${answer.questionId}: ${String(answer.value).trim()}`);
  return lines.length > 0 ? [['## Preflight answers', ...lines].join('\n')] : [];
}
