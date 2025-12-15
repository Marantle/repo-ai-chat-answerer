import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FeedbackData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface FeedbackChartProps {
  data: FeedbackData[]
}

export function FeedbackChart({ data }: FeedbackChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Distribution</CardTitle>
        <CardDescription>User satisfaction breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
