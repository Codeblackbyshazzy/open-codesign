import { describe, expect, it } from 'vitest';
import {
  formatRuntimeLoadError,
  isDoneVerifierRequestAllowed,
  isRuntimeVerifierConsoleNoise,
} from './done-verify';

describe('done runtime verifier error formatting', () => {
  it('redacts self-contained data URLs from load failures', () => {
    const longDataUrl = `data:text/html;base64,${'a'.repeat(4096)}`;

    const message = formatRuntimeLoadError('did-fail-load', 'ERR_INVALID_URL', longDataUrl);

    expect(message).toBe('did-fail-load: ERR_INVALID_URL [data:text/html;base64,...truncated]');
    expect(message).not.toContain('aaaa');
    expect(message.length).toBeLessThan(100);
  });

  it('filters Electron CSP warnings from artifact verification', () => {
    expect(
      isRuntimeVerifierConsoleNoise(
        '%cElectron Security Warning (Insecure Content-Security-Policy) font-weight: bold',
      ),
    ).toBe(true);
    expect(isRuntimeVerifierConsoleNoise('ReferenceError: missingValue is not defined')).toBe(
      false,
    );
  });

  it('filters Babel transformer warnings from artifact verification', () => {
    expect(isRuntimeVerifierConsoleNoise('You are using the in-browser Babel transformer.')).toBe(
      true,
    );
  });

  it('allows only the verifier file for file:// requests', () => {
    expect(
      isDoneVerifierRequestAllowed(
        'file:///tmp/codesign-done/verify.html',
        '/tmp/codesign-done/verify.html',
      ),
    ).toBe(true);
    expect(
      isDoneVerifierRequestAllowed(
        'file:///Users/me/private.txt',
        '/tmp/codesign-done/verify.html',
      ),
    ).toBe(false);
    expect(
      isDoneVerifierRequestAllowed(
        'https://fonts.googleapis.com/css2',
        '/tmp/codesign-done/verify.html',
      ),
    ).toBe(true);
  });
});
