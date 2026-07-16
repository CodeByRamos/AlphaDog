# AlphaDog

Plataforma brasileira de adestramento de cães. Duas metades:

1. **Aquisição** — landing, quiz de 43 passos e paywall personalizado. Existe e
   funciona.
2. **Produto** — treinador com visão computacional que acompanha o treino pela
   câmera e dá feedback em tempo real. Em fase de spike.

## Monorepo

```
apps/
  website/      Next.js 16 — landing, funil, oferta, área do cliente
services/
  ai/           Treino e export dos modelos de visão (Python)
scripts/        Verificação: screenshots, links quebrados, walk do funil
docs/           PENDENCIAS.md — o que exige ação humana
```

`apps/mobile`, `apps/admin`, `services/api` e `packages/*` entram quando o spike
de IA passar. Criar pasta vazia antes da hora só gera manutenção.

## Rodar

```bash
pnpm install
pnpm dev            # website em localhost:3000
```

```bash
pnpm build          # todos os workspaces
pnpm lint
pnpm typecheck
pnpm check:links    # falha se algum link interno der 404
```

Sem `DATABASE_URL` o site roda com stores em memória — nada é persistido. Ver
[docs/PENDENCIAS.md](docs/PENDENCIAS.md).

### IA

Python puro, fora do workspace pnpm:

```bash
cd services/ai
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[dev]"
.venv\Scripts\python.exe -m pytest tests -q
```

## Decisões que valem saber

**O funil é orientado a configuração.** Cada passo é `{ key, order, type, config }`
e o `type` resolve num componente do registry (`features/quiz/`). Adicionar
passo é adicionar configuração, nunca componente. É o que permite dezenas de
passos e variantes de teste A/B sem inchar o código.

**O desconto é decidido no servidor.** O cliente dispara o resgate mas nunca
informa o percentual — senão qualquer um escolheria o próprio preço no devtools.

**A inferência de IA é on-device.** `services/ai` treina e exporta; não infere em
runtime. Mandar vídeo para servidor mataria o tempo real, queimaria 4G caro e
vídeo do interior da casa do tutor é dado pessoal sob a LGPD.

**O gate da IA tem dois níveis.** BUILD prova que o pipeline funciona; PRODUÇÃO
prova que serve ao mercado brasileiro (SRD). Hoje BUILD passa e PRODUÇÃO não —
por decisão consciente, com o débito registrado em código.

## Antes de ir ao ar

Leia [docs/PENDENCIAS.md](docs/PENDENCIAS.md). Resumo do que bloqueia:

- A prova social do site é **inventada** e precisa sair ou ser substituída
- Os textos legais têm `[RAZÃO SOCIAL]`/`[CNPJ]` como marcador e precisam de
  revisão jurídica
- O hero usa um placeholder no lugar da foto de cães

## Identidade

A marca é um escudo que também lê como cabeça de cão, com um chevron ascendente
vazado — o "A" de Alpha, uma divisa de patente e uma seta de evolução ao mesmo
tempo. Paleta: `ink` (autoridade), `alpha` (âmbar — recompensa e progresso),
`trust`, `sage` e `bone`. Sora nos títulos, Inter no corpo.

```bash
pnpm brand    # reexporta os PNGs da marca
```
