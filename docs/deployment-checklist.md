# Checklist de deploy — BarberAI MVP

Use este guia ao publicar o MVP em staging ou produção. **Não há deploy público configurado neste repositório** — adapte conforme sua plataforma (VPS, Railway, Render, Fly.io, etc.).

## Pré-requisitos

- [ ] PostgreSQL 16+ gerenciado (não usar credenciais padrão `barberai/barberai` em produção)
- [ ] Domínio ou subdomínio para frontend e API
- [ ] `JWT_SECRET_KEY` forte gerada (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)
- [ ] `backend/.env` e variáveis do frontend **fora do Git**

## Backend (FastAPI)

### Build

```bash
cd backend
docker build -t barberai-api .
```

Ou deploy via `docker-compose.yml` apontando `DATABASE_URL` para o Postgres externo.

### Migrations (obrigatório antes do tráfego)

O container **não** aplica migrations automaticamente. Execute uma vez por release:

```bash
cd backend
alembic upgrade head
```

Dentro do container:

```bash
docker compose exec backend alembic upgrade head
```

Validar:

```bash
alembic current   # deve ser d4c7b1f9a260 (head)
alembic heads     # apenas uma head
```

### Variáveis de ambiente (produção)

| Variável | Obrigatória | Notas |
|---|---|---|
| `DATABASE_URL` | Sim | `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET_KEY` | Sim | Segredo único por ambiente |
| `JWT_ALGORITHM` | Sim | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Sim | ex.: `480` |
| `CORS_ORIGINS` | Sim | URL(s) do frontend, separadas por vírgula |
| `APP_ENV` | Sim | `production` |
| `APP_DEBUG` | Sim | `false` |
| `BOOKING_AGENT_MODE` | Sim | `local` (MVP) ou `llm` com credenciais |
| `BOOKING_AGENT_API_KEY` | Se LLM | Apenas com modo `llm` |
| `REQUIRE_BARBERSHOP_WHATSAPP_FOR_PUBLIC_BOOKING` | Não | `false` no MVP |

### Healthcheck

```bash
curl https://sua-api.example.com/health
```

Resposta esperada (200):

```json
{"status":"ok","service":"barberai-api","database":"ok"}
```

503 indica API no ar mas banco indisponível.

## Frontend (Next.js)

### Build

```bash
cd frontend
npm ci
npm run build
npm run start
```

### Variáveis

| Variável | Obrigatória | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sim | URL pública da API **com** `/api/v1` |

Exemplo: `https://api.seudominio.com/api/v1`

### CORS

Inclua a origem exata do frontend em `CORS_ORIGINS` do backend (protocolo + domínio + porta se houver).

## Pós-deploy (smoke test)

- [ ] `GET /health` → 200 + `database: ok`
- [ ] Registro de barbearia de teste → login → dashboard
- [ ] Agendamento público em `/barbearia/[slug]` até confirmação
- [ ] Conflito de horário retorna mensagem amigável (409 no agente)
- [ ] Slug inválido → 404 no frontend/API
- [ ] Barbearia incompleta → mensagem de indisponível (sem UUID exposto ao cliente)

## Segurança

- [ ] `.env` não versionado (`git check-ignore backend/.env`)
- [ ] Postgres não exposto publicamente sem firewall
- [ ] HTTPS em frontend e API
- [ ] Rotação de `JWT_SECRET_KEY` documentada (invalida sessões ativas)

## Limitações conhecidas do MVP

- **WhatsApp automático** não envia mensagens — requer integração oficial (Meta WhatsApp Business API).
- **Assistente** opera em modo **local** (regex/intenções) por padrão; LLM externo exige `BOOKING_AGENT_MODE=llm` e credenciais.
- **Sem pagamentos**, voz, estoque ou QR Code público.

## Rollback

1. Reverter imagem/container do backend para tag anterior.
2. Reverter frontend para build anterior.
3. **Não** executar `alembic downgrade` em produção sem plano — preferir migration corretiva forward-only.
