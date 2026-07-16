/**
 * Área do cliente — materiais entregues após a compra.
 *
 * Só o contrato e a apresentação existem hoje. A lógica de entrega (gerar
 * arquivo, assinar URL, liberar acesso) fica para quando o checkout estiver de
 * pé; os tipos aqui são o que a API vai devolver.
 */

export type DeliverableStatus =
  /** Comprado e pronto para baixar. */
  | "available"
  /** Sendo gerado ou processado. */
  | "processing"
  /** Existe no catálogo, mas o plano do cliente não cobre. */
  | "locked"
  /** Liberado por etapa do programa que o cliente ainda não alcançou. */
  | "scheduled";

export type DeliverableKind = "guia" | "video" | "planilha" | "audio" | "certificado";

export type Deliverable = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: DeliverableKind;
  status: DeliverableStatus;
  /** Capa. Enquanto não há arte real, aponta para o placeholder da marca. */
  coverUrl: string;
  /** Presente apenas quando `status === "available"`. URL assinada pela API. */
  downloadUrl?: string;
  /** Tamanho legível já formatado pela API — o cliente não faz conta. */
  fileSize?: string;
  /** Quando `status === "scheduled"`, o que falta para liberar. */
  unlockHint?: string;
  updatedAt: string;
};

/** Envelope paginado. Espelha o formato que a API vai expor. */
export type DeliverablesPage = {
  items: Deliverable[];
  page: number;
  pageSize: number;
  total: number;
};

export type DeliverablesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; data: DeliverablesPage };

export const STATUS_LABEL: Record<DeliverableStatus, string> = {
  available: "Disponível",
  processing: "Processando",
  locked: "Bloqueado",
  scheduled: "Agendado",
};

export function totalPages(page: DeliverablesPage) {
  return Math.max(1, Math.ceil(page.total / page.pageSize));
}
