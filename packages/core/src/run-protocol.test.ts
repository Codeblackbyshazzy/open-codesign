import { describe, expect, it } from 'vitest';
import { buildRunProtocolPreflight, formatRunProtocolPreflightAnswers } from './run-protocol.js';

describe('run protocol preflight', () => {
  it('asks deterministic questions for a fresh vague empty-workspace prompt', () => {
    const result = buildRunProtocolPreflight({
      prompt: 'make something cool',
      historyCount: 0,
      workspaceState: { hasSource: false },
      runPreferences: {
        schemaVersion: 1,
        tweaks: 'auto',
        bitmapAssets: 'auto',
        reusableSystem: 'auto',
      },
    });

    expect(result.requiresClarification).toBe(true);
    expect(result.clarificationQuestions.map((q) => q.id)).toEqual([
      'artifactType',
      'visualDirection',
    ]);
    expect(result.requiresTodosBeforeMutation).toBe(true);
  });

  it('does not ask for a specific Apple Watch run coach brief', () => {
    const result = buildRunProtocolPreflight({
      prompt:
        '设计一个 Apple Watch 风格的 run coach screen。极小视口里要显示当前距离、pace ring、heart-rate zone、haptic cue 状态、pause/resume 控制和一句 glanceable coaching message。',
      historyCount: 0,
      workspaceState: { hasSource: false },
      runPreferences: {
        schemaVersion: 1,
        tweaks: 'auto',
        bitmapAssets: 'auto',
        reusableSystem: 'auto',
      },
    });

    expect(result.requiresClarification).toBe(false);
    expect(result.clarificationQuestions).toEqual([]);
    expect(result.requiresTodosBeforeMutation).toBe(true);
  });

  it('preserves router questions and dedupes deterministic questions by id', () => {
    const result = buildRunProtocolPreflight({
      prompt: 'make something cool',
      historyCount: 0,
      workspaceState: { hasSource: false },
      runPreferences: {
        schemaVersion: 1,
        tweaks: 'auto',
        bitmapAssets: 'auto',
        reusableSystem: 'auto',
      },
      routerQuestions: [
        {
          id: 'visualDirection',
          type: 'text-options',
          prompt: 'Which direction?',
          options: ['professional', 'editorial', 'bold', 'custom'],
        },
      ],
    });

    expect(result.clarificationQuestions.map((q) => q.id)).toEqual([
      'visualDirection',
      'artifactType',
    ]);
  });

  it('formats non-preference preflight answers for agent context', () => {
    const section = formatRunProtocolPreflightAnswers([
      { questionId: 'artifactType', value: 'mobile-app-screen' },
      { questionId: 'visualDirection', value: 'bold' },
    ]);

    expect(section).toEqual([
      ['## Preflight answers', '- artifactType: mobile-app-screen', '- visualDirection: bold'].join(
        '\n',
      ),
    ]);
  });
});
