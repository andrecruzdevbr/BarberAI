# BarberAI — Arquitetura Inicial

## Visão geral

Monorepo com frontend e backend separados, comunicação via REST API. Banco PostgreSQL compartilhado pelo backend. Preparado para containerização com Docker Compose.

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     SQL      ┌─────────────┐
│   Frontend  │ ◄───────────────► │   Backend   │ ◄───────────► │  PostgreSQL │
│  Next.js    │   localhost:3000  │   FastAPI   │              │             │
│  :3000      │                   │   :8000     │              │   :5432     │
└─────────────┘                   └──────┬──────┘              └─────────────┘
                                         │
                                         ▼ (futuro)
                                  ┌─────────────┐
                                  │  Módulo AI  │
                                  │  WhatsApp   │
                                  └─────────────┘
```

## Estrutura de pastas

```
barberai/
├── frontend/          # Next.js (App Router) — UI do produto
├── backend/
│   └── app/
│       ├── api/       # Rotas HTTP (controllers)
│       ├── core/      # Config, segurança, dependências globais
│       ├── models/    # Entidades SQLAlchemy
│       ├── schemas/   # DTOs Pydantic (request/response)
│       ├── services/  # Regras de negócio
│       ├── ai/        # Integrações de IA (futuro)
│       └── main.py    # Entry point FastAPI
├── docs/              # Documentação do produto e engenharia
├── docker-compose.yml # Orquestração local
└── README.md
```

## Camadas do backend

| Camada | Responsabilidade |
|---|---|
| `api/` | Recebe HTTP, valida entrada, delega ao service, retorna response |
| `schemas/` | Contratos tipados (Pydantic) — nunca expor model ORM diretamente |
| `services/` | Regras de negócio, orquestração, transações |
| `models/` | Mapeamento ORM (SQLAlchemy) — tabelas e relacionamentos |
| `core/` | Settings, DB session, middleware, utilitários transversais |
| `ai/` | Prompts, agents, integrações externas (OpenAI, WhatsApp API) |

**Fluxo de uma requisição (futuro):**

```
Request → api/router → schema (validação) → service → model/DB → schema (response) → Response
```

## Frontend

- **Next.js 16** com App Router (`src/app/`)
- **TypeScript** strict mode
- **Tailwind CSS v4** via PostCSS
- Alias `@/*` → `src/*`
- Comunicação com backend via `fetch` ou cliente HTTP (a definir no Dia 2+)

## Banco de dados (Dia 2+)

- PostgreSQL 16 via Docker Compose
- SQLAlchemy 2.x (declarative style)
- Alembic para migrações versionadas
- Convenção: snake_case nas tabelas e colunas

## Autenticação (futuro)

- JWT access token (Bearer)
- Refresh token opcional em fase posterior
- Middleware FastAPI para rotas protegidas
- Contexto de tenant (barbearia_id) em todo request autenticado

## Docker

| Serviço | Imagem / Build | Porta |
|---|---|---|
| `frontend` | Build `frontend/` | 3000 |
| `backend` | Build `backend/` | 8000 |
| `postgres` | `postgres:16-alpine` | 5432 |

Volumes nomeados para persistência do PostgreSQL. Variáveis sensíveis via `.env` (nunca commitadas).

## Decisões técnicas (Dia 1)

1. **Monorepo** — um repositório Git na raiz; frontend sem `.git` próprio
2. **FastAPI factory** — `create_app()` facilita testes e múltiplos ambientes
3. **pydantic-settings** — configuração tipada e validada por ambiente
4. **Dependências comentadas** — SQLAlchemy, Alembic e JWT no `requirements.txt`, ativados no Dia 2
5. **Health check** — `/health` para validação de deploy e Docker

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Escopo do MVP crescer demais | Roadmap de 7 dias com entregas diárias |
| Acoplamento frontend ↔ backend | Schemas Pydantic como contrato; OpenAPI auto-gerada |
| Dados sensíveis em repositório | `.gitignore` + `.env.example` sem segredos reais |
