import type { Metadata } from "next";
import { CameraSection } from "@/components/marketing/camera-section";
import { CapabilitiesSection } from "@/components/marketing/capabilities-section";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqSection } from "@/components/marketing/faq-section";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { StatsBar } from "@/components/marketing/stats-bar";
import { Testimonials } from "@/components/marketing/testimonials";
import { WhatIsSection } from "@/components/marketing/what-is-section";
import { faqJsonLd, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatIsSection />
      <StatsBar />
      <CameraSection />
      <CapabilitiesSection />
      <HowItWorks />
      <ComparisonTable />
      <Testimonials />
      <FaqSection />
      <CtaBand />

      <script
        type="application/ld+json"
        // Dados estruturados são gerados por nós, não vêm de input do usuário.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd(), faqJsonLd()]),
        }}
      />
    </>
  );
}
