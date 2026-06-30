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
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">
              CurieSense<span className="text-primary">AI</span>
            </span>
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            For research and decision-support use only. Not a medical device.
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CurieSense AI
          </p>
        </div>
      </footer>
    </>
  )
}
