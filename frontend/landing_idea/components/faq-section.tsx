const faqs = [
  {
    q: "What kinds of images can the system analyse?",
    a: "The platform is designed to work across multiple modalities including chest X-rays, brain MRI slices, mammograms, CT images, and histopathology tiles. The analysis page supports common image formats.",
  },
  {
    q: "Is this a replacement for a doctor?",
    a: "No. OncoVisionAI is a decision-support and research tool. Its outputs are intended to assist qualified clinicians and should never be used as a sole basis for diagnosis or treatment.",
  },
  {
    q: "How does the model explain its predictions?",
    a: "Alongside a class prediction and confidence score, the system produces visual overlays — heatmaps and bounding boxes — that show which regions influenced the result.",
  },
  {
    q: "Is the project production-ready?",
    a: "The system is under active development. Core detection capabilities are being refined and expanded across additional cancer types and datasets.",
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="text-balance text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-border">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                {item.q}
                <span className="text-primary transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
