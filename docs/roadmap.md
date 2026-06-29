# BarberAI — Roadmap (7 dias)

Plano de execução do MVP técnico. Cada dia tem entrega verificável e escopo fechado.

---

## Dia 1 — Fundação do projeto ✅

**Objetivo:** Estrutura profissional do monorepo, documentação e scaffold mínimo.

- [x] Inspecionar frontend Next.js existente (não recriar)
- [x] Criar estrutura backend (`app/`, pacotes, `main.py`)
- [x] Endpoint `/health` funcional
- [x] Documentação: product-brief, architecture, roadmap
- [x] `.gitignore`, `README.md`, `docker-compose.yml`
- [x] Preparação Docker (Dockerfile backend, Postgres no compose)

**Entrega:** Projeto clonável, documentado e com API respondendo `{"status": "ok"}`.

---

## Dia 2 — Banco de dados e modelos base ✅

**Objetivo:** PostgreSQL conectado, primeiras entidades e migrações.

- [x] Ativar SQLAlchemy, Alembic e psycopg[binary] no `requirements.txt`
- [x] Configurar `DATABASE_URL` e session factory em `core/database.py`
- [x] Modelos: `Barbershop`, `User`, `Service`, `Client`, `Appointment`
- [x] Enums PostgreSQL: `user_role`, `appointment_status`
- [x] Primeira migração Alembic (`72bef4528e3d_initial_schema`)
- [x] Subir stack com `docker compose up --build -d`
- [x] Health check com `SELECT 1` retornando `database: ok`

**Entrega:** Tabelas criadas via migração; backend conecta ao Postgres.

---

## Dia 3 — Autenticação JWT

**Objetivo:** Login seguro para o dono da barbearia.

- [ ] Schema e service de registro/login
- [ ] Hash de senha (passlib/bcrypt)
- [ ] Geração e validação de JWT
- [ ] Dependency `get_current_user` para rotas protegidas
- [ ] Rotas: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Entrega:** Usuário consegue se registrar, logar e acessar rota protegida.

---

## Dia 4 — CRUD de serviços e clientes

**Objetivo:** Primeiras funcionalidades de negócio via API.

- [ ] CRUD `/services` (nome, duração, preço, ativo)
- [ ] CRUD `/clients` (nome, telefone, observações)
- [ ] Paginação e filtros básicos
- [ ] Isolamento por barbearia (tenant_id no token)

**Entrega:** API documentada no Swagger com CRUD completo de serviços e clientes.

---

## Dia 5 — Agenda (appointments)

**Objetivo:** Núcleo do produto — gestão de horários.

- [ ] CRUD `/appointments` com validação de conflito de horário
- [ ] Status: agendado, confirmado, cancelado, concluído
- [ ] Listagem por dia/semana/barbeiro
- [ ] Relacionamentos: client, service, barber

**Entrega:** Agenda funcional via API; conflitos de horário rejeitados.

---

## Dia 6 — Frontend: layout e integração API

**Objetivo:** UI base conectada ao backend.

- [ ] Layout autenticado (sidebar, header)
- [ ] Páginas: login, dashboard placeholder, serviços, clientes, agenda
- [ ] Cliente HTTP tipado (`lib/api.ts`)
- [ ] Tratamento de erros e loading states
- [ ] Renomear metadata para "BarberAI"

**Entrega:** Fluxo login → dashboard → listagem de serviços funcionando ponta a ponta.

---

## Dia 7 — Financeiro básico, dashboard e polish

**Objetivo:** Fechar MVP utilizável e revisar qualidade.

- [ ] Lançamentos financeiros (receita/despesa) via API
- [ ] Dashboard: faturamento do mês, agendamentos hoje, total clientes
- [ ] Revisão de lint, tipos e README com comandos atualizados
- [ ] Smoke test completo (Docker Compose end-to-end)
- [ ] Backlog priorizado para fase IA/WhatsApp

**Entrega:** MVP demonstrável para um dono de barbearia usar no dia a dia.

---

## Backlog pós-MVP (IA e automações)

1. Integração WhatsApp Business API
2. Bot de agendamento com LLM
3. Lembretes automáticos (24h antes)
4. Relatórios avançados e exportação
5. Multi-barbearia / planos SaaS
6. App mobile (PWA ou React Native)
