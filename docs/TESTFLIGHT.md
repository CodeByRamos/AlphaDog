# Distribuir o AlphaDog no TestFlight

Guia para a primeira publicação iOS. Escrito assumindo que você nunca publicou
um app na Apple.

---

## O que já está pronto no código

| Item | Estado |
| --- | --- |
| Bundle Identifier (`com.alphadog.app`) | ✅ configurado |
| Build number e versão | ✅ `buildNumber: 1`, versão 0.1.0; o EAS incrementa sozinho |
| Ícone e splash | ✅ gerados da marca |
| Permissão de câmera + texto | ✅ com explicação em português |
| Permissão de fotos + texto | ✅ |
| Microfone | ✅ **removido** — o app não grava áudio, e pedir permissão sem uso é motivo de rejeição |
| Declaração de criptografia | ✅ `ITSAppUsesNonExemptEncryption: false` (evita um formulário a cada build) |
| Privacy Manifest | ✅ declara o uso de UserDefaults (exigido pela Apple desde 2024) |
| Perfil de build iOS | ✅ `production` no `eas.json` |
| Delegate de IA por plataforma | ✅ Core ML no iPhone, GPU no Android |
| Orientação, Safe Areas, Dark Mode | ✅ retrato travado; o app é escuro por design |

## O que depende de você (conta Apple)

Nada disso dá para eu fazer — exige login na sua conta e pagamento.

| # | Item | Onde |
| --- | --- | --- |
| 1 | **Apple Developer Program** — US$ 99/ano | [developer.apple.com/programs](https://developer.apple.com/programs/) |
| 2 | App ID / Bundle ID `com.alphadog.app` | O EAS cria sozinho no primeiro build |
| 3 | Certificados e provisioning profiles | O EAS cria sozinho (responda "yes") |
| 4 | Registro do app no App Store Connect | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) |
| 5 | `ascAppId` e `appleTeamId` no `eas.json` | Ver passo 2 abaixo |

> ⚠️ A assinatura leva de algumas horas a ~2 dias para ser aprovada pela Apple.
> Se o prazo é curto, **comece por aqui**.

---

## Passo 1 — Criar o app no App Store Connect

