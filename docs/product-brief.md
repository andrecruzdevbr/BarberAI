# BarberAI — Product Brief

## Visão

O **BarberAI** é uma plataforma SaaS inteligente para gestão de barbearias pequenas e médias. Centraliza agendamentos, clientes, serviços e finanças em um único sistema, com base preparada para automações e integração futura com Inteligência Artificial.

## Público-alvo

- Donos de barbearias com 1 a 10 cadeiras
- Equipes que hoje operam via WhatsApp, caderno ou planilhas
- Negócios que precisam de visão financeira e histórico de clientes sem complexidade de ERP

## Problemas que resolve

| Problema atual | Solução BarberAI |
|---|---|
| Agendamentos manuais no WhatsApp | Agenda centralizada com confirmação e histórico |
| Clientes, horários e serviços desorganizados | Cadastro unificado e busca rápida |
| Falta de histórico dos clientes | Ficha do cliente com visitas, serviços e preferências |
| Controle financeiro manual | Registro de entradas, saídas e relatórios básicos |
| Falta de indicadores para o dono | Dashboard com métricas essenciais do negócio |
| Atendimento repetitivo no WhatsApp | *(Futuro)* IA para triagem, agendamento e respostas automáticas |

## Funcionalidades do MVP

1. **Autenticação** — login do dono/barbeiro (JWT)
2. **Barbearia** — cadastro da unidade e configurações básicas
3. **Serviços** — catálogo com nome, duração e preço
4. **Clientes** — cadastro, busca e histórico de atendimentos
5. **Agenda** — criar, editar, cancelar e visualizar horários
6. **Financeiro básico** — lançamentos de receita e despesa
7. **Dashboard** — indicadores: faturamento, agendamentos do dia, clientes ativos

## Funcionalidades futuras com IA

- Assistente conversacional no WhatsApp para agendar, remarcar e confirmar horários
- Sugestão de horários com base em padrões de demanda
- Lembretes automáticos personalizados para clientes
- Resumo inteligente do histórico do cliente antes do atendimento
- Análise de tendências (serviços mais vendidos, horários de pico, churn)

## Stack utilizada

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Banco de dados | PostgreSQL |
| ORM | SQLAlchemy |
| Migrações | Alembic |
| Autenticação | JWT (futuro) |
| Infraestrutura | Docker, Docker Compose |

## Princípios do produto

- **Simples primeiro** — barbeiro usa no celular entre um cliente e outro
- **Confiável** — dados do cliente e da agenda nunca se perdem
- **Evolutivo** — arquitetura pronta para IA sem reescrever o core
- **Multi-tenant ready** — cada barbearia isolada dos dados das demais (fase posterior)
