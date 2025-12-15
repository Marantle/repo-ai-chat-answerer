import { prisma } from '@repo-slop/db'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { unstable_cache } from 'next/cache'

interface PerformanceMetrics {
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  avgLatencyMs: number
  totalQueries: number
}

interface TokenUsage {
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  avgTokensPerQuery: number
  estimatedCostUSD: number
}

interface PopularQuestion {
  question: string
  count: number
  avgLatency: number
  lastAsked: string
}

interface SearchQualityMetrics {
  totalWithFeedback: number
  positiveCount: number
  negativeCount: number
  positiveRate: number
}

interface RepoUsage {
  repoId: string
  repoName: string
  queryCount: number
  avgLatency: number
  totalTokens: number
}

interface TimeSeriesPoint {
  date: string
  queries: number
  avgLatency: number
  totalTokens: number
}

interface AnalyticsData {
  performance: PerformanceMetrics
  tokenUsage: TokenUsage
  popularQuestions: PopularQuestion[]
  searchQuality: SearchQualityMetrics
  repoUsage: RepoUsage[]
  timeSeries: TimeSeriesPoint[]
}

const PRICING = {
  inputTokensPer1M: 0.15,
  outputTokensPer1M: 0.6,
}

// TODO: This is getting messy, maybe extract to a service layer?
function buildPerformanceMetrics(interactions: Array<{ durationMs: number }>) {
  const latencies = interactions.map((i) => i.durationMs).sort((a, b) => a - b)
  const p50Index = Math.floor(latencies.length * 0.5)
  const p95Index = Math.floor(latencies.length * 0.95)
  const p99Index = Math.floor(latencies.length * 0.99)
  return {
    p50LatencyMs: latencies[p50Index] || 0,
    p95LatencyMs: latencies[p95Index] || 0,
    p99LatencyMs: latencies[p99Index] || 0,
    avgLatencyMs: Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length),
    totalQueries: interactions.length,
  }
}

function buildTokenMetrics(
  interactions: Array<{
    promptTokens: number | null
    completionTokens: number | null
    totalTokens: number | null
  }>
) {
  const totalPromptTokens = interactions.reduce((sum, i) => sum + (i.promptTokens || 0), 0)
  const totalCompletionTokens = interactions.reduce((sum, i) => sum + (i.completionTokens || 0), 0)
  const totalTokens = interactions.reduce((sum, i) => sum + (i.totalTokens || 0), 0)
  // Pricing math - update this when OpenAI inevitably changes pricing again
  const inputCost = (totalPromptTokens / 1_000_000) * PRICING.inputTokensPer1M
  const outputCost = (totalCompletionTokens / 1_000_000) * PRICING.outputTokensPer1M
  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    avgTokensPerQuery: Math.round(totalTokens / interactions.length),
    estimatedCostUSD: parseFloat((inputCost + outputCost).toFixed(4)),
  }
}

function buildPopularQuestions(
  interactions: Array<{ question: string; durationMs: number; createdAt: Date }>
) {
  const map = new Map<string, { count: number; totalLatency: number; lastAsked: Date }>()
  for (const interaction of interactions) {
    const existing = map.get(interaction.question)
    if (existing) {
      existing.count++
      existing.totalLatency += interaction.durationMs
      if (interaction.createdAt > existing.lastAsked) existing.lastAsked = interaction.createdAt
    } else {
      map.set(interaction.question, {
        count: 1,
        totalLatency: interaction.durationMs,
        lastAsked: interaction.createdAt,
      })
    }
  }
  return Array.from(map.entries())
    .map(([question, data]) => ({
      question,
      count: data.count,
      avgLatency: Math.round(data.totalLatency / data.count),
      lastAsked: data.lastAsked.toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function buildRepoMetrics(
  interactions: Array<{
    repoId: string
    repo: { name: string }
    durationMs: number
    totalTokens: number | null
  }>
) {
  const map = new Map<
    string,
    { name: string; queries: number; totalLatency: number; totalTokens: number }
  >()
  for (const interaction of interactions) {
    const existing = map.get(interaction.repoId)
    if (existing) {
      existing.queries++
      existing.totalLatency += interaction.durationMs
      existing.totalTokens += interaction.totalTokens || 0
    } else {
      map.set(interaction.repoId, {
        name: interaction.repo.name,
        queries: 1,
        totalLatency: interaction.durationMs,
        totalTokens: interaction.totalTokens || 0,
      })
    }
  }
  return Array.from(map.entries())
    .map(([repoId, data]) => ({
      repoId,
      repoName: data.name,
      queryCount: data.queries,
      avgLatency: Math.round(data.totalLatency / data.queries),
      totalTokens: data.totalTokens,
    }))
    .sort((a, b) => b.queryCount - a.queryCount)
}

function buildTimeSeriesData(
  interactions: Array<{ createdAt: Date; durationMs: number; totalTokens: number | null }>
) {
  const map = new Map<string, { queries: number; totalLatency: number; totalTokens: number }>()
  for (const interaction of interactions) {
    const day = interaction.createdAt.toISOString().split('T')[0]
    const existing = map.get(day)
    if (existing) {
      existing.queries++
      existing.totalLatency += interaction.durationMs
      existing.totalTokens += interaction.totalTokens || 0
    } else {
      map.set(day, {
        queries: 1,
        totalLatency: interaction.durationMs,
        totalTokens: interaction.totalTokens || 0,
      })
    }
  }
  return Array.from(map.entries())
    .map(([date, data]) => ({
      date,
      queries: data.queries,
      avgLatency: Math.round(data.totalLatency / data.queries),
      totalTokens: data.totalTokens,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
}

const getAnalyticsData = unstable_cache(
  async (): Promise<AnalyticsData> => {
    const interactions = await prisma.interaction.findMany({
      include: { repo: true, feedback: true },
      orderBy: { createdAt: 'desc' },
    })

    if (interactions.length === 0) {
      return {
        performance: {
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          avgLatencyMs: 0,
          totalQueries: 0,
        },
        tokenUsage: {
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalTokens: 0,
          avgTokensPerQuery: 0,
          estimatedCostUSD: 0,
        },
        popularQuestions: [],
        searchQuality: {
          totalWithFeedback: 0,
          positiveCount: 0,
          negativeCount: 0,
          positiveRate: 0,
        },
        repoUsage: [],
        timeSeries: [],
      }
    }

    const withFeedback = interactions.filter((i) => i.feedback)
    const positiveCount = withFeedback.filter((i) => i.feedback?.rating === 'UP').length

    return {
      performance: buildPerformanceMetrics(interactions),
      tokenUsage: buildTokenMetrics(interactions),
      popularQuestions: buildPopularQuestions(interactions),
      searchQuality: {
        totalWithFeedback: withFeedback.length,
        positiveCount,
        negativeCount: withFeedback.length - positiveCount,
        positiveRate:
          withFeedback.length > 0
            ? parseFloat(((positiveCount / withFeedback.length) * 100).toFixed(1))
            : 0,
      },
      repoUsage: buildRepoMetrics(interactions),
      timeSeries: buildTimeSeriesData(interactions),
    }
  },
  ['analytics'],
  {
    tags: ['analytics', 'interactions'],
    revalidate: 10,
  }
)

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()
  return <AnalyticsClient initialData={data} />
}
