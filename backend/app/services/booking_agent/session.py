"""Sessão em memória do agente de agendamento."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any
from uuid import UUID


@dataclass
class SlotSelection:
    """Horário selecionado na sessão."""

    barber_id: UUID
    barber_name: str
    starts_at: datetime
    ends_at: datetime
    label: str


@dataclass
class BookingSessionState:
    """Estado conversacional de uma sessão pública."""

    session_id: str
    barbershop_id: UUID | None = None
    slug: str | None = None
    barbershop_name: str | None = None
    step: str = "welcome"
    shop_choices: list[dict[str, Any]] = field(default_factory=list)
    service_id: UUID | None = None
    service_name: str | None = None
    barber_id: UUID | None = None
    barber_any: bool = False
    barber_name: str | None = None
    selected_slot: SlotSelection | None = None
    client_name: str | None = None
    client_whatsapp: str | None = None
    services: list[dict[str, Any]] = field(default_factory=list)
    barbers: list[dict[str, Any]] = field(default_factory=list)
    current_slots: list[SlotSelection] = field(default_factory=list)
    slots_view: str = "next5"
    week_date_from: date | None = None
    # Preferências de data/período informadas antes de ter serviço definido
    pref_date_from: date | None = None
    pref_weekday: int | None = None
    pref_after_hour: int | None = None
    pref_before_hour: int | None = None
    pref_first_slot: bool = False
    pref_days: int | None = None


_sessions: dict[str, BookingSessionState] = {}


def create_session(
    *,
    barbershop_id: UUID,
    slug: str,
    barbershop_name: str,
) -> BookingSessionState:
    """Cria nova sessão de agendamento com barbearia definida."""
    session_id = str(uuid.uuid4())
    state = BookingSessionState(
        session_id=session_id,
        barbershop_id=barbershop_id,
        slug=slug,
        barbershop_name=barbershop_name,
    )
    _sessions[session_id] = state
    return state


def create_home_session() -> BookingSessionState:
    """Cria sessão inicial da home sem barbearia definida."""
    session_id = str(uuid.uuid4())
    state = BookingSessionState(
        session_id=session_id,
        step="choose_barbershop",
    )
    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> BookingSessionState | None:
    """Recupera sessão existente."""
    return _sessions.get(session_id)


def delete_session(session_id: str) -> None:
    """Remove sessão após conclusão."""
    _sessions.pop(session_id, None)
