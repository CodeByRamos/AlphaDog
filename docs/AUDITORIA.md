# Auditoria — o que falta para publicar o AlphaDog

Estado real do projeto contra o que as lojas e a operação comercial exigem.
Escrito depois de ler o código, não de memória.

**Legenda:** 🔴 bloqueia o lançamento · 🟡 bloqueia a cobrança · 🟢 melhora

---

## 1. O que já está pronto e verificado

| Área | Estado |
| --- | --- |
| Autenticação (cadastro, login, sessão persistente) | ✅ Supabase Auth |
| Onboarding do cão (9 campos) | ✅ grava no banco com RLS |
| Biblioteca de exercícios | ✅ 11 comandos em 5 categorias, com passos, erro comum e critério de conclusão |
| Sessão de treino cronometrada | ✅ com permanência, janela de recompensa e gravação real |
| Dashboard, histórico, estatísticas, sequência | ✅ calculados de dados reais |
| HUD de identificação do cão | ✅ mira, varredura, partículas, trava de alvo a 60fps |
| Modelo de visão treinado | ✅ YOLO-pose, 24 keypoints, StanfordExtra |
| Classificador de postura | ✅ aprendido, 1,0% de falso positivo (validação cruzada 5-fold) |
| Decodificação da saída do modelo | ✅ 11 testes unitários |
| Paywall no cliente | ✅ Gate + guarda de deep link |
| Tabela de assinaturas + RLS | ✅ cliente lê, nunca escreve |
| Webhook do gateway | ✅ escrito (Asaas), aguarda credenciais |
| Trava de servidor (migration 0004) | ✅ escrita, **não aplicada** — ver §3 |
| Landing page | ✅ copy de conversão, build verde |
| Preparação iOS/TestFlight | ✅ ver `docs/TESTFLIGHT.md` |
| Testes | ✅ 87 no core, 46 no mobile, 71 em Python |

---

## 2. 🔴 Bloqueia o lançamento nas lojas

### 2.1 In-App Purchase no iOS — decisão de arquitetura
A Apple exige que assinatura de conteúdo digital use o **IAP dela** (comissão
15–30%). Cobrar por PIX ou cartão próprio dentro do app iOS é rejeição certa
(Guideline 3.1.1).

Três caminhos, e é decisão sua:
- **A.** IAP no iOS + Asaas no Android/web. Mais trabalho, receita nas duas lojas.
- **B.** App iOS não vende: o usuário assina no site e faz login no app. Legal,
  mas não pode nem mencionar o site dentro do app iOS.
- **C.** Lançar só Android agora. A Play Store aceita cobrança externa com menos
  atrito, e você valida o produto antes de pagar o preço do IAP.

**Recomendo C para começar** — valida o negócio sem gastar semanas em IAP.

### 2.2 Política de Privacidade pública
URL obrigatória no formulário das duas lojas. O texto existe no site
(`/privacidade`), mas precisa estar publicado e acessível.

### 2.3 Conta de demonstração para o revisor
Sem um login que entre no app **com assinatura ativa**, a revisão é rejeitada
automaticamente — o revisor não consegue passar do paywall.

### 2.4 Privacy Labels / Data Safety
Declarar nas duas lojas: coleta e-mail, dados do cão e fotos; **o vídeo da
câmera não sai do aparelho**. Esse último ponto é um diferencial — declare com
clareza.

### 2.5 Prova social inventada
O site ainda tem números e depoimentos fabricados (`testimonials`, alguns dados
em `comparison`). Publicar como real é propaganda enganosa (CDC/CONAR) e as
lojas rejeitam. Trocar por depoimentos reais ou remover.

### 2.6 Dados da empresa nos textos legais
`[RAZÃO SOCIAL]` e `[CNPJ]` ainda são marcadores em `src/lib/content/legal.ts`.

---

## 3. 🟡 Bloqueia a cobrança

