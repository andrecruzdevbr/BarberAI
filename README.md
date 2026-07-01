# BarberAI

Plataforma SaaS inteligente para gestão de barbearias — agendamentos, clientes, serviços, finanças e (futuro) automação com IA.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.12, FastAPI |
| Banco | PostgreSQL 16 |
| ORM / Migrações | SQLAlchemy, Alembic *(Dia 2+)* |
| Infra | Docker, Docker Compose |

## Estrutura do projeto

```
barberai/
├── frontend/          # Next.js (App Router)
├── backend/
│   └── app/           # API FastAPI
├── docs/              # Documentação do produto
├── docker-compose.yml
└── README.md
```

Documentação detalhada em [`docs/`](docs/):

- [Product Brief](docs/product-brief.md)
- [Arquitetura](docs/architecture.md)
- [Roadmap 7 dias](docs/roadmap.md)

## Pré-requisitos

- **Node.js** 20+ e npm
- **Python** 3.12+
- **Docker** e Docker Compose *(opcional, recomendado a partir do Dia 2)*

## Desenvolvimento local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### Backend

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Linux / macOS
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows — ou: cp .env.example .env

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Acesse:

- API: [http://localhost:8000](http://localhost:8000)
- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

### Docker Compose (Postgres + Backend)

```bash
# Na raiz do projeto
docker compose up --build
```

Serviços:

| Serviço | Porta | Descrição |
|---|---|---|
| `backend` | 8000 | API FastAPI |
| `postgres` | 5432 | PostgreSQL 16 |

> O frontend roda localmente com `npm run dev` no Dia 1. Integração via Docker será expandida no Dia 2+.

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste conforme necessário. **Nunca commite arquivos `.env` com segredos reais.**

## Autenticação e SaaS (Dia 3)

- **JWT** (HS256) com token Bearer e expiração configurável
- **Onboarding** — `POST /api/v1/auth/register` cria barbearia + usuário `owner` em transação única
- **Login** — `POST /api/v1/auth/login` e perfil em `GET /api/v1/auth/me`
- **Multi-barbearia** — cada usuário pertence a uma `Barbershop`; tenant vem do token, nunca do frontend
- **Papéis** — `owner`, `barber`, `receptionist`

Variáveis JWT em `backend/.env.example` (`JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`).

Frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` em `frontend/.env.example`.

## Status atual

- [x] Monorepo, Docker, PostgreSQL e modelos
- [x] Autenticação JWT e cadastro de barbearia
- [x] Telas iniciais: home, register, login, dashboard
- [ ] CRUD de serviços e clientes *(Dia 4)*
- [ ] Agenda funcional *(Dia 5)*

## Licença

Projeto privado — BarberAI © 2026.
