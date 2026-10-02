import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../src/lib/clipboard';

describe('Clipboard Lib Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when empty text is provided', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('should copy via navigator.clipboard when available in secure context', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'window', {
      value: { isSecureContext: true },
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: { clipboard: { writeText: writeTextMock } },
      writable: true,
    });

    const result = await copyToClipboard('contacto@mumutech.com');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('contacto@mumutech.com');
  });

  it('should fallback to document.execCommand when navigator.clipboard is unavailable', async () => {
    Object.defineProperty(global, 'window', {
      value: { isSecureContext: false },
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
    });

    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const execCommandMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(global, 'document', {
      value: {
        createElement: () => ({
          style: {},
          value: '',
          focus: vi.fn(),
          select: vi.fn(),
        }),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      },
      writable: true,
    });

    const result = await copyToClipboard('fallback@mumutech.com');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('should handle exceptions gracefully and return false', async () => {
    Object.defineProperty(global, 'window', {
      value: { isSecureContext: true },
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      },
      writable: true,
    });

    const result = await copyToClipboard('error@mumutech.com');
    expect(result).toBe(false);
  });
});
