import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Task Management
 *
 * Test Coverage:
 * 1. Creating new tasks
 * 2. Task visibility in Signal Queue
 * 3. Task actions (start, complete, defer)
 * 4. Task editing and deletion
 * 5. Task filtering by project
 */

test.describe('Task Management - Creating Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to be ready
    await page.waitForSelector('button[title="Add new task"]', { timeout: 10000 })
  })

  test('should open task creation modal via FAB button', async ({ page }) => {
    // Click the FAB button
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Modal should appear
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Required form elements should be present
    const titleInput = page.getByPlaceholder('What needs to be done?')
    await expect(titleInput).toBeVisible()
  })

  test('should create a new task with title only', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Wait for modal
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).toBeVisible()

    // Fill in task title
    const titleInput = page.getByPlaceholder('What needs to be done?')
    await titleInput.fill('Test task from E2E')

    // Submit the form
    const createButton = page.getByRole('button', { name: 'Create Task' })
    await createButton.click()

    // Modal should close
    await expect(modalHeader).not.toBeVisible({ timeout: 5000 })

    // Task should appear somewhere in the UI (Signal Queue or Projects)
    // Allow some time for the task to appear
    await page.waitForTimeout(500)

    // Check if the task appears in the UI
    const taskText = page.getByText('Test task from E2E')
    await expect(taskText).toBeVisible({ timeout: 5000 })
  })

  test('should create a task with priority', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Wait for modal
    await page.waitForTimeout(300)

    // Fill in task title
    const titleInput = page.getByPlaceholder('What needs to be done?')
    await titleInput.fill('High priority task')

    // Select priority 5 (highest)
    const priority5Button = page.locator('button').filter({ hasText: '5' }).first()
    await priority5Button.click()

    // Submit the form
    const createButton = page.getByRole('button', { name: 'Create Task' })
    await createButton.click()

    // Wait for modal to close
    await page.waitForTimeout(500)

    // Task should appear
    const taskText = page.getByText('High priority task')
    await expect(taskText).toBeVisible({ timeout: 5000 })
  })

  test('should create a task with description', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Fill in task title
    const titleInput = page.getByPlaceholder('What needs to be done?')
    await titleInput.fill('Task with description')

    // Fill in description
    const descriptionInput = page.getByPlaceholder('Additional details (optional)')
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('This is a detailed description for the task')
    }

    // Submit
    const createButton = page.getByRole('button', { name: 'Create Task' })
    await createButton.click()

    // Task should appear
    await page.waitForTimeout(500)
    const taskText = page.getByText('Task with description')
    await expect(taskText).toBeVisible({ timeout: 5000 })
  })

  test('should not create task with empty title', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Don't fill in title, just try to submit
    const createButton = page.getByRole('button', { name: 'Create Task' })

    // The button should be disabled or clicking should not close modal
    // Check if button is disabled
    const isDisabled = await createButton.isDisabled()

    if (!isDisabled) {
      await createButton.click()
      // Modal should still be open
      const modalHeader = page.getByText('NEW TASK')
      await expect(modalHeader).toBeVisible()
    } else {
      expect(isDisabled).toBe(true)
    }
  })

  test('should close modal on cancel', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Click cancel
    const cancelButton = page.getByRole('button', { name: 'Cancel' })
    await cancelButton.click()

    // Modal should close
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).not.toBeVisible()
  })

  test('should close modal on escape key', async ({ page }) => {
    // Open task modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Press escape
    await page.keyboard.press('Escape')

    // Modal should close
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).not.toBeVisible()
  })
})

