import Link from "next/link"
import { Activity, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaFooter() {
  return (
    <>
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to analyse a scan?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Upload an image and get an AI-assisted multi-cancer assessment in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" nativeButton={false} render={<Link href="/detect" />}>
              <Activity className="size-4" aria-hidden="true" />
              Go to analysis
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/lg.png"
              alt="CurieSense AI Logo"
              className="h-7 w-auto object-contain"
            />
            <div className="flex items-baseline">
              <span className="text-lg font-bold text-foreground tracking-tight">CurieSense</span>
              <span
                className="text-lg font-bold ml-1 tracking-tight"
                style={{
                  background: "linear-gradient(to right, #60a5fa, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI
              </span>
            </div>
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            For research and decision-support use only.
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CurieSense AI
          </p>
        </div>
      </footer>
    </>
  )
}
