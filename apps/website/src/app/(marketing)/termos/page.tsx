import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL_UPDATED_AT, terms } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso do AlphaDog.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      updatedAt={LEGAL_UPDATED_AT}
      intro="As regras do serviço, em português claro."
      sections={terms}
    />
  );
}
