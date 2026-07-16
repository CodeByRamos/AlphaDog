import type { Deliverable, DeliverablesPage } from "./types";

/**
 * Dados de exemplo enquanto a API não existe.
 *
 * Cobre os quatro status de propósito: uma grade só de "disponível" esconde os
 * estados que na prática dão trabalho de desenhar.
 */
const COVER = "/brand/hero-app-dogs.png";

export const mockDeliverables: readonly Deliverable[] = [
  {
    id: "1",
    slug: "guia-socializacao",
    name: "Guia de socialização",
    description: "Apresentar seu cão a gente, cães e barulho sem trauma.",
    kind: "guia",
    status: "available",
    coverUrl: COVER,
    downloadUrl: "#",
    fileSize: "4,2 MB",
    updatedAt: "2026-07-10",
  },
  {
    id: "2",
    slug: "ansiedade-separacao",
    name: "Ansiedade de separação",
    description: "Protocolo de dessensibilização para ficar sozinho sem sofrer.",
    kind: "guia",
    status: "available",
    coverUrl: COVER,
    downloadUrl: "#",
    fileSize: "3,8 MB",
    updatedAt: "2026-07-08",
  },
  {
    id: "3",
    slug: "planilha-progresso",
    name: "Planilha de progresso",
    description: "Registre cada sessão e veja a evolução semana a semana.",
    kind: "planilha",
    status: "processing",
    coverUrl: COVER,
    updatedAt: "2026-07-14",
  },
  {
    id: "4",
    slug: "por-que-meu-cao-late",
    name: "Por que meu cão late",
    description: "Identificar o gatilho e cortar o latido na raiz.",
    kind: "video",
    status: "locked",
    coverUrl: COVER,
    updatedAt: "2026-07-01",
  },
  {
    id: "5",
    slug: "jogos-de-faro",
    name: "50+ jogos de faro",
    description: "Gastar energia mental em 10 minutos, dentro de casa.",
    kind: "guia",
    status: "locked",
    coverUrl: COVER,
    updatedAt: "2026-06-28",
  },
  {
    id: "6",
    slug: "certificado",
    name: "Certificado de conclusão",
    description: "Emitido quando o programa de 4 semanas for concluído.",
    kind: "certificado",
    status: "scheduled",
    coverUrl: COVER,
    unlockHint: "Libera ao concluir a semana 4",
    updatedAt: "2026-07-15",
  },
];

export function mockDeliverablesPage(page = 1, pageSize = 6): DeliverablesPage {
  const start = (page - 1) * pageSize;
  return {
    items: [...mockDeliverables].slice(start, start + pageSize),
    page,
    pageSize,
    total: mockDeliverables.length,
  };
}
