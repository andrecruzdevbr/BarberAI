# BarberAI

Plataforma SaaS multi-barbearia para **agendamento online**, **gestão de agenda**, **clientes**, **serviços** e **equipe** — com assistente conversacional de agendamento (modo local no MVP).

## Problema que resolve

Barbearias perdem tempo no WhatsApp repetindo horários, serviços e confirmações. O BarberAI centraliza a operação: o cliente agenda pelo link público; o dono e a equipe gerenciam tudo em um painel responsivo.

## Funcionalidades prontas no MVP

| Área | Status |
|---|---|
| Cadastro de barbearia + owner (onboarding) | ✅ |
| Login JWT multi-tenant | ✅ |
| Papéis: owner, barber, receptionist | ✅ |
| CRUD clientes (owner/receptionist) | ✅ |
| CRUD serviços (owner) | ✅ |
| Equipe — barbeiros e recepcionistas (owner) | ✅ |
| Disponibilidade semanal por barbeiro | ✅ |
| Agenda interna + agendamento manual | ✅ |
| Agendamento público `/barbearia/[slug]` | ✅ |
| Assistente conversacional (modo local) | ✅ |
| Cliente criado automaticamente por WhatsApp no agendamento | ✅ |
| Prevenção de conflito de horário | ✅ |
| Interface responsiva (mobile/tablet/desktop) | ✅ |
| Confirmação automática por WhatsApp | ❌ requer integração Business |
| Pagamentos / voz / estoque / QR Code | ❌ roadmap |

## Arquitetura (resumo)

```
Frontend (Next.js :3000)  ──REST──►  Backend (FastAPI :8000)  ──SQL──►  PostgreSQL (:5432)
                                              │
                                              └── Assistente local (intenções + dados reais)
```

Monorepo: `frontend/`, `backend/app/`, `docs/`, `docker-compose.yml`.

Documentação adicional: [`docs/architecture.md`](docs/architecture.md), [`docs/product-brief.md`](docs/product-brief.md), [`docs/roadmap.md`](docs/roadmap.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Banco | PostgreSQL 16 |
| Infra local | Docker Compose |

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- Python 3.12+ (opcional se usar só Docker para API)
- Docker Desktop (recomendado para Postgres + API)

### 2. Variáveis de ambiente

**Backend** — copie e ajuste:

```bash
cp backend/.env.example backend/.env
```

Gere um `JWT_SECRET_KEY` forte para desenvolvimento. **Nunca commite `backend/.env`.**

**Frontend** — copie e ajuste:

```bash
cp frontend/.env.example frontend/.env.local
```

### 3. Docker (Postgres + API)

Na raiz do projeto:

```bash
docker compose up --build -d
docker compose ps
```

Aplique migrations (necessário na primeira subida):

```bash
docker compose exec backend alembic upgrade head
```

Validar:

```bash
curl http://localhost:8000/health
```

Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### 5. Build de produção (frontend)

```bash
cd frontend
npm run build
```

## Migrations

Cadeia atual (head única): `d4c7b1f9a260`

```bash
cd backend
alembic upgrade head    # aplicar
alembic current         # revisão atual
alembic heads           # deve listar apenas uma head
```

## Contas e papéis (teste local)

Após `POST /api/v1/auth/register`, você cria:

| Papel | Como obter |
|---|---|
| **owner** | Registro inicial da barbearia |
| **barber** | Owner cadastra em Equipe |
| **receptionist** | Owner cadastra em Equipe |

Use senhas fortes locais — **não use senhas reais no repositório**. Membros da equipe recebem senha temporária definida pelo owner no cadastro.

## Fluxos principais

### Dono da barbearia

1. Registrar barbearia → login
2. Configurar nome e WhatsApp (opcional) em Configurações
3. Cadastrar serviços, barbeiros e disponibilidade
4. Usar agenda para criar/cancelar agendamentos

### Cliente (público)

1. Abrir `/` ou `/barbearia/[slug]`
2. Conversar com o assistente (serviço, barbeiro, horário, nome, WhatsApp)
3. Confirmar — appointment aparece na agenda interna

## Assistente de agendamento

- **Modo padrão:** `BOOKING_AGENT_MODE=local` — interpretação por intenções/aliases, **não é um LLM externo**.
- **Modo LLM (futuro):** `BOOKING_AGENT_MODE=llm` + `BOOKING_AGENT_API_KEY` e URL do provedor.
- O assistente usa **apenas dados reais** do banco (serviços, barbeiros, slots).
- Botões apoiam a conversa; texto livre funciona em todas as etapas até a confirmação.

## WhatsApp

- Links `wa.me` para contato manual (clientes, equipe, barbearia).
- **Não há envio automático** de confirmação no MVP — depende de integração oficial WhatsApp Business (Meta).
- Flag `REQUIRE_BARBERSHOP_WHATSAPP_FOR_PUBLIC_BOOKING=false` por padrão (barbearia pode agendar sem WhatsApp cadastrado).

## Permissões (resumo)

| Ação | Owner | Receptionist | Barber |
|---|---|---|---|
| Configurações / serviços / equipe | ✅ | ❌ 403 | ❌ 403 |
| Clientes | ✅ | ✅ | ❌ 403 |
| Agenda completa | ✅ | ✅ | só próprios |
| Disponibilidade | ✅ | ❌ 403 | só a própria |
| Agendamento manual | ✅ | ✅ | ✅ (próprio) |

Isolamento multi-tenant: `barbershop_id` vem do JWT; usuários não acessam dados de outra barbearia (404/403).

## Limitações reais do MVP

- Assistente local — cobertura limitada a padrões de linguagem comuns.
- Sem deploy público incluído — ver [`docs/deployment-checklist.md`](docs/deployment-checklist.md).
- Sem confirmação WhatsApp automática, pagamentos, faturamento ou relatórios financeiros.
- Frontend e API rodam em processos separados (Compose sobe API + Postgres; frontend via `npm run dev`).

## Roadmap futuro

- Integração WhatsApp Business (confirmação e lembretes)
- Modo LLM para assistente
- QR Code do link de agendamento
- Deploy contínuo e ambientes staging/prod
- Finanças e analytics

## Deploy

Consulte [`docs/deployment-checklist.md`](docs/deployment-checklist.md) — variáveis, build, migrations, healthcheck e CORS.

## Licença

Projeto privado — BarberAI © 2026.