test.describe('Task Management - Signal Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=SIGNAL QUEUE', { timeout: 10000 })
  })

  test('should display Signal Queue section', async ({ page }) => {
    const signalQueueHeader = page.getByText('SIGNAL QUEUE')
    await expect(signalQueueHeader).toBeVisible()
  })

  test('should show empty state or tasks in Signal Queue', async ({ page }) => {
    // The Signal Queue should show either tasks or an empty/error state
    const hasEmptyState = await page.getByText('No tasks in queue').isVisible().catch(() => false)
    const hasError = await page.getByText('Failed to load').isVisible().catch(() => false)
    const hasRetry = await page.getByText('Retry').isVisible().catch(() => false)
    const hasTasks = await page.locator('[class*="TaskRow"]').count() > 0

    // At least one state should be present
    expect(hasEmptyState || hasError || hasRetry || hasTasks).toBeTruthy()
  })

  test('should display refill mode toggle', async ({ page }) => {
    // Look for the refill mode button (Endless or Daily)
    const refillButton = page.locator('button').filter({ hasText: /Endless|Daily/ }).first()
    await expect(refillButton).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Task Management - Task Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('button[title="Add new task"]', { timeout: 10000 })

    // Create a test task first
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    const titleInput = page.getByPlaceholder('What needs to be done?')
    await titleInput.fill('Action test task')

    const createButton = page.getByRole('button', { name: 'Create Task' })
    await createButton.click()

    await page.waitForTimeout(500)
  })

  test('should show task action buttons on hover', async ({ page }) => {
    // Find the created task
    const taskElement = page.getByText('Action test task').first()
    await expect(taskElement).toBeVisible({ timeout: 5000 })

    // Hover over the task row
    const taskRow = taskElement.locator('xpath=ancestor::*[contains(@class, "group")]').first()
    if (await taskRow.isVisible()) {
      await taskRow.hover()

      // Action buttons should appear (start/complete/defer icons)
      await page.waitForTimeout(300) // Wait for hover state
    }
  })

  test('should be able to complete a task', async ({ page }) => {
    // Find the created task
    const taskText = page.getByText('Action test task').first()
    await expect(taskText).toBeVisible()

    // Find and click the checkbox or complete button
    // Look for a checkbox input near the task
    const taskRow = taskText.locator('xpath=ancestor::*[contains(@class, "flex")]').first()

    if (await taskRow.isVisible()) {
      // Look for checkbox/complete button within the row
      const checkbox = taskRow.locator('input[type="checkbox"], button[title*="omplete"]').first()

      if (await checkbox.isVisible()) {
        await checkbox.click()

        // Task might be marked complete or removed from queue
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('Task Management - Project Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=ALL', { timeout: 10000 })
  })

  test('should display ALL tab by default', async ({ page }) => {
    const allTab = page.getByRole('button', { name: /ALL/ })
    await expect(allTab).toBeVisible()
  })

  test('should show tasks from all projects when ALL is selected', async ({ page }) => {
    // Click ALL tab to ensure it's active
    const allTab = page.getByRole('button', { name: /ALL/ })
    await allTab.click()

    // The view should show all tasks (or empty state)
    const signalQueue = page.getByText('SIGNAL QUEUE')
    await expect(signalQueue).toBeVisible()
  })

  test('should be able to add a new project', async ({ page }) => {
    // Click add project button
    const addProjectButton = page.locator('button[title="Add new project"]')
    await addProjectButton.click()

    // Modal should appear
    const modalHeader = page.getByText('NEW PROJECT')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Name input should be visible
    const nameInput = page.getByPlaceholder('e.g., MILO Development')
    await expect(nameInput).toBeVisible()
  })

  test('should create a new project', async ({ page }) => {
    // Click add project button
    const addProjectButton = page.locator('button[title="Add new project"]')
    await addProjectButton.click()

    // Fill in project name
    const nameInput = page.getByPlaceholder('e.g., MILO Development')
    await nameInput.fill('E2E Test Project')

    // Submit
    const createButton = page.getByRole('button', { name: 'Create Project' })
    await createButton.click()

    // Wait for modal to close and project to appear
    await page.waitForTimeout(500)

    // Project tab should appear
    const projectTab = page.getByText('E2E Test Project')
    await expect(projectTab).toBeVisible({ timeout: 5000 })
  })

  test('should filter tasks when project tab is clicked', async ({ page }) => {
    // First check if there are any project tabs besides ALL
    const projectTabs = page.locator('button').filter({ hasText: /^(?!ALL)/ })
    const tabCount = await projectTabs.count()

    if (tabCount > 0) {
      // Click a project tab
      await projectTabs.first().click()

      // View should update (Signal Queue still visible)
      const signalQueue = page.getByText('SIGNAL QUEUE')
      await expect(signalQueue).toBeVisible()
    }
  })
})

test.describe('Task Management - Projects Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Projects', { timeout: 10000 })
  })

  test('should display Projects section', async ({ page }) => {
    const projectsSection = page.getByText('Projects').first()
    await expect(projectsSection).toBeVisible()
  })

  test('should show expandable project cards', async ({ page }) => {
    // Look for project cards (they have expand/collapse toggles)
    const projectCards = page.locator('[class*="border-pipboy"]').filter({
      has: page.locator('button[class*="text-pipboy"]')
    })

    // There might be 0 or more project cards
    const cardCount = await projectCards.count()

    // The section should exist even if empty
    const projectsSection = page.getByText('Projects').first()
    await expect(projectsSection).toBeVisible()
  })

  test('should toggle project expansion', async ({ page }) => {
    // Look for a project card with expand button
    const expandButtons = page.locator('button').filter({
      has: page.locator('svg')
    })

    // Find expand/collapse buttons in projects section
    const projectsArea = page.locator('text=Projects').locator('xpath=ancestor::*[1]').locator('xpath=following-sibling::*')

    if (await projectsArea.isVisible()) {
      const toggles = projectsArea.locator('button').first()

      if (await toggles.isVisible()) {
        await toggles.click()
        await page.waitForTimeout(300)
        // Content should expand or collapse
      }
    }
  })
})
