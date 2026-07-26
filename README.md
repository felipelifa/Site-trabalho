# WorkFlow PT

ERP pessoal de trabalho — sistema web moderno para trabalhadores portugueses.

**Projeto ativo em desenvolvimento.** Build limpo, sem erros TypeScript.

**Deploy:** https://site-trabalho-omega.vercel.app

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Estilo | TailwindCSS v4, shadcn/ui (23 componentes) |
| Animacoes | Framer Motion |
| Rotas | React Router v7 |
| Forms | React Hook Form + Zod |
| State | TanStack Query v5 |
| Graficos | Recharts |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) |

---

## Supabase

- **URL:** `https://crtcznclfkxqhwmmgawl.supabase.co`
- **Projeto:** WorkFlow PT
- **Auth:** Email/senha, Magic Link (confirmacao de email DESATIVADA no dev)

---

## Regras de Negocio

### Valores Fixos

| Item | Valor |
|---|---|
| Salario Base | 820€/mes (fixo, so desconta por faltas) |
| Subsidio Alimentacao | 4,50€/dia trabalhado |
| Duodecimos | 150€/mes |
| Dia de Pagamento | 15 de cada mes |

### Regras Salariais

| Regra | Valor | Condicao |
|---|---|---|
| Semana Lisboa/Algarve | +140€ | Por semana trabalhada |
| Semana Porto | +50€ | Por semana trabalhada |
| Sabado Lisboa/Algarve | +110€ | Sabado trabalhado (sem outros bonus) |
| Sabado Porto | +80€ | Sabado trabalhado (sem outros bonus) |
| Feriado Lisboa/Algarve | +110€ | Dia feriado trabalhado |
| Feriado Porto | +80€ | Dia feriado trabalhado |
| Ferias | +80€ | Dia de ferias |
| Falta normal | -80€ | Falta qualquer dia |
| Falta segunda | -240€ | Falta na segunda |
| Falta sexta | -240€ | Falta na sexta |

**Calculo mensal (calculateMonthEarnings):**
1. Salario Base (820€ - faltas x 80€)
2. Duodecimos (150€ fixo)
3. Bonus semanais por destino
4. Ganhos diarios (sabados, feriados, ferias, faltas)
5. Subsidio alimentacao (4,50€ x dias trabalhados)

---

## Sistema de Competencias

O sistema trabalha por **competencia mensal** (mes trabalhado).

- Pagamento no dia **15** = mes anterior completo
- Ex: Pagamento 15 Julho = trabalho realizado em Junho
- Dashboard mostra sempre a competencia atual

---

## Banco de Dados

### Tabelas (13)

| Tabela | Descricao |
|---|---|
| `profiles` | Perfis dos usuarios |
| `companies` | Empresas |
| `salary_rules` | Regras salariais configuraveis |
| `work_weeks` | Semanas de trabalho |
| `work_days` | Dias de trabalho (com destino, feriado, ferias, falta) |
| `payments` | Pagamentos mensais |
| `receipts` | Recibos (upload para Storage) |
| `notes` | Notas por dia |
| `checklists` | Checklists diarios |
| `settings` | Configuracoes do usuario |
| `municipal_holidays` | Feriados municipais |
| `reminders` | Lembretes |
| `competencies` | Competencias mensais |

### RLS

Todas as tabelas com RLS habilitado. Cada usuario acessa apenas seus dados.

### Arquivos SQL

| Arquivo | Descricao |
|---|---|
| `supabase/migration.sql` | Schema completo (13 tabelas + RLS + indexes) |
| `supabase/fix-rls.sql` | Correcoes de politicas RLS (WITH CHECK) |
| `supabase/seed-rules.sql` | Regras padrao + update settings |

---

## Feriados

- **Nacionais PT:** 2024, 2025, 2026 hardcoded em `src/utils/holidays.ts`
- **Municipais Fafe:** Corpo de Deus, Festas de Fafe, Nossa Senhora da Piedade
- Deteccao automatica no calendario e dashboard

---

## Arquitetura

