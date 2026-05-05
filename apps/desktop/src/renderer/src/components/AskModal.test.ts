import { describe, expect, it } from 'vitest';
import type { AskRequest } from '../../../preload/index';
import { advanceAskQueue, enqueueAskRequest } from './AskModal';

const request = (requestId: string): AskRequest => ({
  requestId,
  sessionId: `session-${requestId}`,
  input: {
    questions: [{ id: 'q1', type: 'freeform', prompt: 'What style?' }],
  },
});

describe('AskModal queue helpers', () => {
  it('queues concurrent requests without replacing the active request', () => {
    const first = request('ask-1');
    const second = request('ask-2');

    let state = enqueueAskRequest({ active: null, queue: [] }, first);
    state = enqueueAskRequest(state, second);

    expect(state.active?.requestId).toBe('ask-1');
    expect(state.queue.map((item) => item.requestId)).toEqual(['ask-2']);
  });

  it('advances to the next request after the active request resolves', () => {
    const state = {
      active: request('ask-1'),
      queue: [request('ask-2'), request('ask-3')],
    };

    const next = advanceAskQueue(state);

    expect(next.active?.requestId).toBe('ask-2');
    expect(next.queue.map((item) => item.requestId)).toEqual(['ask-3']);
  });
});
