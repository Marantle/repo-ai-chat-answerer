import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getChunkContent } from '@/app/chunks/actions'

interface Source {
  chunkId: string
  repoName: string
  filePath: string
  startLine: number
  endLine: number
  similarity: number
}

interface SourceWithContent extends Source {
  content?: string
  language?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceWithContent[]
  interactionId?: string
}

const STORAGE_KEY = 'chat-messages'

function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveMessagesToStorage(messages: Message[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch (err) {
    console.error('Failed to save messages:', err)
  }
}

interface StreamingParams {
  question: string
  repoId: string | null
  filePatterns?: string[]
}

interface StreamData {
  type: 'chunk' | 'done' | 'error'
  content?: string
  sources?: SourceWithContent[]
  interactionId?: string
  message?: string
}

async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n\n') // SSE format, not my favorite but it works

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      parseStreamLine(line, messageId, setMessages)
    }
  }
}

function parseStreamLine(
  line: string,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  try {
    const data = JSON.parse(line.slice(6)) as StreamData

    if (data.type === 'chunk') {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + (data.content || ''),
                sources: data.sources || msg.sources,
              }
            : msg
        )
      )
    } else if (data.type === 'done' && data.interactionId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, interactionId: data.interactionId } : msg
        )
      )
    } else if (data.type === 'error') {
      console.error('Stream error:', data.message)
    }
  } catch (err) {
    console.error('Failed to parse SSE:', err)
  }
}

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load messages after hydration to avoid SSR mismatch
  useEffect(() => {
    setMessages(loadMessagesFromStorage())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      saveMessagesToStorage(messages)
    }
  }, [messages, isHydrated])

  const sendMessage = async (params: StreamingParams) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: params.question,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: params.question,
          repoId: params.repoId,
          filePatterns: params.filePatterns,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')
      if (!response.body) throw new Error('No response body')

      await processStream(response.body.getReader(), assistantId, setMessages)
    } catch (error) {
      console.error('Stream error:', error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: 'Sorry, an error occurred. Please try again.' }
            : msg
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const loadChunkContent = async (chunkId: string, messageId: string) => {
    const result = await getChunkContent(chunkId)

    if (result.success && result.content) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                sources: updateSourceContent(msg.sources, chunkId, {
                  content: result.content,
                  language: result.language,
                }),
              }
            : msg
        )
      )
    } else {
      toast.error(result.error || 'Failed to load code preview')
    }
  }

  return { messages, isStreaming, sendMessage, loadChunkContent }
}

function updateSourceContent(
  sources: SourceWithContent[] | undefined,
  chunkId: string,
  chunk: { content: string; language?: string }
): SourceWithContent[] | undefined {
  return sources?.map((s) =>
    s.chunkId === chunkId ? { ...s, content: chunk.content, language: chunk.language } : s
  )
}
