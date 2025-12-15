'use client'

import { useState } from 'react'
import { TrendingUp, Zap, DollarSign, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/analytics/metric-card'
import { TimeSeriesChart } from '@/components/analytics/time-series-chart'
import { TokenUsageChart } from '@/components/analytics/token-usage-chart'
import { PopularQuestions } from '@/components/analytics/popular-questions'
import { RepoUsage } from '@/components/analytics/repo-usage'
import { FeedbackChart } from '@/components/analytics/feedback-chart'
import { getAnalyticsData } from '@/app/analytics/refresh-actions'

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

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1']

interface AnalyticsClientProps {
  initialData: AnalyticsData
}

export function AnalyticsClient({ initialData }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    const result = await getAnalyticsData()
    if (result.success && result.data) {
      setData(result.data)
    }
    setRefreshing(false)
  }

  const feedbackData = [
    { name: 'Positive', value: data.searchQuality.positiveCount, color: COLORS[3] },
    { name: 'Negative', value: data.searchQuality.negativeCount, color: COLORS[1] },
  ]

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Queries"
          value={data.performance.totalQueries}
          subtitle="All time"
          icon={TrendingUp}
        />
        <MetricCard
          title="Avg Latency"
          value={`${data.performance.avgLatencyMs}ms`}
          subtitle={`P95: ${data.performance.p95LatencyMs}ms`}
          icon={Zap}
        />
        <MetricCard
          title="Estimated Cost"
          value={`$${data.tokenUsage.estimatedCostUSD}`}
          subtitle={`${data.tokenUsage.totalTokens.toLocaleString()} tokens`}
          icon={DollarSign}
        />
        <MetricCard
          title="Positive Rate"
          value={`${data.searchQuality.positiveRate}%`}
          subtitle={`${data.searchQuality.totalWithFeedback} responses rated`}
          icon={ThumbsUp}
        />
      </div>

      <TimeSeriesChart data={data.timeSeries} colors={COLORS} />

      <TokenUsageChart data={data.timeSeries} color={COLORS[2]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PopularQuestions questions={data.popularQuestions} />
        <RepoUsage repos={data.repoUsage} />
      </div>

      {data.searchQuality.totalWithFeedback > 0 && <FeedbackChart data={feedbackData} />}
    </>
  )
}
