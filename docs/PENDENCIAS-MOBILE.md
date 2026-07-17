# Pendências do app mobile

O app está **completo e commitado**. Falta rodar num celular.

Já verificado por mim contra o banco real (não precisa fazer nada):

| | Status |
| --- | --- |
| Sua `anon key` | ✅ correta (`role: anon`, não service_role) |
| Tabelas + RLS | ✅ 2 tabelas, 7 políticas, bucket privado |
| RLS de verdade | ✅ anônimo não lê nem escreve (erro 42501) |
| Insert de sessão em cão alheio | ✅ bloqueado |
| Website | ✅ buildando |
| Testes | ✅ 97 passando |

---

# 🔴 1. "Confirm email" ainda está ligado

**Isto é o único item que ainda bloqueia.** Rodei o teste contra seu banco e ele
falhou exatamente aqui:

```
ok    cadastro funciona
FALHA sessão criada no cadastro  (confirm email ligado?)
```

O Supabase cria o usuário mas **não devolve sessão** enquanto o e-mail não for
confirmado. Você disse que desligou — o banco discorda. Provavelmente não salvou.

### Passo a passo

1. [supabase.com/dashboard](https://supabase.com/dashboard) → projeto AlphaDog.
2. Menu lateral → **Authentication**.
3. **Sign In / Providers** (ou **Providers**).
4. Clique em **Email** para expandir.
5. Desligue **Confirm email**.
6. **Save** no rodapé do painel. ⚠️ É esse botão que costuma passar batido.

### Como validar

```powershell
cd C:\Users\Ramos\Documents\AlphaDog
node scripts/db-smoke.mjs
```

Tem que terminar com **`RLS OK`**. Se ainda falhar em "sessão criada", não salvou.

> **Antes de lançar, religue.** Sem confirmação, qualquer um cria conta com o
> e-mail de outra pessoa. O app já trata os dois casos — com confirmação ligada
> ele mostra "Confirme seu e-mail" em vez de travar.

**Arquivo que depende disto:** `apps/mobile/src/state/auth.tsx`

---

# 🔴 2. Development build (Expo Go não funciona)

**Por quê:** o modo treino usa Vision Camera, que roda código nativo. O Expo Go
não suporta — limitação dele, não nossa.

**Tempo:** ~20 min, quase tudo espera.

```powershell
npm install -g eas-cli
eas login
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
eas build:configure
eas build --profile development --platform android
```

Ao final o EAS dá um link. Abra no celular e instale o APK.

Depois, para rodar:

```powershell
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
pnpm start
```

Abra **o app instalado** (não o Expo Go) e escaneie o QR.

### Conta EAS

Grátis em [expo.dev](https://expo.dev). O tier gratuito tem fila — 10 a 30 min.

---

# 🟡 3. Celular Android físico

Emulador não tem câmera real e usa a CPU do PC. Ative **Opções do
desenvolvedor** → **Depuração USB**.

Use um aparelho **intermediário** (Moto G, Samsung A, Redmi). Se só funcionar no
top de linha, não funciona para seus clientes.

---

# 🟡 4. Imagens do Stanford Dogs

Quando o download terminar:

1. Extraia em `services/ai/data/stanford_dogs/Images/`
2. Confira que virou uma pasta por raça (`n02085620-Chihuahua`, etc).
3. Rode:

```powershell
cd C:\Users\Ramos\Documents\AlphaDog\services\ai
.\.venv\Scripts\python.exe scripts\prepare_dataset.py --json data\StanfordExtra_v12.json --images data\stanford_dogs\Images --out data\yolo
```

Seguro: não baixa nada, valida os caminhos, falha alto se estiver errado.

Espere ver `escritos: N treino, M validação`. Me avise.

---

# Resumo

- [ ] 🔴 Desligar **Confirm email** e clicar **Save**
- [ ] 🔴 Validar com `node scripts/db-smoke.mjs` (tem que dar `RLS OK`)
- [ ] 🔴 Gerar o development build com EAS
- [ ] 🟡 Ativar depuração USB num Android intermediário
- [ ] 🟡 Extrair as imagens e rodar `prepare_dataset.py`

---

## O que o app faz hoje

Tudo, menos ver o cão:

| Fluxo | Estado |
| --- | --- |
| Criar conta / entrar | Real, Supabase, sessão persistente |
| Onboarding (9 campos) | Real, salva no banco |
| Dashboard | Real: progresso, sequência, semana, recomendação |
| Catálogo de treinos | Real, com passos de adestramento |
| Abrir câmera | Real |
| **Feedback da IA** | **Sem modelo — ver abaixo** |
| Encerrar sessão | Real, grava no banco |
| Histórico | Real, calculado das sessões |
| Perfil + foto | Real, upload para o Storage |

## Sobre o feedback da IA

**O modelo não existe ainda** — depende do dataset (item 4) e do treino no Colab.

A tela de treino **não simula detecção**. Ela abre a câmera, mostra os passos e
avisa que o feedback automático vem em breve.

Escrever um detector falso seria trivial e faria a demo parecer pronta. Não fiz
de propósito: um "Excelente!" sem o cão ter sentado ensina o tutor a recompensar
o comportamento errado — o app passaria a **piorar** o treino do cão em vez de
melhorar. É o único lugar do produto onde parecer pronto é pior que admitir que
falta.

Quando o `.tflite` sair do treino, é **uma linha** em
`apps/mobile/src/vision/useDetector.ts`. Nenhuma tela muda.

## Travou?

Me manda o **comando** e a **mensagem de erro inteira**.