### 3.1 Conta no gateway + credenciais
O webhook está escrito (`supabase/functions/asaas-webhook`). Falta:
1. Conta no [Asaas](https://www.asaas.com) aprovada
2. Chave de API e token do webhook
3. `supabase secrets set ASAAS_WEBHOOK_TOKEN=... `
4. `supabase functions deploy asaas-webhook --no-verify-jwt`
5. Cadastrar a URL do webhook no painel do Asaas

### 3.2 Criação de cobrança no app
O botão "Assinar" hoje avisa que o checkout está em configuração — **não
simula sucesso**, de propósito. Falta a chamada que cria a cobrança no Asaas e
devolve o QR do PIX ou o formulário do cartão. Depende de 3.1.

### 3.3 Aplicar a migration 0004
A trava de servidor está escrita mas **não aplicada**. Enquanto isso, o paywall
é só do cliente: uma chamada direta com a anon key grava sessão sem assinatura.

> Aplique só quando a cobrança estiver no ar (ou depois de liberar sua conta e a
> dos testadores). Aplicar antes tranca todo mundo, inclusive você.

### 3.4 Nota fiscal
Cobrança recorrente de PF/PJ no Brasil exige emissão. O Asaas emite
automaticamente se configurado.

---

## 4. Segurança — estado atual

| Item | Estado |
| --- | --- |
| RLS em todas as tabelas | ✅ política por operação, não `for all` |
| Cliente não escreve em `subscriptions` | ✅ não existe policy de escrita |
| anon key no bundle | ✅ correto — ela identifica, o RLS autoriza |
| service_role fora do app | ✅ só no webhook (servidor) |
| Tokens em AsyncStorage | ✅ padrão do Supabase; sessão persistente e refresh automático |
| Autenticação do webhook | ✅ token no header, 401 sem ele |
| Idempotência do webhook | ✅ upsert por `user_id`; reenvio não duplica |
| Log de auditoria de assinatura | ✅ trigger na migration 0004 |
| Validação de acesso no servidor | 🟡 escrita, não aplicada (3.3) |
| Rate limiting | 🟡 o Supabase aplica no Auth; endpoints próprios não têm |
| Rotação da senha do banco | 🔴 **a senha passou pelo chat e deve ser trocada** |
| Ofuscação / anti-engenharia reversa | 🟢 Hermes já dificulta; ProGuard no release Android |

### 🔴 Ação de segurança imediata
A senha do Postgres foi exposta em conversa. **Troque no painel do Supabase**
(Settings → Database → Reset password). Nenhuma credencial chegou a commit —
verificado.

---

## 5. Qualidade e performance

| Item | Estado |
| --- | --- |
| Monorepo com domínio compartilhado | ✅ `packages/core` sem React nem banco |
| Testes do domínio | ✅ 87 no core |
| Typecheck e lint | ✅ limpos nos dois apps |
| Componentes reutilizáveis | ✅ `Button`, `Card`, `Screen`, `Field`, `OptionCard` |
| Inferência fora da thread de UI | ✅ worklet na thread da câmera |
| Frame skip | ✅ 1 em 3 — economiza bateria sem perder decisão |
| Animações só em transform/opacity | ✅ 60fps na UI thread do Reanimated |
| Cache de queries | ✅ React Query com `staleTime` por tipo de dado |
| Índices no banco | ✅ em `owner_id`, `dog_id`, `status` |
| Skeleton loaders | 🟢 telas usam spinner; skeleton daria percepção melhor |
| Modo offline | 🟢 não implementado — exige estratégia de merge, não é trivial |
| Notificações | 🟢 não implementadas |

---

## 6. O que eu recomendo fazer, em ordem

**Esta semana**
1. Trocar a senha do Supabase (5 min, risco real)
2. Decidir §2.1 — recomendo Android primeiro
3. Publicar a Política de Privacidade
4. Remover a prova social inventada

**Antes de cobrar**
5. Abrir conta no Asaas e me passar as chaves → eu ligo o checkout
6. Aplicar a migration 0004
7. Preencher os dados da empresa nos textos legais

**Antes da loja**
8. Criar conta de demonstração para o revisor
9. Screenshots e descrição
10. Testar em iPhone real (nenhum iOS foi executado ainda)

---

## 7. O que não está feito e eu não fingi que estava

Sendo explícito para você não descobrir na véspera:

- **Checkout real** — o botão avisa que está em configuração; não cobra ninguém
- **IAP da Apple** — nada implementado
- **Renovação automática** — o webhook trata a confirmação, mas o ciclo
  recorrente depende da configuração no Asaas
- **Recibos e histórico de pagamento na UI** — os dados existem no gateway,
  falta a tela
- **Modo offline, notificações, calendário, metas, gamificação** — no
  `ROADMAP.md`, não implementados
- **Nenhum teste em iPhone** — o primeiro build do TestFlight é o primeiro teste
- **FPS da IA em aparelho real** — não medido; o alvo de ≥15 FPS ainda não foi
  verificado em device
