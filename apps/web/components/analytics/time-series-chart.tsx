import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TimeSeriesPoint {
  date: string
  queries: number
  avgLatency: number
  totalTokens: number
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[]
  colors: string[]
}

export function TimeSeriesChart({ data, colors }: TimeSeriesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Volume Over Time</CardTitle>
        <CardDescription>Daily query count and average latency (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="queries"
              stroke={colors[0]}
              strokeWidth={2}
              name="Queries"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgLatency"
              stroke={colors[1]}
              strokeWidth={2}
              name="Avg Latency (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
