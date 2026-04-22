import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCodesignStore } from '../../store';
import type { Toast } from '../../store';
import { AUTO_DISMISS_MS, scheduleAutoDismiss } from '../Toast';

describe('Toast auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses success toasts after 5s', () => {
    const onDismiss = vi.fn();
    scheduleAutoDismiss('success', onDismiss);
    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses info toasts after 5s', () => {
    const onDismiss = vi.fn();
    scheduleAutoDismiss('info', onDismiss);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss error toasts', () => {
    const onDismiss = vi.fn();
    const cleanup = scheduleAutoDismiss('error', onDismiss);
    expect(cleanup).toBeNull();
    vi.advanceTimersByTime(60_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('cleanup cancels the pending timer', () => {
    const onDismiss = vi.fn();
    const cleanup = scheduleAutoDismiss('success', onDismiss);
    expect(cleanup).not.toBeNull();
    cleanup?.();
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('exposes 5s for non-error variants and null for error', () => {
    expect(AUTO_DISMISS_MS.success).toBe(5000);
    expect(AUTO_DISMISS_MS.info).toBe(5000);
    expect(AUTO_DISMISS_MS.error).toBeNull();
  });
});

describe('resolveToastEventId', () => {
  const baseToast = (over: Partial<Toast> = {}): Toast => ({
    id: 't1',
    variant: 'error',
    title: 'boom',
    ...over,
  });

  beforeEach(() => {
    useCodesignStore.setState({ recentEvents: [] });
  });

  it('returns toast.eventId when set (no store lookup needed)', async () => {
    // Also ensure it does not accidentally hit a recentEvents fallback.
    useCodesignStore.setState({
      recentEvents: [
        {
          id: 999,
          schemaVersion: 1,
          ts: Date.now(),
          level: 'error',
          code: 'x',
          scope: 's',
          runId: 'other',
          fingerprint: 'f',
          message: 'm',
          stack: undefined,
          transient: false,
          count: 1,
          context: undefined,
        },
      ],
    });
    const id = await useCodesignStore
      .getState()
      .resolveToastEventId(baseToast({ eventId: 42, runId: 'other' }));
    expect(id).toBe(42);
  });

  it('looks up by runId after refreshing events', async () => {
    useCodesignStore.setState({
      recentEvents: [
        {
          id: 100,
          schemaVersion: 1,
          ts: Date.now(),
          level: 'error',
          code: 'x',
          scope: 's',
          runId: 'run-xyz',
          fingerprint: 'f',
          message: 'm',
          stack: undefined,
          transient: false,
          count: 1,
          context: undefined,
        },
      ],
      // Stub refreshDiagnosticEvents so it doesn't require window.codesign.
      refreshDiagnosticEvents: async () => {
        /* noop — test provides recentEvents directly */
      },
    });
    const id = await useCodesignStore
      .getState()
      .resolveToastEventId(baseToast({ runId: 'run-xyz' }));
    expect(id).toBe(100);
  });

  it('returns null when runId has no match', async () => {
    useCodesignStore.setState({
      recentEvents: [
        {
          id: 100,
          schemaVersion: 1,
          ts: Date.now(),
          level: 'error',
          code: 'x',
          scope: 's',
          runId: 'run-other',
          fingerprint: 'f',
          message: 'm',
          stack: undefined,
          transient: false,
          count: 1,
          context: undefined,
        },
      ],
      refreshDiagnosticEvents: async () => {
        /* noop */
      },
    });
    const id = await useCodesignStore
      .getState()
      .resolveToastEventId(baseToast({ runId: 'run-missing' }));
    expect(id).toBeNull();
  });

  it('returns null when neither eventId nor runId is set', async () => {
    const id = await useCodesignStore.getState().resolveToastEventId(baseToast());
    expect(id).toBeNull();
  });
});
