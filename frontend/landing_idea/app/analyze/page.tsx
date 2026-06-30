import Link from "next/link"
import { ArrowLeft, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"

// ─────────────────────────────────────────────────────────────────────────────
// This is the Analysis page. Replace the contents of <main> below with your
// existing, already-developed analysis UI / logic. The "Analyse" button on the
// landing page links here (/analyze).
// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              OncoVision<span className="text-primary">AI</span>
            </span>
          </Link>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Scan analysis</h1>
        <p className="mt-2 text-muted-foreground">
          Drop your developed analysis interface here. This route is wired to the
          landing page&apos;s &quot;Analyse&quot; button.
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Replace the contents of{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
              app/analyze/page.tsx
            </code>{" "}
            with your existing analysis page code.
          </p>
        </div>
      </main>
    </div>
  )
}
