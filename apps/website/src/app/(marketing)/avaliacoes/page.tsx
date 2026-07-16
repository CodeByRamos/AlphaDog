import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { reviews } from "@/lib/content/reviews";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Avaliações",
  description:
    "O que os tutores dizem depois de treinar com o AlphaDog — inclusive o que não funcionou.",
  alternates: { canonical: "/avaliacoes" },
};

const average = (
  reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
).toFixed(1);

export default function ReviewsPage() {
  return (
    <Section>
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl">O que os tutores dizem</h1>
          <div className="mt-5 flex items-center justify-center gap-3">
            <div aria-hidden className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="fill-alpha-500 text-alpha-500 size-5" />
              ))}
            </div>
            <p className="font-display text-lg font-extrabold">
              {average.replace(".", ",")}
              <span className="text-ink-400 font-sans text-sm font-normal">
                {" "}
                de {reviews.length} avaliações
              </span>
            </p>
          </div>
          <p className="text-ink-500 mt-4 leading-relaxed">
            Publicamos as boas e as ruins. Uma página só com nota cinco não diz nada
            sobre um produto.
          </p>
        </header>

        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <li
              key={review.author + review.dog}
              className="border-ink-100 rounded-card flex flex-col border bg-white p-7"
            >
              <div
                aria-label={`${review.rating} de 5 estrelas`}
                className="flex gap-0.5"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    aria-hidden
                    className={
                      i < review.rating
                        ? "fill-alpha-500 text-alpha-500 size-4"
                        : "text-ink-200 size-4"
                    }
                  />
                ))}
              </div>

              <blockquote className="text-ink-700 mt-4 flex-1 leading-relaxed">
                “{review.body}”
              </blockquote>

              <footer className="border-ink-100 mt-5 border-t pt-4">
                <p className="font-display font-bold">{review.author}</p>
                <p className="text-ink-500 text-sm">{review.dog}</p>
              </footer>
            </li>
          ))}
        </ul>

        <div className="mt-14 text-center">
          <Button asChild size="lg">
            <Link href={routes.quiz}>Montar o plano do meu cão</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
