import { describe, expect, it, vi } from 'vitest';

vi.mock('../electron-runtime', () => ({
  app: { getPath: vi.fn(() => '/tmp/open-codesign-test') },
  ipcMain: { handle: vi.fn() },
}));

import {
  buildRunPreferenceAskInput,
  contextWindowForContextPack,
  mergeRunPreferenceAnswers,
  shouldRequestRunPreferencePreflight,
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
  it('asks fresh designs for tweak preferences', () => {
    expect(
      shouldRequestRunPreferencePreflight({
        hasSource: false,
        existingPreferences: null,
        prompt: 'make a dashboard',
      }),
    ).toBe(true);
  });

  it('does not ask again once run preferences are stored', () => {
    expect(
      shouldRequestRunPreferencePreflight({
        hasSource: false,
        existingPreferences: {
          schemaVersion: 1,
          tweaks: 'auto',
          bitmapAssets: 'auto',
          reusableSystem: 'auto',
        },
        prompt: 'make another screen',
      }),
    ).toBe(false);
  });

  it('updates explicit prompt overrides without preflight', () => {
    expect(
      mergeRunPreferenceAnswers(
        {
          schemaVersion: 1,
          tweaks: 'auto',
          bitmapAssets: 'auto',
          reusableSystem: 'auto',
        },
        [],
        '不要加微调，也不要生成图片',
      ),
    ).toEqual({
      schemaVersion: 1,
      tweaks: 'no',
      bitmapAssets: 'no',
      reusableSystem: 'auto',
    });
  });

  it('builds a required tweaks question for fresh preflight', () => {
    const input = buildRunPreferenceAskInput('make a landing page');
    expect(input.questions[0]).toMatchObject({
      id: 'tweaks',
      type: 'text-options',
      options: ['auto', 'no', 'yes'],
    });
  });
});
