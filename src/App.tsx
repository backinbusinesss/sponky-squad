import { useRef } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { Preloader } from "@/components/Preloader";
import { SiteHeader } from "@/components/SiteHeader";
import { useGSAPReveal } from "@/hooks/useGSAPReveal";
import { useLenis } from "@/hooks/useLenis";
import { CommunitySection } from "@/sections/CommunitySection";
import { DigitalCardSection } from "@/sections/DigitalCardSection";
import { EventsSection } from "@/sections/EventsSection";
import { FAQSection } from "@/sections/FAQSection";
import { FinalCTASection } from "@/sections/FinalCTASection";
import { Footer } from "@/sections/Footer";
import { HeroSection } from "@/sections/HeroSection";
import { HowItWorksSection } from "@/sections/HowItWorksSection";
import { PartnersSection } from "@/sections/PartnersSection";
import { StatsLiveSection } from "@/sections/StatsLiveSection";
import { TestimonialsSection } from "@/sections/TestimonialsSection";

export default function App() {
  const scope = useRef<HTMLDivElement>(null);

  useLenis();
  useGSAPReveal(scope);

  return (
    <div ref={scope} className="min-h-screen overflow-x-hidden bg-asphalt-950 text-white selection:bg-racing-orange selection:text-asphalt-950">
      <Preloader />
      <CustomCursor />
      <SiteHeader />
      <main>
        <HeroSection />
        <StatsLiveSection />
        <HowItWorksSection />
        <DigitalCardSection />
        <PartnersSection />
        <EventsSection />
        <CommunitySection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
