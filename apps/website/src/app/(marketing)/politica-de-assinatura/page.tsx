import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL_UPDATED_AT, subscriptionPolicy } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Política de assinatura",
  description:
    "Como funciona a cobrança, a renovação automática e o cancelamento no AlphaDog.",
  alternates: { canonical: "/politica-de-assinatura" },
};

export default function SubscriptionPolicyPage() {
  return (
    <LegalPage
      title="Política de assinatura"
      updatedAt={LEGAL_UPDATED_AT}
      intro="Cobrança, renovação e cancelamento — sem letra miúda."
      sections={subscriptionPolicy}
    />
  );
}
