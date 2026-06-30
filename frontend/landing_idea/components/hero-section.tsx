import Link from "next/link"
import Image from "next/image"
import { Activity, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Deep learning diagnostics platform
          </span>

          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Multi-cancer detection from medical scans, in seconds.
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            OncoVisionAI analyses radiology and pathology images with state-of-the-art
            neural networks to flag abnormal or cancerous regions, supporting clinicians
            with fast, consistent second opinions.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/analyze" />}>
              <Activity className="size-4" aria-hidden="true" />
              Start an analysis
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="#how-it-works" />}>
              See how it works
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Research and decision-support use — not a replacement for clinical diagnosis.
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <Image
              src="/images/scan-analysis.png"
              alt="Medical scan with AI detection overlays highlighting a region of interest"
              width={720}
              height={560}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
