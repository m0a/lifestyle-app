# Integration and E2E Tests

This directory contains integration and E2E tests for the lifestyle-app.

## Directory Structure

```
tests/
├── unit/                 # Unit tests (services, utils)
├── integration/          # API integration tests
├── e2e/                  # Playwright E2E tests
├── helpers/              # Test utilities and helpers
│   └── integration.ts    # Auth helpers, TestSession class
└── fixtures/             # Test assets (images, etc.)
    └── README.md         # How to create test images
```

## Prerequisites

### For Integration Tests

1. **Backend server must be running**:
   ```bash
   pnpm dev:backend
   ```

2. **Environment variables** (in `packages/backend/.dev.vars`):
   ```
   AI_API_KEY=your-gemini-api-key
   ```

3. **Test user** (automatically created by tests):
   - Email: `test@example.com`
   - Password: `test1234`

### For E2E Tests

1. **Both backend and frontend must be running**:
   ```bash
   # Terminal 1: Backend
   pnpm dev:backend

   # Terminal 2: Frontend
   pnpm dev
   ```

2. **Test images** must exist in `tests/fixtures/`:
   - See `tests/fixtures/README.md` for setup instructions
   - Or run: `node /tmp/create-test-images.js`

## Running Tests

### Integration Tests

**Quick start** (with automatic backend check):
```bash
./scripts/test-integration.sh
```

**Manual approach**:
```bash
# 1. Start backend in separate terminal
pnpm dev:backend

# 2. Run integration tests
pnpm test:integration

# Run specific test file
pnpm vitest tests/integration/meals.test.ts

# Run with verbose output
pnpm vitest tests/integration/meals.test.ts --reporter=verbose
```

**Note**: Integration tests make real API calls to the local backend. Ensure backend is running first.

### E2E Tests

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run E2E tests in UI mode
pnpm playwright test --ui

# Run specific test file
pnpm playwright test tests/e2e/meal-creation-multi-photo.spec.ts

# Run with browser visible
pnpm playwright test --headed
```

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run all tests (unit + integration)
pnpm test
```

## Integration Test Helpers

### TestSession

Helper class for authenticated API requests in integration tests.

```typescript
import { createTestSession, TEST_USERS } from '../helpers/integration';

const session = createTestSession();
await session.login(TEST_USERS.default.email, TEST_USERS.default.password);

// Make authenticated request
const response = await session.request('/api/meals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mealType: 'lunch', content: 'ランチ' }),
});

await session.logout();
```

### waitForBackend

Wait for backend to be ready (useful in CI).

```typescript
import { waitForBackend } from '../helpers/integration';

const isReady = await waitForBackend(30, 1000); // 30 attempts, 1s delay
if (!isReady) {
  throw new Error('Backend not ready');
}
```

## E2E Test Helpers

### Authentication

Helper functions for authenticating in E2E tests.

```typescript
import { loginAsTestUser, ensureTestUserExists, logout } from '../helpers/e2e';

test.beforeEach(async ({ page }) => {
  // Ensure test user exists (creates if not exists)
  await ensureTestUserExists(page);

  // Login as test user
  await loginAsTestUser(page);

  // Navigate to page
  await page.goto('/meals');
});

test.afterEach(async ({ page }) => {
  // Optional: Logout after test
  await logout(page);
});
```

### Custom Test User

You can use a different test user:

```typescript
import { loginAsTestUser, TEST_USERS } from '../helpers/e2e';

// Login with secondary user
await loginAsTestUser(page, TEST_USERS.secondary.email, TEST_USERS.secondary.password);

// Or with custom credentials
await loginAsTestUser(page, 'custom@example.com', 'password123');
```

## Test Data Management

### Database State

- Integration tests use the **local D1 database** (`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`)
- Tests do **not** automatically clean up data
- If you need a clean state, delete the database file and restart backend

### Cleanup Between Tests

For now, test isolation is handled by:
- Each test using different data (timestamps, content)
- Tests reading only their own created data

Future: Add cleanup helpers if needed.

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main branch
- Release tags

**Workflow steps**:
1. Setup Node.js and pnpm
2. Install dependencies
3. Build shared package
4. Start backend in background
5. Wait for backend readiness
6. Run integration tests
7. Start frontend in background
8. Run E2E tests

See `.github/workflows/ci.yml` for details.

## Troubleshooting

### Integration tests timeout

**Problem**: Tests fail with timeout errors.

**Solution**:
- Ensure backend is running: `pnpm dev:backend`
- Check backend logs for errors
- Verify `AI_API_KEY` is set in `.dev.vars`
- Increase timeout for slow tests (AI processing):
  ```typescript
  it('should create meal with AI', async () => {
    // test code
  }, 60000); // 60s timeout
  ```

### E2E tests can't find elements

**Problem**: Playwright can't find buttons or elements.

**Solution**:
- Ensure frontend is running: `pnpm dev`
- Check if authentication is working
- Run in headed mode to debug: `pnpm playwright test --headed`
- Use Playwright Inspector: `pnpm playwright test --debug`

### Test images missing

**Problem**: E2E tests fail with "ENOENT: no such file".

**Solution**:
- Create test images: `node /tmp/create-test-images.js`
- Or follow instructions in `tests/fixtures/README.md`

### "Backend not ready after 30 seconds"

**Problem**: Integration tests fail during setup.

**Solution**:
- Start backend manually first: `pnpm dev:backend`
- Check if port 8787 is already in use
- Look for errors in backend startup

## Writing New Tests

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestSession, ensureTestUser, waitForBackend, TEST_USERS } from '../helpers/integration';
import type { TestSession } from '../helpers/integration';

describe('My API Tests', () => {
  let session: TestSession;

  beforeAll(async () => {
    const isReady = await waitForBackend();
    if (!isReady) {
      throw new Error('Backend not ready');
    }
    await ensureTestUser(TEST_USERS.default.email, TEST_USERS.default.password);
  });

  beforeEach(async () => {
    session = createTestSession();
    await session.login(TEST_USERS.default.email, TEST_USERS.default.password);
  });

  afterEach(async () => {
    await session.logout();
  });

  it('should test something', async () => {
    const response = await session.request('/api/endpoint', {
      method: 'GET',
    });
    expect(response.status).toBe(200);
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication helper
    await page.goto('/my-page');
  });

  test('should do something', async ({ page }) => {
    await page.getByRole('button', { name: /Submit/ }).click();
    await expect(page.getByText(/Success/)).toBeVisible();
  });
});
```

## Notes

- **AI-dependent tests**: Tests that use AI analysis may be slow (10-15s per photo) and require valid `AI_API_KEY`
- **Test isolation**: Currently minimal - consider adding data cleanup if tests interfere
- **Mocking**: AI service is NOT mocked - tests make real API calls to Gemini
- **Preview environments**: Use separate database (`health-tracker-preview-db`)
