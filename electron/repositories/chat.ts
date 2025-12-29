import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

// Convert DB row to ChatConversation
function rowToConversation(row: Record<string, unknown>): ChatConversation {
  return {
    id: row.id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Convert DB row to ChatMessage
function rowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string,
  }
}

export const chatRepository = {
  // ==================== Conversations ====================

  // Get all conversations, ordered by most recently updated
  getAllConversations(): ChatConversation[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM chat_conversations ORDER BY updated_at DESC')
      .all() as Record<string, unknown>[]
    return rows.map(rowToConversation)
  },

  // Get a single conversation by ID
  getConversation(id: string): ChatConversation | null {
    const db = getDatabase()
    const row = db
      .prepare('SELECT * FROM chat_conversations WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined
    return row ? rowToConversation(row) : null
  },

  // Create a new conversation
  createConversation(title: string = 'New Chat'): ChatConversation {
    const db = getDatabase()
    const id = nanoid()
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

  // Update conversation title
  updateConversationTitle(id: string, title: string): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?
    `).run(title, now, id)
  },

  // Touch conversation (update timestamp)
  touchConversation(id: string): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE chat_conversations SET updated_at = ? WHERE id = ?
    `).run(now, id)
  },

  // Delete a conversation (messages cascade)
  deleteConversation(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM chat_conversations WHERE id = ?').run(id)
  },

  // ==================== Messages ====================

  // Get all messages for a conversation
  getMessages(conversationId: string): ChatMessage[] {
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `)
      .all(conversationId) as Record<string, unknown>[]
    return rows.map(rowToMessage)
  },

  // Add a message to a conversation
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): ChatMessage {
    const db = getDatabase()
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, conversationId, role, content, now)

    // Update conversation timestamp
    this.touchConversation(conversationId)

    return {
      id,
      conversationId,
      role,
      content,
      createdAt: now,
    }
  },

  // Delete a message
  deleteMessage(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id)
  },

  // Get message count for a conversation
  getMessageCount(conversationId: string): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number }
    return result.count
  },

  // Generate a title from the first user message
  generateTitleFromFirstMessage(conversationId: string): string {
    const db = getDatabase()
    const row = db
      .prepare(`
        SELECT content FROM chat_messages
        WHERE conversation_id = ? AND role = 'user'
        ORDER BY created_at ASC
        LIMIT 1
      `)
      .get(conversationId) as { content: string } | undefined

    if (!row) return 'New Chat'

    // Truncate to first 50 chars
    const content = row.content.trim()
    return content.length > 50 ? content.substring(0, 47) + '...' : content
  },

  // Auto-title a conversation based on first message
  autoTitleConversation(conversationId: string): void {
    const title = this.generateTitleFromFirstMessage(conversationId)
    this.updateConversationTitle(conversationId, title)
  },
}
