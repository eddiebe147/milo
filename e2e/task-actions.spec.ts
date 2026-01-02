/**
 * E2E Tests for Task Actions (Start, Complete, Defer)
 *
 * These tests use a mock window.milo API to test task actions
 * without requiring the Electron main process.
 */

import { test, expect } from './fixtures/test-base'

// Helper to create a project via UI
async function createProjectViaUI(page: import('@playwright/test').Page, name: string) {
  const addProjectButton = page.locator('button[title="Add new project"]')
  await addProjectButton.click()

  const projectNameInput = page.getByPlaceholder('e.g., MILO Development')
  await expect(projectNameInput).toBeVisible({ timeout: 5000 })
  await projectNameInput.fill(name)

  const createButton = page.locator('button').filter({ hasText: 'Create' }).last()
  await createButton.click()

  await page.waitForTimeout(500)
}

// Helper to create a task via UI
async function createTaskViaUI(page: import('@playwright/test').Page, title: string) {
  // Click the add task button (could be in project card or FAB)
  const addTaskButton = page.locator('button[title="Add new task"], button[title^="Add task to"]').first()
  await expect(addTaskButton).toBeVisible({ timeout: 5000 })
  await addTaskButton.click()

  // Fill in the task title
  const titleInput = page.getByPlaceholder('What needs to be done?')
  await expect(titleInput).toBeVisible({ timeout: 5000 })
  await titleInput.fill(title)

  // Click create - the button text is just "Create"
  const createButton = page.locator('button').filter({ hasText: 'Create' }).last()
  await createButton.click()

  await page.waitForTimeout(500)
}

test.describe('Task Actions', () => {
  // Setup: Create a project and task before each test
  test.beforeEach(async ({ page }) => {
    // Check if we need to create a project first
    const noProjectsMessage = page.getByText('No projects yet')
    const hasNoProjects = await noProjectsMessage.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasNoProjects) {
      await createProjectViaUI(page, 'Test Project')
    }

    // Create a test task
    await createTaskViaUI(page, 'Action test task')
  })

  test('should be able to start a task', async ({ page }) => {
    // Find the task in the Signal Queue
    const taskText = page.getByText('Action test task').first()
    await expect(taskText).toBeVisible({ timeout: 5000 })

    // Find the Start button
    const startButton = page.locator('button[title="Start task"]').first()
    await expect(startButton).toBeVisible({ timeout: 5000 })

    // Click Start - this opens the execution modal
    await startButton.click()
    await page.waitForTimeout(500)

    // Verify the execution modal opened
    const modalTitle = page.getByRole('heading', { name: 'EXECUTE TASK' })
    await expect(modalTitle).toBeVisible({ timeout: 5000 })

    // Click one of the launch options (e.g., Claude CLI)
    // This actually starts the task
    const launchButton = page.locator('button').filter({ hasText: 'Launch Claude CLI' })
    await expect(launchButton).toBeVisible({ timeout: 5000 })
    await launchButton.click()

    await page.waitForTimeout(500)

    // After launching, the task should be marked as active
    // The modal closes and task shows "Active" state
    const activeBadge = page.getByText('Active').first()
    await expect(activeBadge).toBeVisible({ timeout: 5000 })

    // The button should now say "Execute" instead of "Start"
    const executeButton = page.locator('button').filter({ hasText: 'Execute' }).first()
    await expect(executeButton).toBeVisible({ timeout: 5000 })
  })

  test('should show active styling when task is started', async ({ page }) => {
    // Find and click Start - opens execution modal
    const startButton = page.locator('button[title="Start task"]').first()
    await expect(startButton).toBeVisible({ timeout: 5000 })
    await startButton.click()
    await page.waitForTimeout(500)

    // Click launch button to actually start the task
    const launchButton = page.locator('button').filter({ hasText: 'Launch Claude CLI' })
    await expect(launchButton).toBeVisible({ timeout: 5000 })
    await launchButton.click()
    await page.waitForTimeout(500)

    // Verify the Active badge is visible
    const activeBadge = page.getByText('Active')
    await expect(activeBadge).toBeVisible({ timeout: 5000 })
  })

  test('should open execution modal when clicking Start', async ({ page }) => {
    // Find and click Start
    const startButton = page.locator('button[title="Start task"]').first()
    await expect(startButton).toBeVisible({ timeout: 5000 })
    await startButton.click()
    await page.waitForTimeout(500)

    // Verify the execution modal opened with task title
    const modalTitle = page.getByRole('heading', { name: 'EXECUTE TASK' })
    await expect(modalTitle).toBeVisible({ timeout: 5000 })

    // Verify the task name is shown in the modal
    const taskInModal = page.locator('p').filter({ hasText: 'Action test task' })
    await expect(taskInModal).toBeVisible({ timeout: 5000 })

    // Verify launch target options are shown (using first() since text appears in multiple places)
    await expect(page.getByText('Claude Web').first()).toBeVisible()
    await expect(page.getByText('Claude CLI').first()).toBeVisible()
    await expect(page.getByText('Claude Desktop').first()).toBeVisible()

    // Verify Cancel button exists
    const cancelButton = page.getByRole('button', { name: 'Cancel' })
    await expect(cancelButton).toBeVisible()
  })
})
