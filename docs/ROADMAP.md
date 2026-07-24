# Roadmap AlphaDog

Este documento existe porque a lista de ideias cresceu muito além do que cabe na
entrega de curto prazo. Registrar e sequenciar é trabalho de produto; implementar
tudo de uma vez é como se produz software que parece pronto e não é.

Regra de ouro do projeto: **nada de tela ilustrativa**. Cada item entra completo
(dado real + estado vazio + erro + teste) ou não entra. Melhor três features
inteiras que vinte pela metade.

---

## Prioridade 0 — A ENTREGA (os próximos 2 dias)

O que decide se você tem um produto na mão, não features novas.

| # | Item | Estado | Depende de |
| --- | --- | --- | --- |
| 0.1 | **APK buildando no EAS** | 🔴 fix do Node 22 aplicado, aguarda você rodar de novo | seu `eas build` |
| 0.2 | Desligar Confirm email no Supabase | 🔴 | seu clique no painel |
| 0.3 | Paywall de acesso (app 100% pago) | 🟡 em andamento | — |
| 0.4 | Landing de conversão | ✅ feito | — |

**Sem 0.1 não há entrega.** Tudo abaixo é depois disso.

---

## O que já existe hoje (não reconstruir)

O app não é um esqueleto. Já tem, funcionando e testado:

- Auth (cadastro, login, sessão persistente) via Supabase
- Onboarding do cão (9 campos) salvando no banco com RLS
- Dashboard com progresso, sequência (streak), semana e recomendação do próximo treino
- Exercícios guiados passo a passo (sentar, deitar, dar a pata) com erro comum
- Sessão de treino cronometrada, com marcação de acerto pelo tutor e gravação real
- Histórico calculado das sessões
- Perfil do cão com upload de foto
- Estatísticas: total de sessões, minutos, taxa de acerto, "dominado" = 3×80%

Boa parte da lista nova é **expansão** disso, não criação do zero.

---

## Fase 1 — Assinatura e acesso (semana 1)

Pré-requisito de um app pago. Já iniciado.

- [ ] Tabela `subscriptions` no Supabase (RLS: dono lê; service_role escreve via webhook)
- [ ] `useSubscription` + gate no `app/index.tsx` e guarda no `(app)/_layout`
- [ ] Tela de assinatura premium (planos, FAQ, cobrança recorrente, honesta sobre a câmera)
- [ ] Provider Asaas atrás da interface `PaymentProvider` que já existe (dormente até as chaves)
- [ ] Webhook (Edge Function) sincronizando status — **precisa de conta Asaas + chaves**

Decisão travada: cobrança como **CPF** → cartão recorrente; PIX estende acesso por
N dias (o `pricing.ts` já modela `days` por plano). PIX Automático exigiria CNPJ.

## Fase 2 — Profundidade do treino (semanas 2-3)

O núcleo do produto, expandido. Alto valor, baixo risco.

- [ ] **Biblioteca de exercícios** completa (básico, avançado, socialização, foco,
      autocontrole, enriquecimento) — cada um com descrição, dificuldade, duração,
      dicas, erros comuns, critério de concluído. Hoje são 3 exercícios; a estrutura
      em `packages/core` já suporta N.
- [ ] **Plano de treino gerado** por idade/raça/porte/energia/experiência/objetivo
      (regras determinísticas primeiro; "IA" só quando houver dado de uso)
- [ ] **Sistema de metas** (treinar X min/dia, X dias seguidos, dominar comando Y)
- [ ] **Perfil do cão expandido** (peso ao longo do tempo, alimentação, observações,
      restrições, objetivos)

## Fase 3 — Evolução e engajamento (semanas 4-5)

- [ ] **Sistema de evolução do cão**: níveis, XP, habilidades desbloqueadas,
      evolução visual — em cima das sessões que já são gravadas
- [ ] **Gamificação discreta**: conquistas, medalhas, desafios semanais (streak já existe)
- [ ] **Dashboard inteligente**: exercícios favoritos, comandos com dificuldade,
      progresso semanal/mensal — gráficos modernos
- [ ] **Timeline / histórico completo**: treinos, notas, melhorias, dificuldades
- [ ] **Calendário**: treinos feitos, próximos, lembretes, metas

## Fase 4 — Retenção e saúde (semanas 6-7)

- [ ] **Notificações inteligentes** (rotina, horário habitual, dias sem treino) —
      exige `expo-notifications` + agendamento
- [ ] **Área de saúde** opcional (vacinação, vermífugo, medicamentos, consultas, peso)
- [ ] **Busca global** (exercícios, comandos, sessões, histórico, artigos)

## Fase 5 — Visão computacional (destrava quando o modelo treinar)

Bloqueada pelo `.tflite` que ainda não terminou de treinar. Ver `PENDENCIAS.md`.

- [ ] Reconhecimento de postura pela câmera (contagem automática de repetição)
- [ ] Feedback automático em tempo real
- [ ] Detecção de comportamento (puxar guia, agitação)
- [ ] Gestão de vídeos (histórico, comparação lado a lado, favoritos)
- [ ] Análise de evolução por vídeo

## Transversal — qualidade contínua (todas as fases)

Não é uma fase; é como cada PR é feito.

- Performance: lazy loading, code splitting, cache do React Query, índices no banco
- Design system: espaçamento, tipografia, skeleton loaders, estados vazios, microinterações
- Offline: cache dos conteúdos essenciais + sync (exige estratégia de merge — não trivial)
- Escalabilidade: componentes reutilizáveis, zero duplicação, documentar estruturas novas

---

## Por que não tudo de uma vez

Cada feature acima que toca o banco precisa de: migração + RLS + tipos gerados +
camada de dados + tela + estado vazio + erro + teste. Multiplicado por ~20, é
trabalho de meses. Entregar metade de vinte telas deixa o app pior que hoje — mais
lugares para quebrar, menos que funciona de verdade. A ordem acima entrega valor
em cada passo e nunca deixa o app num estado quebrado.
