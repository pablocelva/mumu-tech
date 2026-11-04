import { describe, it, expect } from 'vitest';
import {
  ADMIN_COOKIE_NAME,
  RateLimiter,
  buildClearSessionCookie,
  buildSessionCookie,
  escapeHtml,
  extractSessionToken,
  getClientIp,
  sanitizeEmailHeader,
  signDevToken,
  verifyDevToken,
} from '../src/lib/security';

describe('Security Utilities Unit Tests', () => {
  describe('escapeHtml & sanitizeEmailHeader', () => {
    it('should escape dangerous HTML characters', () => {
      const malicious = `<script>alert("xss" & 'bad')</script>`;
      expect(escapeHtml(malicious)).toBe(
        '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;bad&#39;)&lt;/script&gt;'
      );
    });

    it('should strip CR/LF from email headers', () => {
      expect(sanitizeEmailHeader('Consulta\r\nBcc: attacker@evil.com')).toBe(
        'Consulta Bcc: attacker@evil.com'
      );
    });
  });

  describe('signDevToken & verifyDevToken', () => {
    const secret = 'test-hmac-secret-987654321';

    it('should sign and verify a valid HMAC token', () => {
      const now = 1_700_000_000_000;
      const token = signDevToken('admin@mumutech.com', secret, now);
      expect(token.startsWith('mumu_dev_')).toBe(true);
      expect(verifyDevToken(token, secret, 60_000, now + 5_000)).toBe('admin@mumutech.com');
    });

    it('should reject tampered, expired, or malformed tokens', () => {
      const now = 1_700_000_000_000;
      const token = signDevToken('admin@mumutech.com', secret, now);

      expect(verifyDevToken('', secret)).toBeNull();
      expect(verifyDevToken('mumu_token_legacy_forged', secret)).toBeNull();
      expect(verifyDevToken('mumu_dev_nodot', secret)).toBeNull();
      expect(verifyDevToken(`${token}tampered`, secret, 60_000, now)).toBeNull();
      expect(verifyDevToken(token, 'wrong-secret', 60_000, now)).toBeNull();
      // Expired
      expect(verifyDevToken(token, secret, 10_000, now + 20_000)).toBeNull();
    });

    it('should reject malformed JSON payloads with valid HMAC', async () => {
      const { createHmac } = await import('node:crypto');
      const badJsonPayload = Buffer.from('{not-json', 'utf8').toString('base64url');
      const sig1 = createHmac('sha256', secret).update(badJsonPayload).digest('base64url');
      expect(verifyDevToken(`mumu_dev_${badJsonPayload}.${sig1}`, secret)).toBeNull();

      const badShapePayload = Buffer.from(JSON.stringify({ email: 123 }), 'utf8').toString('base64url');
      const sig2 = createHmac('sha256', secret).update(badShapePayload).digest('base64url');
      expect(verifyDevToken(`mumu_dev_${badShapePayload}.${sig2}`, secret)).toBeNull();
    });
  });

  describe('Cookie & Session Token Helpers', () => {
    it('should extract token from HttpOnly Cookie first, then Authorization header', () => {
      const reqWithCookie = new Request('http://localhost/admin', {
        headers: {
          Cookie: `other=1; ${ADMIN_COOKIE_NAME}=cookie_tok_123`,
          Authorization: 'Bearer header_tok_456',
        },
      });
      expect(extractSessionToken(reqWithCookie)).toBe('cookie_tok_123');

      const reqWithBearer = new Request('http://localhost/api/content', {
        headers: { Authorization: 'Bearer header_tok_456' },
      });
      expect(extractSessionToken(reqWithBearer)).toBe('header_tok_456');

      const reqEmpty = new Request('http://localhost/admin');
      expect(extractSessionToken(reqEmpty)).toBe('');
    });

    it('should build secure HttpOnly session cookies for dev and prod', () => {
      const devCookie = buildSessionCookie('tok', false, 3600);
      expect(devCookie).toContain('HttpOnly');
      expect(devCookie).toContain('SameSite=Strict');
      expect(devCookie).not.toContain('Secure');

      const prodCookie = buildSessionCookie('tok', true, 3600);
      expect(prodCookie).toContain('Secure');

      const cleared = buildClearSessionCookie(true);
      expect(cleared).toContain('Max-Age=0');
    });
  });

  describe('getClientIp & RateLimiter', () => {
    it('should prioritize x-nf-client-connection-ip over x-forwarded-for', () => {
      const reqNf = new Request('http://localhost', {
        headers: {
          'x-nf-client-connection-ip': '203.0.113.10',
          'x-forwarded-for': '198.51.100.1',
        },
      });
      expect(getClientIp(reqNf)).toBe('203.0.113.10');

      const reqFwd = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
      });
      expect(getClientIp(reqFwd)).toBe('198.51.100.1');

      const reqLocal = new Request('http://localhost');
      expect(getClientIp(reqLocal)).toBe('local-ip');
    });

    it('should enforce sliding-window limits and recover after window expires', () => {
      const limiter = new RateLimiter(2, 10_000);
      const t0 = 1_000_000;

      expect(limiter.check('ip-1', t0).allowed).toBe(true);
      expect(limiter.check('ip-1', t0 + 1000).allowed).toBe(true);

      const blocked = limiter.check('ip-1', t0 + 2000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBe(8);

      // After window passes
      expect(limiter.check('ip-1', t0 + 11_000).allowed).toBe(true);

      limiter.reset();
      expect(limiter.check('ip-1', t0 + 11_000).allowed).toBe(true);
    });
  });
});

