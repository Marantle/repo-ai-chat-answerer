import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Repository {
  id: string
  name: string
  chunkCount: number
}

interface ChatInputProps {
  repositories: Repository[]
  selectedRepoId: string | null
  onSelectRepo: (repoId: string | null) => void
  onSubmit: (params: { question: string; repoId: string | null; filePatterns?: string[] }) => void
  disabled: boolean
}

export function ChatInput({
  repositories,
  selectedRepoId,
  onSelectRepo,
  onSubmit,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [filePattern, setFilePattern] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    onSubmit({
      question: input.trim(),
      repoId: selectedRepoId,
      filePatterns: filePattern.trim() ? filePattern.split(',').map((p) => p.trim()) : undefined,
    })

    setInput('')
  }

  return (
    <div className="border-t p-4">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex flex-wrap gap-2">
          {repositories.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="repo-select" className="text-sm font-medium">
                Repository:
              </label>
              <Select
                value={selectedRepoId || 'all'}
                onValueChange={(v) => onSelectRepo(v === 'all' ? null : v)}
              >
                <SelectTrigger id="repo-select" className="w-[250px]">
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositories.length > 1 && (
                    <SelectItem value="all">
                      All repositories ({repositories.reduce((sum, r) => sum + r.chunkCount, 0)})
                    </SelectItem>
                  )}
                  {repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name} ({repo.chunkCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="file-pattern" className="text-sm font-medium">
              Files:
            </label>
            <Input
              id="file-pattern"
              value={filePattern}
              onChange={(e) => setFilePattern(e.target.value)}
              placeholder="e.g., src/**, *.ts (optional)"
              className="w-[250px]"
              disabled={disabled}
            />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your codebase..."
            disabled={disabled}
            className="flex-1"
          />
          <Button
            data-testid="send-button"
            aria-label="Send message"
            type="submit"
            disabled={disabled || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
