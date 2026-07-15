import type { Metadata } from "next";
import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { Container, Section } from "@/components/ui/section";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com o time do AlphaDog: ${siteConfig.contactEmail}.`,
  alternates: { canonical: "/contato" },
};

const channels = [
  {
    icon: Mail,
    title: "Suporte",
    body: "Dúvida sobre a sua conta, acesso ou cobrança. Respondemos em até 1 dia útil.",
    action: siteConfig.contactEmail,
    href: `mailto:${siteConfig.contactEmail}`,
  },
  {
    icon: ShieldCheck,
    title: "Garantia",
    body: 'Quer pedir reembolso dentro dos 30 dias? Escreva com o assunto "Garantia".',
    action: `${siteConfig.contactEmail}`,
    href: `mailto:${siteConfig.contactEmail}?subject=Garantia`,
  },
  {
    icon: LifeBuoy,
    title: "Dúvida de treino",
    // O canal do especialista dentro do app entra junto com a área logada.
    body: "Travou num exercício? Conte o que está acontecendo e um adestrador responde.",
    action: siteConfig.contactEmail,
    href: `mailto:${siteConfig.contactEmail}?subject=D%C3%BAvida%20de%20treino`,
  },
];

export default function ContactPage() {
  return (
    <Section>
      <Container width="narrow">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">Falar com a gente</h1>
          <p className="text-ink-500 mt-4 text-lg leading-relaxed">
            Sem bot, sem fila. Escreva e uma pessoa responde.
          </p>
        </header>

        <ul className="mt-12 space-y-4">
          {channels.map((channel) => (
            <li
              key={channel.title}
              className="border-ink-100 rounded-card hover:shadow-card flex gap-5 border bg-white p-7 transition-shadow"
            >
              <span className="bg-alpha-50 text-alpha-700 flex size-12 shrink-0 items-center justify-center rounded-full">
                <channel.icon className="size-6" />
              </span>
              <div>
                <h2 className="text-lg">{channel.title}</h2>
                <p className="text-ink-500 mt-1.5 leading-relaxed">{channel.body}</p>
                <a
                  href={channel.href}
                  className="text-alpha-700 mt-3 inline-block font-semibold underline-offset-4 hover:underline"
                >
                  {channel.action}
                </a>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-ink-100 mt-12 border-t pt-8">
          <h2 className="text-lg">Dados da empresa</h2>
          <p className="text-ink-500 mt-2 leading-relaxed">
            {/* Substituir pelos dados reais antes de cobrar do primeiro cliente. */}
            [RAZÃO SOCIAL] — CNPJ [CNPJ]
            <br />
            [ENDEREÇO COMPLETO]
          </p>
        </div>
      </Container>
    </Section>
  );
}
