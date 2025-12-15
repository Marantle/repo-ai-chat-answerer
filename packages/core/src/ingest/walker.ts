/**
 * File system walking with gitignore support.
 */

import { glob } from 'fast-glob'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isProcessableFile } from './language'

export interface WalkOptions {
  ignoreDirs?: string[]
  ignorePatterns?: string[]
  respectGitignore?: boolean
  maxFileSize?: number // bytes
}

const DEFAULT_IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.astro',
  'dist',
  'build',
  'out',
  'output',
  'public/build',
  'coverage',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.webpack',
  '.rollup.cache',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.env',
  '.env.local',
  '.venv',
  'target',
  'bin',
  'obj',
  '.gradle',
  '.mvn',
  'vendor',
  'deps',
  '_build',
  'tmp',
  'temp',
]

const DEFAULT_IGNORE_PATTERNS = [
  '**/*.min.js',
  '**/*.min.css',
  '**/*.bundle.js',
  '**/*.bundle.css',
  '**/*.chunk.js',
  '**/*.chunk.css',
  '**/*.map',
  '**/*.lock',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/composer.lock',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/evaluation-report-*.json',
  '**/.playwright-mcp/**',
  '**/generated/**',
  '**/*.compiled.js',
  '**/*.transpiled.js',
  '**/webpack.*.js',
  '**/rollup.*.js',
  '**/*.d.ts.map',
  '**/tsconfig.tsbuildinfo',
]

const DEFAULT_OPTIONS: WalkOptions = {
  ignoreDirs: DEFAULT_IGNORE_DIRS,
  ignorePatterns: DEFAULT_IGNORE_PATTERNS,
  respectGitignore: true,
  maxFileSize: 1024 * 1024, // 1MB
}

export interface FileEntry {
  path: string
  relativePath: string
  size: number
}

function buildIgnorePatterns(opts: Required<WalkOptions>): string[] {
  return [...(opts.ignorePatterns ?? []), ...(opts.ignoreDirs ?? []).map((dir) => `**/${dir}/**`)]
}

async function readFileSize(fullPath: string): Promise<number | null> {
  try {
    const content = await readFile(fullPath)
    return content.byteLength
  } catch {
    return null
  }
}

async function processFile(
  file: string,
  rootPath: string,
  maxFileSize: number | undefined
): Promise<FileEntry | null> {
  if (!isProcessableFile(file)) return null

  const fullPath = join(rootPath, file)
  const size = await readFileSize(fullPath)

  if (size === null) {
    console.warn(`⚠️  Error reading file: ${file}`)
    return null
  }

  if (maxFileSize && size > maxFileSize) {
    console.warn(`⏭️  Skipping large file (${size.toLocaleString()} bytes): ${file}`)
    return null
  }

  return { path: fullPath, relativePath: file, size }
}

/**
 * Walk directory and find all processable code files.
 */
export async function walkDirectory(
  rootPath: string,
  options: Partial<WalkOptions> = {}
): Promise<FileEntry[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const ignorePatterns = buildIgnorePatterns(opts as Required<WalkOptions>)

  const files = await glob('**/*', {
    cwd: rootPath,
    absolute: false,
    ignore: ignorePatterns,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
  })

  const entries: FileEntry[] = []

  for (const file of files) {
    const entry = await processFile(file, rootPath, opts.maxFileSize)
    if (entry) entries.push(entry)
  }

  return entries
}

/**
 * Read and parse gitignore file.
 */
export async function readGitignore(rootPath: string): Promise<string[]> {
  try {
    const gitignorePath = join(rootPath, '.gitignore')
    const content = await readFile(gitignorePath, 'utf-8')

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  } catch {
    return []
  }
}
