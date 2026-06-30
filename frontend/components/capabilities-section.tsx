import { Brain, Microscope, Layers, Gauge, FileSearch, Lock } from "lucide-react"

const capabilities = [
  {
    icon: Layers,
    title: "Multi-cancer coverage",
    description:
      "A single platform trained across multiple modalities — brain MRI, chest X-ray, mammography, skin lesions, and histopathology.",
  },
  {
    icon: Brain,
    title: "Deep learning models",
    description:
      "Convolutional and transformer-based architectures trained on large, annotated medical imaging datasets.",
  },
  {
    icon: FileSearch,
    title: "Region localisation",
    description:
      "Heatmaps and bounding boxes highlight exactly where the model detects abnormal or suspicious tissue.",
  },
  {
    icon: Gauge,
    title: "Fast inference",
    description:
      "Results in seconds, enabling rapid triage and a consistent second read for high-volume workloads.",
  },
  {
    icon: Microscope,
    title: "Confidence scoring",
    description:
      "Every prediction is returned with a calibrated probability so clinicians can prioritise review.",
  },
  {
    icon: Lock,
    title: "Privacy-aware",
    description:
      "Designed with secure handling of sensitive medical images and clear research-use boundaries.",
  },
]

export function CapabilitiesSection() {
  return (
    <section id="capabilities" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Built for accuracy and clinical trust
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            A complete imaging intelligence layer that turns raw scans into actionable,
            explainable insights.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
