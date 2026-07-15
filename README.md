# AlphaDog

SaaS brasileiro de adestramento de cães. Gera um programa personalizado a partir
da raça, idade e comportamento do cão, entregue em aulas curtas com método
positivo e acompanhamento de especialistas.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| Linguagem | TypeScript strict |
| Estilo | Tailwind CSS v4 (tokens em `src/app/globals.css`) |
| Banco | PostgreSQL + Prisma |
| Auth | Auth.js v5 |
| Pagamentos | Stripe (PIX + cartão) |
| i18n | next-intl — pt-BR |

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

Disponível em `http://localhost:3000`.

```bash
npm run build     # build de produção
npm run lint      # eslint
npx tsc --noEmit  # checagem de tipos
```

## Arquitetura

```
src/
  app/           rotas (App Router)
  components/
    brand/       marca AlphaDog
    ui/          primitivos do design system
  features/      domínio (quiz, billing, program, content)
  lib/           utilitários e configuração
  server/        actions, acesso a dados, serviços
```

### Funil orientado a configuração

O funil de onboarding é a peça central do produto. Cada passo é um registro
`{ key, order, type, config }` e o `type` resolve num componente registrado no
**step registry** (`src/features/quiz/`). Adicionar um passo significa adicionar
configuração — nunca um componente novo. É isso que permite rodar dezenas de
passos e variantes de teste A/B sem inchar o código.

## Identidade

A marca é um escudo que também lê como cabeça de cão, com um chevron ascendente
vazado — o "A" de Alpha, uma divisa de patente e uma seta de evolução ao mesmo
tempo. Paleta: `ink` (autoridade), `alpha` (âmbar — recompensa e progresso),
`trust`, `sage` e `bone`. Tipografia: Sora nos títulos, Inter no corpo.
