"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const statusIcon = (Icon: typeof CircleCheckIcon, color: string, background: string) => (
  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${background} ${color}`}>
    <Icon className="size-4" />
  </span>
)

const Toaster = ({ ...props }: ToasterProps) => {

  return (
    <Sonner
      theme="light"
      className="toaster group"
      closeButton
      icons={{
        success: statusIcon(CircleCheckIcon, "text-[#167d68]", "bg-[#eaf5f0]"),
        info: statusIcon(InfoIcon, "text-[#3e719a]", "bg-[#edf4f8]"),
        warning: statusIcon(TriangleAlertIcon, "text-[#a66b0a]", "bg-[#fff5e2]"),
        error: statusIcon(OctagonXIcon, "text-[#b34b4b]", "bg-[#fcefed]"),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast group flex items-start gap-3 rounded-xl border border-border bg-white p-4 pr-10 text-[#182d2a] shadow-[0_12px_32px_#182d2a24]",
          content: "min-w-0 flex-1",
          title: "text-sm font-semibold leading-5 text-[#182d2a]",
          description: "mt-1 text-xs leading-5 text-[#687a76]",
          icon: "mt-0.5 !ml-0 !mr-0 !size-8 shrink-0",
          closeButton: "!left-auto !right-2 !top-2 !size-6 !rounded-md !border-0 !bg-transparent !text-[#87938f] hover:!bg-[#f2f6f3]",
          success: "!border-l-4 !border-l-[#167d68]",
          info: "!border-l-4 !border-l-[#3e719a]",
          warning: "!border-l-4 !border-l-[#a66b0a]",
          error: "!border-l-4 !border-l-[#b34b4b]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
