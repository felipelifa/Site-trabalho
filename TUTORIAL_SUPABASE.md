# Tutorial Completo — Configurar Supabase para o WorkFlow PT

---

## Passo 1: Criar Conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"**
3. Faca login com GitHub, Google ou email
4. Confirme seu email se necessario

---

## Passo 2: Criar um Novo Projeto

1. No dashboard, clique em **"New project"**
2. Preencha:
   - **Organization**: crie uma organization (ex: "Meu Trabalho") ou selecione uma existente
   - **Project name**: `workflow-pt`
   - **Database Password**: crie uma senha forte e ** guarde em local seguro **
   - **Region**: escolha **Europe (West)** — mais proximo de Portugal
3. Clique em **"Create new project"**
4. Aguarde 1-2 minutos para o projeto ser criado

---

## Passo 3: Copiar as Credenciais

1. No dashboard do projeto, va em **Settings** (icone de engrenagem no canto superior esquerdo)
2. Clique em **API**
3. Voce vera duas informacoes importantes:

   - **Project URL** — algo como: `https://xyzcompany.supabase.co`
   - **anon / public key** — algo como: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. Copie ambas e cole no seu arquivo `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## Passo 4: Aplicar o Schema do Banco de Dados

1. No dashboard do Supabase, va no menu lateral em **SQL Editor**
2. Clique em **"New query"**
3. Abra o arquivo `supabase/migration.sql` do projeto (esta na raiz do projeto)
4. **Copie TODO o conteudo** do arquivo
5. **Cole** no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Aguarde a mensagem de sucesso

### O que esse SQL faz:

| Acao | Descricao |
|---|---|
| Cria 12 tabelas | profiles, companies, salary_rules, work_weeks, work_days, payments, receipts, notes, checklists, settings, municipal_holidays, reminders |
| Habilita RLS | Cada usuario so ve seus proprios dados |
| Cria 18+ politicas RLS | Protecao completa por user_id |
| Cria 18 indices | Para performance nas consultas |
| Cria trigger | Ao registrar usuario, cria profile e settings automaticamente |
| Cria bucket de Storage | Para upload de recibos |

---

## Passo 5: Configurar Autenticacao

### 5.1 Habilitar Provedores de Login

1. No dashboard, va em **Authentication** no menu lateral
2. Clique em **Providers**

#### Email/Senha (ja vem habilitado)
- Verifique que **Email** esta habilitado
- Em **Confirm email**, voce pode desabilitar para testes (nao recomendado em producao)

#### Google OAuth
1. Clique em **Google** na lista de providers
2. Clique em **Enable Sign in with Google**
3. Voce precisa criar um projeto no Google Cloud Console:

   a. Acesse [https://console.cloud.google.com](https://console.cloud.google.com)
   
   b. Crie um novo projeto ou selecione um existente
   
   c. Va em **APIs & Services** > **Credentials**
   
   d. Clique em **Create Credentials** > **OAuth client ID**
   
   e. Configure o OAuth consent screen:
      - User Type: **External**
      - App name: **WorkFlow PT**
      - Email: seu email
      - Scopes: adicionar `email` e `profile`
   
   f. Clique em **Create OAuth client ID**
   
   g. Application type: **Web application**
   
   h. Authorized redirect URIs — adicione:
      ```
      https://SEU-PROJETO.supabase.co/auth/v1/callback
      ```
   
   i. Copie o **Client ID** e **Client Secret**
   
   j. Volte ao Supabase e cole:
      - Client ID: cola o Client ID do Google
      - Client Secret: cola o Client Secret do Google
   
   k. Clique em **Save**

#### Magic Link
1. O Magic Link ja funciona por padrao via OTP
2. Nenhuma configuracao adicional necessaria

---

## Passo 6: Configurar Storage para Recibos

1. No dashboard, va em **Storage** no menu lateral
2. Verifique que o bucket `receipts` foi criado pelo SQL
3. Se nao foi criado, crie manualmente:
   - Clique em **"New bucket"**
   - Nome: `receipts`
   - Public: **desabilitado**
   - Clique em **"Create bucket"**

4. Configure as politicas de acesso:
   - Va em **Policies**
   - O SQL ja criou as politicas necessarias

---

## Passo 7: Testar o Login

1. Volte para o projeto local
2. Execute:
   ```bash
   npm run dev
   ```
3. Acesse `http://localhost:5173`
4. Clique em **"Criar conta"**
5. Preencha nome, email e senha
6. Clique em **"Criar conta"**
7. Faca login
8. Voce deve ver o Dashboard

---

## Passo 8: Verificar que Tudo Funciona

### Testar RLS (Seguranca)

1. Crie uma segunda conta com outro email
2. Faca login com a segunda conta
3. Verifique que nao ve os dados da primeira conta

### Testar as Paginas

1. **Dashboard** — deve mostrar zeros (ainda sem dados)
2. **Calendario** — deve mostrar o mes atual
3. **Semanas** — pode registrar uma semana
4. **Notas** — pode criar notas
5. **Checklists** — pode criar tarefas
6. **Lembretes** — pode criar lembretes
7. **Configuracoes** — pode alterar salario e cidade

---

## Possiveis Problemas e Solucoes

### "Invalid API key"
- Verifique se as variaveis de ambiente estao corretas no `.env`
- Verifique se nao ha espacos extras nas chaves

### "Row Level Security" error
- Verifique se o SQL foi executado completamente
- Va em **Authentication** > **Users** e confirme que o usuario foi criado

### Tabelas nao existem
- Va em **Table Editor** no menu lateral
- Verifique se as 12 tabelas aparecem na lista
- Se nao, execute o SQL novamente

### Google Login nao funciona
- Verifique se o redirect URI esta correto
- Verifique se o Client ID e Secret estao corretos
- Aguarde alguns minutos (propagacao do Google)

### Build com erro de variavel de ambiente
- Verifique que o `.env` esta na raiz do projeto
- Verifique que nao tem aspas nas variaveis
- Reinicie o servidor `npm run dev`

---

## Comandos Uteis do Supabase CLI (Opcional)

Se quiser usar o Supabase CLI localmente:

```bash
# Instalar CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref SEU-PROJECT-REF

# Aplicar migracao
supabase db push

# Gerar tipos automaticamente
supabase gen types typescript --local > src/types/database.ts
```

---

## Resumo dos URLs Importantes

| Item | URL |
|---|---|
| Dashboard Supabase | https://app.supabase.com |
| SQL Editor | https://app.supabase.com > seu projeto > SQL Editor |
| Table Editor | https://app.supabase.com > seu projeto > Table Editor |
| Authentication | https://app.supabase.com > seu projeto > Authentication |
| Storage | https://app.supabase.com > seu projeto > Storage |
| API Settings | https://app.supabase.com > seu projeto > Settings > API |

---

## Checklist Final

- [ ] Conta criada no Supabase
- [ ] Projeto `workflow-pt` criado
- [ ] URL e anon key copiadas para `.env`
- [ ] SQL `migration.sql` executado no SQL Editor
- [ ] Todas as 12 tabelas aparecem no Table Editor
- [ ] Google OAuth configurado (opcional)
- [ ] Bucket `receipts` existe no Storage
- [ ] Login funciona com email/senha
- [ ] Dashboard carrega corretamente