```
src/
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx
│   │   ├── auth-layout.tsx
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── ui/                    # 23 componentes shadcn/ui
├── features/
│   ├── auth/
│   │   ├── login-page.tsx
│   │   └── register-page.tsx
│   ├── dashboard/
│   │   └── dashboard-page.tsx
│   ├── calendar/
│   │   └── calendar-page.tsx   # Calendario UNIFICADO (edição de dias)
│   ├── statistics/
│   │   └── statistics-page.tsx
│   ├── notes/
│   │   └── notes-page.tsx
│   ├── checklists/
│   │   └── checklists-page.tsx
│   └── reminders/
│       └── reminders-page.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-auth-context.tsx
│   └── use-queries.ts
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── services/
│   └── api.ts
├── types/
│   └── database.ts
├── utils/
│   ├── date-utils.ts
│   ├── holidays.ts
│   └── rules-engine.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## Rotas

| Rota | Pagina |
|---|---|
| `/auth/login` | Login |
| `/auth/register` | Registro |
| `/auth/callback` | Magic Link callback |
| `/` | Dashboard |
| `/calendar` | Calendario (unificado) |
| `/statistics` | Estatisticas |
| `/notes` | Notas |
| `/checklists` | Checklists |
| `/reminders` | Lembretes |

**Nota:** A pagina de Registro Semanal foi removida. O Calendario e a pagina unica para gerir dias de trabalho.

---

## Paginas

### Dashboard
- Card de competencia atual com progresso
- Cards de metricas (salario base, ganhos semanais, dias trabalhados, dias restantes)
- Semana atual com dias clicaveis
- Resumo financeiro completo
- Smart assistant com dicas
- Quick actions

### Calendario (Unificado)
- Grade do mes com status visual por dia (trabalho, sabado, feriado, falta, ferias, pendente)
- Filtros rapidos (10 opcoes: Todos, Trabalho, Sabados, Feriados, Faltas, Ferias, Porto, Lisboa, Algarve, Pendentes)
- **Clique num dia para editar** — painel lateral com:
  - Status do dia (Trabalhou/Falta/Ferias/Folga)
  - Destino (Porto/Lisboa/Algarve)
  - Observacao
  - Ganho do dia calculado
  - Auto-save automatico
- Navegacao por mes com indicador "Mes Atual", "Mes Passado", "Proximo Mes"
- Totais por semana
- Resumo do mes (ganhos, comparacao com mes anterior, stats, destinos)
- Legenda

### Estatisticas
- Seletor de ano com setas
- Seletor de mes com dropdown
- Grafico de barras com gradiente e tooltip customizado
- Grafico de area para tendencias
- Grafico de pizza com porcentagens
- Aba de breakdown com composicao salarial
- Cards de comparacao (mes atual vs anterior)
- Resumo por cidade com medias

### Checklists
- Edicao inline de tarefas
- Filtros (Todos/Pendentes/Feitos)
- Barra de progresso animada
- Operacoes em lote (Marcar Tudo Feito, Limpar Feitos)
- Card de celebracao

### Lembretes
- Categorias do banco (Trabalho, Pessoal, Financeiro, Saude, Familia, Casa, Outro)
- Filtro por categoria
- Ordenacao por data/prioridade
- Indicadores de atraso (vermelho)
- Secao recolhivel de concluidos

---

## Funcionalidades

- **Auto-save** — Registro semanal salva automaticamente 1.5s apos alteracao
- **Calculo automatico** — Ganhos calculados em tempo real via rules engine
- **Mobile responsive** — Sidebar hamburger drawer, todas as paginas responsivas
- **Dark mode** — Toggle na sidebar
- **Feriados automaticos** — Deteccao de feriados nacionais e municipais
- **Comparacao mensal** — Ganhos do mes vs mes anterior

---

## Para Rodar

```bash
npm install
npm run dev          # Desenvolvimento
npm run build        # Build producao
npx vite preview --host  # Preview com rede
```

---

## Para Aplicar o Banco

1. Abrir Supabase SQL Editor
2. Colar e executar `supabase/migration.sql`
3. Colar e executar `supabase/fix-rls.sql`
4. Colar e executar `supabase/seed-rules.sql`

---

## Deploy

```bash
npx vercel --prod --yes
```

---

## Notas Importantes

- **Build limpo** — `npm run build` passa sem erros
- **Auth trigger removido** — profile/settings criados client-side em `use-auth.ts`
- **Valores hardcoded** — base=820€, duodecimos=150€, meal=4.50€/dia
- **Feriados de Fafe** incluidos nos feriados municipais
- **Calendario unificado** — pagina de semanas removida, tudo no calendario
- **Google Removido** — Auth apenas via email/senha e Magic Link
- **Competencia** = mes trabalhado, pagamento no 15 do mes seguinte
