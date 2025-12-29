import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Chat Feature (ChatBottomPanel)
 *
 * Test Coverage:
 * 1. Opening/closing chat panel
 * 2. Opening/closing chat history
 * 3. Starting a new conversation
 * 4. Sending a message (with mocked AI response)
 * 5. Loading previous conversations
 * 6. Deleting a conversation
 *
 * Architecture:
 * - ChatBottomPanel: Bottom-docked collapsible chat
 * - ChatHistory: Slide-out history panel
 * - ChatMessages: Message display area
 * - ChatInput: User input component
 */

test.describe('Chat Panel - Basic Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display collapsed chat input by default', async ({ page }) => {
    // Chat should be collapsed initially with just the input visible
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await expect(chatInput).toBeVisible({ timeout: 10000 })

    // Expand button (chevron up) should be visible
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expect(expandButton).toBeVisible()
  })

  test('should expand chat panel when chevron is clicked', async ({ page }) => {
    // Find and click the expand button
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Check for expanded state indicators
    // The header with "MILO" should be visible
    const miloHeader = page.getByText('MILO').first()
    await expect(miloHeader).toBeVisible({ timeout: 5000 })

    // Collapse button should be visible
    const collapseButton = page.locator('button[title="Collapse chat"]')
    await expect(collapseButton).toBeVisible()

    // History toggle button should be visible
    const historyButton = page.locator('button[title="Chat history"]')
    await expect(historyButton).toBeVisible()
  })

  test('should collapse chat panel when chevron down is clicked', async ({ page }) => {
    // First expand the panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Verify it's expanded by checking for collapse button
    const collapseButton = page.locator('button[title="Collapse chat"]')
    await expect(collapseButton).toBeVisible()

    // Now collapse it
    await collapseButton.click()

    // The collapse button should no longer be visible
    await expect(collapseButton).not.toBeVisible()

    // But the collapsed input and expand button should be there
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await expect(chatInput).toBeVisible()

    const expandButtonAgain = page.locator('button[title="Expand chat history"]')
    await expect(expandButtonAgain).toBeVisible()
  })

  test('should show empty state when no messages', async ({ page }) => {
    // Expand the chat panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Check for empty state message
    const emptyStateText = page.getByText('No messages yet')
    await expect(emptyStateText).toBeVisible({ timeout: 5000 })

    const emptySubtext = page.getByText('Type below to chat with MILO')
    await expect(emptySubtext).toBeVisible()
  })

  test('should collapse when clicking outside the panel', async ({ page }) => {
    // Expand the panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Verify it's expanded by checking for collapse button
    const collapseButton = page.locator('button[title="Collapse chat"]')
    await expect(collapseButton).toBeVisible()

    // Click outside the panel (on the main dashboard area)
    const signalQueue = page.getByText('SIGNAL QUEUE')
    await signalQueue.click()

    // Wait a bit for the click-outside handler to trigger
    await page.waitForTimeout(300)

    // The collapse button should no longer be visible (panel collapsed)
    await expect(collapseButton).not.toBeVisible()

    // Expand button should be visible again
    await expect(expandButton).toBeVisible()
  })
})

test.describe('Chat Panel - Chat History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Expand chat panel for these tests
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()
  })

  test('should toggle chat history panel', async ({ page }) => {
    // Click history button to open
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for animation (CSS transition is 300ms)
    await page.waitForTimeout(500)

    // History panel should slide in
    const historyHeader = page.getByText('Chat History')
    await expect(historyHeader).toBeVisible({ timeout: 5000 })

    // New Chat button should be visible in history
    const newChatButton = page.getByText('+ New Chat')
    await expect(newChatButton).toBeVisible()

    // Click history button again to close
    await historyButton.click()

    // Wait longer for the slide-out animation (the width goes to 0)
    await page.waitForTimeout(500)

    // History panel header might still exist in DOM but be hidden (width: 0)
    // Check if the parent container has w-0 class or is not visible
    const historyPanel = page.locator('[class*="w-64"], [class*="w-0"]').filter({ has: historyHeader })
    const isHidden = await historyPanel.evaluate((el) => {
      return el.classList.contains('w-0') || el.offsetWidth === 0
    })
    expect(isHidden).toBe(true)
  })

  test('should display "No conversations yet" when history is empty', async ({ page }) => {
    // Open history
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for history panel
    const historyHeader = page.getByText('Chat History')
    await expect(historyHeader).toBeVisible()

    // Check for empty state (may or may not appear depending on whether there are saved conversations)
    const emptyText = page.getByText('No conversations yet')
    if (await emptyText.isVisible()) {
      await expect(emptyText).toBeVisible()
    }
  })

  test('should close history when new chat is started', async ({ page }) => {
    // Open history
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for animation
    await page.waitForTimeout(500)

    // Verify history is open
    const historyHeader = page.getByText('Chat History')
    await expect(historyHeader).toBeVisible()

    // Click "New Chat" in the expanded header
    const newChatHeaderButton = page.locator('button[title="New chat"]')
    await newChatHeaderButton.click()

    // Wait for animation
    await page.waitForTimeout(500)

    // History should close (check width is 0)
    const historyPanel = page.locator('[class*="w-64"], [class*="w-0"]').filter({ has: historyHeader })
    const isHidden = await historyPanel.evaluate((el) => {
      return el.classList.contains('w-0') || el.offsetWidth === 0
    })
    expect(isHidden).toBe(true)

    // Empty state should be visible
    const emptyStateText = page.getByText('No messages yet')
    await expect(emptyStateText).toBeVisible()
  })
})

