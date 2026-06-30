"use client"

import Link from "next/link"
import { Activity, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Performance", href: "#performance" },
  { label: "FAQ", href: "#faq" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/30 backdrop-blur-xl backdrop-saturate-150 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex py-4 sm:py-5 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lg.png"
            alt="CurieSense AI Logo"
            className="h-10 w-auto object-contain translate-y-0.5"
          />
          <div className="leading-none">
            <div>
              <span className="text-xl font-bold text-foreground">CurieSense</span>
              <span
                className="text-xl font-bold"
                style={{
                  background: "linear-gradient(to right, #60a5fa, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {" "}AI
              </span>
            </div>
            <p className="text-[8px] font-medium uppercase tracking-widest text-muted-foreground">
              Cancer Detection System
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button nativeButton={false} render={<Link href="/detect" />}>
            <Activity className="size-4" aria-hidden="true" />
            Analyse
          </Button>
        </div>
      </div>
    </header>
  )
}
