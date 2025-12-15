/**
 * Language detection and metadata for code files.
 */

export interface LanguageInfo {
  language: string
  extensions: string[]
  commentStyle: {
    singleLine?: string
    multiLineStart?: string
    multiLineEnd?: string
  }
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  typescript: {
    language: 'typescript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  javascript: {
    language: 'javascript',
    extensions: ['', '.jsx', '.mjs', '.cjs'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  python: {
    language: 'python',
    extensions: ['.py', '.pyw'],
    commentStyle: { singleLine: '#', multiLineStart: '"""', multiLineEnd: '"""' },
  },
  java: {
    language: 'java',
    extensions: ['.java'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  csharp: {
    language: 'csharp',
    extensions: ['.cs'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  cpp: {
    language: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.hxx'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  rust: {
    language: 'rust',
    extensions: ['.rs'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  go: {
    language: 'go',
    extensions: ['.go'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  ruby: {
    language: 'ruby',
    extensions: ['.rb'],
    commentStyle: { singleLine: '#', multiLineStart: '=begin', multiLineEnd: '=end' },
  },
  php: {
    language: 'php',
    extensions: ['.php'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  swift: {
    language: 'swift',
    extensions: ['.swift'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  kotlin: {
    language: 'kotlin',
    extensions: ['.kt', '.kts'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  sql: {
    language: 'sql',
    extensions: ['.sql'],
    commentStyle: { singleLine: '--', multiLineStart: '/*', multiLineEnd: '*/' },
  },
  yaml: {
    language: 'yaml',
    extensions: ['.yaml', '.yml'],
    commentStyle: { singleLine: '#' },
  },
  json: {
    language: 'json',
    extensions: ['.json'],
    commentStyle: {},
  },
  markdown: {
    language: 'markdown',
    extensions: ['.md', '.markdown'],
    commentStyle: {},
  },
  prisma: {
    language: 'prisma',
    extensions: ['.prisma'],
    commentStyle: { singleLine: '//', multiLineStart: '/*', multiLineEnd: '*/' },
  },
}

const EXTENSION_TO_LANGUAGE = new Map<string, LanguageInfo>()
for (const info of Object.values(LANGUAGE_MAP)) {
  for (const ext of info.extensions) {
    EXTENSION_TO_LANGUAGE.set(ext, info)
  }
}

/**
 * Detect language from file extension.
 */
export function detectLanguage(filePath: string): LanguageInfo | null {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return EXTENSION_TO_LANGUAGE.get(ext) ?? null
}

/**
 * Check if a file should be processed based on extension.
 */
export function isProcessableFile(filePath: string): boolean {
  return detectLanguage(filePath) !== null
}
