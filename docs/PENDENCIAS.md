# O que VOCÊ precisa fazer — entrega de hoje

Quatro passos. Uns 45 minutos, dos quais 30 são o build rodando sozinho.

Faça **na ordem**. Cada passo depende do anterior.

---

## Passo 1 — Banco de dados (5 min)

Uma colada só de SQL resolve tudo.

1. Abra o arquivo **`supabase/SETUP.sql`** aqui do projeto (no VS Code)
2. Na parte de baixo, troque `SEU_EMAIL_AQUI` pelo e-mail da **sua conta no app**
3. Copie o arquivo inteiro
4. Vá em [supabase.com/dashboard](https://supabase.com/dashboard) → seu projeto → **SQL Editor** → **New query**
5. Cole e clique em **RUN**

**Como saber se deu certo:** no final aparece uma tabela com seu e-mail e a coluna
`tem_acesso` marcada como `true`.

> Se ainda não criou conta no app, faça o Passo 2 e 4 primeiro, crie a conta, e
> depois volte aqui.

---

## Passo 2 — Desligar confirmação de e-mail (2 min)

Sem isso, quem se cadastra não entra — fica preso esperando um e-mail.

1. No Supabase: **Authentication** → **Sign In / Providers**
2. Clique em **Email** para expandir
3. **Desligue** a opção **Confirm email**
4. **Save** no rodapé ← é este passo que costuma escapar

---

## Passo 3 — Gerar o app (5 min você, 30 min a fila)

```bash
cd C:\Users\Ramos\Documents\AlphaDog\apps\mobile
```
```bash
eas build --profile production --platform android
```

**Quando ele perguntar "Install and run on an emulator?" → responda NÃO.**
Você não tem emulador; foi isso que deu erro de `adb` antes.

No fim ele mostra um link. **Guarde esse link** — é o instalador do seu app.

> Use `production` e não `development`: o build de development precisa do
> computador ligado rodando o Metro. O de production roda sozinho, que é o que
> você entrega.

---

## Passo 4 — Instalar e testar (10 min)

1. Abra o link do build **no celular**
2. Baixe e instale (o Android vai avisar sobre "fonte desconhecida" — permita)
3. Crie a conta **com o mesmo e-mail** que você colocou no Passo 1
4. Faça o onboarding do cão
5. Entre num treino e aponte a câmera para o seu cão

**Se aparecer uma caixa laranja em volta do cão, seguindo ele → a IA está
funcionando.** Depois de alguns segundos ela fica verde e o treino começa.

---

# Pronto. Isso é a entrega.

O que funciona depois desses 4 passos:

| | |
| --- | --- |
| Criar conta e entrar | ✅ |
| Cadastro do cão (9 perguntas) | ✅ |
| Painel com progresso e sequência | ✅ |
| 11 exercícios com passo a passo | ✅ |
| Treino cronometrado com a câmera | ✅ |
| Reconhecimento do cão por IA | ✅ |
| Histórico e estatísticas | ✅ |
| Perfil com foto | ✅ |

---

# Depois da entrega — quando quiser cobrar

Nada disso bloqueia hoje.

### Ligar o pagamento
1. Abrir conta no [Asaas](https://www.asaas.com) (grátis, precisa aprovação)
2. Pegar a chave de API e colocar em `apps/website/.env.local`:
   ```
   ASAAS_API_KEY=sua_chave
   ASAAS_ENV=sandbox
   ```
3. Me avisar → eu testo o checkout de ponta a ponta
4. Trocar para `ASAAS_ENV=production` quando estiver funcionando

### Travar o acesso de verdade
Rodar `supabase/migrations/0004_enforce_subscription.sql` no SQL Editor.

Hoje o bloqueio é só de tela. Essa migration põe a regra no banco — aí nem app
modificado passa. **Só rode depois que o pagamento estiver funcionando**, senão
tranca todo mundo.

### Distribuir o APK pelo site
1. Suba o `.apk` em algum lugar público (o próprio Supabase Storage serve)
2. Em `apps/website/.env.local`:
   ```
   NEXT_PUBLIC_APK_URL=https://.../alphadog.apk
   NEXT_PUBLIC_APK_VERSION=0.1.0
   ```
3. A página `/baixar` passa a mostrar o botão sozinha

### Publicar atualizações (sem gerar APK novo)
```bash
eas update --branch production --message "o que mudou"
```
Funciona para mudanças de tela, texto e correção de bug. Só dependência nova
exige APK novo.

---

# Antes de vender para o público

- [ ] Trocar a senha do Supabase (ela passou pelo nosso chat)
- [ ] Publicar a Política de Privacidade numa URL
- [ ] Tirar a prova social inventada do site (números e depoimentos)
- [ ] Preencher `[RAZÃO SOCIAL]` e `[CNPJ]` nos textos legais
- [ ] Play Store: US$ 25 uma vez (se quiser a loja além do site)

Detalhes em `docs/AUDITORIA.md`.

---

# Travou?

Me manda **o comando** e **a mensagem de erro inteira**. Quase todo problema
aqui é caminho de arquivo, PATH ou chave trocada.
