import { ShieldCheck } from "lucide-react";

export function Guarantee() {
  return (
    <div className="border-sage-200 bg-sage-50 rounded-card border-2 border-dashed p-7 text-center">
      <span className="bg-sage-500 mx-auto mb-4 flex size-12 items-center justify-center rounded-full text-white">
        <ShieldCheck className="size-6" />
      </span>

      <h2 className="text-lg">Garantia de 30 dias</h2>

      <p className="text-ink-600 mx-auto mt-2 max-w-md leading-relaxed">
        Siga o plano por 4 semanas. Se você não vir mudança clara no comportamento do
        seu cão, devolvemos o valor integral — basta escrever para a gente dentro de 30
        dias.
      </p>
    </div>
  );
}
