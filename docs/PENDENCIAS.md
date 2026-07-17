# O que você ainda precisa fazer

Estado conferido contra o banco e o repositório em 17/07 — não é de memória.

O código está pronto. O que falta depende de você: um clique no painel, ~30 min
de rotulagem, um treino no Colab e um build no celular.

## Já feito e verificado (não mexa)

| Item | Estado |
| --- | --- |
| Banco + RLS | ✅ testado com a anon key real: anônimo não lê nem escreve (erro 42501) |
| Sua `anon key` | ✅ é `anon`, não `service_role` |
| App mobile completo | ✅ typecheck limpo, 58 testes no core |
| Website | ✅ buildando |
| Ícone e splash | ✅ gerados |
| Dataset Stanford | ✅ 12.538 imagens convertidas, 120 raças, zero puladas |
| Rótulos de postura | ✅ **234 rótulos** — o Claude rotulou olhando cada foto; gate `pronto` |

**Legenda:** 🔴 bloqueia · 🟡 trava só uma parte · 🟢 melhora

---

# 🔴 1. Desligar "Confirm email"

**Rodei o teste agora e ele ainda falha aqui:**

```
ok    cadastro funciona
FALHA sessão criada no cadastro  (confirm email ligado?)
```

O Supabase cria o usuário mas **não devolve sessão** enquanto o e-mail não for
confirmado. Sem isso o app abre na tela "Confirme seu e-mail" em vez de entrar.
Você já tentou; quase sempre é o botão **Save** que falta.