1. Entre em [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Meus Apps** → **+** → **Novo App**
3. Preencha:
   - **Plataforma:** iOS
   - **Nome:** AlphaDog *(precisa ser único na App Store; se der conflito, use "AlphaDog — Adestramento")*
   - **Idioma principal:** Português (Brasil)
   - **Bundle ID:** `com.alphadog.app` *(aparece na lista depois do primeiro build; se ainda não aparecer, faça o passo 3 antes e volte aqui)*
   - **SKU:** `alphadog-001` (identificador interno, você escolhe)
4. **Criar**

## Passo 2 — Pegar os dois identificadores

**`ascAppId`:** no App Store Connect, abra o app → **Informações do app** → role até
**Apple ID** (um número de 10 dígitos).

**`appleTeamId`:** em [developer.apple.com/account](https://developer.apple.com/account) →
**Membership** → **Team ID** (10 caracteres, letras e números).

Abra `apps/mobile/eas.json` e substitua:

```json
"ios": {
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDE12345"
}
```

## Passo 3 — Gerar o build

```bash
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
```
```bash
eas build --profile production --platform ios
```

O que ele pergunta e como responder:

| Pergunta | Resposta |
| --- | --- |
| *Log in to your Apple account* | seu Apple ID e senha |
| *Generate a new Apple Distribution Certificate?* | **Yes** |
| *Generate a new Apple Provisioning Profile?* | **Yes** |
| *Would you like to set up Push Notifications?* | **No** (não usamos) |

O EAS cria e guarda certificados e perfis na sua conta Expo — **você não precisa
entender nem gerenciar isso**, e nos próximos builds ele reaproveita.

Fila de 20–40 min. Não precisa ficar olhando.

## Passo 4 — Enviar para o App Store Connect

```bash
eas submit --profile production --platform ios --latest
```

`--latest` pega o build mais recente automaticamente. Leva ~10 min.

> Se pedir uma **senha específica do app**: gere em
> [appleid.apple.com](https://appleid.apple.com) → **Segurança** → **Senhas
> específicas do app**. Não é a senha normal do seu Apple ID.

## Passo 5 — Liberar no TestFlight

1. App Store Connect → seu app → aba **TestFlight**
2. O build aparece como **"Processando"** (10–30 min). Espere ficar **"Pronto para testar"**
3. Se aparecer **"Informações de conformidade de exportação ausentes"**, clique e
   responda **Não** para uso de criptografia não isenta *(já declaramos isso no
   `app.json`, mas às vezes ele pergunta de novo no primeiro build)*

## Passo 6 — Convidar seus sócios

**Testadores internos** (até 100 pessoas, sem revisão da Apple — libera na hora):

1. TestFlight → **Testadores internos** → **+**
2. Adicione o e-mail de cada sócio
   - ⚠️ O e-mail precisa estar cadastrado como **usuário** em **Usuários e Acesso**
     do App Store Connect. Adicione lá primeiro (papel "Desenvolvedor" basta).
3. Selecione o build → **Salvar**

Cada sócio recebe um e-mail, instala o app **TestFlight** da App Store, e o
AlphaDog aparece lá para instalar.

> **Testadores externos** (até 10.000, mas passa por revisão da Apple de 1–2 dias)
> só compensam se você for além dos sócios.

## Passo 7 — Atualizações futuras

Depois da primeira vez, publicar uma versão nova é isto:

```bash
eas build --profile production --platform ios
```
```bash
eas submit --profile production --platform ios --latest
```

O `autoIncrement` cuida do número do build. Certificados e perfis já estão
salvos. Os testadores recebem a atualização sozinhos.

---

## O que seus sócios vão conseguir testar

| Funciona | Observação |
| --- | --- |
| Cadastro, login, sessão | ✅ |
| Onboarding do cão | ✅ |
| Dashboard, sequência, estatísticas | ✅ |
| Biblioteca de 11 exercícios | ✅ |
| Sessão de treino cronometrada | ✅ |
| Histórico e perfil | ✅ |
| HUD de identificação do cão | ✅ |
| Reconhecimento de postura por IA | ✅ se o `.tflite` estiver no build |
| **Assinatura** | ⚠️ **ver aviso abaixo** |

### ⚠️ Aviso importante sobre o paywall

O app hoje bloqueia o acesso sem assinatura ativa, e o checkout **ainda não está
ligado** a um gateway. Para os sócios testarem, escolha um destes:

**Opção A — liberar as contas deles (recomendado para teste):**
No SQL Editor do Supabase, para cada e-mail:
```sql
insert into public.subscriptions (user_id, status, plan_id, current_period_end)
select id, 'active', 'trimestral', now() + interval '1 year'
from auth.users where email = 'email-do-socio@exemplo.com'
on conflict (user_id) do update
  set status = 'active', current_period_end = excluded.current_period_end;
```

**Opção B — desligar o paywall no build de teste.** Me avise se preferir isso.

> 🚨 **Regra da Apple:** se o app vende assinatura, o pagamento de conteúdo
> digital **precisa** usar o In-App Purchase da Apple (comissão de 15–30%).
> Cobrar por PIX ou cartão próprio dentro do app iOS é motivo de **rejeição**
> (Guideline 3.1.1). Isso não afeta o TestFlight nem o Android — mas afeta a
> publicação final na App Store. Vale decidir cedo: ou IAP no iOS, ou o app iOS
> não vende assinatura por dentro.

---

## Auditoria — o que ainda falta para a App Store

Para o **TestFlight com os sócios**, nada disso bloqueia. Para a **publicação
pública**, tudo isto é obrigatório:

### Bloqueia a publicação
- [ ] **In-App Purchase** no iOS (ou remover a venda de dentro do app) — Guideline 3.1.1
- [ ] **Política de Privacidade** numa URL pública (obrigatória no formulário da App Store)
- [ ] **Privacy Nutrition Label** no App Store Connect: declarar que coleta e-mail,
      dados do cão e fotos, e que o **vídeo da câmera não sai do aparelho**
- [ ] **Conta de demonstração** para o revisor da Apple (login e senha que
      entrem no app com assinatura ativa) — sem isso a revisão é rejeitada
- [ ] **Screenshots** 6,7" e 6,5" e descrição da loja

### Recomendado antes de vender
- [ ] Gateway de pagamento ligado (Android/web) com webhooks
- [ ] Prova social real no site (os números atuais são placeholders)
- [ ] Dados da empresa nos textos legais (`[RAZÃO SOCIAL]`, `[CNPJ]`)
- [ ] Revisão jurídica dos termos (CDC + LGPD)
- [ ] Teste em iPhone real: FPS da câmera com o modelo rodando

### Compatibilidade iOS — verificado
- ✅ Todas as dependências nativas suportam iOS (Vision Camera, fast-tflite via
      Core ML, Nitro, Skia, Reanimated)
- ✅ Delegate de IA escolhido por plataforma
- ✅ Safe Areas tratadas em todas as telas (`Screen` centraliza os insets)
- ✅ Orientação retrato travada
- ✅ App é escuro por design — sem quebra em Dark Mode
- ⚠️ **Não testado em iPhone físico.** Nenhum iOS foi executado ainda; o
      primeiro build do TestFlight é o primeiro teste real.
