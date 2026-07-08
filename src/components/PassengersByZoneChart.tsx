// PassengersByZoneChart.tsx
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { Users } from "lucide-react"

interface Zone {
  id: string
  name: string
  passengers: number
  status: "done" | "current" | "pending"
}

const ACCENT = "var(--accent, #6A0DAD)"
const ACCENT_SOFT = "var(--accent-soft, #EFEBFF)"

export function PassengersByZoneChart({ zones }: { zones: Zone[] }) {
  const data = zones.map((z) => ({ name: z.name, passengers: z.passengers, status: z.status }))
  const totalBoarded = zones.reduce((sum, z) => sum + z.passengers, 0)

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: ACCENT_SOFT }}>
            <Users className="h-3.5 w-3.5" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-md font-semibold text-text-primary">Passagers par zone</h2>
        </div>
        <p className="text-xs font-medium text-text-muted">{totalBoarded} au total</p>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 20, right: 12, left: 12, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--text-muted, #8a8a94)" }}
              axisLine={{ stroke: "var(--border, #e5e5ea)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card, #fff)",
                border: "1px solid var(--border, #e5e5ea)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary, #18181b)", fontWeight: 500 }}
              itemStyle={{ color: ACCENT, fontWeight: 600 }}
              cursor={{ fill: ACCENT_SOFT }}
            />
            <Bar dataKey="passengers" radius={[6, 6, 0, 0]} maxBarSize={32}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.status === "pending" ? ACCENT_SOFT : ACCENT}
                  fillOpacity={d.status === "done" ? 0.75 : 1}
                />
              ))}
              <LabelList
                dataKey="passengers"
                position="top"
                style={{ fill: "var(--text-primary, #18181b)", fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}