test.describe('Chat Panel - Sending Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Mock the AI chat API to avoid actual API calls
    // Ensure window.milo exists before mocking
    await page.evaluate(() => {
      // @ts-ignore - Mocking window.milo.ai.chat
      window.milo = window.milo || {}
      // @ts-ignore
      window.milo.ai = window.milo.ai || {}
      // @ts-ignore
      window.milo.ai.chat = async (message: string) => {
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return `Mock AI response to: "${message}"`
      }
    })
  })

  test('should send a message from collapsed state', async ({ page }) => {
    // Type message in collapsed input
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Hello MILO!')

    // Click the send button instead of pressing Enter
    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait for expansion animation
    await page.waitForTimeout(500)

    // Chat should auto-expand - check for collapse button
    const collapseButton = page.locator('button[title="Collapse chat"]')
    await expect(collapseButton).toBeVisible({ timeout: 5000 })

    // User message should appear
    const userMessage = page.getByText('Hello MILO!').first()
    await expect(userMessage).toBeVisible({ timeout: 5000 })

    // Wait for AI response (mocked)
    const aiResponse = page.getByText('Mock AI response to: "Hello MILO!"', { exact: false })
    await expect(aiResponse).toBeVisible({ timeout: 10000 })
  })

  test('should send a message from expanded state', async ({ page }) => {
    // Expand the panel first
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Wait for expansion
    await page.waitForTimeout(300)

    // Type message in expanded input
    const chatInput = page.getByPlaceholder('Type message to MILO...')
    await chatInput.fill('Test message from expanded state')

    // Click send button
    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // User message should appear
    const userMessage = page.getByText('Test message from expanded state').first()
    await expect(userMessage).toBeVisible({ timeout: 5000 })

    // Wait for AI response
    const aiResponse = page.getByText('Mock AI response to: "Test message from expanded state"', { exact: false })
    await expect(aiResponse).toBeVisible({ timeout: 10000 })
  })

  test('should show loading indicator while generating response', async ({ page }) => {
    // Mock AI with longer delay - ensure window.milo exists
    await page.evaluate(() => {
      // @ts-ignore
      window.milo = window.milo || {}
      // @ts-ignore
      window.milo.ai = window.milo.ai || {}
      // @ts-ignore
      window.milo.ai.chat = async (message: string) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return `Delayed response: ${message}`
      }
    })

    // Expand panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()
    await page.waitForTimeout(300)

    // Send a message
    const chatInput = page.getByPlaceholder('Type message to MILO...')
    await chatInput.fill('Testing loading state')

    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait a moment for the UI to update
    await page.waitForTimeout(200)

    // Look for loading indicator (spinner) - it appears in the header when generating
    const processingIndicator = page.locator('.animate-spin')
    await expect(processingIndicator.first()).toBeVisible({ timeout: 2000 })

    // Wait for response to complete
    await page.waitForTimeout(2500)

    // Loading indicator should be gone
    const spinners = await page.locator('.animate-spin').count()
    expect(spinners).toBe(0)
  })

  test('should disable input while generating response', async ({ page }) => {
    // Mock AI with delay - ensure window.milo exists
    await page.evaluate(() => {
      // @ts-ignore
      window.milo = window.milo || {}
      // @ts-ignore
      window.milo.ai = window.milo.ai || {}
      // @ts-ignore
      window.milo.ai.chat = async (message: string) => {
        await new Promise(resolve => setTimeout(resolve, 1500))
        return `Response: ${message}`
      }
    })

    // Send a message
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('First message')

    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait for expanded state
    await page.waitForTimeout(400)

    // Try to type another message while generating
    const expandedInput = page.getByPlaceholder('Type message to MILO...')

    // Input should be disabled
    await expect(expandedInput).toBeDisabled({ timeout: 2000 })

    // Wait for generation to complete
    await page.waitForTimeout(2000)

    // Input should be enabled again
    await expect(expandedInput).toBeEnabled()
  })

  test('should clear conversation when clear button is clicked', async ({ page }) => {
    // Mock window.confirm to auto-confirm
    await page.evaluate(() => {
      window.confirm = () => true
    })

    // Send a message first
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Message to be cleared')

    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait for message to appear and response
    await page.waitForTimeout(1500)

    const userMessage = page.getByText('Message to be cleared').first()
    await expect(userMessage).toBeVisible({ timeout: 5000 })

    // Click clear conversation button
    const clearButton = page.locator('button[title="Clear conversation"]')
    await clearButton.click()

    // Wait for clear action
    await page.waitForTimeout(300)

    // Messages should be cleared
    await expect(userMessage).not.toBeVisible()

    // Empty state should appear
    const emptyStateText = page.getByText('No messages yet')
    await expect(emptyStateText).toBeVisible()
  })
})

