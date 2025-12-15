import { prisma } from '@repo-slop/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, ThumbsUp, ThumbsDown, Clock, FileText } from 'lucide-react'
import { unstable_cache } from 'next/cache'

const getMetricsData = unstable_cache(
  async () => {
    const totalInteractions = await prisma.interaction.count()

    const allInteractions = await prisma.interaction.findMany({
      where: { feedback: { isNot: null } },
      select: { feedback: true },
    })

    const upvotes = allInteractions.filter((i) => i.feedback?.rating === 'UP').length
    const downvotes = allInteractions.filter((i) => i.feedback?.rating === 'DOWN').length
    const totalFeedback = upvotes + downvotes
    const upvotePercentage = totalFeedback > 0 ? ((upvotes / totalFeedback) * 100).toFixed(1) : '0'
    const downvotePercentage =
      totalFeedback > 0 ? ((downvotes / totalFeedback) * 100).toFixed(1) : '0'

    const avgResponse = await prisma.interaction.aggregate({
      _avg: { durationMs: true },
    })
    const avgDuration = avgResponse._avg.durationMs ?? 0
    const avgSeconds = (avgDuration / 1000).toFixed(2)

    const topFiles = await prisma.interactionSource.groupBy({
      by: ['chunkId'],
      _count: { chunkId: true },
      orderBy: { _count: { chunkId: 'desc' } },
      take: 10,
    })

    const topFilesWithDetails = await Promise.all(
      topFiles.map(async (item) => {
        const chunk = await prisma.chunk.findUnique({
          where: { id: item.chunkId },
          select: { filePath: true },
        })
        return {
          filePath: chunk?.filePath ?? 'Unknown',
          count: item._count.chunkId,
        }
      })
    )

    const repoStats = await prisma.repo.findMany({
      select: {
        name: true,
        _count: {
          select: { chunks: true, interactions: true },
        },
      },
    })

    const recentInteractions = await prisma.interaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        question: true,
        createdAt: true,
        feedback: true,
        durationMs: true,
      },
    })

    return {
      totalInteractions,
      upvotes,
      downvotes,
      upvotePercentage,
      downvotePercentage,
      avgSeconds,
      topFilesWithDetails,
      repoStats,
      recentInteractions,
    }
  },
  ['metrics'],
  {
    tags: ['metrics', 'interactions', 'analytics'],
    revalidate: 60,
  }
)

export default async function MetricsPage() {
  const {
    totalInteractions,
    upvotes,
    downvotes,
    upvotePercentage,
    downvotePercentage,
    avgSeconds,
    topFilesWithDetails,
    repoStats,
    recentInteractions,
  } = await getMetricsData()

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInteractions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSeconds}s</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upvotes}</div>
            <p className="text-xs text-muted-foreground">{upvotePercentage}% of feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Feedback</CardTitle>
            <ThumbsDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{downvotes}</div>
            <p className="text-xs text-muted-foreground">{downvotePercentage}% of feedback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Most Queried Files */}
        <Card>
          <CardHeader>
            <CardTitle>Most Queried Files</CardTitle>
            <CardDescription>Files most frequently referenced in responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFilesWithDetails.map((file, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[300px]">{file.filePath}</span>
                  </div>
                  <span className="text-sm font-medium">{file.count}</span>
                </div>
              ))}
              {topFilesWithDetails.length === 0 && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Repository Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Statistics</CardTitle>
            <CardDescription>Chunks and interactions per repository</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repoStats.map((repo, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{repo.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {repo._count.interactions} queries
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {repo._count.chunks} chunks indexed
                  </div>
                </div>
              ))}
              {repoStats.length === 0 && (
                <p className="text-sm text-muted-foreground">No repositories yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest interactions with the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInteractions.map((interaction) => (
              <div
                key={interaction.id}
                className="flex items-start justify-between border-b pb-4 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-2">{interaction.question}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(interaction.createdAt).toLocaleString()}</span>
                    <span>{(interaction.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                </div>
                {interaction.feedback && (
                  <div className="ml-4">
                    {interaction.feedback.rating === 'UP' ? (
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            ))}
            {recentInteractions.length === 0 && (
              <p className="text-sm text-muted-foreground">No interactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
