/**
 * Base test fixture for MILO E2E tests
 *
 * This extends Playwright's test with automatic window.milo mock injection,
 * allowing tests to run in a standard browser without Electron IPC.
 */

import { test as base, expect } from '@playwright/test'
import { injectMiloMock, createTestProject, createTestTask } from './milo-mock'

// Extend the base test with our custom fixtures
export const test = base.extend<{
  miloPage: Awaited<ReturnType<typeof base.extend>>
}>({
  // Override the page fixture to inject the mock before navigation
  page: async ({ page }, use) => {
    // Inject the mock API before any navigation
    await injectMiloMock(page)

    // Navigate to the app
    await page.goto('/')

    // Wait for the app to be ready (SIGNAL QUEUE should appear with mock data)
    await page.waitForSelector('text=SIGNAL QUEUE', { timeout: 15000 })

    // Use the page in the test
    await use(page)
  },
})

// Re-export expect for convenience
export { expect }

// Export helper functions
export { createTestProject, createTestTask }