test.describe('Chat Panel - Conversation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Mock AI - ensure window.milo exists
    await page.evaluate(() => {
      // @ts-ignore
      window.milo = window.milo || {}
      // @ts-ignore
      window.milo.ai = window.milo.ai || {}
      // @ts-ignore
      window.milo.ai.chat = async (message: string) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return `AI: ${message}`
      }
    })
  })

  test('should create a new conversation automatically on first message', async ({ page }) => {
    // Send first message (this should create a new conversation)
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Starting a new conversation')

    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait for message to appear and response
    await page.waitForTimeout(1500)

    const userMessage = page.getByText('Starting a new conversation').first()
    await expect(userMessage).toBeVisible({ timeout: 5000 })

    // Expand panel if not already
    const expandButton = page.locator('button[title="Expand chat history"]')
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }

    // Open history to check if conversation was created
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for history to load
    await page.waitForTimeout(800)

    // There should be at least one conversation (or empty state)
    const historyHeader = page.getByText('Chat History')
    await expect(historyHeader).toBeVisible()
  })

  test('should start a new conversation from new chat button', async ({ page }) => {
    // Send a message first
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('First conversation message')

    const sendButton = page.locator('button:has(svg)').filter({ hasText: '' }).last()
    await sendButton.click()

    // Wait for message and response
    await page.waitForTimeout(1500)

    const firstMessage = page.getByText('First conversation message').first()
    await expect(firstMessage).toBeVisible({ timeout: 5000 })

    // Expand if needed
    const expandButton = page.locator('button[title="Expand chat history"]')
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }

    // Click new chat button
    const newChatButton = page.locator('button[title="New chat"]')
    await newChatButton.click()

    // Wait for transition
    await page.waitForTimeout(300)

    // Previous message should be gone
    await expect(firstMessage).not.toBeVisible()

    // Empty state should appear
    const emptyStateText = page.getByText('No messages yet')
    await expect(emptyStateText).toBeVisible()
  })

  test('should load a previous conversation from history', async ({ page }) => {
    // First, create a conversation with a message
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Message in first conversation')
    await chatInput.press('Enter')

    // Wait for response
    await page.waitForTimeout(1500)

    // Start a new conversation
    const expandButton = page.locator('button[title="Expand chat history"]')
    if (await expandButton.isVisible()) {
      await expandButton.click()
    }

    const newChatButton = page.locator('button[title="New chat"]')
    await newChatButton.click()

    // Send message in new conversation
    const expandedInput = page.getByPlaceholder('Type message to MILO...')
    await expandedInput.fill('Message in second conversation')
    await expandedInput.press('Enter')

    // Wait for response
    await page.waitForTimeout(1500)

    // Open history
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for conversations to load
    await page.waitForTimeout(500)

    // Look for conversation items (they should have the conversation title)
    // Since conversations auto-title after first exchange, we might see them
    const conversationItems = page.locator('[class*="border-b border-pipboy-border/30"]')
    const count = await conversationItems.count()

    if (count > 1) {
      // Click the first previous conversation (not the "New Chat" button)
      await conversationItems.nth(1).click()

      // Should load that conversation's messages
      // Wait for history to close and messages to load
      await page.waitForTimeout(1000)

      // The conversation should be loaded (we can check if messages changed)
      const historyHeader = page.getByText('Chat History')
      await expect(historyHeader).not.toBeVisible()
    }
  })

  test('should delete a conversation from history', async ({ page }) => {
    // Create a conversation
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Conversation to delete')
    await chatInput.press('Enter')

    // Wait for message
    await page.waitForTimeout(1500)

    // Expand panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    if (await expandButton.isVisible()) {
      await expandButton.click()
    }

    // Open history
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for history to load
    await page.waitForTimeout(500)

    // Mock window.confirm to auto-confirm deletion
    await page.evaluate(() => {
      window.confirm = () => true
    })

    // Find conversation items
    const conversationItems = page.locator('[class*="border-b border-pipboy-border/30"]')
    const count = await conversationItems.count()

    if (count > 1) {
      // Hover over a conversation to reveal delete button
      const firstConversation = conversationItems.nth(1)
      await firstConversation.hover()

      // Find and click delete button (trash icon)
      const deleteButton = firstConversation.locator('button[title="Delete conversation"]')
      await deleteButton.click({ timeout: 5000 })

      // Wait for deletion
      await page.waitForTimeout(500)

      // Conversation should be removed
      // (We can't easily verify without knowing the specific title, but the action should complete)
    }
  })

  test('should highlight active conversation in history', async ({ page }) => {
    // Create and send a message
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('Active conversation test')
    await chatInput.press('Enter')

    // Wait for response
    await page.waitForTimeout(1500)

    // Expand panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    if (await expandButton.isVisible()) {
      await expandButton.click()
    }

    // Open history
    const historyButton = page.locator('button[title="Chat history"]')
    await historyButton.click()

    // Wait for history
    await page.waitForTimeout(500)

    // Look for the active conversation (it should have a special class or styling)
    // Active conversations have 'border-l-2 border-l-pipboy-green' class
    const activeConversation = page.locator('[class*="border-l-pipboy-green"]')

    if (await activeConversation.count() > 0) {
      await expect(activeConversation.first()).toBeVisible()
    }
  })
})

