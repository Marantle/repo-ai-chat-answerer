'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CodeViewerProps {
  repoName: string
  filePath: string
  startLine: number
  endLine: number
  language: string
  content: string
  similarity: number
  onExpand?: () => void
}

export function CodeViewer({
  repoName,
  filePath,
  startLine,
  endLine,
  language,
  content,
  similarity,
  onExpand,
}: CodeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggle = () => {
    if (!isExpanded && onExpand) {
      onExpand()
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="rounded-lg border">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <div className="text-sm font-medium">
              <span className="text-muted-foreground">{repoName}/</span>
              {filePath}
            </div>
            <div className="text-xs text-muted-foreground">
              Lines {startLine}-{endLine} · {similarity.toFixed(1)}% relevant
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t">
          <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">{language}</span>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              showLineNumbers
              startingLineNumber={startLine}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '0.875rem',
              }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  )
}
