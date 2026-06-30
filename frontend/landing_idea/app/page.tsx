import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { CapabilitiesSection } from "@/components/capabilities-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { PerformanceSection } from "@/components/performance-section"
import { FaqSection } from "@/components/faq-section"
import { CtaFooter } from "@/components/cta-footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <HeroSection />
        <CapabilitiesSection />
        <HowItWorksSection />
        <PerformanceSection />
        <FaqSection />
        <CtaFooter />
      </main>
    </div>
  )
}
