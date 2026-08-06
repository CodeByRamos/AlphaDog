import type { Exercise } from "./exercise";

/**
 * O que uma sessão de treino deixa gravado.
 *
 * Este arquivo já hospedou a máquina de estado guiada por frames — histerese,
 * contagem de permanência, janela de concordância entre leituras. Tudo aquilo
 * existia por causa do vídeo: a detecção piscava trinta vezes por segundo e
 * precisava de amortecimento para não anunciar sucesso e voltar atrás.
 *
 * Com a avaliação por foto existe um evento por repetição, e evento discreto
 * não pisca. A máquina passou para `photo-session.ts`, muito menor. Aqui ficou
 * só o formato que vai para o banco — que não mudou, e por isso o histórico
 * antigo continua legível.
 */
export type SessionResult = {
  exerciseId: Exercise["id"];
  successCount: number;
  totalReps: number;
  durationSeconds: number;
  /** 0..1. Quantas repetições saíram do total tentado. */
  successRate: number;
  /**
   * Quantos acertos foram marcados pelo tutor em vez de avaliados pela IA.
   *
   * Rastreado porque muda o significado do número: uma sessão 100% manual é o
   * relato do tutor, não medição. É isto que separa o que a análise confirmou
   * do que o tutor disse ter visto.
   */
  manualCount: number;
};
