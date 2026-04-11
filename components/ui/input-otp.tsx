"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// 原生 OTP 输入框，兼容密码管理器自动填充
const InputOTP = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="text"
    inputMode="numeric"
    autoComplete="one-time-code"
    className={cn(
      "h-12 w-[calc(6*2.75rem+5*0.5rem)] max-w-full rounded-md border border-input bg-transparent px-1 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring focus:ring-offset-background",
      className
    )}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

export { InputOTP }
