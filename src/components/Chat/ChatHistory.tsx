import React from 'react'
import { MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { useChatStore } from '@/stores'
import type { ChatConversation } from '@/stores/chatStore'

/**
 * ChatHistory - Slide-out panel showing conversation history
 *
 * Features:
 * - List of past conversations with titles
 * - Click to load conversation
 * - Delete conversations
 * - Shows "New Chat" at top
 * - Retro terminal aesthetic
 */
export const ChatHistory: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    isLoading,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useChatStore()

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('Delete this conversation?')) {
      deleteConversation(id)
    }
  }

  return (
    <div className="h-full flex flex-col bg-pipboy-background border-r border-pipboy-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-pipboy-border bg-pipboy-surface/30">
        <span className="text-xs font-mono font-medium text-pipboy-green-dim uppercase tracking-wider">
          Chat History
        </span>
      </div>

      {/* New Chat Button */}
      <button
        onClick={startNewConversation}
        className={`
          flex items-center gap-2 px-3 py-2 text-left
          border-b border-pipboy-border/50
          hover:bg-pipboy-surface/50 transition-colors
          ${!currentConversationId ? 'bg-pipboy-surface/30' : ''}
        `}
      >
        <MessageSquare size={14} className="text-pipboy-green" />
        <span className="text-sm font-mono text-pipboy-green">+ New Chat</span>
      </button>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-pipboy-green-dim" />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-pipboy-green-dim font-mono">No conversations yet</p>
          </div>
        )}

        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === currentConversationId}
            onClick={() => loadConversation(conversation.id)}
            onDelete={(e) => handleDelete(e, conversation.id)}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: ChatConversation
  isActive: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  formatDate: (date: string) => string
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onDelete,
  formatDate,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-2 px-3 py-2 text-left
        border-b border-pipboy-border/30
        hover:bg-pipboy-surface/50 transition-colors group
        ${isActive ? 'bg-pipboy-surface/40 border-l-2 border-l-pipboy-green' : ''}
      `}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-pipboy-green truncate">
          {conversation.title}
        </p>
        <p className="text-[10px] font-mono text-pipboy-green-dim">
          {formatDate(conversation.updatedAt)}
        </p>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
        title="Delete conversation"
      >
        <Trash2 size={12} />
      </button>
    </button>
  )
}
