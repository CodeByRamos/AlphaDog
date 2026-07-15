import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { footerNav } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="bg-ink-900 text-ink-300 mt-auto">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_3fr]">
          <div className="space-y-4">
            <Logo className="text-bone" />
            <p className="max-w-xs text-sm leading-relaxed">
              Adestramento personalizado, método positivo e acompanhamento de
              especialistas — no ritmo do seu dia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group) => (
              <div key={group.title}>
                <h3 className="text-bone font-display mb-3 text-sm font-bold">
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="hover:text-alpha-500 text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-ink-700 mt-12 flex flex-col gap-4 border-t pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos
            reservados.
          </p>
          <div className="flex gap-6">
            <a
              href={siteConfig.social.instagram}
              className="hover:text-alpha-500 transition-colors"
              rel="noreferrer noopener"
              target="_blank"
            >
              Instagram
            </a>
            <a
              href={siteConfig.social.youtube}
              className="hover:text-alpha-500 transition-colors"
              rel="noreferrer noopener"
              target="_blank"
            >
              YouTube
            </a>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="hover:text-alpha-500 transition-colors"
            >
              {siteConfig.contactEmail}
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
