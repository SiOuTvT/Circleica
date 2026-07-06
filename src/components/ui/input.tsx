import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 rounded-xl px-3 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "min-h-[44px] border border-input bg-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50",
        filled:
          "min-h-[44px] bg-muted ring-1 ring-border focus:ring-ring focus:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        ghost:
          "bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:border-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
