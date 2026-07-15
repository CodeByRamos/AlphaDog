import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL_UPDATED_AT, privacy } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o AlphaDog trata seus dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      updatedAt={LEGAL_UPDATED_AT}
      intro="Que dados coletamos, por que, e o que você pode exigir da gente."
      sections={privacy}
    />
  );
}
