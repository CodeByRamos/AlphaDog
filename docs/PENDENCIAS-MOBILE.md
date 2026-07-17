# O que falta — passo a passo

O código está completo. O que resta depende de você: um celular, 30 minutos de
rotulagem e um treino no Colab.

## Já feito e verificado (não mexa)

| | |
| --- | --- |
| Banco + RLS | ✅ testado com a anon key real: anônimo não lê nem escreve |
| Sua `anon key` | ✅ é `anon`, não `service_role` |
| App mobile | ✅ completo, typecheck limpo |
| Website | ✅ buildando |
| Dataset Stanford | ✅ **12.538 imagens convertidas, 120 raças, zero puladas** |
| Testes | ✅ 168 (71 Python + 51 core + 46 mobile) |

---

# 🔴 1. "Confirm email" — ainda ligado

Rodei o teste contra seu banco agora:

```
ok    cadastro funciona
FALHA sessão criada no cadastro  (confirm email ligado?)
```

Você disse que desligou; o banco discorda. Quase sempre é o botão **Save** que
falta.

1. [supabase.com/dashboard](https://supabase.com/dashboard) → AlphaDog
2. **Authentication** → **Sign In / Providers**
3. Clique em **Email** para expandir
4. Desligue **Confirm email**
5. **Save** no rodapé ← este é o passo que costuma escapar

**Validar:**
```powershell
cd C:\Users\Ramos\Documents\AlphaDog
node scripts/db-smoke.mjs
```
Tem que terminar em **`RLS OK`**.

> Religue antes de lançar. Sem confirmação, qualquer um cria conta com o e-mail
> de outra pessoa. O app já trata os dois casos.

---

# 🔴 2. Rotular 180 fotos (~30 min)

**Por que precisa:** o StanfordExtra tem os keypoints (onde está cada pata) mas
**não diz se o cão está sentado**. Sem esse rótulo, o gate não tem como medir se
o modelo acerta a decisão do produto — e sem veredito o modelo não entra no app.

```powershell
cd C:\Users\Ramos\Documents\AlphaDog\services\ai
.\.venv\Scripts\python.exe scripts\label_postures.py
```

Abre no navegador sozinho. Para cada foto:

| Tecla | Rótulo | Quando |
| --- | --- | --- |
| **1** | Sentado | bumbum no chão, tronco erguido |
| **2** | Em pé | as quatro patas no chão, tronco horizontal |
| **3** | Deitado | barriga ou lateral no chão |
| **4** | Outro | correndo, pulando, de costas, não dá pra dizer |
| **espaço** | Pular | foto ruim demais |

**Meta: 60 de cada** (sentado, em pé, deitado). O contador no topo mostra o
progresso. Salva a cada clique — pode fechar e voltar.

### Use o "Outro" sem medo

Cão correndo não é nenhuma das três. Forçar um rótulo cria dado errado no
conjunto que vai julgar o modelo — pior que ter menos amostras.

### Por que só 60 por classe

O gate **mede** decisão, não treina. O modelo já aprendeu pose com as 12 mil.
Com menos de 60, um único erro vale mais de 2 pontos percentuais — e o critério
de falso positivo é exatamente 2%. Abaixo disso, o gate não distingue sinal de
ruído.

---

# 🔴 3. Treinar no Colab (2–4h, quase tudo espera)

## 3.1 Compactar o dataset

```powershell
cd C:\Users\Ramos\Documents\AlphaDog\services\ai\data
Compress-Archive -Path yolo -DestinationPath yolo.zip
```

Dá ~800 MB.

## 3.2 Subir para o Drive

Coloque o `yolo.zip` na raiz do seu Google Drive. **Não** faça upload direto no
Colab — arquivo desse tamanho cai no meio.

## 3.3 Rodar

1. Abra [colab.research.google.com](https://colab.research.google.com)
2. **Arquivo → Fazer upload de notebook**
3. Escolha `services/ai/notebooks/train_colab.ipynb`
4. **Ambiente de execução → Alterar o tipo → T4 GPU → Salvar**
5. Rode as células em ordem

A primeira célula **para** se não houver GPU — de propósito. Em CPU levaria dias.

## 3.4 Guardar o resultado

A última célula salva no Drive. **Não pule** — o Colab apaga tudo ao
desconectar, e você não vai querer treinar de novo.

Baixe o `.tflite` e coloque em:

```
apps/mobile/assets/models/dogpose.tflite
```

Me avise que eu ligo no app — é uma linha em `useDetector.ts`.

---

# 🔴 4. Development build (Expo Go não roda)

O modo treino usa Vision Camera com frame processor, que exige código nativo. O
Expo Go não suporta — limitação dele.

```powershell
npm install -g eas-cli
eas login
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
eas build:configure
eas build --profile development --platform android
```

Conta grátis em [expo.dev](https://expo.dev). Fila de 10–30 min. Ao final, um
link: abra no celular e instale o APK.

Para rodar:
```powershell
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
pnpm start
```
Abra **o app instalado** (não o Expo Go) e escaneie o QR.

---

# 🟡 5. Celular Android intermediário

Emulador não tem câmera real e usa a CPU do PC — o FPS medido seria mentira.

Use Moto G, Samsung A, Redmi. **Não use seu melhor aparelho**: se só funcionar
no top de linha, não funciona para a maioria dos seus clientes.

Ative **Opções do desenvolvedor** → **Depuração USB**.

---

# Sua lista

- [ ] 🔴 Desligar Confirm email **e clicar Save**
- [ ] 🔴 Validar: `node scripts/db-smoke.mjs` → `RLS OK`
- [ ] 🔴 Rotular 180 fotos (~30 min)
- [ ] 🔴 Compactar `data/yolo`, subir no Drive, rodar o notebook
- [ ] 🔴 Baixar o `.tflite` e me avisar
- [ ] 🔴 Gerar o development build (EAS)
- [ ] 🟡 Android intermediário com depuração USB

---

## Uma coisa que o rotulador já revelou

Na primeira foto que carreguei — um retriever claramente **em pé** — a razão de
aspecto da caixa deu **0,97**. Os limiares atuais leriam isso como *sentado*.

Não é bug: é exatamente por isso que o classificador exige que a caixa **e** a
geometria dos keypoints concordem, e responde "não sei" quando discordam. A
caixa sozinha erraria.

Os limiares reais saem da sua rotulagem. É o dado que falta.

## Sobre a IA — o que o app faz hoje

O modelo **não existe ainda**. A tela de treino abre a câmera, mostra os passos e
avisa que o feedback automático vem em breve. **Não simula detecção.**

Escrever um detector falso levaria 10 minutos e a demo pareceria pronta. Não fiz
de propósito: um "Excelente!" sem o cão ter sentado ensina o tutor a recompensar
o comportamento errado — o app passaria a **piorar** o treino. É o único lugar
do produto onde parecer pronto é pior que admitir que falta.

## Travou?

Me manda o **comando** e a **mensagem de erro inteira**.
