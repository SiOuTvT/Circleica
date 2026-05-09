"use client"

import { BreadcrumbSetter } from "./breadcrumb-setter";

export function GameBreadcrumb({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  return <BreadcrumbSetter segment={gameId} label={gameTitle} />
}