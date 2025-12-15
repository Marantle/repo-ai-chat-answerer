import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PopularQuestion {
  question: string
  count: number
  avgLatency: number
  lastAsked: string
}

interface PopularQuestionsProps {
  questions: PopularQuestion[]
}

export function PopularQuestions({ questions }: PopularQuestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Questions</CardTitle>
        <CardDescription>Most frequently asked questions</CardDescription>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="border-b pb-3 last:border-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium line-clamp-2 flex-1">{q.question}</p>
                  <span className="text-sm font-bold text-primary ml-2">{q.count}×</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Avg: {q.avgLatency}ms</span>
                  <span>Last: {new Date(q.lastAsked).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
