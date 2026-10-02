import { describe, it, expect } from 'vitest';
import { authRepository } from '../src/repositories/auth.repository';

describe('AuthRepository Unit Tests', () => {
  it('should authenticate demo admin successfully', async () => {
    const result = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });

    expect(result.user).not.toBeNull();
    expect(result.user?.email).toBe('admin@mumutech.com');
    expect(result.token).not.toBeNull();
    expect(result.token?.startsWith('mumu_token_')).toBe(true);
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

  it('should verify a valid token', async () => {
    const loginResult = await authRepository.login({
      email: 'admin@mumutech.com',
      password: 'mumutech2026',
    });

    const user = await authRepository.verifyToken(loginResult.token!);
    expect(user).not.toBeNull();
    expect(user?.email).toBe('admin@mumutech.com');
  });

  it('should reject invalid or empty token', async () => {
    const user1 = await authRepository.verifyToken('');
    expect(user1).toBeNull();

    const user2 = await authRepository.verifyToken('invalid_random_token_string');
    expect(user2).toBeNull();
  });
});
