import { cn } from "@/lib/utils";

/** Larguras de leitura padronizadas — evita `max-w-*` solto pelas páginas. */
const widths = {
  prose: "max-w-2xl",
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
} as const;

type ContainerProps = React.ComponentProps<"div"> & {
  width?: keyof typeof widths;
};

export function Container({ className, width = "default", ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[width], className)}
      {...props}
    />
  );
}
