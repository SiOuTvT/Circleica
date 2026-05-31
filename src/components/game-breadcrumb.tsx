"use client"

import { useBreadcrumb } from "@/components/breadcrumb-context";
import { useEffect } from "react";

export function GameBreadcrumb({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { setDynamicLabel } = useBreadcrumb()

  useEffect(() => {
    setDynamicLabel(gameId, gameTitle)
    return () => {
      setDynamicLabel(gameId, null)
    }
  }, [gameId, gameTitle, setDynamicLabel])

  return null
}