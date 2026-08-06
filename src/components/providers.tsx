"use client"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { ThemeProvider } from "./theme-provider"

export function Providers({ children, themeColor }: { children: React.ReactNode; themeColor?: string }) {
  return (
    <SessionProvider>
      <ThemeProvider initialThemeColor={themeColor}>
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
      </ThemeProvider>
    </SessionProvider>
  )
}
