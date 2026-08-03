# SyncPay — integração de pagamentos

Tudo que a camada de pagamento do AlphaDog faz, onde entram as credenciais e
como sair do sandbox.

---

## O que a SyncPay entrega, e o que ela não entrega

Confirmado na documentação oficial (`syncpay.apidog.io`), não suposto:

| Endpoint | O quê |
|---|---|
| `POST /api/partner/v1/auth-token` | Troca `client_id` + `client_secret` por um Bearer token válido por 1 hora |
| `POST /v1/gateway/api` | Cria a cobrança PIX. Devolve `idTransaction`, `paymentCode` (copia-e-cola) e `paymentCodeBase64` (QR) |
| Postback | `POST` no `postbackUrl`, com o corpo embrulhado em `data`. Tempo limite de **5 segundos** |

**O que não existe:** cobrança em cartão e recorrência automática. A API
documentada é cash-in por PIX.

Isso molda o produto, e o código diz isso de frente: **cada PIX confirmado
estende o período de acesso**. A renovação é uma cobrança nova. Não há débito
automático — e a tela de assinatura avisa isso ao tutor, porque é a dúvida
número um de quem paga por PIX.

---

## Onde entram as credenciais

Todas em variáveis de ambiente. **Nenhuma** com prefixo `NEXT_PUBLIC_` — esse
prefixo é o que manda o Next embutir o valor no JavaScript enviado ao navegador.

Pegue em `https://app.syncpayments.com.br/seller/developer-api` e preencha:

```
SYNCPAY_CLIENT_ID="..."
SYNCPAY_CLIENT_SECRET="..."
SYNCPAY_WEBHOOK_SECRET="..."     # openssl rand -hex 32
SUPABASE_SERVICE_ROLE_KEY="..."  # painel do Supabase → API
```

Em desenvolvimento vão no `.env.local`. Em produção, no painel da hospedagem
(Vercel → Settings → Environment Variables). O arquivo `.env.example` é
versionado e serve de modelo — **nunca** coloque valor real nele.

Enquanto `SYNCPAY_CLIENT_ID` e `SYNCPAY_CLIENT_SECRET` estiverem vazios, o site
continua de pé: a tela de assinatura aparece normalmente e o botão responde
"pagamento temporariamente indisponível". Banco, webhook e estados de assinatura
já funcionam.

---

## Sandbox → produção

Uma variável:

```
SYNCPAY_ENVIRONMENT="production"
```

Em `sandbox` (padrão), a tela de assinatura mostra uma tarja avisando que
nenhuma cobrança real será feita. Sem ela, um deploy esquecido em teste faria
alguém achar que pagou.

Se a SyncPay indicar um endereço de API diferente para a sua conta, use
`SYNCPAY_BASE_URL`. O padrão é `https://api.syncpay.pro`.

### Duas confirmações a fazer no sandbox, antes de abrir vendas

**1. A unidade do campo `amount`.** A documentação diz apenas "integer", sem
dizer se são centavos ou reais. Errar isso cobra cem vezes a mais ou a menos.
Gere uma cobrança de R$ 49,90 e confira o valor no painel da SyncPay:

- veio R$ 49,90 → `SYNCPAY_AMOUNT_UNIT="cents"` (padrão, já está certo)
- veio R$ 4.990,00 → mude para `SYNCPAY_AMOUNT_UNIT="reais"`

**2. O caminho de consulta de transação.** Pergunte ao suporte qual endpoint
consulta uma transação pelo id e preencha `SYNCPAY_STATUS_PATH` usando `{id}`
como marcador — por exemplo `/v1/gateway/api/{id}`.

Enquanto ele estiver vazio, **nenhum webhook libera acesso sozinho**: o pagamento
fica em "processamento" à espera de conferência humana. É proposital, e o
porquê está na seção de segurança.

---

## Como o webhook funciona

