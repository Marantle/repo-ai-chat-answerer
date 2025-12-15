/**
 * Retry helper for transient network errors.
 */

interface RetryOptions {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

const RETRYABLE_PATTERNS = ['502', '503', '504', '429', 'ECONNRESET', 'ETIMEDOUT', 'fetch failed']

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return RETRYABLE_PATTERNS.some((pattern) => error.message.includes(pattern))
}

function calculateDelay(delayMs: number, multiplier: number, maxDelay: number): number {
  return Math.min(delayMs * multiplier, maxDelay)
}

/**
 * Retry a function with exponential backoff.
 */
function shouldRetryAttempt(attempt: number, maxRetries: number, error: unknown): boolean {
  return attempt < maxRetries && isRetryableError(error)
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let delayMs = opts.initialDelayMs

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!shouldRetryAttempt(attempt, opts.maxRetries, error)) throw error

      console.log(
        `Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delayMs}ms...`
      )

      await new Promise((resolve) => setTimeout(resolve, delayMs))
      delayMs = calculateDelay(delayMs, opts.backoffMultiplier, opts.maxDelayMs)
    }
  }

  throw new Error('All retry attempts failed')
}
