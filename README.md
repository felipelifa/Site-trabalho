# WorkFlow PT

ERP pessoal de trabalho — sistema web moderno para trabalhadores portugueses.

**Projeto ativo em desenvolvimento.** Build limpo, sem erros TypeScript.

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
- **Auth:** Email/senha, Google OAuth, Magic Link (confirmacao de email DESATIVADA no dev)

---

## Regras de Negocio

### Valores Configuraveis

| Item | Valor |
|---|---|
| Salario Base | 970€/mes |
| Subsidio Alimentacao | 90€/mes |
| Duodecimos (Natal + Ferias) | 150€/mes (75€ cada) |
| Dia de Pagamento | 15 de cada mes |
| Valor Hora | 5,31€ |
| Jornada | 8h/dia, 40h/semana |
| Vale Alimentacao | 4,50€/dia trabalhado |

### Regras Salariais

| Regra | Valor | Condicao |
|---|---|---|
| Semana Lisboa/Algarve | +140€ | Por semana trabalhada |
| Semana Porto | +50€ | Por semana trabalhada |
| Sabado Lisboa/Algarve | +110€ | Sabado trabalhado |
| Sabado Porto | +80€ | Sabado trabalhado |
| Feriado | +80€ | Dia feriado trabalhado |
| Ferias | +80€ | Dia de ferias |
| Falta normal | -80€ | Falta qualquer dia |
| Falta segunda | -240€ | Falta na segunda |
| Falta sexta | -240€ | Falta na sexta |
| Adicional Diario Porto | +10€ | Por dia (seg-sex) |
| Adicional Diario Lisboa/Algarve | +30€ | Por dia (seg-sex) |
| Adicional Sexta Lisboa/Algarve | +20€ | Sexta-feira (20€ em vez de 30€) |

**Ordem do calculo:**
1. Salario Base (970€)
2. Subsidio Alimentacao (90€)
3. Duodecimos (150€)
4. Trabalho Horario (8h x 5,31€ x dias trabalhados)
5. Vale Alimentacao (4,50€ x dias trabalhados)
6. Valor das semanas
7. Valor dos sabados
8. Valor dos feriados
9. Valor das ferias
10. Adicionais diarios
11. Descontos por faltas

---

## Sistema de Competencias

O sistema trabalha por **competencia mensal** (mes trabalhado).

- Pagamento no dia **15** = mes anterior completo
- Ex: Pagamento 15 Julho = trabalho realizado em Junho
- Dashboard mostra sempre a competencia atual

### Tabela competencies

```sql
competencies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  month INTEGER,
  year INTEGER,
  expected_amount NUMERIC(10,2),
  received_amount NUMERIC(10,2),
  payment_date DATE,
  status TEXT DEFAULT 'active', -- active, completed, archived
  days_worked INTEGER,
  total_hours NUMERIC(10,2),
  UNIQUE(user_id, year, month)
)
```

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
| `competencies` | Competencias mensais (novo) |

### RLS

Todas as tabelas com RLS habilitado. Cada usuario acessa apenas seus dados.

### Arquivos SQL

| Arquivo | Descricao |
|---|---|
| `supabase/migration.sql` | Schema completo (13 tabelas + RLS + indexes) |
| `supabase/fix-rls.sql` | Correcoes de politicas RLS (WITH CHECK) |
| `supabase/seed-rules.sql` | Regras padrao + update settings (base=970, meal=90) |

---

## Feriados

- **Nacionais PT:** 2024, 2025, 2026 hardcoded em `src/utils/holidays.ts`
- **Municipais Fafe:** Corpo de Deus, Festas de Fafe, Nossa Senhora da Piedade
- Deteccao automatica no registro semanal e dashboard

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
│   │   └── dashboard-page.tsx   # Dashboard com competencia + edicao inline
│   ├── calendar/
│   │   └── calendar-page.tsx
│   ├── weeks/
│   │   └── weekly-registration-page.tsx
│   ├── statistics/
│   │   └── statistics-page.tsx   # Graficos com Recharts
│   ├── notes/
│   │   └── notes-page.tsx
│   ├── checklists/
│   │   └── checklists-page.tsx
│   └── reminders/
│       └── reminders-page.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-auth-context.tsx
│   └── use-queries.ts           # Todos os hooks React Query
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── services/
│   └── api.ts                   # Service layer completo
├── types/
│   └── database.ts              # Tipos TypeScript do banco
├── utils/
│   ├── date-utils.ts
│   ├── holidays.ts              # Feriados PT + Fafe
│   └── rules-engine.ts          # Motor de calculo salarial
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
| `/auth/callback` | OAuth/Magic Link callback |
| `/` | Dashboard (competencia + dias inline) |
| `/calendar` | Calendario |
| `/weeks` | Registro Semanal |
| `/statistics` | Estatisticas |
| `/notes` | Notas |
| `/checklists` | Checklists |
| `/reminders` | Lembretes |

**Nota:** A pagina de Configuracoes foi removida da navegacao. Todos os valores estao hardcoded conforme especificado.

---

## Dashboard

O dashboard mostra:

1. **Competencia Atual** — mes/ano, proximo pagamento, progresso com barra
2. **Cards de metricas** — Salario Base, Ganhos Semana, Dias Trabalhados, Dias Restantes
3. **Semana Atual** — destino, periodo, **dias clicaveis para edicao inline**
4. **Resumo Financeiro** — breakdown completo por regra com valores

### Edicao Inline dos Dias

Cada dia da semana no dashboard e clicavel. Ao clicar, abre um menu com opcoes:
- **Trabalho:** Porto, Lisboa, Algarve
- **Outros:** Feriado, Ferias, Falta
- **Limpar** — reseta o dia

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
4. Colar e executar `supabase/seed-rules.sql` (insere regras + atualiza settings)
5. Verificar se `settings.base_salary = 970` e `meal_allowance = 90`

---

## Proximos Passos

### Prioridade Alta

1. **Historico de competencias** — pagina que lista competencias anteriores com previsto vs recebido
2. **Auto-criar competencia** no 1o dia do mes (ja implementado `ensureCompetency`, precisa de trigger ou cron)
3. **Pagina de Pagamentos** — comparacao previsto vs recebido por competencia
4. **Update do total_earned** na tabela work_weeks ao salvar dias

### Prioridade Media

5. **Exportacao PDF/Excel**
6. **Notificacoes push** para lembretes
7. **Modo offline** (PWA completa)
8. **Upload de recibos** funcional

### Prioridade Baixa

9. **OCR para recibos**
10. **Integracao Google Calendar**
11. **App Mobile** (React Native)

---

## Notas Importantes

- **Build limpo** — `npm run build` passa sem erros
- **Auth trigger removido** — profile/settings criados client-side em `use-auth.ts`
- **Valores hardcoded** — base_salary=970, meal=90, payment_day=15, hora=5.31€, vale=4.50€
- **Feriados de Fafe** incluidos nos feriados municipais
- **Sexta-feira em Lisboa** = 20€ (nao 30€)
- **Competencia** = mes trabalhado, pagamento no 15 do mes seguinte
