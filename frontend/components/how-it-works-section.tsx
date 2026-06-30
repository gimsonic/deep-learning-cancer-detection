import Image from "next/image"
import { Upload, Cpu, ClipboardCheck } from "lucide-react"

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload a scan",
    description:
      "Drag and drop a medical image — X-ray, MRI, CT slice, mammogram, or pathology tile.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI analyses",
    description:
      "The deep learning model processes the image and localises abnormal or cancerous regions.",
  },
  {
    icon: ClipboardCheck,
    step: "03",
    title: "Review results",
    description:
      "Get a clear prediction, confidence score, and visual overlay to support your decision.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            From scan to insight in three steps
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            A streamlined workflow designed to fit into clinical and research routines
            without friction.
          </p>

          <ol className="mt-10 space-y-8">
            {steps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{item.step}</span>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <Image
              src="/images/scan-grid.png"
              alt="Grid of medical scan thumbnails across multiple imaging modalities"
              width={680}
              height={560}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
