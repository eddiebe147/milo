import { db } from './db'
import { nanoid } from 'nanoid'
import type { ChatConversation, ChatMessageDB } from './db'

export const chatWebRepository = {
    async getAllConversations(): Promise<ChatConversation[]> {
        return db.conversations.orderBy('updatedAt').reverse().toArray()
    },

    async getConversation(id: string): Promise<ChatConversation | null> {
        return (await db.conversations.get(id)) || null
    },

    async createConversation(title: string = 'New Chat'): Promise<ChatConversation> {
        const id = nanoid()
        const now = new Date().toISOString()
        const conv: ChatConversation = { id, title, createdAt: now, updatedAt: now }
        await db.conversations.add(conv)
        return conv
    },

    async updateConversationTitle(id: string, title: string): Promise<boolean> {
        const now = new Date().toISOString()
        const count = await db.conversations.update(id, { title, updatedAt: now })
        return count > 0
    },

    async deleteConversation(id: string): Promise<boolean> {
        await db.transaction('rw', db.conversations, db.messages, async () => {
            await db.conversations.delete(id)
            await db.messages.where('conversationId').equals(id).delete()
        })
        return true
    },

    async getMessages(conversationId: string): Promise<ChatMessageDB[]> {
        return db.messages.where('conversationId').equals(conversationId).toArray()
    },

    async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessageDB> {
        const id = nanoid()
        const now = new Date().toISOString()
        const msg: ChatMessageDB = { id, conversationId, role, content, createdAt: now }

        await db.transaction('rw', db.messages, db.conversations, async () => {
            await db.messages.add(msg)
            await db.conversations.update(conversationId, { updatedAt: now })
        })

        return msg
    },

    async deleteMessage(id: string): Promise<boolean> {
        await db.messages.delete(id)
        return true
    },

    async autoTitleConversation(id: string): Promise<ChatConversation | null> {
        const firstMsg = await db.messages.where('conversationId').equals(id).first()
        if (!firstMsg) return null

        let title = firstMsg.content.trim()
        if (title.length > 50) title = title.substring(0, 47) + '...'

        await this.updateConversationTitle(id, title)
        return this.getConversation(id)
    }
}
