import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full min-w-0 rounded-xl px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50",
        filled:
          "bg-muted ring-1 ring-border focus:ring-ring focus:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        ghost:
          "bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:border-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Textarea({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
