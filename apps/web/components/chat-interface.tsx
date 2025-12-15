'use client'

import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStreamingChat } from '@/hooks/use-streaming-chat'
import { useFeedback } from '@/hooks/use-feedback'
import { useBookmarks } from '@/hooks/use-bookmarks'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { toast } from 'sonner'

interface Repository {
  id: string
  name: string
  chunkCount: number
}

interface ChatInterfaceProps {
  repositories: Repository[]
}

export function ChatInterface({ repositories }: ChatInterfaceProps) {
  const { messages, isStreaming, sendMessage, loadChunkContent } = useStreamingChat()
  const { feedback, submitFeedback } = useFeedback()
  const { bookmarked, addBookmark } = useBookmarks()
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(
    repositories.length > 1 ? null : repositories.length > 0 ? repositories[0].id : null
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (params: {
    question: string
    repoId: string | null
    filePatterns?: string[]
  }) => {
    try {
      await sendMessage(params)
    } catch {
      toast.error('Failed to get answer. Please try again.')
    }
  }

  return (
    <div className="flex h-screen flex-1 flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">RepoAiChatSlop</h1>
        <p className="text-sm text-muted-foreground">Ask questions about your codebase</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <MessageList
          messages={messages}
          feedback={feedback}
          bookmarked={bookmarked}
          onFeedback={submitFeedback}
          onBookmark={addBookmark}
          onLoadChunk={loadChunkContent}
        />
      </ScrollArea>

      <div className="sticky bottom-0 border-t bg-background">
        <ChatInput
          repositories={repositories}
          selectedRepoId={selectedRepoId}
          onSelectRepo={setSelectedRepoId}
          onSubmit={handleSubmit}
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
