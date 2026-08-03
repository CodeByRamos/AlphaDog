# SyncPay — integração de pagamentos

Tudo que a camada de pagamento do AlphaDog faz, onde entram as credenciais e o
que foi medido contra a API real.

---

## O que foi verificado na prática

A documentação pública da SyncPay **diverge do comportamento real em quatro
pontos**, e três deles quebrariam o checkout ou cobrariam o valor errado. Tudo
abaixo foi medido com credenciais de produção.

| Ponto | O que a documentação diz | O que a API faz |
|---|---|---|
| Endereço da API | `api.syncpay.pro` (material de terceiros) | **Não resolve DNS.** O host correto é `api.syncpayments.com.br` |
| Campo `amount` | "integer", sem unidade | **Reais, não centavos.** `amount: 100` gerou uma cobrança de R$ 100,00. Decimais funcionam: `1.99` → R$ 1,99 |
| `customer.address` | campos opcionais | **Todos obrigatórios** (422): city, state, street, country, zipCode, neighborhood, streetNumber. `customer.phone` também |
| `pix.expiresInDays` | nome sugere número de dias | **Exige uma data** (`YYYY-MM-DD`). Enviar `"1"` devolve 422 |

Outros achados:

- **Valor mínimo ≈ R$ 1,00.** `amount: 0.99` devolveu 500; `1.99` passou.
- **Limite de requisições.** Chamadas em sequência devolvem 429 com
  *"Tente novamente em 10 minutos"*.
- **Não existe ambiente de sandbox separado.** A mesma base atende, e a conta
  responde `status: "approved"`. `SYNCPAY_ENVIRONMENT` controla **apenas a tarja
  de aviso na tela** — não torna cobrança nenhuma falsa.
- **Status observados:** `WAITING_FOR_APPROVAL` na criação, `pending` na
  consulta.

### Endpoints

| Endpoint | O quê |
|---|---|
| `POST /api/partner/v1/auth-token` | `client_id` + `client_secret` → Bearer válido por 1 hora |
| `POST /v1/gateway/api` | Cria a cobrança. Devolve `idTransaction`, `paymentCode`, `paymentCodeBase64` |
| `GET /api/partner/v1/transaction/{id}` | Estado da transação, em `data.status`. Descoberto por sondagem: de nove candidatos, só este respondeu 200 |
| Postback | `POST` no `postbackUrl`, corpo em `data`. Tempo limite de 5 segundos |

**O que não existe:** cobrança em cartão e recorrência automática.

Isso molda o produto, e o código diz de frente: **cada PIX confirmado estende o
período de acesso**. Renovar é uma cobrança nova. Não há débito automático — e a
tela avisa isso ao tutor, porque é a dúvida número um de quem paga por PIX.

---

## Onde entram as credenciais

Todas em variáveis de ambiente. **Nenhuma** com prefixo `NEXT_PUBLIC_` — esse
prefixo é o que manda o Next embutir o valor no JavaScript enviado ao navegador.

```
SYNCPAY_CLIENT_ID="..."
SYNCPAY_CLIENT_SECRET="..."
SYNCPAY_WEBHOOK_SECRET="..."     # openssl rand -hex 32
SUPABASE_SERVICE_ROLE_KEY="..."  # painel do Supabase → API
```

Em desenvolvimento, no `.env.local`. Em produção, no painel da hospedagem
(Vercel → Settings → Environment Variables). O `.env.example` é versionado e
serve de modelo — **nunca** coloque valor real nele.

Enquanto as credenciais estiverem vazias, o site continua de pé: a tela de
assinatura aparece e o botão responde "pagamento temporariamente indisponível".
Banco, webhook e estados de assinatura já funcionam.

Ver `docs/SYNCPAY-CHAVES.md` para o guia de quem vai buscar as chaves no painel.

---

## Sandbox → produção

```
SYNCPAY_ENVIRONMENT="production"
```

⚠️ **Isso NÃO controla se a cobrança é real.** A SyncPay não expõe API de teste
separada — verificado. Toda cobrança criada é um PIX de verdade, que alguém pode
pagar de verdade. A variável controla só a tarja de aviso na tela de assinatura,
que existe para ninguém achar que pagou durante os testes.

`SYNCPAY_BASE_URL` e `SYNCPAY_STATUS_PATH` têm padrões verificados e só precisam
ser preenchidos se a SyncPay indicar valores diferentes para a conta.

---

## Como o webhook funciona

A SyncPay chama `POST https://SEU_SITE/api/webhooks/syncpay?token=SEGREDO`.
A URL é montada a partir de `NEXT_PUBLIC_SITE_URL` e `SYNCPAY_WEBHOOK_SECRET` e
enviada em cada cobrança, no campo `postbackUrl` — **não há nada para cadastrar
no painel.**

