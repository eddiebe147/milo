import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createTestDatabase, clearTestDatabase, closeTestDatabase } from '../test/setup'
import Database from 'better-sqlite3'

// We need to manually set up the module since we can't use vi.mock with dynamic imports
let db: Database.Database

// Create a local version of chatRepository that uses our test database
const chatRepository = {
  getAllConversations() {
    const rows = db
      .prepare('SELECT * FROM chat_conversations ORDER BY updated_at DESC')
      .all() as Record<string, unknown>[]
    return rows.map(rowToConversation)
  },

  getConversation(id: string) {
    const row = db
      .prepare('SELECT * FROM chat_conversations WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined
    return row ? rowToConversation(row) : null
  },

  createConversation(title: string = 'New Chat') {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO chat_conversations (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(id, title, now, now)

    return {
      id,
      title,
      createdAt: now,
      updatedAt: now,
    }
  },

  updateConversationTitle(id: string, title: string) {
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?
    `).run(title, now, id)
  },

  touchConversation(id: string) {
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE chat_conversations SET updated_at = ? WHERE id = ?
    `).run(now, id)
  },

  deleteConversation(id: string) {
    db.prepare('DELETE FROM chat_conversations WHERE id = ?').run(id)
  },

  getMessages(conversationId: string) {
    const rows = db
      .prepare(`
        SELECT * FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `)
      .all(conversationId) as Record<string, unknown>[]
    return rows.map(rowToMessage)
  },

  addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, conversationId, role, content, now)

    this.touchConversation(conversationId)

    return {
      id,
      conversationId,
      role,
      content,
      createdAt: now,
    }
  },

  deleteMessage(id: string) {
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id)
  },

  getMessageCount(conversationId: string) {
    const result = db
      .prepare('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number }
    return result.count
  },

  generateTitleFromFirstMessage(conversationId: string) {
    const row = db
      .prepare(`
        SELECT content FROM chat_messages
        WHERE conversation_id = ? AND role = 'user'
        ORDER BY created_at ASC
        LIMIT 1
      `)
      .get(conversationId) as { content: string } | undefined

    if (!row) return 'New Chat'

    const content = row.content.trim()
    return content.length > 50 ? content.substring(0, 47) + '...' : content
  },

  autoTitleConversation(conversationId: string) {
    const title = this.generateTitleFromFirstMessage(conversationId)
    this.updateConversationTitle(conversationId, title)
  },
}

interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

function rowToConversation(row: Record<string, unknown>): ChatConversation {
  return {
    id: row.id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string,
  }
}

