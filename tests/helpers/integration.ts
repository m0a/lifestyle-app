/**
 * Integration Test Helpers
 *
 * Provides utilities for integration tests including:
 * - API base URL configuration
 * - Authentication helpers
 * - Test user management
 * - API request wrappers with auth
 */

export const API_BASE = process.env.TEST_API_BASE || 'http://localhost:8787';

/**
 * Test user credentials for integration tests
 * These users should be seeded in the test database
 */
export const TEST_USERS = {
  default: {
    email: 'test@example.com',
    password: 'test1234',
  },
  secondary: {
    email: 'test2@example.com',
    password: 'test1234',
  },
} as const;

/**
 * Session management for integration tests
 */
export class TestSession {
  private sessionCookie: string | null = null;

  /**
   * Login and store session cookie
   */
  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${await response.text()}`);
    }

    // Extract session cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.sessionCookie = setCookie.split(';')[0];
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    if (!this.sessionCookie) return;

    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: this.sessionCookie },
    });

    this.sessionCookie = null;
  }

  /**
   * Make authenticated API request
   */
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers);

    if (this.sessionCookie) {
      headers.set('Cookie', this.sessionCookie);
    }

    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  }

  /**
   * Get current session cookie
   */
  getCookie(): string | null {
    return this.sessionCookie;
  }

  /**
   * Check if session is active
   */
  isAuthenticated(): boolean {
    return this.sessionCookie !== null;
  }
}

/**
 * Create a new test session
 */
export function createTestSession(): TestSession {
  return new TestSession();
}

/**
 * Helper to create a test user if not exists
 * Note: Requires backend support for user creation
 */
export async function ensureTestUser(email: string, password: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // 409 = user already exists, which is fine
    if (!response.ok && response.status !== 409) {
      console.warn(`Could not create test user ${email}: ${response.status}`);
    }
  } catch (error) {
    console.warn(`Test user creation failed:`, error);
  }
}

/**
 * Helper to clean up test data
 * WARNING: Only use in test environment
 */
export async function cleanupTestData(session: TestSession, userId?: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot cleanup in production');
  }

  // TODO: Implement cleanup endpoints if needed
  // For now, test database should be reset between test runs
}

/**
 * Wait for backend to be ready
 */
export async function waitForBackend(maxAttempts = 30, delayMs = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // Backend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}
