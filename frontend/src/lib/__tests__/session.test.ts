/**
 * Comprehensive unit tests for session management utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  isAuthenticated,
  decodeToken,
  isTokenExpired,
  getSession,
  type SessionData,
} from '../session';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to create a valid JWT token
function createToken(userId: string, expiresIn: number = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const payload = btoa(JSON.stringify({ sub: userId, exp }));
  const signature = 'fake-signature';
  return `${header}.${payload}.${signature}`;
}

describe('Session Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('setAuthToken', () => {
    it('should store token in localStorage', () => {
      const token = 'test-token';
      setAuthToken(token);
      expect(localStorage.getItem('token')).toBe(token);
    });

    it('should overwrite existing token', () => {
      setAuthToken('old-token');
      setAuthToken('new-token');
      expect(localStorage.getItem('token')).toBe('new-token');
    });
  });

  describe('getAuthToken', () => {
    it('should retrieve token from localStorage', () => {
      const token = 'test-token';
      localStorage.setItem('token', token);
      expect(getAuthToken()).toBe(token);
    });

    it('should return null if no token exists', () => {
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('clearAuthToken', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('token', 'test-token');
      clearAuthToken();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should not throw error if token does not exist', () => {
      expect(() => clearAuthToken()).not.toThrow();
    });

    it('should handle multiple clear calls', () => {
      localStorage.setItem('token', 'test-token');
      clearAuthToken();
      clearAuthToken();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode valid JWT token', () => {
      const token = createToken('user-123', 3600);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should handle numeric user IDs', () => {
      const token = createToken('12345', 3600);
      const decoded = decodeToken(token);
      expect(decoded.userId).toBe('12345');
    });

    it('should throw error for invalid token format', () => {
      expect(() => decodeToken('invalid-token')).toThrow();
    });

    it('should throw error for malformed JWT', () => {
      expect(() => decodeToken('header.invalid-base64.signature')).toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = createToken('user-123', 3600);
      const session = decodeToken(token);
      expect(isTokenExpired(session)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = createToken('user-123', -100);
      const session = decodeToken(token);
      expect(isTokenExpired(session)).toBe(true);
    });

    it('should return false for token expiring in next second', () => {
      const session: SessionData = {
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 1,
      };
      expect(isTokenExpired(session)).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid token', () => {
      const token = createToken('user-123', 3600);
      setAuthToken(token);
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false for expired token', () => {
      const token = createToken('user-123', -100);
      setAuthToken(token);
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when no token exists', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should clear token if expired', () => {
      const token = createToken('user-123', -100);
      setAuthToken(token);
      isAuthenticated();
      expect(getAuthToken()).toBeNull();
    });

    it('should clear token if invalid', () => {
      setAuthToken('invalid-token');
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
    });

    it('should handle malformed tokens gracefully', () => {
      setAuthToken('not.a.valid.jwt.token');
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
    });

    it('should return false for empty token', () => {
      setAuthToken('');
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should return session data for valid token', () => {
      const token = createToken('user-123', 3600);
      setAuthToken(token);
      const session = getSession();

      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-123');
      expect(session?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return null for expired token', () => {
      const token = createToken('user-123', -100);
      setAuthToken(token);
      expect(getSession()).toBeNull();
    });

    it('should return null when no token exists', () => {
      expect(getSession()).toBeNull();
    });

    it('should clear token if expired', () => {
      const token = createToken('user-123', -100);
      setAuthToken(token);
      getSession();
      expect(getAuthToken()).toBeNull();
    });

    it('should clear token if invalid', () => {
      setAuthToken('invalid-token');
      expect(getSession()).toBeNull();
      expect(getAuthToken()).toBeNull();
    });

    it('should return null for empty token', () => {
      setAuthToken('');
      expect(getSession()).toBeNull();
    });

    it('should preserve session data structure', () => {
      const token = createToken('user-456', 7200);
      setAuthToken(token);
      const session = getSession();

      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('exp');
      expect(typeof session?.userId).toBe('string');
      expect(typeof session?.exp).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(1000);
      const token = createToken(longUserId, 3600);
      const decoded = decodeToken(token);
      expect(decoded.userId).toBe(longUserId);
    });

    it('should handle special characters in user ID', () => {
      const specialUserId = 'user@123!#$%';
      const token = createToken(specialUserId, 3600);
      const decoded = decodeToken(token);
      expect(decoded.userId).toBe(specialUserId);
    });

    it('should handle token with very far future expiration', () => {
      const token = createToken('user-123', 365 * 24 * 3600); // 1 year
      const session = decodeToken(token);
      expect(isTokenExpired(session)).toBe(false);
    });

    it('should handle rapid token operations', () => {
      const token1 = createToken('user-1', 3600);
      const token2 = createToken('user-2', 3600);

      setAuthToken(token1);
      expect(isAuthenticated()).toBe(true);

      setAuthToken(token2);
      expect(isAuthenticated()).toBe(true);

      const session = getSession();
      expect(session?.userId).toBe('user-2');
    });
  });
});
