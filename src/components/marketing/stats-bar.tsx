import { Container } from "@/components/ui/container";
import { stats } from "@/lib/content/marketing";

export function StatsBar() {
  return (
    <div className="border-ink-100 border-b bg-white">
      <Container>
        <dl className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display text-ink-900 block text-3xl font-extrabold">
                  {stat.value}
                </span>
                <span className="text-ink-500 mt-1 block text-sm">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}
