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

## Status atual (Dia 1)

- [x] Monorepo estruturado
- [x] Frontend Next.js existente preservado
- [x] Backend scaffold com health check
- [x] Documentação inicial
- [x] Docker Compose preparado
- [ ] Banco de dados e modelos *(Dia 2)*
- [ ] Autenticação JWT *(Dia 3)*
- [ ] Telas e integração completa *(Dia 6)*

## Licença

Projeto privado — BarberAI © 2026.
