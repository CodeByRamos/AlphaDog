# Pendências — o que só você pode resolver

Tudo aqui depende de acesso, hardware, dinheiro ou decisão de negócio. Eu não
consigo fazer nenhum destes itens.

Ordenado por urgência. Faça de cima para baixo.

**Legenda**

| | Significado |
| --- | --- |
| 🔴 | Faça agora. Tem risco de segurança ou legal. |
| 🟡 | Trava o desenvolvimento. Faça quando puder. |
| 🟢 | Melhora o produto. Sem pressa. |

---

# 🔴 1. Trocar a senha do Supabase

**Por quê:** você colou a senha (`Bicicletavermelha1020`) no chat. Ela deve ser
considerada vazada. Verifiquei e ela **não** foi para nenhum commit — mas trocar
é obrigatório mesmo assim.

**Tempo:** 3 minutos.

### Passo a passo

1. Abra [supabase.com/dashboard](https://supabase.com/dashboard) e entre no
   projeto do AlphaDog.
2. Menu lateral → engrenagem **Settings**.
3. Clique em **Database**.
4. Procure a seção **Database password** → botão **Reset database password**.
5. Clique em **Generate a password**. O Supabase cria uma senha forte.
6. **Copie e guarde num gerenciador de senhas** (Bitwarden, 1Password, o do
   navegador). Ela aparece **uma vez só**.
7. Confirme o reset.

> ⚠️ Nunca cole senha no chat, em issue do GitHub, ou no `.env.example`.
> Senha vive só no `.env.local` da sua máquina e no painel da Vercel.

---

# 🔴 2. Ligar o banco de dados

**Por quê:** sem isso o site guarda as respostas do quiz **em memória** — elas
somem quando o servidor reinicia. Nada de real é salvo.

**Tempo:** 5 minutos. Faça logo depois do item 1.

### Passo a passo

1. No Supabase, ainda em **Settings → Database**.
2. Procure **Connection string** (ou **Connection pooling**).
3. Você precisa copiar **duas** strings diferentes. Elas parecem iguais, mas a
   **porta muda** — preste atenção nesse número:

   | Qual | Porta | Onde encontrar |
   | --- | --- | --- |
   | **Pooler** | `6543` | Aba **Transaction** ou **Connection pooling** |
   | **Direta** | `5432` | Aba **Direct connection** ou **Session** |

4. Na pasta do projeto (`C:\Users\Ramos\Documents\AlphaDog`), crie um arquivo
   chamado exatamente **`.env.local`**.
5. Cole isto dentro, trocando os valores:

```bash
DATABASE_URL="cole-aqui-a-string-da-porta-6543"
DIRECT_URL="cole-aqui-a-string-da-porta-5432"
```

6. Nas duas strings, troque `[YOUR-PASSWORD]` pela senha nova do item 1.
7. Salve.

### Por que duas strings?

Não é firula. São coisas diferentes:

- **A porta 6543 (pooler)** é o que o site usa no dia a dia. Servidor sem estado
  abre e fecha muita conexão; o pooler segura isso. Sem ele o Postgres esgota as
  conexões e o site cai sob tráfego.
- **A porta 5432 (direta)** é usada só para criar/alterar tabelas. O pooler não
  aceita esses comandos.

### Conferindo se funcionou

No terminal, dentro da pasta do projeto:

```powershell
npm run db:push
```

Deve aparecer algo como *"Your database is now in sync with your Prisma schema"*.
Se der erro de autenticação, a senha no `.env.local` está errada.

> ✅ O `.env.local` **nunca** vai para o GitHub — já configurei o `.gitignore`.
> O arquivo `.env.example` é só o modelo, e fica **sempre vazio**.

---

# 🔴 3. Tirar a prova social inventada

**Por quê:** **eu inventei todos esses números e depoimentos** para preencher o
layout. Publicar como se fossem reais é **propaganda enganosa** — Código de
Defesa do Consumidor, artigo 37. O CONAR também pega. Multa e obrigação de tirar
o ar.

**Isto não é opinião de design. É risco jurídico real.**

### O que está inventado

| Onde | O que | Arquivo |
| --- | --- | --- |
| Home (faixa de números) | "+120 mil tutores", "4,8/5" | `src/lib/content/marketing.ts` |
| Home (depoimentos) | Marina R., Rafael M., Carolina S. | `src/lib/content/marketing.ts` |
| Funil | "94% relatam melhora em 4 semanas", "8 em cada 10 tutores" | `src/features/quiz/funnel-config.ts` |
| /avaliacoes | Os 9 depoimentos | `src/lib/content/reviews.ts` |

### Suas três opções

**A. Ainda não tem clientes** → me avise e eu troco os números por afirmações
verificáveis sobre o método ("sessões de 10 minutos", "reforço positivo"), sem
inventar resultado. Também posso remover a página `/avaliacoes` até existirem
avaliações reais.

**B. Já tem clientes** → me mande os depoimentos e números reais que eu troco.
Peça autorização por escrito para usar nome e foto (também é LGPD).

**C. Quer manter até conseguir os reais** → não recomendo. O risco é seu, mas o
CDC não aceita "era temporário" como defesa.

---

# 🔴 4. Dados da empresa

**Por quê:** os textos legais e a página de contato têm marcadores no lugar dos
dados reais. Vender com `[RAZÃO SOCIAL]` no site é ilegal — o CDC exige
identificação clara do fornecedor.

**Onde aparece:** `/termos`, `/privacidade`, `/contato`.

### Me mande

- Razão social (nome da empresa no CNPJ, não o nome fantasia)
- CNPJ
- Endereço completo com CEP
- E-mail oficial de contato (hoje está `suporte@alphadog.com.br`, que inventei)

Se ainda não tem CNPJ: dá para desenvolver, **mas não dá para cobrar**. Abrir
MEI leva ~1 dia em [gov.br/mei](https://www.gov.br/mei).

---

# 🔴 5. Advogado revisar os textos legais

**Por quê:** escrevi Termos, Privacidade, Política de Assinatura e Garantia
refletindo o que o produto faz de verdade (renovação automática, garantia de 30
dias, cancelamento sem multa, direito de arrependimento do art. 49 do CDC).

**Mas eu não sou advogado.** Cobrança recorrente no Brasil tem regra específica,
e a LGPD tem exigências que texto genérico não cobre.

**Quando:** antes de cobrar do primeiro cliente. Não antes disso.

**Como:** advogado de direito do consumidor / digital. Mande os arquivos:

- `src/lib/content/legal.ts` — todos os textos
- `prisma/schema.prisma` — mostra que dados são coletados (importa para a LGPD)

Uma revisão dessas custa em torno de R$ 800–2.500. É barato perto de uma multa
do Procon.

---

# 🟡 6. Dataset de cães (para a IA)

**Por quê:** para treinar o modelo que reconhece a postura do cão. Sem isto não
existe treinador com câmera.

**Tempo:** 20 min de trabalho + tempo de download.

## 6.1 — StanfordExtra (as anotações)

São os pontos do corpo do cão marcados em 12.000 fotos.

1. Abra [github.com/benjiebob/StanfordExtra](https://github.com/benjiebob/StanfordExtra).
2. Leia o README até achar o link do **formulário de acesso** (Google Forms).
3. Preencha. Uso: **pesquisa e desenvolvimento de produto**. É gratuito.
4. Você recebe por e-mail o link do arquivo **`StanfordExtra_v12.json`**.
5. Salve em: `services/ai/data/StanfordExtra_v12.json`

## 6.2 — Stanford Dogs (as fotos)

O StanfordExtra só tem as anotações. As fotos vêm daqui.

1. Abra [vision.stanford.edu/aditya86/ImageNetDogs](http://vision.stanford.edu/aditya86/ImageNetDogs/).
2. Baixe **Images** (`images.tar`, ~750 MB).
3. Extraia. Vai virar uma pasta `Images/` com uma subpasta por raça
   (`n02085620-Chihuahua`, etc).
4. Coloque em: `services/ai/data/stanford_dogs/Images/`

## 6.3 — Conferir

No terminal:

```powershell
cd services\ai
.\.venv\Scripts\python.exe scripts\prepare_dataset.py --json data\StanfordExtra_v12.json --images data\stanford_dogs\Images --out data\yolo
```

**Este comando é seguro.** Não baixa nada, não muda nada fora da pasta `data`.
Se o caminho estiver errado, ele avisa e para.

Deve terminar com algo como:

```
escritos: 10245 treino, 1808 validação
yaml: data\yolo\dogs.yaml
```

Me avise quando aparecer isso.

> ℹ️ Vai aparecer um aviso sobre SRD (vira-lata). É esperado — decidimos tratar
> isso depois. Não é erro.

---

# 🟡 7. GPU para treinar

**Por quê:** treinar o modelo na sua máquina levaria **dias** (ela não tem placa
de vídeo dedicada para isso). Numa GPU leva **2–4 horas**.

**Custo:** grátis (Colab) ou ~R$ 15 (RunPod).

## Opção A — Google Colab (grátis, recomendado para começar)

1. Abra [colab.research.google.com](https://colab.research.google.com).
2. **Arquivo → Novo notebook**.
3. **Ambiente de execução → Alterar o tipo de ambiente de execução**.
4. Em *Acelerador de hardware*, escolha **T4 GPU**. Salvar.
5. Me avise — eu preparo o notebook com os comandos prontos.

**Limitação:** o Colab grátis desconecta após ~4h de inatividade e tem fila em
horário de pico. Para um primeiro treino, resolve.

## Opção B — RunPod (pago, mais confiável)

Se o Colab desconectar no meio do treino, vale pagar. ~US$ 0,30/hora numa RTX
4090; um treino completo sai por menos de US$ 2.

---

# 🟡 8. Celular Android para medir velocidade

**Por quê:** o app precisa processar **15 quadros por segundo** para o feedback
chegar a tempo do cão associar. Emulador **não serve** — ele usa a CPU do PC e o
número seria mentira.

**O que serve:** um Android intermediário, tipo Moto G, Samsung A-series, Xiaomi
Redmi. **Não use seu melhor aparelho** — se funcionar só no top de linha, não
funciona para a maioria dos seus clientes.

Quando chegarmos nessa fase eu te digo exatamente o que instalar.

---

# 🟢 9. Fotos de cães

**Por quê:** o hero (primeira dobra do site) tem hoje um **placeholder** dentro
do celular — um fundo verde com patinhas. Não tenho ferramenta de gerar imagem.

**O que precisa:** uma foto vertical de cães felizes, boa qualidade, que caiba
na tela do celular do mockup.

### Suas opções

| Como | Custo | Observação |
| --- | --- | --- |
| Foto sua / de clientes | R$ 0 | Melhor opção: é real e é seu |
| Banco pago (Getty, Adobe Stock) | ~R$ 50–200 | Confira a licença para uso comercial |
| Banco grátis (Unsplash, Pexels) | R$ 0 | Verifique a licença; qualidade varia |
| Gerar por IA (Midjourney, DALL·E) | ~R$ 60/mês | Confira os termos para uso comercial |

**Formato:** vertical, mínimo 552×1120 pixels.

**Onde colocar:** substitua o arquivo
`public/brand/hero-app-dogs.png`. O layout não muda — é só trocar o arquivo.

> ⚠️ Não use foto do Google Imagens. É violação de direito autoral e dá processo.

---

# 🟢 10. Stripe (só quando for cobrar)

Deixe para quando o checkout for implementado.

1. Crie conta em [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Ative a conta brasileira (precisa de CNPJ — ver item 4).
3. **Deixe em modo de teste** (chave começa com `sk_test_`).
4. Em **Developers → API keys**, copie a *Secret key*.
5. Adicione no `.env.local`.

> ⚠️ **PIX no Stripe exige conta brasileira aprovada.** Se demorar ou não sair,
> a alternativa é Mercado Pago — já deixei a arquitetura pronta para trocar de
> gateway sem reescrever nada.

---

# Resumo — sua lista

Copie para onde você organiza tarefas:

- [ ] 🔴 Trocar senha do Supabase
- [ ] 🔴 Criar `.env.local` com as duas connection strings
- [ ] 🔴 Decidir o que fazer com a prova social inventada
- [ ] 🔴 Mandar razão social, CNPJ e endereço
- [ ] 🔴 Contratar advogado para revisar os textos legais (antes de cobrar)
- [ ] 🟡 Preencher formulário do StanfordExtra
- [ ] 🟡 Baixar Stanford Dogs
- [ ] 🟡 Rodar `prepare_dataset.py` e me avisar
- [ ] 🟡 Abrir conta no Google Colab
- [ ] 🟡 Separar um Android intermediário
- [ ] 🟢 Conseguir foto de cães para o hero
- [ ] 🟢 Conta Stripe (depois)

---

## Travou em algo?

Me manda **o comando que você rodou** e **a mensagem de erro inteira** (copiada,
não printada, se der). Quase todo erro de setup é caminho de arquivo errado ou
senha, e a mensagem completa mostra qual dos dois.