A SyncPay chama `POST https://SEU_SITE/api/webhooks/syncpay?token=SEGREDO`.
A URL é montada sozinha a partir de `NEXT_PUBLIC_SITE_URL` e
`SYNCPAY_WEBHOOK_SECRET` e enviada em cada cobrança, no campo `postbackUrl` —
não há nada para cadastrar no painel.

O caminho de um pagamento:

```
tutor escolhe o plano
   ↓
registramos o pagamento no banco (status pendente)  ← o id vira a referência externa
   ↓
POST /v1/gateway/api na SyncPay
   ↓
QR + copia-e-cola na tela; a página acompanha o estado
   ↓
tutor paga
   ↓
SyncPay chama o postback
   ↓
1. o segredo da URL confere?            senão → 401, registrado na auditoria
2. o corpo é válido?                    senão → registrado e descartado
3. o gateway confirma o pagamento?      senão → fica "em processamento"
4. o banco aceita a transição?          senão → duplicado, ignorado
   ↓
período estendido, acesso liberado no app
```

### Segurança, camada por camada

**1. Segredo na URL.** A SyncPay não assina os postbacks: o corpo chega sem
cabeçalho HMAC para conferir. O segredo é comparado em tempo constante — um
`===` comum sai no primeiro caractere diferente, e essa diferença de tempo é
mensurável pela rede.

**2. Reconferência no gateway.** Segredo em URL vaza: aparece em log de proxy,
em print, em histórico. Por isso ele não é a última palavra. Todo evento de
"pago" é reconferido direto na API da SyncPay, por um caminho que o atacante não
controla. Sem confirmação, nada é liberado.

**3. Idempotência no banco.** A SyncPay desiste em 5 segundos e reenvia. Se cada
chegada estendesse o período, uma tentativa repetida daria meses de graça. A
trava está na transição de estado dentro do Postgres (`apply_paid_payment`),
onde conferir e escrever são a mesma instrução — verificar na aplicação
deixaria dois postbacks simultâneos passarem pelos dois.

**4. Auditoria.** Todo postback é gravado em `payment_events` como chegou,
aceito ou recusado. Uma sequência de recusas é o sinal de que a URL vazou.

**5. Segredos fora do log.** O que vai para o log passa por um redator que
substitui `client_secret`, `access_token`, CPF, documento e a URL de postback.

A rota responde **200 mesmo quando recusa** o evento, depois de gravar a
auditoria: devolver erro faria a SyncPay reenviar em laço um postback que nunca
vai ser aceito. Só erro *nosso* devolve 500 — esse merece reenvio.

---

## Banco de dados

Migration `supabase/migrations/0005_syncpay.sql`.

| Tabela | Para quê |
|---|---|
| `payments` | Todo pagamento, do pendente ao estornado. O id é a referência enviada à SyncPay |
| `payment_events` | Auditoria bruta dos postbacks, com o corpo em `jsonb` |
| `subscriptions` | Estado atual do acesso: plano, período, próxima cobrança |

RLS: o tutor **lê** o próprio histórico e a própria assinatura. **Não escreve
nada.** Quem grava é o webhook, com a `service_role`. Sem isso, o app do celular
marcaria o próprio PIX como pago.

Estados da assinatura: `trialing`, `active`, `processing`, `past_due`,
`canceled`, `incomplete`, `expired`, `refunded`, `failed`.

---

## Arquivos

```
apps/website/src/features/billing/
├── syncpay/
│   ├── config.ts      credenciais, ambiente, URL de postback
│   ├── client.ts      token com cache, tempo limite, redator de log
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
5. Sandbox: gerar uma cobrança e confirmar a unidade de `amount`.
6. Perguntar o caminho de consulta e preencher `SYNCPAY_STATUS_PATH`.
7. Sandbox: pagar e conferir que o acesso libera; reenviar o mesmo postback e
   conferir que o período **não** estende de novo.
8. Trocar `SYNCPAY_ENVIRONMENT` para `production`.
