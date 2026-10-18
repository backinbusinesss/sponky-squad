import { useEffect, useRef, useState } from "react";
import { CustomCursor } from "@/components/CustomCursor";
import { Preloader } from "@/components/Preloader";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginModal } from "@/components/LoginModal";
import { RegisterModal } from "@/components/RegisterModal";
import { PartnerModal } from "@/components/PartnerModal";
import { useGSAPReveal } from "@/hooks/useGSAPReveal";
import { useLenis } from "@/hooks/useLenis";
import { AuthProvider } from "@/lib/auth-context";
import { useRoute } from "@/lib/router";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { CommunitySection } from "@/sections/CommunitySection";
import { DigitalCardSection } from "@/sections/DigitalCardSection";
import { EventsSection } from "@/sections/EventsSection";
import { FAQSection } from "@/sections/FAQSection";
import { FinalCTASection } from "@/sections/FinalCTASection";
import { Footer } from "@/sections/Footer";
import { HeroSection } from "@/sections/HeroSection";
import { HowItWorksSection } from "@/sections/HowItWorksSection";
import { PartnersSection } from "@/sections/PartnersSection";
import { SocialLiveSection } from "@/sections/SocialLiveSection";
import { StatsLiveSection } from "@/sections/StatsLiveSection";
import { TestimonialsSection } from "@/sections/TestimonialsSection";

/**
 * Radice dell'app.
 *
 * Due responsabilità qui:
 *  - decidere quale pagina mostrare in base all'hash (#/account, #/admin)
 *  - tenere aperte le tre modali (login, registrazione, partner)
 *
 * La home monta tutte le sezioni come prima; /account e /admin sono pagine a
 * sé e non montano la home, così non si caricano inutilità (e il maialino 3D
 * non gira mentre si è nell'area riservata).
 */
export default function App() {
  const route = useRoute();

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  // lo header apre la modale di login speditando un evento custom: così non
  // serve sollevare lo stato giù per tutta la gerarchia
  useEffect(() => {
    const onOpenLogin = () => {
      setRegisterOpen(false);
      setLoginOpen(true);
    };
    const onOpenRegister = () => {
      setLoginOpen(false);
      setRegisterOpen(true);
    };
    const onOpenPartner = () => setPartnerOpen(true);

    window.addEventListener("sponky:open-login", onOpenLogin);
    window.addEventListener("sponky:open-register", onOpenRegister);
    window.addEventListener("sponky:open-partner", onOpenPartner);
    return () => {
      window.removeEventListener("sponky:open-login", onOpenLogin);
      window.removeEventListener("sponky:open-register", onOpenRegister);
      window.removeEventListener("sponky:open-partner", onOpenPartner);
    };
  }, []);

  // al primo caricamento, se l'hash punta a una modale (es. #iscrizione che il
  // vecchio sito usava come ancora) la apriamo
  useEffect(() => {
    if (window.location.hash === "#iscrizione") setRegisterOpen(true);
    if (window.location.hash === "#partner") setPartnerOpen(true);
  }, []);

  return (
    <AuthProvider>
      <CustomCursor />
      <RouteGate route={route}>
        <SiteHeader />
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSwitchToRegister={() => setRegisterOpen(true)}
        />
        <RegisterModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          onSwitchToLogin={() => setLoginOpen(true)}
        />
        <PartnerModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
      </RouteGate>
    </AuthProvider>
  );
}

/**
 * Sceglie il contenuto in base alla rotta.
 *
 * useGSAPReveal e useLenis vivono dentro Home solo: sulle pagine account/admin
 * non serve animare gli ingressi con GSAP, e forzare lo scroll morbido lì
 * darebbe solo effetti strani.
 */
function RouteGate({ route, children }: { route: ReturnType<typeof useRoute>; children: React.ReactNode }) {
  if (route === "account") return <>{children}<AccountPage /></>;
  if (route === "admin") return <>{children}<AdminPage /></>;
  return <>{children}<HomePage /></>;
}

function HomePage() {
  const scope = useRef<HTMLDivElement>(null);
  useLenis();
  useGSAPReveal(scope);

  return (
    <div ref={scope} className="min-h-screen overflow-x-hidden bg-asphalt-950 text-white selection:bg-racing-orange selection:text-asphalt-950">
      <Preloader />
      
      <main>
        <HeroSection />
        <StatsLiveSection />
        <HowItWorksSection />
        <DigitalCardSection />
        <PartnersSection />
        <EventsSection />
        <CommunitySection />
        <SocialLiveSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
