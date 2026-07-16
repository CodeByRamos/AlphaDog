import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navLinks, routes } from "@/lib/routes";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="border-ink-100 bg-bone/85 sticky top-0 z-50 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href={routes.home} aria-label="AlphaDog — início">
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink-600 hover:bg-ink-100 hover:text-ink-900 rounded-field px-3 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* "Entrar" volta aqui junto com a autenticação (depende do banco). */}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={routes.quiz}>Começar</Link>
            </Button>
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}
