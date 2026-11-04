import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'mumu_admin_session';
const DEV_TOKEN_PREFIX = 'mumu_dev_';
const DEFAULT_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Escapes untrusted strings before interpolating into HTML (e.g. Resend emails).
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips CR/LF characters to prevent email header injection in subjects/headers.
 */
export function sanitizeEmailHeader(input: string): string {
  return input.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Signs a development-only admin session token using HMAC-SHA256.
 */
export function signDevToken(email: string, secret: string, nowMs: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email, iat: nowMs }), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${DEV_TOKEN_PREFIX}${payload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed development token and checks expiration.
 */
export function verifyDevToken(
  token: string,
  secret: string,
  maxAgeMs: number = DEFAULT_TOKEN_TTL_MS,
  nowMs: number = Date.now()
): string | null {
  if (!token || !token.startsWith(DEV_TOKEN_PREFIX)) {
    return null;
  }

  const raw = token.slice(DEV_TOKEN_PREFIX.length);
  const dotIndex = raw.indexOf('.');
  if (dotIndex <= 0 || dotIndex === raw.length - 1) {
    return null;
  }

  const payload = raw.slice(0, dotIndex);
  const providedSig = raw.slice(dotIndex + 1);
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
      iat?: unknown;
    };

    if (typeof decoded.email !== 'string' || typeof decoded.iat !== 'number') {
      return null;
    }

    if (nowMs - decoded.iat > maxAgeMs || decoded.iat > nowMs + 60_000) {
      return null;
    }

    return decoded.email;
  } catch {
    return null;
  }
}

/**
 * Extracts session token from HttpOnly cookie first, or Authorization Bearer header.
 */
export function extractSessionToken(request: Request): string {
  const cookieHeader = request.headers.get('Cookie') || '';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const part of cookies) {
      const [rawName, ...rest] = part.trim().split('=');
      if (rawName === ADMIN_COOKIE_NAME && rest.length > 0) {
        return decodeURIComponent(rest.join('=').trim());
      }
    }
  }

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

/**
 * Builds an HttpOnly, SameSite=Strict cookie header for admin sessions.
 */
export function buildSessionCookie(
  token: string,
  isProduction: boolean,
  maxAgeSeconds: number = 8 * 60 * 60
): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Builds a Set-Cookie header that immediately expires the admin session cookie.
 */
export function buildClearSessionCookie(isProduction: boolean): string {
  return buildSessionCookie('', isProduction, 0);
}

/**
 * Resolves client IP prioritizing Netlify's trusted connection header.
 */
export function getClientIp(request: Request): string {
  const netlifyIp = request.headers.get('x-nf-client-connection-ip');
  if (netlifyIp) return netlifyIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'local-ip';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Lightweight sliding-window rate limiter per key (e.g. client IP).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string, nowMs: number = Date.now()): RateLimitResult {
    const windowStart = nowMs - this.windowMs;
    const existing = (this.hits.get(key) || []).filter((ts) => ts > windowStart);

    if (existing.length >= this.maxRequests) {
      const oldestInWindow = existing[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + this.windowMs - nowMs) / 1000));
      this.hits.set(key, existing);
      return { allowed: false, retryAfterSeconds };
    }

    existing.push(nowMs);
    this.hits.set(key, existing);

    // Opportunistic cleanup to bound memory usage
    if (this.hits.size > 1000) {
      for (const [k, timestamps] of this.hits.entries()) {
        const active = timestamps.filter((ts) => ts > windowStart);
        if (active.length === 0) {
          this.hits.delete(k);
        } else {
          this.hits.set(k, active);
        }
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset(): void {
    this.hits.clear();
  }
}

export const contactRateLimiter = new RateLimiter(5, 10 * 60 * 1000);
export const authRateLimiter = new RateLimiter(8, 15 * 60 * 1000);

