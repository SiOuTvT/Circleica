import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  radius = "2xl",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "compact" | "default" | "comfortable" | "large"
  radius?: "xl" | "2xl"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden bg-card text-sm text-card-foreground ring-1 ring-border has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        radius === "xl" && "rounded-xl *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        radius === "2xl" && "rounded-2xl *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
        size === "compact" && "gap-3 py-3",
        size === "default" && "gap-4 py-4",
        size === "comfortable" && "gap-5 py-5",
        size === "large" && "gap-6 py-6",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-2xl px-4 group-data-[size=compact]/card:px-3 group-data-[size=comfortable]/card:px-5 group-data-[size=large]/card:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=compact]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=compact]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=compact]/card:px-3 group-data-[size=comfortable]/card:px-5 group-data-[size=large]/card:px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t bg-muted/50 p-4 group-data-[size=compact]/card:p-3 group-data-[size=comfortable]/card:p-5 group-data-[size=large]/card:p-6",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
