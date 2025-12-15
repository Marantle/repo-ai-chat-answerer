import {
  BarChart,
  Bar,
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

interface TokenUsageChartProps {
  data: TimeSeriesPoint[]
  color: string
}

export function TokenUsageChart({ data, color }: TokenUsageChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Usage Trend</CardTitle>
        <CardDescription>Total tokens consumed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalTokens" fill={color} name="Total Tokens" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
