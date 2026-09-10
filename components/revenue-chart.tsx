'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartPoint = { date: string; revenue: number }

interface RevenueChartProps {
  data: ChartPoint[]
  label: string
}

const formatRupiahShort = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return `${value}`
}

export function RevenueChart({ data, label }: RevenueChartProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatRupiahShort}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          formatter={(value) => [
              typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : '',
              label,
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