### Onde
[supabase.com/dashboard](https://supabase.com/dashboard) → projeto AlphaDog

### Passo a passo
1. Menu lateral → **Authentication**
2. Aba **Sign In / Providers**
3. Clique em **Email** para expandir
4. Desligue **Confirm email**
5. **Save** no rodapé ← este é o passo que escapa

### Validar
```powershell
cd C:\Users\Ramos\Documents\AlphaDog
node scripts\db-smoke.mjs
```
Tem que terminar em **`RLS OK`**. Se ainda falhar em "sessão criada", não salvou.

### Depende disto
`apps/mobile/src/state/auth.tsx`

> ⚠️ Religue antes de lançar. Sem confirmação, qualquer um cria conta com o
> e-mail de outra pessoa. O app já trata os dois casos.

---

# ✅ 2. Rotulagem de postura — FEITA (não precisa mexer)

Você pediu pra eu rodar. Rodei: **234 fotos rotuladas**, olhando cada uma —
41 sentado, 113 em pé, 54 deitado, 26 outro. O gate agora responde `pronto`.
Está commitado (`services/ai/data/posture_labels.json`).

**Isso eu podia fazer de verdade** — é só olhar a foto e dizer se o cão está
sentado. Não é fingir que a câmera vê (isso eu nunca faço). Marquei "outro"
sempre que fiquei em dúvida, pra não sujar o conjunto com rótulo errado.

Se um dia quiser mais rótulos (pra produção, de preferência com vira-lata
brasileiro), o rotulador web ainda está lá:
```powershell
cd C:\Users\Ramos\Documents\AlphaDog\services\ai
.\.venv\Scripts\python.exe scripts\label_postures.py
```

---

# 🔴 3. Treinar no Colab (2–4h, quase tudo espera)

O ambiente você já configurou. Agora é rodar.

## 3.1 Compactar o dataset
```powershell
cd C:\Users\Ramos\Documents\AlphaDog\services\ai\data
Compress-Archive -Path yolo -DestinationPath yolo.zip
```
Dá ~800 MB.

## 3.2 Subir para o Drive
Coloque `yolo.zip` na raiz do seu Google Drive. **Não** faça upload direto no
Colab — arquivo desse tamanho cai no meio.

## 3.3 Rodar o notebook
1. [colab.research.google.com](https://colab.research.google.com)
2. **Arquivo → Fazer upload de notebook**
3. Escolha `services/ai/notebooks/train_colab.ipynb`
4. **Ambiente de execução → Alterar o tipo → T4 GPU → Salvar**
5. Rode as células em ordem

A primeira célula **para** se não houver GPU — de propósito. Em CPU levaria dias.

## 3.4 Guardar o resultado
A última célula salva no Drive. **Não pule** — o Colab apaga tudo ao
desconectar, e você não vai querer treinar de novo.

Baixe o `.tflite` e coloque **exatamente** em:
```
apps/mobile/assets/models/dogpose.tflite
```

### Depois me avise
Ligar o modelo no app é **uma linha** em `apps/mobile/src/vision/useDetector.ts`.
Eu faço.

---

# 🔴 4. Development build (Expo Go não funciona)

**Por que:** o modo treino usa Vision Camera com frame processor, que roda
código nativo. O Expo Go não suporta — limitação dele, não nossa.

### Passo a passo
```powershell
npm install -g eas-cli
eas login
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
eas build:configure
eas build --profile development --platform android
```

Conta grátis em [expo.dev](https://expo.dev). Fila de 10–30 min. Ao final, um
link: abra no celular e instale o APK.

### Para rodar depois
```powershell
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
pnpm start
```
Abra **o app instalado** (não o Expo Go) e escaneie o QR.

> Se der "pnpm não reconhecido": abra o terminal como **este** (o PATH do pnpm
> está em `C:\Users\Ramos\AppData\Roaming\npm`). Ou use `npx pnpm start`.

---

# 🟡 5. Celular Android intermediário

Emulador não tem câmera real e usa a CPU do PC — o FPS medido seria mentira.

Use Moto G, Samsung A, Redmi. **Não use seu melhor aparelho**: se só rodar no
top de linha, não roda para a maioria dos seus clientes.

Ative **Opções do desenvolvedor** → **Depuração USB**.

---

# 🟢 6. Antes de lançar de verdade

Não bloqueia o desenvolvimento, mas bloqueia a operação comercial. Está no
`docs/PENDENCIAS.md` original com detalhe:

- **Prova social inventada** no site (números e depoimentos) — trocar ou remover
- **Dados da empresa** (`[RAZÃO SOCIAL]`, `[CNPJ]`) nos textos legais
- **Revisão jurídica** dos termos (CDC + LGPD)
- **Foto de cães** no hero do site (hoje é placeholder)
- **Stripe** (só quando for cobrar)

---

# Sua lista

- [ ] 🔴 Desligar Confirm email **e clicar Save** → validar com `db-smoke.mjs`
- [x] ✅ ~~Rotular postura~~ — feito pelo Claude, 234 rótulos, gate `pronto`
- [ ] 🔴 Compactar `data/yolo`, subir no Drive, rodar o notebook
- [ ] 🔴 Baixar o `.tflite` para `apps/mobile/assets/models/` e me avisar
- [ ] 🔴 Gerar o development build (EAS)
- [ ] 🟡 Android intermediário com depuração USB
- [ ] 🟢 Prova social, dados da empresa, jurídico, fotos (antes de lançar)

---

## O que o app faz hoje — sem o modelo

Tudo funciona de verdade, inclusive o treino:

| Fluxo | Estado |
| --- | --- |
| Criar conta / entrar | Real, sessão persistente |
| Onboarding (9 campos) | Real, salva no banco |
| Dashboard | Real: progresso, sequência, semana, recomendação |
| Treinos com passos | Real |
| Abrir câmera | Real |
| Modo treino | **Real** — o tutor toca "Ele acertou", a sessão conta e grava |
| Feedback automático da IA | Só quando o `.tflite` chegar |
| Histórico | Real, calculado das sessões |
| Perfil + foto | Real, upload para o Storage |

### Por que o botão manual, e não IA simulada

O modelo ainda não existe. Em vez de sortear postura e fingir que a câmera vê, o
tutor marca o acerto — e a sessão conta de verdade.

Um "Excelente!" automático sem o cão ter sentado ensinaria o tutor a recompensar
o comportamento errado, e o app passaria a **piorar** o treino. Então a IA só
fala quando souber. Até lá, quem julga é quem está vendo o cão.

Quando o `.tflite` entrar, o botão manual continua útil — a pata sai do quadro, o
cão fica de costas. O app registra os dois separados (`manualCount`).

## Travou?

Me manda o **comando** e a **mensagem de erro inteira**. Quase todo erro aqui é
caminho de arquivo, PATH ou chave trocada.
