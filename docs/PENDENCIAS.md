# O que você ainda precisa fazer

Estado conferido contra o banco e o repositório em 17/07 — não é de memória.

O código está pronto. O que falta depende de você: um clique no painel, ~30 min
de rotulagem, um treino no Colab e um build no celular.

## Já feito e verificado (não mexa)

| Item | Estado |
| --- | --- |
| Banco + RLS | ✅ testado com a anon key real: anônimo não lê nem escreve (erro 42501) |
| Sua `anon key` | ✅ é `anon`, não `service_role` |
| App mobile completo | ✅ typecheck limpo, 58 testes no core + 46 no mobile |
| Website | ✅ `next build` verde (conferido agora — achei e consertei um `@types/react` duplicado que quebrava) |
| Build do celular | ✅ `eas.json` + deps prontos, `expo-doctor` 18/18 |
| Ícone e splash | ✅ gerados e ligados no `app.json` |
| Dataset Stanford | ✅ 12.538 imagens, 120 raças; labels validados (77 colunas, 24 keypoints) |
| Zip do Colab | ✅ `services/ai/data/yolo.zip` pronto (493 MB, barras corretas p/ Linux) |
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

## 3.1 O zip já está pronto — não precisa compactar
Eu já gerei pra você:
```
services/ai/data/yolo.zip   (~493 MB, 12.538 imagens, 0 caminhos quebrados)
```
> Por que eu mesmo fiz: o `Compress-Archive` e o ZipFile do PowerShell gravam os
> caminhos com barra invertida (`\`), que o Linux do Colab não entende — o
> dataset descompactaria quebrado. Usei o `zipfile` do Python (barra normal).
> Se um dia precisar refazer, rode `services/ai/scripts/zip_dataset.py`, nunca o
> `Compress-Archive`.

## 3.2 Use o **Kaggle**, não o Colab

O Colab grátis não dá conta deste treino. Não foi você — o notebook original
pedia 100 épocas (3–4 h de T4 seguidas), e o Colab grátis desconecta e corta a
cota antes disso.

| | Colab grátis | Kaggle grátis |
| --- | --- | --- |
| GPU | cota curta, já estourada | **30 h por semana** |
| Desconectou | perde tudo | **roda em background no servidor deles** |
| Dataset | re-upload toda vez | sobe **uma vez**, fica salvo |

O botão **Save & Run All** do Kaggle é o que resolve: o notebook roda nos
servidores deles, você **fecha o navegador e desliga o PC**, e ele termina.

### Passo a passo

1. Crie conta em [kaggle.com](https://www.kaggle.com) (grátis) e **verifique o
   telefone** — sem isso a GPU e a internet do notebook ficam bloqueadas.
2. **kaggle.com/datasets → New Dataset** → suba `services/ai/data/yolo.zip`.
   O Kaggle descompacta sozinho. Isso é feito **uma vez só**.
3. **kaggle.com/code → New Notebook → File → Import Notebook** → escolha
   `services/ai/notebooks/train_kaggle.ipynb`.
4. Na barra lateral direita:
   - **Input → Add Input → Datasets** → escolha o dataset que você criou
   - **Accelerator** → `GPU T4 x2`
   - **Internet** → `On`
5. **Save Version → Save & Run All (Commit)**. Feche a aba. Vá dormir.
6. Volte, abra a versão, aba **Output**, baixe o `.tflite`.

### O que mudou no treino (por isso agora termina)
- **`time=3.0`** — teto de 3 horas. O ultralytics para sozinho e salva o melhor
  peso, em vez de estourar a cota no meio do caminho.
- **retomada** — se já existe `last.pt`, continua de onde parou.
- **60 épocas com `patience=10`** — normalmente para antes; fine-tune de uma
  classe converge bem antes das 100 originais.

## 3.3 Guardar o resultado

Baixe o `.tflite` da aba **Output**, renomeie para `dogpose.tflite` e coloque em:
```
apps/mobile/assets/models/dogpose.tflite
```

### Depois me avise
Eu ligo o modelo no app (dep nativa + decode + wiring, testados juntos).

> **Isto não bloqueia sua entrega.** O app funciona sem o modelo — o tutor marca
> o acerto e a sessão conta de verdade. O treino é melhoria, não pré-requisito.

---

# 🔴 4. Development build (Expo Go não funciona)

**Por que:** o modo treino usa Vision Camera com frame processor, que roda
código nativo. O Expo Go não suporta — limitação dele, não nossa.

Já deixei pronto o que não precisa da sua conta: o `eas-cli` está **instalado**
(`eas --version` → 21.0.2) e o `eas.json` já existe com o perfil `development`.
Você começa direto no login:

```powershell
eas login
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
eas build --profile development --platform android
```

Conta grátis em [expo.dev](https://expo.dev). O `eas build:configure` não é mais
necessário — o `eas.json` já está no repo. Fila de 10–30 min. Ao final, um link:
abra no celular e instale o APK.

> Não fiz o `eas login` nem o `eas build` por você: os dois autenticam na sua
> conta Expo, e eu não digito senha nas suas contas. O resto está pronto.

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