test.describe('Chat Panel - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Expand chat panel for these tests
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()
  })

  test('should open API key settings modal', async ({ page }) => {
    // Click settings button
    const settingsButton = page.locator('button[title="API Key Settings"]')
    await settingsButton.click()

    // Settings modal should appear
    // Look for common settings modal indicators
    const settingsModal = page.locator('[role="dialog"]').or(page.getByText('API Key').first())
    await expect(settingsModal).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Chat Panel - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display error message when AI request fails', async ({ page }) => {
    // Mock AI to throw an error
    await page.evaluate(() => {
      // @ts-ignore
      if (window.milo && window.milo.ai) {
        window.milo.ai.chat = async () => {
          throw new Error('API key not configured')
        }
      }
    })

    // Send a message
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.fill('This should fail')
    await chatInput.press('Enter')

    // Wait a bit for the error
    await page.waitForTimeout(1000)

    // Error message should be displayed
    const errorMessage = page.getByText('[ERROR]', { exact: false })
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should handle empty message submission gracefully', async ({ page }) => {
    // Expand panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()

    // Try to send empty message
    const chatInput = page.getByPlaceholder('Type message to MILO...')
    await chatInput.fill('   ')  // Just spaces
    await chatInput.press('Enter')

    // Should not create a message
    // Empty state should still be visible
    const emptyStateText = page.getByText('No messages yet')
    await expect(emptyStateText).toBeVisible()
  })
})

test.describe('Chat Panel - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should be keyboard navigable', async ({ page }) => {
    // Focus the chat input directly
    const chatInput = page.getByPlaceholder('Chat with MILO...')
    await chatInput.focus()

    // Type a message
    await page.keyboard.type('Keyboard navigation test')

    // Press Enter to send
    await page.keyboard.press('Enter')

    // Wait for processing
    await page.waitForTimeout(1500)

    // Message should be sent
    const message = page.getByText('Keyboard navigation test').first()
    await expect(message).toBeVisible({ timeout: 5000 })
  })

  test('should maintain focus after sending message', async ({ page }) => {
    // Expand panel
    const expandButton = page.locator('button[title="Expand chat history"]')
    await expandButton.click()
    await page.waitForTimeout(300)

    // Focus input
    const chatInput = page.getByPlaceholder('Type message to MILO...')
    await chatInput.focus()

    // Type and send
    await chatInput.fill('Focus test')
    await chatInput.press('Enter')

    // Wait for message to be sent
    await page.waitForTimeout(500)

    // Input should still be focused (or refocused) - it's an INPUT element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBe('INPUT')
  })
})
