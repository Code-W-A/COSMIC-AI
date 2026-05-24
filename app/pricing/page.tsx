import { Navigation } from "@/components/landing/navigation"
import { PricingSection } from "@/components/landing/pricing-section"
import { Footer } from "@/components/landing/footer"

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Navigation />
      <div className="pt-16">
        <PricingSection />
      </div>
      <Footer />
    </main>
  )
}