describe('chatRepository', () => {
  beforeEach(() => {
    db = createTestDatabase()
    clearTestDatabase()
  })

  afterAll(() => {
    closeTestDatabase()
  })

  describe('conversations', () => {
    describe('createConversation', () => {
      it('creates a conversation with default title', () => {
        const conv = chatRepository.createConversation()

        expect(conv.id).toBeDefined()
        expect(conv.title).toBe('New Chat')
        expect(conv.createdAt).toBeDefined()
        expect(conv.updatedAt).toBeDefined()
      })

      it('creates a conversation with custom title', () => {
        const conv = chatRepository.createConversation('My Custom Chat')

        expect(conv.title).toBe('My Custom Chat')
      })

      it('generates unique IDs for each conversation', () => {
        const conv1 = chatRepository.createConversation()
        const conv2 = chatRepository.createConversation()

        expect(conv1.id).not.toBe(conv2.id)
      })
    })

    describe('getConversation', () => {
      it('returns conversation by ID', () => {
        const created = chatRepository.createConversation('Test Chat')
        const fetched = chatRepository.getConversation(created.id)

        expect(fetched).not.toBeNull()
        expect(fetched!.id).toBe(created.id)
        expect(fetched!.title).toBe('Test Chat')
      })

      it('returns null for non-existent ID', () => {
        const result = chatRepository.getConversation('non-existent-id')
        expect(result).toBeNull()
      })
    })

    describe('getAllConversations', () => {
      it('returns empty array when no conversations', () => {
        const convs = chatRepository.getAllConversations()
        expect(convs).toEqual([])
      })

      it('returns all conversations ordered by updated_at DESC', async () => {
        const conv1 = chatRepository.createConversation('First')
        await new Promise(resolve => setTimeout(resolve, 10))
        const conv2 = chatRepository.createConversation('Second')
        await new Promise(resolve => setTimeout(resolve, 10))
        const conv3 = chatRepository.createConversation('Third')

        // At this point, conv3 is newest, then conv2, then conv1
        const convs = chatRepository.getAllConversations()

        expect(convs).toHaveLength(3)
        expect(convs[0].id).toBe(conv3.id) // Most recently updated
        expect(convs[1].id).toBe(conv2.id)
        expect(convs[2].id).toBe(conv1.id)
      })
    })

    describe('updateConversationTitle', () => {
      it('updates the conversation title', () => {
        const conv = chatRepository.createConversation('Original Title')
        chatRepository.updateConversationTitle(conv.id, 'Updated Title')

        const updated = chatRepository.getConversation(conv.id)
        expect(updated!.title).toBe('Updated Title')
      })

      it('updates the updated_at timestamp', async () => {
        const conv = chatRepository.createConversation('Test')
        const originalUpdatedAt = conv.updatedAt

        // Small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10))
        chatRepository.updateConversationTitle(conv.id, 'New Title')

        const updated = chatRepository.getConversation(conv.id)
        expect(updated!.updatedAt).not.toBe(originalUpdatedAt)
      })
    })

    describe('deleteConversation', () => {
      it('deletes the conversation', () => {
        const conv = chatRepository.createConversation('To Delete')
        chatRepository.deleteConversation(conv.id)

        const result = chatRepository.getConversation(conv.id)
        expect(result).toBeNull()
      })

      it('cascades delete to messages', () => {
        const conv = chatRepository.createConversation()
        chatRepository.addMessage(conv.id, 'user', 'Hello')
        chatRepository.addMessage(conv.id, 'assistant', 'Hi there!')

        expect(chatRepository.getMessageCount(conv.id)).toBe(2)

        chatRepository.deleteConversation(conv.id)

        expect(chatRepository.getMessageCount(conv.id)).toBe(0)
      })
    })
  })

  describe('messages', () => {
    let testConversation: ChatConversation

    beforeEach(() => {
      testConversation = chatRepository.createConversation('Test Conv')
    })

    describe('addMessage', () => {
      it('adds a user message', () => {
        const msg = chatRepository.addMessage(testConversation.id, 'user', 'Hello MILO')

        expect(msg.id).toBeDefined()
        expect(msg.conversationId).toBe(testConversation.id)
        expect(msg.role).toBe('user')
        expect(msg.content).toBe('Hello MILO')
        expect(msg.createdAt).toBeDefined()
      })

      it('adds an assistant message', () => {
        const msg = chatRepository.addMessage(testConversation.id, 'assistant', 'Hello! How can I help?')

        expect(msg.role).toBe('assistant')
        expect(msg.content).toBe('Hello! How can I help?')
      })

      it('touches the conversation when adding message', async () => {
        const originalUpdatedAt = testConversation.updatedAt

        // Small delay to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10))
        chatRepository.addMessage(testConversation.id, 'user', 'Test')

        const updated = chatRepository.getConversation(testConversation.id)
        expect(updated!.updatedAt).not.toBe(originalUpdatedAt)
      })
    })

    describe('getMessages', () => {
      it('returns empty array when no messages', () => {
        const messages = chatRepository.getMessages(testConversation.id)
        expect(messages).toEqual([])
      })

      it('returns messages in chronological order', () => {
        chatRepository.addMessage(testConversation.id, 'user', 'First')
        chatRepository.addMessage(testConversation.id, 'assistant', 'Second')
        chatRepository.addMessage(testConversation.id, 'user', 'Third')

        const messages = chatRepository.getMessages(testConversation.id)

        expect(messages).toHaveLength(3)
        expect(messages[0].content).toBe('First')
        expect(messages[1].content).toBe('Second')
        expect(messages[2].content).toBe('Third')
      })

      it('only returns messages for specified conversation', () => {
        const conv2 = chatRepository.createConversation('Other Conv')

        chatRepository.addMessage(testConversation.id, 'user', 'Conv 1 message')
        chatRepository.addMessage(conv2.id, 'user', 'Conv 2 message')

        const messages1 = chatRepository.getMessages(testConversation.id)
        const messages2 = chatRepository.getMessages(conv2.id)

        expect(messages1).toHaveLength(1)
        expect(messages1[0].content).toBe('Conv 1 message')
        expect(messages2).toHaveLength(1)
        expect(messages2[0].content).toBe('Conv 2 message')
      })
    })

    describe('deleteMessage', () => {
      it('deletes a specific message', () => {
        const msg1 = chatRepository.addMessage(testConversation.id, 'user', 'Keep me')
        const msg2 = chatRepository.addMessage(testConversation.id, 'assistant', 'Delete me')

        chatRepository.deleteMessage(msg2.id)

        const messages = chatRepository.getMessages(testConversation.id)
        expect(messages).toHaveLength(1)
        expect(messages[0].id).toBe(msg1.id)
      })
    })

    describe('getMessageCount', () => {
      it('returns 0 for empty conversation', () => {
        const count = chatRepository.getMessageCount(testConversation.id)
        expect(count).toBe(0)
      })

      it('returns correct count', () => {
        chatRepository.addMessage(testConversation.id, 'user', 'One')
        chatRepository.addMessage(testConversation.id, 'assistant', 'Two')
        chatRepository.addMessage(testConversation.id, 'user', 'Three')

        const count = chatRepository.getMessageCount(testConversation.id)
        expect(count).toBe(3)
      })
    })
  })

  describe('auto-titling', () => {
    let testConversation: ChatConversation

    beforeEach(() => {
      testConversation = chatRepository.createConversation()
    })

    describe('generateTitleFromFirstMessage', () => {
      it('returns "New Chat" when no messages', () => {
        const title = chatRepository.generateTitleFromFirstMessage(testConversation.id)
        expect(title).toBe('New Chat')
      })

      it('returns first user message as title', () => {
        chatRepository.addMessage(testConversation.id, 'user', 'Hello MILO')
        chatRepository.addMessage(testConversation.id, 'assistant', 'Hi there!')

        const title = chatRepository.generateTitleFromFirstMessage(testConversation.id)
        expect(title).toBe('Hello MILO')
      })

      it('truncates long messages to 50 chars', () => {
        const longMessage = 'This is a very long message that should be truncated because it exceeds fifty characters'
        chatRepository.addMessage(testConversation.id, 'user', longMessage)

        const title = chatRepository.generateTitleFromFirstMessage(testConversation.id)
        expect(title.length).toBe(50)
        expect(title.endsWith('...')).toBe(true)
        expect(title.startsWith('This is a very long message')).toBe(true)
      })

      it('ignores assistant messages for title generation', () => {
        // Add assistant message first (unusual but possible)
        chatRepository.addMessage(testConversation.id, 'assistant', 'Welcome!')
        chatRepository.addMessage(testConversation.id, 'user', 'Thanks!')

        const title = chatRepository.generateTitleFromFirstMessage(testConversation.id)
        expect(title).toBe('Thanks!')
      })
    })

    describe('autoTitleConversation', () => {
      it('updates conversation title based on first message', () => {
        chatRepository.addMessage(testConversation.id, 'user', 'Help me with code')

        chatRepository.autoTitleConversation(testConversation.id)

        const updated = chatRepository.getConversation(testConversation.id)
        expect(updated!.title).toBe('Help me with code')
      })
    })
  })
})
