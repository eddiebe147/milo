import { test, expect } from '@playwright/test'

test.describe('Dashboard V3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the SIGNAL QUEUE header', async ({ page }) => {
    // Check for the Signal Queue section
    const signalQueue = page.getByText('SIGNAL QUEUE')
    await expect(signalQueue).toBeVisible({ timeout: 10000 })
  })

  test('should display project tabs', async ({ page }) => {
    // Check for the "ALL" tab in ProjectTabs
    const allTab = page.getByText('ALL')
    await expect(allTab).toBeVisible({ timeout: 10000 })
  })

  test('should display projects section', async ({ page }) => {
    // Check for the "Projects" section header
    const projectsSection = page.getByText('Projects', { exact: false })
    await expect(projectsSection).toBeVisible({ timeout: 10000 })
  })

  test('should display chat panel at bottom', async ({ page }) => {
    // Check for the chat input placeholder
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await expect(chatInput).toBeVisible({ timeout: 10000 })
  })

  test('should display signal queue header even on error', async ({ page }) => {
    // The SIGNAL QUEUE header should be visible regardless of load state
    const signalQueueHeader = page.getByText('SIGNAL QUEUE')
    await expect(signalQueueHeader).toBeVisible({ timeout: 10000 })
  })

  test('should show error state or empty state in queue', async ({ page }) => {
    // Either shows error state, empty state, or tasks
    const queueContent = page.locator('[class*="border-pipboy-border"]').first()
    await expect(queueContent).toBeVisible({ timeout: 10000 })

    // One of these should be visible
    const hasError = await page.getByText('Failed to load queue').isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No tasks in queue').isVisible().catch(() => false)
    const hasRetry = await page.getByText('Retry').isVisible().catch(() => false)

    // At least one state should be shown
    expect(hasError || hasEmpty || hasRetry).toBeTruthy()
  })
})

test.describe('Project Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have ALL tab active by default', async ({ page }) => {
    const allTab = page.getByRole('button', { name: /ALL/ })
    await expect(allTab).toBeVisible({ timeout: 10000 })
    // Should have active styling
    await expect(allTab).toHaveClass(/border-pipboy-green/)
  })

  test('should display add project button', async ({ page }) => {
    // Check for the + button to add new project
    const addButton = page.locator('button[title="Add new project"]')
    await expect(addButton).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Add Task Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display FAB button for adding tasks', async ({ page }) => {
    // Check for the floating action button
    const fabButton = page.locator('button[title="Add new task"]')
    await expect(fabButton).toBeVisible({ timeout: 10000 })
  })

  test('should open task modal when FAB is clicked', async ({ page }) => {
    // Click the FAB button
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Modal should appear with "NEW TASK" header
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Task title input should be visible
    const titleInput = page.getByPlaceholder('What needs to be done?')
    await expect(titleInput).toBeVisible()
  })

  test('should close task modal on escape', async ({ page }) => {
    // Open the modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Verify modal is open
    const modalHeader = page.getByText('NEW TASK')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Press escape
    await page.keyboard.press('Escape')

    // Modal should be closed
    await expect(modalHeader).not.toBeVisible()
  })

  test('should show priority selector in task modal', async ({ page }) => {
    // Open the modal
    const fabButton = page.locator('button[title="Add new task"]')
    await fabButton.click()

    // Priority buttons should be visible (1-5)
    for (let i = 1; i <= 5; i++) {
      const priorityBtn = page.locator(`button:has-text("${i}")`).first()
      await expect(priorityBtn).toBeVisible()
    }
  })
})

test.describe('Add Project Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open project modal when + button is clicked', async ({ page }) => {
    // Click the add project button in ProjectTabs
    const addProjectBtn = page.locator('button[title="Add new project"]')
    await addProjectBtn.click()

    // Modal should appear with "NEW PROJECT" header
    const modalHeader = page.getByText('NEW PROJECT')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Project name input should be visible
    const nameInput = page.getByPlaceholder('e.g., MILO Development')
    await expect(nameInput).toBeVisible()
  })

  test('should show color picker in project modal', async ({ page }) => {
    // Open the modal
    const addProjectBtn = page.locator('button[title="Add new project"]')
    await addProjectBtn.click()

    // Wait for modal
    const modalHeader = page.getByText('NEW PROJECT')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Color label should be visible
    const colorLabel = page.getByText('Color')
    await expect(colorLabel).toBeVisible()

    // Preview label should be visible
    const previewLabel = page.getByText('Preview')
    await expect(previewLabel).toBeVisible()
  })

  test('should close project modal on cancel', async ({ page }) => {
    // Open the modal
    const addProjectBtn = page.locator('button[title="Add new project"]')
    await addProjectBtn.click()

    // Verify modal is open
    const modalHeader = page.getByText('NEW PROJECT')
    await expect(modalHeader).toBeVisible({ timeout: 5000 })

    // Click cancel button
    const cancelBtn = page.getByRole('button', { name: 'Cancel' })
    await cancelBtn.click()

    // Modal should be closed
    await expect(modalHeader).not.toBeVisible()
  })
})

test.describe('Chat Bottom Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display collapsed chat input', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await expect(chatInput).toBeVisible({ timeout: 10000 })
  })

  test('should expand chat panel on chevron click', async ({ page }) => {
    // Find the expand button (chevron up)
    const expandButton = page.locator('button[aria-label="Expand chat"]')

    if (await expandButton.isVisible()) {
      await expandButton.click()

      // Chat history area should be visible when expanded
      const chatHistory = page.locator('[class*="overflow-y-auto"]').last()
      await expect(chatHistory).toBeVisible()
    }
  })
})
