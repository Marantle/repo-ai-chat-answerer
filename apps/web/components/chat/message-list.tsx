import ReactMarkdown from 'react-markdown'
import { CodeViewer } from '@/components/code-viewer'

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

interface MessageListProps {
  messages: Message[]
  feedback: Record<string, 'UP' | 'DOWN'>
  bookmarked: Set<string>
  onFeedback: (interactionId: string, rating: 'UP' | 'DOWN') => void
  onBookmark: (interactionId: string) => void
  onLoadChunk: (chunkId: string, messageId: string) => void
}

export function MessageList({
  messages,
  feedback,
  bookmarked,
  onFeedback,
  onBookmark,
  onLoadChunk,
}: MessageListProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          feedback={feedback}
          bookmarked={bookmarked}
          onFeedback={onFeedback}
          onBookmark={onBookmark}
          onLoadChunk={onLoadChunk}
        />
      ))}
    </div>
  )
}

interface MessageItemProps {
  message: Message
  feedback: Record<string, 'UP' | 'DOWN'>
  bookmarked: Set<string>
  onFeedback: (interactionId: string, rating: 'UP' | 'DOWN') => void
  onBookmark: (interactionId: string) => void
  onLoadChunk: (chunkId: string, messageId: string) => void
}

function MessageItem({
  message,
  feedback,
  bookmarked,
  onFeedback,
  onBookmark,
  onLoadChunk,
}: MessageItemProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        data-testid={`message-${message.role}`}
        data-message-id={message.id}
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {message.role === 'user' ? (
          <p>{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.sources && message.sources.length > 0 && (
              <MessageSources
                sources={message.sources}
                messageId={message.id}
                onLoadChunk={onLoadChunk}
              />
            )}
            {message.interactionId && (
              <MessageActions
                interactionId={message.interactionId}
                feedback={feedback}
                bookmarked={bookmarked}
                onFeedback={onFeedback}
                onBookmark={onBookmark}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface MessageSourcesProps {
  sources: SourceWithContent[]
  messageId: string
  onLoadChunk: (chunkId: string, messageId: string) => void
}

function MessageSources({ sources, messageId, onLoadChunk }: MessageSourcesProps) {
  return (
    <div data-testid="message-sources" className="mt-4 border-t pt-4">
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sources</p>
      <div className="space-y-2">
        {sources.map((source) => (
          <CodeViewer
            key={source.chunkId}
            repoName={source.repoName}
            filePath={source.filePath}
            startLine={source.startLine}
            endLine={source.endLine}
            language={source.language || 'typescript'}
            content={source.content || 'Loading...'}
            similarity={source.similarity * 100}
            onExpand={() => {
              if (!source.content) {
                onLoadChunk(source.chunkId, messageId)
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface MessageActionsProps {
  interactionId: string
  feedback: Record<string, 'UP' | 'DOWN'>
  bookmarked: Set<string>
  onFeedback: (interactionId: string, rating: 'UP' | 'DOWN') => void
  onBookmark: (interactionId: string) => void
}

function MessageActions({
  interactionId,
  feedback,
  bookmarked,
  onFeedback,
  onBookmark,
}: MessageActionsProps) {
  return (
    <div data-testid="message-actions" className="mt-4 flex gap-2 border-t pt-4">
      <button
        data-testid="feedback-up"
        aria-label="Give positive feedback"
        onClick={() => onFeedback(interactionId, 'UP')}
        disabled={!!feedback[interactionId]}
        className={`p-2 hover:bg-muted-foreground/10 rounded ${
          feedback[interactionId] === 'UP' ? 'text-green-600' : ''
        }`}
      >
        👍
      </button>
      <button
        data-testid="feedback-down"
        aria-label="Give negative feedback"
        onClick={() => onFeedback(interactionId, 'DOWN')}
        disabled={!!feedback[interactionId]}
        className={`p-2 hover:bg-muted-foreground/10 rounded ${
          feedback[interactionId] === 'DOWN' ? 'text-red-600' : ''
        }`}
      >
        👎
      </button>
      <button
        data-testid="bookmark-button"
        aria-label="Bookmark this answer"
        onClick={() => onBookmark(interactionId)}
        disabled={bookmarked.has(interactionId)}
        className={`p-2 hover:bg-muted-foreground/10 rounded ${
          bookmarked.has(interactionId) ? 'text-yellow-600' : ''
        }`}
      >
        🔖
      </button>
    </div>
  )
}
