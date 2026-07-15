const stats = [
  { value: "3+", label: "Cancer types & modalities supported" },
  { value: "<10s", label: "Average inference time per scan" },
  { value: "94%", label: "Validation sensitivity on benchmark sets" },
  { value: "24/7", label: "Consistent, fatigue-free second reads" },
]

export function PerformanceSection() {
  return (
    <section id="performance" className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Measurable performance you can build on
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed opacity-90">
            Figures reflect internal benchmark evaluations and are intended for research and
            decision-support contexts.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-4xl font-bold tracking-tight sm:text-5xl">
                  {stat.value}
                </span>
                <span className="mt-2 block text-sm leading-relaxed opacity-90">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
