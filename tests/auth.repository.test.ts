import { describe, it, expect, afterEach } from 'vitest';
import { authRepository } from '../src/repositories/auth.repository';

describe('AuthRepository Unit Tests', () => {
  afterEach(() => {
    authRepository.setAllowDemoFallback(true);
  });

  it('should authenticate dev admin successfully with HMAC signed token', async () => {
    const result = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });

    expect(result.user).not.toBeNull();
    expect(result.user?.email).toBe('admin@mumutech.com');
    expect(result.token).not.toBeNull();
    expect(result.token?.startsWith('mumu_dev_')).toBe(true);
  });

  it('should reject invalid credentials', async () => {
    const result = await authRepository.login({
      email: 'wrong@mumutech.com',
      password: 'wrongpassword',
    });

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('should verify a valid HMAC signed dev token', async () => {
    const loginResult = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });

    const user = await authRepository.verifyToken(loginResult.token!);
    expect(user).not.toBeNull();
    expect(user?.email).toBe('admin@mumutech.com');
  });

  it('should reject forged legacy mumu_token_ or empty token', async () => {
    const user1 = await authRepository.verifyToken('');
    expect(user1).toBeNull();

    const user2 = await authRepository.verifyToken('mumu_token_forged_anything');
    expect(user2).toBeNull();

    const user3 = await authRepository.verifyToken('invalid_random_token_string');
    expect(user3).toBeNull();
  });

  it('should completely block demo credentials and dev tokens when demo fallback is disabled (production mode)', async () => {
    const devLogin = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });

    authRepository.setAllowDemoFallback(false);

    const prodLogin = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });
    expect(prodLogin.user).toBeNull();
    expect(prodLogin.token).toBeNull();
    expect(prodLogin.error).toContain('producción');

    const prodVerify = await authRepository.verifyToken(devLogin.token!);
    expect(prodVerify).toBeNull();
  });
});
