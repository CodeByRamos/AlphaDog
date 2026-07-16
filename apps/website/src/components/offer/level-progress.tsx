import { ArrowRight } from "lucide-react";

/**
 * Progressão de nível "hoje → em 4 semanas".
 *
 * Os valores vêm das respostas do funil, não são decorativos: é a mesma conta
 * do passo de perfil, para que o tutor veja coerência entre o que respondeu e o
 * que está sendo prometido.
 */
export function LevelProgress({
  levels,
}: {
  levels: readonly { label: string; from: string; to: string; percent: number }[];
}) {
  return (
    <div className="border-ink-100 rounded-card shadow-card border bg-white p-7">
      <h2 className="text-lg">O que muda em 4 semanas</h2>

      <dl className="mt-6 space-y-6">
        {levels.map((level) => (
          <div key={level.label}>
            <dt className="text-ink-500 mb-2 text-sm">{level.label}</dt>
            <dd className="flex items-center gap-3">
              <span className="text-ink-400 font-display text-sm font-bold">
                {level.from}
              </span>
              <ArrowRight aria-hidden className="text-alpha-600 size-4 shrink-0" />
              <span className="font-display text-alpha-700 text-sm font-bold">
                {level.to}
              </span>
            </dd>
            <div className="bg-ink-100 mt-2 h-2 overflow-hidden rounded-full">
              <div
                className="from-alpha-500 to-alpha-400 h-full rounded-full bg-gradient-to-r"
                style={{ width: `${level.percent}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
