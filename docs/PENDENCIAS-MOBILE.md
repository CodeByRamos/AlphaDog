# Pendências do app mobile

O que só você pode fazer. Ordenado por urgência — de cima para baixo.

Já resolvido por mim (não precisa fazer nada): banco migrado, tabelas criadas,
RLS ligado e verificado, bucket de fotos privado, `.env.local` do site corrigido.

---

# 🔴 1. Chaves públicas do Supabase

**Por quê:** o app precisa saber com qual projeto falar. Tentei pegar sozinho e o
sistema bloqueou — raspar credencial de painel exige sua aprovação explícita, e
com razão.

**Tempo:** 2 minutos.

### Passo a passo

1. Abra [supabase.com/dashboard](https://supabase.com/dashboard) → projeto AlphaDog.
2. Menu lateral → **Settings** (engrenagem) → **API Keys**.
3. Copie os dois valores:

   | Campo no painel | Como se parece |
   | --- | --- |
   | **Project URL** | `https://yvapwrhfncipedznhygv.supabase.co` |
   | **anon** / **publishable** | `eyJhbGci...` (longo) ou `sb_publishable_...` |

4. Crie o arquivo **`apps/mobile/.env`** e cole:

```bash
EXPO_PUBLIC_SUPABASE_URL="https://yvapwrhfncipedznhygv.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="cole-a-anon-key-aqui"
```

### ⚠️ Nunca copie a `service_role`

No mesmo painel existe uma chave **`service_role`**. Ela **ignora o RLS** — quem
tiver ela lê e apaga os dados de todos os usuários.

- A **anon key** pode ir no app. Ela só identifica o projeto; quem autoriza é o
  RLS, que roda no banco. Mesmo extraída do APK, só faz o que a política permite.
- A **service_role** nunca entra em app nenhum. Ela é de servidor.

Se colar a errada, o app funciona igual — e é justamente por isso que é
perigoso: você não perceberia.

### Como validar

Depois do item 3 (build), rode o app. Se as chaves estiverem erradas, ele falha
no boot com a mensagem "Supabase não configurado" — falha de propósito, para
você não descobrir só na primeira query.

**Arquivos que dependem disto:** `apps/mobile/src/lib/supabase.ts`

---

# 🔴 2. Ligar o login por e-mail

**Por quê:** por padrão o Supabase exige confirmação de e-mail. Para testar o
MVP rápido, desligue — depois religue antes de ir ao ar.

**Tempo:** 1 minuto.

1. Painel → **Authentication** → **Sign In / Providers**.
2. Confirme que **Email** está ligado.
3. **Desligue** "Confirm email" enquanto estiver desenvolvendo.

> Antes de lançar, religue. Sem confirmação, qualquer um cria conta com o e-mail
> de outra pessoa.

---

# 🔴 3. Development build (Expo Go não serve)

**Por quê:** o modo treino usa Vision Camera com *frame processor*, que roda
código nativo. **O Expo Go não suporta isso** — não é limitação nossa, é do Expo
Go. Precisa de um build próprio.

**Tempo:** 20 min de espera (o build roda na nuvem).

### Passo a passo

```powershell
npm install -g eas-cli
eas login
cd apps\mobile
eas build:configure
eas build --profile development --platform android
```

Ao final o EAS dá um link. Abra no celular, instale o APK.

Depois, para rodar:

```powershell
cd apps\mobile
pnpm start
```

Abra o app instalado (não o Expo Go) e escaneie o QR.

### Conta EAS

O build precisa de conta Expo (gratuita) em [expo.dev](https://expo.dev). O
tier grátis tem fila — pode levar 10–30 min.

---

# 🟡 4. Celular Android físico

**Por quê:** emulador não tem câmera de verdade e a CPU é a do PC. O FPS medido
seria mentira.

**O que serve:** Moto G, Samsung A-series, Redmi. **Não use seu melhor
aparelho** — se só funcionar no top de linha, não funciona para seus clientes.

Ative **Opções do desenvolvedor** → **Depuração USB**.

---

# 🟡 5. Imagens do Stanford Dogs

Você disse que estão baixando. Quando terminar:

1. Extraia em `services/ai/data/stanford_dogs/Images/`
2. Deve virar uma pasta por raça (`n02085620-Chihuahua`, etc).
3. Rode:

```powershell
cd services\ai
.\.venv\Scripts\python.exe scripts\prepare_dataset.py --json data\StanfordExtra_v12.json --images data\stanford_dogs\Images --out data\yolo
```

Seguro: não baixa nada, valida os caminhos, falha alto se estiver errado.

Me avise quando aparecer `escritos: N treino, M validação`.

---

# Resumo

- [ ] 🔴 Copiar Project URL + anon key para `apps/mobile/.env`
- [ ] 🔴 **NÃO** copiar a service_role
- [ ] 🔴 Desligar "Confirm email" no painel (religar antes de lançar)
- [ ] 🔴 Gerar development build com EAS
- [ ] 🟡 Separar um Android intermediário
- [ ] 🟡 Extrair as imagens e rodar `prepare_dataset.py`

---

## O modelo de IA

Ele **ainda não existe** — depende do dataset (item 5) e do treino no Colab.

O app está construído com o detector atrás de uma interface: quando o `.tflite`
sair do treino, ele encaixa sem mexer em tela nenhuma. Enquanto isso, o modo
treino não tem como dar feedback real de visão — e eu prefiro dizer isso do que
simular.

## Travou?

Me manda **o comando** e **a mensagem de erro inteira**. Quase todo erro aqui é
caminho de arquivo ou chave trocada.
