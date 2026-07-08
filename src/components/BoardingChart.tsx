// BoardingChart.tsx
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Zone {
  id: string
  name: string
  passengers: number
  status: "done" | "current" | "pending"
}

export function BoardingChart({ zones, total }: { zones: Zone[]; total: number }) {
  let running = 0
  const data = zones.map((z) => {
    running += z.passengers
    return { name: z.name, cumulated: running }
  })

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-md font-semibold text-text-primary">Embarquement cumulé</h2>
        <p className="text-xs font-medium text-text-muted">
          {running}/{total} passagers
        </p>
      </div>

      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary)", fontWeight: 500 }}
              itemStyle={{ color: "var(--accent)" }}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="cumulated"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="var(--accent)"
              fillOpacity={0.08}
              dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
              activeDot={{ r: 3.5, fill: "var(--accent)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}