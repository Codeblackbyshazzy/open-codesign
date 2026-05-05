import { describe, expect, it, vi } from 'vitest';

vi.mock('../electron-runtime', () => ({
  app: { getPath: vi.fn(() => '/tmp/open-codesign-test') },
  ipcMain: { handle: vi.fn() },
}));

import {
  assistantNoteForToolStart,
  buildRunPreferenceAskInput,
  contextWindowForContextPack,
  shouldRunUserMemoryCandidateCapture,
} from './generate';

describe('generate IPC context budget helpers', () => {
  it('uses active model contextWindow when the model object exposes it', () => {
    expect(
      contextWindowForContextPack({ provider: 'p', modelId: 'm', contextWindow: 64_000 }),
    ).toBe(64_000);
  });

  it('falls back to the harness default when model metadata lacks contextWindow', () => {
    expect(contextWindowForContextPack({ provider: 'p', modelId: 'm' })).toBe(200_000);
  });
});

describe('generate IPC memory preference helpers', () => {
  it('captures user memory candidates only when the memory system and user auto-update are enabled', () => {
    expect(
      shouldRunUserMemoryCandidateCapture({
        memoryEnabled: true,
        userMemoryAutoUpdate: true,
      }),
    ).toBe(true);
    expect(
      shouldRunUserMemoryCandidateCapture({
        memoryEnabled: true,
        userMemoryAutoUpdate: false,
      }),
    ).toBe(false);
    expect(
      shouldRunUserMemoryCandidateCapture({
        memoryEnabled: false,
        userMemoryAutoUpdate: true,
      }),
    ).toBe(false);
  });
});

describe('generate IPC run preference preflight helpers', () => {
  it('builds clarification input from semantic router questions', () => {
    const input = buildRunPreferenceAskInput([
      {
        id: 'bitmapAssets',
        type: 'text-options',
        prompt: 'Generate bitmap assets?',
        options: ['auto', 'no', 'yes'],
      },
    ]);
    expect(input.questions[0]).toMatchObject({
      id: 'bitmapAssets',
      type: 'text-options',
      options: ['auto', 'no', 'yes'],
    });
  });
});

describe('generate IPC assistant phase notes', () => {
  it('emits fixed notes for major tool phases when the model has not streamed text', () => {
    expect(assistantNoteForToolStart('ask', {}, false)).toBe(
      'I need a couple choices before building.',
    );
    expect(assistantNoteForToolStart('set_todos', {}, false)).toBe(
      'I’ll lay out the build steps first.',
    );
    expect(
      assistantNoteForToolStart('str_replace_based_edit_tool', { command: 'create' }, false),
    ).toBe('I’m writing the first complete pass now.');
    expect(
      assistantNoteForToolStart('str_replace_based_edit_tool', { command: 'str_replace' }, false),
    ).toBe('I’m applying the next focused edit.');
    expect(assistantNoteForToolStart('preview', {}, false)).toBe(
      'I’m previewing the artifact and checking for issues.',
    );
    expect(assistantNoteForToolStart('done', {}, false)).toBe(
      'I’m running the final completion check.',
    );
  });

  it('does not emit host notes after model text has streamed', () => {
    expect(assistantNoteForToolStart('preview', {}, true)).toBeNull();
  });
});
