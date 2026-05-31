"use client"

import { useBreadcrumb } from "@/components/breadcrumb-context";
import { useEffect } from "react";

export function GameBreadcrumb({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { setDynamicLabel } = useBreadcrumb()

  useEffect(() => {
    setDynamicLabel(`/games/${gameId}`, gameTitle)
    return () => {
      setDynamicLabel(`/games/${gameId}`, null)
    }
  }, [gameId, gameTitle, setDynamicLabel])

  return null
}