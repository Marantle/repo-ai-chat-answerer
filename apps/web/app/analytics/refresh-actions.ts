'use server'

import { prisma } from '@repo-slop/db'

const PRICING = {
  inputTokensPer1M: 0.15,
  outputTokensPer1M: 0.6,
}

interface Interaction {
  durationMs: number
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  question: string
  createdAt: Date
  repoId: string
}

function calculatePerformanceMetrics(interactions: Interaction[]) {
  const latencies = interactions.map((i) => i.durationMs).sort((a, b) => a - b)
  const p50Index = Math.floor(latencies.length * 0.5)
  const p95Index = Math.floor(latencies.length * 0.95)
  const p99Index = Math.floor(latencies.length * 0.99)

  return {
    p50LatencyMs: latencies[p50Index] || 0,
    p95LatencyMs: latencies[p95Index] || 0,
    p99LatencyMs: latencies[p99Index] || 0,
    avgLatencyMs: Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length) || 0,
    totalQueries: interactions.length,
  }
}

function calculateTokenMetrics(interactions: Interaction[]) {
  const totalPromptTokens = interactions.reduce((sum, i) => sum + (i.promptTokens || 0), 0)
  const totalCompletionTokens = interactions.reduce((sum, i) => sum + (i.completionTokens || 0), 0)
  const totalTokens = interactions.reduce((sum, i) => sum + (i.totalTokens || 0), 0)

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    avgTokensPerQuery: Math.round(totalTokens / interactions.length) || 0,
    estimatedCostUSD:
      (totalPromptTokens / 1_000_000) * PRICING.inputTokensPer1M +
      (totalCompletionTokens / 1_000_000) * PRICING.outputTokensPer1M,
  }
}

function calculatePopularQuestions(interactions: Interaction[]) {
  const questionCounts = new Map<string, number>()
  interactions.forEach((i) => {
    questionCounts.set(i.question, (questionCounts.get(i.question) || 0) + 1)
  })

  return Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question, count]) => {
      const related = interactions.filter((i) => i.question === question)
      const avgLatency = related.reduce((sum, i) => sum + i.durationMs, 0) / related.length
      return {
        question,
        count,
        avgLatency: Math.round(avgLatency),
        lastAsked: related[0]?.createdAt.toISOString() || new Date().toISOString(),
      }
    })
}

function calculateRepoUsage(interactions: Interaction[], repoMap: Map<string, string>) {
  const repoStats = new Map<
    string,
    { count: number; totalDurationMs: number; totalTokens: number }
  >()

  interactions.forEach((i) => {
    const current = repoStats.get(i.repoId) || { count: 0, totalDurationMs: 0, totalTokens: 0 }
    repoStats.set(i.repoId, {
      count: current.count + 1,
      totalDurationMs: current.totalDurationMs + i.durationMs,
      totalTokens: current.totalTokens + (i.totalTokens || 0),
    })
  })

  return Array.from(repoStats.entries()).map(([repoId, stats]) => ({
    repoId,
    repoName: repoMap.get(repoId) || 'Unknown',
    queryCount: stats.count,
    avgLatency: Math.round(stats.totalDurationMs / stats.count),
    totalTokens: stats.totalTokens,
  }))
}

function calculateTimeSeries(interactions: Interaction[]) {
  const dailyStats = new Map<
    string,
    { count: number; totalDurationMs: number; totalTokens: number }
  >()

  interactions.forEach((i) => {
    const date = i.createdAt.toISOString().split('T')[0]!
    const current = dailyStats.get(date) || { count: 0, totalDurationMs: 0, totalTokens: 0 }
    dailyStats.set(date, {
      count: current.count + 1,
      totalDurationMs: current.totalDurationMs + i.durationMs,
      totalTokens: current.totalTokens + (i.totalTokens || 0),
    })
  })

  return Array.from(dailyStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, stats]) => ({
      date,
      queries: stats.count,
      avgLatency: Math.round(stats.totalDurationMs / stats.count),
      totalTokens: stats.totalTokens,
    }))
}

export async function getAnalyticsData() {
  try {
    const [interactions, positiveCount, negativeCount, repos] = await Promise.all([
      prisma.interaction.findMany({
        select: {
          durationMs: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          question: true,
          createdAt: true,
          repoId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.count({ where: { rating: 'UP' } }),
      prisma.feedback.count({ where: { rating: 'DOWN' } }),
      prisma.repo.findMany({ select: { id: true, name: true } }),
    ])

    const repoMap = new Map(repos.map((r) => [r.id, r.name]))

    return {
      success: true,
      data: {
        performance: calculatePerformanceMetrics(interactions),
        tokenUsage: calculateTokenMetrics(interactions),
        popularQuestions: calculatePopularQuestions(interactions),
        searchQuality: {
          totalWithFeedback: positiveCount + negativeCount,
          positiveCount,
          negativeCount,
          positiveRate:
            positiveCount + negativeCount > 0
              ? (positiveCount / (positiveCount + negativeCount)) * 100
              : 0,
        },
        repoUsage: calculateRepoUsage(interactions, repoMap),
        timeSeries: calculateTimeSeries(interactions),
      },
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return { success: false, error: 'Failed to fetch analytics data' }
  }
}
