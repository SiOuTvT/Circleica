"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from "recharts";

interface StatPoint { date: string; value: number }

interface Props {
  gamesByDay:    StatPoint[]
  usersByDay:    StatPoint[]
  commentsByDay: StatPoint[]
}

const TOOLTIP_STYLE_DARK = {
  backgroundColor: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#a1a1aa",
}

const TOOLTIP_STYLE_LIGHT = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#3f3f46",
}

export function AdminCharts({ gamesByDay, usersByDay, commentsByDay }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <ChartCard title="新增游戏" data={gamesByDay} color="#f472b6" type="bar" />
      <ChartCard title="新增用户" data={usersByDay} color="#a78bfa" type="line" />
      <ChartCard title="新增评论" data={commentsByDay} color="#22D3EE" type="bar" />
    </div>
  )
}

function ChartCard({ title, data, color, type }: {
  title: string; data: StatPoint[]; color: string; type: "line" | "bar"
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const isDark = typeof document !== "undefined" && !document.documentElement.classList.contains("light")
  const tooltipStyle = isDark ? TOOLTIP_STYLE_DARK : TOOLTIP_STYLE_LIGHT
  const gridStroke = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"
  const tickFill = isDark ? "#52525b" : "#71717a"

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-lg font-bold text-foreground">{total}</p>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        {type === "bar"
          ? <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickFill }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: tickFill }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridStroke }} />
              <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          : <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickFill }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: tickFill }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
        }
      </ResponsiveContainer>
    </div>
  )
}
