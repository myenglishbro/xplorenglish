import { LandingNavbar } from "./LandingNavbar";
import { LandingFooter } from "./LandingFooter";

import { HeroSection } from "./HeroSection";
import { ProgramsSection } from "./ProgramsSection";
import { MethodologySection } from "./MethodologySection";
import { DiagnosticClassSection } from "./DiagnosticClassSection";
import { PricingSection } from "./PricingSection";
import { PackageBenefitsSection } from "./PackageBenefitsSection";
import { AboutSection } from "./AboutSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { PaymentMethodsSection } from "./PaymentMethodsSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { TeachingTeamSection } from "./TeachingTeamSection";

export function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#f7f9f9",
        color: "var(--text-heading)",
      }}
    >
      {/* =========================
          NAVBAR
      ========================== */}
      <LandingNavbar />

      {/* =========================
          LANDING CONTENT
      ========================== */}
      <main>
        <HeroSection />

        <ProgramsSection />

        <MethodologySection />

        <DiagnosticClassSection />

        <PricingSection />

        <PackageBenefitsSection />

        <AboutSection />
  <TeachingTeamSection />

        <TestimonialsSection />

        <PaymentMethodsSection />

        <FinalCtaSection />
      </main>

      {/* =========================
          FOOTER
      ========================== */}
      <LandingFooter />
    </div>
  );
}