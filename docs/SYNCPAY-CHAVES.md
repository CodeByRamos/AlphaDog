# Como pegar as chaves da SyncPay

Guia para quem tem acesso à conta da SyncPay. **Não precisa saber programar.**

Leva uns 5 minutos. São dois códigos que você vai copiar e mandar para a equipe
técnica.

---

## Antes de começar

Você vai precisar de:

- O **login e a senha** da conta da SyncPay
- O celular com acesso ao e-mail cadastrado (pode pedir confirmação)
- Um computador (dá para fazer no celular, mas copiar códigos longos é chato)

---

## Passo 1 — Entrar na conta

Abra o navegador e acesse:

**https://app.syncpayments.com.br**

Faça login normalmente, com e-mail e senha.

> Se a tela pedir um código de confirmação, ele chega no e-mail cadastrado.

---

## Passo 2 — Abrir a área de desenvolvedor

Com o login feito, cole este endereço na barra do navegador:

**https://app.syncpayments.com.br/seller/developer-api**

Essa é a página onde ficam as chaves.

> **Se der erro ou a página não abrir:** procure no menu lateral (ou no menu do
> canto superior, se estiver no celular) por uma opção com um destes nomes:
> **"API"**, **"Desenvolvedor"**, **"Integrações"**, **"Credenciais"** ou
> **"Developer API"**. Todos levam ao mesmo lugar.

---

## Passo 3 — Gerar as credenciais

Nessa página você vai ver dois campos, ou um botão para criá-los:

| O que aparece na tela | O que é |
|---|---|
| **Client ID** | Identifica a nossa loja |
| **Client Secret** | A senha da integração |

**Se os campos já estiverem preenchidos:** ótimo, é só copiar (passo 4).

**Se estiverem vazios:** procure um botão escrito **"Gerar"**, **"Criar
credenciais"**, **"Nova chave"** ou **"+"** e clique. Os dois códigos aparecem
na hora.

> ⚠️ **Atenção com o Client Secret.** Em muitos sistemas ele aparece **uma vez
> só**. Se você fechar a página sem copiar, vai precisar gerar de novo — e
> gerar de novo às vezes invalida o anterior. Copie antes de fechar.

---

## Passo 4 — Copiar os dois códigos

Cada campo costuma ter um ícone de **cópia** (dois quadradinhos sobrepostos) do
lado. Clique nele.

Se não tiver o ícone, selecione o texto todo com o mouse e use `Ctrl + C`
(no Mac, `Cmd + C`).

Cole cada um num lugar seguro por enquanto — o **Bloco de Notas** serve.

Os códigos são parecidos com isto (**estes são inventados, só de exemplo**):

```
Client ID:      3f8a1c92-7d4e-4b6a-9f21-0c5e8b7a1d33
Client Secret:  a91b7c04-e523-4f88-b0d6-2f47a9e13c85
```

São longos e cheios de traços. Copie **inteiros**, sem espaço sobrando no começo
ou no fim.

---

## Passo 5 — Ver se tem ambiente de testes

Ainda nessa página, procure alguma chave ou botão escrito **"Sandbox"**,
**"Teste"**, **"Homologação"** ou **"Ambiente de testes"**.

- **Se existir:** pegue **também** essas credenciais de teste e diga que são as
  de teste. Elas deixam a gente testar o pagamento sem mexer em dinheiro de
  verdade.
- **Se não existir:** tudo bem, não é obrigatório. Só avise que não tem.

---

## Passo 6 — Mandar para a equipe (com cuidado)

⚠️ **Não mande o Client Secret por WhatsApp, Telegram, e-mail comum ou grupo.**

Esses códigos dão acesso a **movimentar dinheiro da conta**. Quem tiver eles
pode gerar cobranças em nome da empresa.

**Formas seguras, em ordem de preferência:**

1. **Gerenciador de senhas** com compartilhamento (1Password, Bitwarden,
   LastPass) — o ideal.
2. **Site de mensagem que se autodestrói:** entre em
   [privnote.com](https://privnote.com), cole os códigos, gere o link e mande
   **o link**. Ele some depois de aberto uma vez.
3. **Pessoalmente ou por ligação**, ditando os códigos.

Se por algum motivo mandar por chat, **troque as chaves depois** (gere novas na
mesma página, o que invalida as antigas).

---

## Passo 7 — Duas perguntas para o suporte da SyncPay

Enquanto está com a conta aberta, abra o chat de suporte deles e mande estas
duas perguntas. **Pode copiar e colar do jeito que está:**

> Olá! Estou integrando a API de vocês e preciso confirmar duas coisas:
>
> 1. No endpoint de cash-in (`POST /v1/gateway/api`), o campo `amount` deve ser
>    enviado em **centavos** ou em **reais**? Ex.: para cobrar R$ 49,90, envio
>    `4990` ou `49`?
>
> 2. Qual é o endpoint para **consultar uma transação pelo id**? Preciso do
>    caminho completo, por exemplo `/v1/gateway/api/{id}`.
>
> Obrigado!

**Por que isso importa:**

- A pergunta 1 evita a gente cobrar **cem vezes a mais ou a menos** do cliente.
- A pergunta 2 é uma trava de segurança: antes de liberar o acesso de alguém,
  o sistema confere direto com a SyncPay se o pagamento existe mesmo. Sem essa
  resposta, o sistema fica propositalmente mais lento em liberar, porque não
  confia só na notificação recebida.

Copie a resposta deles e mande junto com as chaves.

---

## Resumo — o que mandar

- [ ] **Client ID** (produção)
- [ ] **Client Secret** (produção)
- [ ] Client ID e Secret de **teste**, se existirem
- [ ] A **resposta do suporte** às duas perguntas do passo 7

---

## Perguntas comuns

**"Gerar essas chaves cobra alguma coisa?"**
Não. É só uma credencial de acesso.

**"Isso mexe em algo que já está funcionando?"**
Não. Gerar credenciais não altera vendas, saldo nem configuração da conta.

**"E se eu clicar em gerar duas vezes?"**
Pode acontecer de a chave anterior parar de funcionar. Se isso ocorrer depois
que a integração já estiver no ar, avise a equipe — é só trocar pela nova.

**"Preciso configurar alguma URL de webhook no painel?"**
**Não.** O sistema já manda esse endereço automaticamente em cada cobrança. Se
alguém do suporte perguntar, a resposta é que a URL vai no campo `postbackUrl`
de cada requisição.

**"Perdi o Client Secret, e agora?"**
Volte na mesma página e gere de novo. Avise a equipe que as chaves mudaram.
