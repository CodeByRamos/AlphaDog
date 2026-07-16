import { cn } from "@/lib/utils";

/**
 * Marca AlphaDog.
 *
 * A silhueta é um escudo (proteção, confiança) que ao mesmo tempo lê como uma
 * cabeça de cão — as duas pontas superiores são orelhas atentas. O vazado
 * interno é um chevron ascendente com três leituras: o "A" de Alpha, uma divisa
 * de patente (autoridade, disciplina) e uma seta para cima (evolução). Escudo e
 * chevron dividem o mesmo eixo: tutor e cão, um movimento só.
 *
 * O chevron é recortado com `fill-rule: evenodd`, então a marca funciona sobre
 * qualquer fundo e herda a cor via `currentColor`.
 */
const MARK_PATH = `M8 14 L10.5 3 L20.5 14 L27.5 14 L37.5 3 L40 14
  C40 30 33 38.5 24 43 C15 38.5 8 30 8 14 Z
  M24 16 L34 27 L28.2 32.4 L24 27.4 L19.8 32.4 L14 27 Z`;

type MarkProps = React.SVGProps<SVGSVGElement> & { title?: string };

export function AlphaDogMark({ className, title, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      className={cn("h-8 w-8", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path fill="currentColor" fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  /** Oculta o wordmark — use em espaços apertados (mobile, favicon, avatar). */
  markOnly?: boolean;
};

export function Logo({ className, markClassName, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AlphaDogMark
        title="AlphaDog"
        className={cn("text-alpha-500 h-8 w-8", markClassName)}
      />
      {!markOnly && (
        <span className="font-display text-xl font-extrabold tracking-tight">
          Alpha<span className="text-alpha-500">Dog</span>
        </span>
      )}
    </span>
  );
}
