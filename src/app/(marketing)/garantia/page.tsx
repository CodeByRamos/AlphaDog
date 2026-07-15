import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { guarantee, LEGAL_UPDATED_AT } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Garantia de 30 dias",
  description: "Siga o plano por 4 semanas. Sem resultado, devolvemos o valor pago.",
  alternates: { canonical: "/garantia" },
};

export default function GuaranteePage() {
  return (
    <LegalPage
      title="Garantia de 30 dias"
      updatedAt={LEGAL_UPDATED_AT}
      intro="Siga o plano por 4 semanas. Se não vir mudança, devolvemos o valor."
      sections={guarantee}
    />
  );
}
