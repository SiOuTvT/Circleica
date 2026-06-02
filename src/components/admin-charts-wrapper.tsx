"use client"

import dynamic from "next/dynamic"

interface ChartDataPoint {
  date: string
  value: number
}

interface AdminChartsWrapperProps {
  gamesByDay: ChartDataPoint[]
  usersByDay: ChartDataPoint[]
  commentsByDay: ChartDataPoint[]
}

const AdminCharts = dynamic(() => import("@/components/admin-charts").then(m => ({ default: m.AdminCharts })), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-zinc-800/50 light:bg-zinc-200/50" />,
  ssr: false,
})

export function AdminChartsWrapper(props: AdminChartsWrapperProps) {
  return <AdminCharts {...props} />
}