```
tutor escolhe o plano
   ↓
registramos o pagamento no banco (pendente)   ← o id vira a referência externa
   ↓
POST /v1/gateway/api
   ↓
QR + copia-e-cola na tela; a página acompanha o estado
   ↓
tutor paga
   ↓
SyncPay chama o postback
   ↓
1. o segredo da URL confere?          senão → 401, registrado na auditoria
2. o corpo é válido?                  senão → registrado e descartado
3. o gateway confirma o pagamento?    senão → fica "em processamento"
4. o banco aceita a transição?        senão → duplicado, ignorado
   ↓
período estendido, acesso liberado no app
```

### Segurança, camada por camada

**1. Segredo na URL.** A SyncPay não assina os postbacks: o corpo chega sem
cabeçalho HMAC. O segredo é comparado em tempo constante — um `===` sai no
primeiro caractere diferente, e essa diferença é mensurável pela rede.

**2. Reconferência no gateway.** Segredo em URL vaza: log de proxy, print,
histórico. Por isso ele não é a última palavra. Todo evento de "pago" é
reconferido em `GET /api/partner/v1/transaction/{id}`, por um caminho que o
atacante não controla. Sem confirmação, nada é liberado.

**3. Idempotência no banco.** A SyncPay desiste em 5 segundos e reenvia. Se cada
chegada estendesse o período, uma tentativa repetida daria meses de graça. A
trava está na transição dentro do Postgres (`apply_paid_payment`), onde conferir
e escrever são a mesma instrução — verificar na aplicação deixaria dois
postbacks simultâneos passarem pelos dois.

**4. Auditoria.** Todo postback é gravado em `payment_events` como chegou,
aceito ou recusado. Uma sequência de recusas é o sinal de que a URL vazou.

**5. Segredos fora do log.** O que vai para o log passa por um redator que
oculta `client_secret`, `access_token`, CPF, documento e a URL de postback.

**6. Status desconhecido nunca libera.** Qualquer valor não reconhecido vira
`pending`, jamais `paid`.

A rota responde **200 mesmo quando recusa**, depois de gravar a auditoria:
devolver erro faria a SyncPay reenviar em laço um postback que nunca vai ser
aceito. Só erro *nosso* devolve 500 — esse merece reenvio.

---

## Banco de dados

Migration `supabase/migrations/0005_syncpay.sql`.

| Tabela | Para quê |
|---|---|
| `payments` | Todo pagamento, do pendente ao estornado. O id é a referência enviada à SyncPay |
| `payment_events` | Auditoria bruta dos postbacks, em `jsonb` |
| `subscriptions` | Estado atual do acesso: plano, período, próxima cobrança |

RLS: o tutor **lê** o próprio histórico e a própria assinatura. **Não escreve
nada.** Quem grava é o webhook, com a `service_role`. Sem isso, o app do celular
marcaria o próprio PIX como pago.

Estados: `trialing`, `active`, `processing`, `past_due`, `canceled`,
`incomplete`, `expired`, `refunded`, `failed`.

---

## Arquivos

```
apps/website/src/features/billing/
├── syncpay/
│   ├── config.ts      credenciais, ambiente, URL de postback
│   ├── client.ts      token com cache, tempo limite, 429, redator de log
│   ├── charges.ts     criar cobrança PIX, reconferir transação
│   ├── events.ts      formato do postback e tradução de estados
│   └── events.test.ts
├── subscriptions.ts   escrita com service_role, idempotência
├── actions.ts         checkout (identidade da sessão, preço do catálogo)
├── pricing.ts         planos: mensal, trimestral, semestral, anual
├── payment-methods.ts contrato do gateway
└── environment.ts     rótulo sandbox/produção para a interface

apps/website/src/app/api/webhooks/syncpay/route.ts
apps/website/src/app/(marketing)/assinar/       checkout
apps/website/src/app/(marketing)/assinatura/    estado da assinatura
supabase/migrations/0005_syncpay.sql
```

---

## Passo a passo para entrar em produção

1. Aplicar `supabase/migrations/0005_syncpay.sql` no banco.
2. Preencher `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET` e
   `SYNCPAY_WEBHOOK_SECRET`.
3. Preencher `SUPABASE_SERVICE_ROLE_KEY` **só no servidor**.
4. Conferir `NEXT_PUBLIC_SITE_URL` — é o que monta a URL de postback.
5. Publicar o site (o webhook precisa de um endereço público para ser chamado).
6. Fazer uma assinatura de verdade, com valor real, e conferir:
   - o PIX aparece na tela e o valor bate com o plano;
   - depois de pago, o acesso libera sozinho;
   - reenviar o mesmo postback **não** estende o período de novo.
7. Trocar `SYNCPAY_ENVIRONMENT` para `production`.

⚠️ As credenciais atuais trafegaram por WhatsApp e por chat. **Gere um par novo
no painel antes de abrir vendas** — isso invalida as antigas.
