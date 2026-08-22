"use client"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { ThemeProvider } from "./theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children, themeColor }: { children: React.ReactNode; themeColor?: string }) {
  return (
    <SessionProvider>
      <ThemeProvider initialThemeColor={themeColor}>
        <TooltipProvider delayDuration={120} skipDelayDuration={50}>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: "text-sm",
              duration: 3000,
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
