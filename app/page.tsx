import { Navigation } from "@/components/landing/navigation"
import { HeroSection } from "@/components/landing/hero-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { AgentsSection } from "@/components/landing/agents-section"
import { ChatPreview } from "@/components/landing/chat-preview"
import { CosmicData } from "@/components/landing/cosmic-data"
import { PricingSection } from "@/components/landing/pricing-section"
import { Testimonials } from "@/components/landing/testimonials"
import { FAQSection } from "@/components/landing/faq-section"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Navigation />
      <HeroSection />
      <HowItWorks />
      <AgentsSection />
      <ChatPreview />
      <CosmicData />
      <PricingSection />
      <Testimonials />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}
