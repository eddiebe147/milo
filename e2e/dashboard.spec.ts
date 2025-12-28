import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the MILO title bar', async ({ page }) => {
    // Check for the app title in the title bar
    const titleBar = page.locator('[class*="TitleBar"]').first()
    await expect(titleBar).toBeVisible()
  })

  test('should display the dashboard with stats panel', async ({ page }) => {
    // Look for "Today's Signal" which is the stats panel title
    const statsPanel = page.getByText("Today's Signal")
    await expect(statsPanel).toBeVisible({ timeout: 10000 })
  })

  test('should display quick capture button', async ({ page }) => {
    // Quick capture starts collapsed showing "Quick capture task"
    const quickCapture = page.getByText('Quick capture task')
    await expect(quickCapture).toBeVisible({ timeout: 10000 })
  })

  test('should expand quick capture on click', async ({ page }) => {
    // Click the quick capture button
    const quickCaptureButton = page.getByText('Quick capture task')
    await quickCaptureButton.click()

    // Input should now be visible
    const input = page.getByPlaceholder('What needs to be done?')
    await expect(input).toBeVisible()
  })

  test('should display mission panel', async ({ page }) => {
    // Look for "Mission Panel" or task list area
    const missionPanel = page.getByText('Signal Tasks')
    await expect(missionPanel).toBeVisible({ timeout: 10000 })
  })

  test('should have CRT overlay effect', async ({ page }) => {
    // Check for CRT effect elements (scanlines, noise, etc.)
    const crtOverlay = page.locator('[class*="crt"]').first()
    await expect(crtOverlay).toBeAttached()
  })
})

test.describe('Quick Capture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Expand quick capture
    await page.getByText('Quick capture task').click()
  })

  test('should have disabled submit button when input is empty', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })

  test('should enable submit button when input has text', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?')
    await input.fill('Test task')

    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled()
  })

  test('should close on Escape key', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?')
    await expect(input).toBeVisible()

    await input.press('Escape')

    // Quick capture should collapse
    await expect(page.getByText('Quick capture task')).toBeVisible()
    await expect(input).not.toBeVisible()
  })
})
