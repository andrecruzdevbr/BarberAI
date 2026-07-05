"""Extração e persistência de contexto conversacional do agente."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from app.services.booking_agent.intent import (
    DetectedIntent,
    _extract_time_prefs,
    _match_catalog_item,
    _requested_service_concept,
    normalize_text,
    resolve_service_request,
)
from app.services.booking_agent.session import BookingSessionState

_WEEKDAY_NAMES = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
]

_PERIOD_LABELS = {
    "morning": "de manhã",
    "afternoon": "à tarde",
    "evening": "à noite",
}


@dataclass
class ParsedMessage:
    """Informações extraídas de uma mensagem livre."""

    service_intent: DetectedIntent | None = None
    pending_service_label: str | None = None
    barber_index: int | None = None
    barber_any: bool = False
    barber_query: str | None = None
    date_from: date | None = None
    weekday: int | None = None
    days: int | None = None
    period: str | None = None
    after_hour: int | None = None
    before_hour: int | None = None
    first_slot: bool = False
    requested_week: bool = False
    wants_booking: bool = False
    change_service: bool = False
    change_barber: bool = False
    change_slot: bool = False
    entities: dict[str, Any] = field(default_factory=dict)


def parse_message(
    message: str,
    *,
    services: list[dict[str, Any]] | None = None,
    barbers: list[dict[str, Any]] | None = None,
) -> ParsedMessage:
    """Extrai serviço, barbeiro, data e período de uma mensagem livre."""
    services = services or []
    barbers = barbers or []
    text = normalize_text(message)
    parsed = ParsedMessage()

    if message.startswith("action:"):
        return parsed

    from app.services.booking_agent.intent import _has_any

    parsed.wants_booking = _has_any(
        text,
        ("quero", "marcar", "agendar", "agenda", "reservar", "agendar um", "agenda um"),
    )
    parsed.change_service = _has_any(
        text,
        ("alterar servico", "mudar servico", "trocar servico", "trocar de servico", "outro servico"),
    )
    parsed.change_barber = _has_any(
        text,
        ("alterar barbeiro", "mudar barbeiro", "trocar barbeiro", "trocar de barbeiro", "outro barbeiro"),
    )
    parsed.change_slot = _has_any(
        text,
        ("alterar horario", "mudar horario", "trocar horario", "outro horario", "mudar o horario"),
    )

    if services:
        parsed.service_intent = resolve_service_request(message, services)
    else:
        concept, label = _requested_service_concept(text)
        if concept is not None:
            parsed.pending_service_label = label
            parsed.service_intent = DetectedIntent(
                name="service_not_available",
                entities={"requested_label": label, "pending_only": True},
            )

    barber_index = _match_catalog_item(text, barbers)
    if barber_index is not None:
        parsed.barber_index = barber_index
        parsed.barber_query = barbers[barber_index]["name"]
    elif _has_any(
        text,
        (
            "qualquer barbeiro",
            "qualquer um",
            "primeiro disponivel",
            "pode ser qualquer",
            "tanto faz",
            "qualquer um disponivel",
        ),
    ):
        parsed.barber_any = True

    temp = DetectedIntent(name="ask_availability")
    _extract_time_prefs(text, temp)
    parsed.date_from = temp.date_from
    parsed.weekday = temp.weekday
    parsed.days = temp.days
    parsed.period = temp.period
    parsed.after_hour = temp.after_hour
    parsed.before_hour = temp.before_hour
    parsed.first_slot = temp.first_slot
    parsed.requested_week = _has_any(
        text, ("proxima semana", "semana que vem", "semana seguinte")
    )

    return parsed


def has_booking_signals(parsed: ParsedMessage) -> bool:
    """True se a mensagem trouxe algo relevante para o agendamento."""
    if parsed.service_intent is not None:
        return True
    if parsed.pending_service_label:
        return True
    if parsed.barber_index is not None or parsed.barber_any:
        return True
    if any(
        [
            parsed.date_from,
            parsed.weekday is not None,
            parsed.after_hour is not None,
            parsed.before_hour is not None,
            parsed.first_slot,
            parsed.requested_week,
            parsed.period,
        ]
    ):
        return True
    return parsed.wants_booking


def apply_parsed_to_state(state: BookingSessionState, parsed: ParsedMessage) -> None:
    """Persiste informações extraídas sem apagar o que já estava definido."""
    if parsed.pending_service_label and not state.service_id:
        state.pending_service_query = parsed.pending_service_label
        state.booking_intent = state.booking_intent or "book"

    if parsed.service_intent is not None:
        if parsed.service_intent.name == "select_service":
            index = parsed.service_intent.entities.get("service_index")
            if index is not None and 0 <= index < len(state.services):
                svc = state.services[index]
                state.service_id = svc["id"]
                state.service_name = svc["name"]
                state.resolved_service_id = svc["id"]
                state.pending_service_query = None
                state.booking_intent = "book"
        elif parsed.service_intent.name == "service_not_available":
            label = parsed.service_intent.entities.get("requested_label")
            if label:
                state.pending_service_query = label
                state.booking_intent = "book"
        elif parsed.service_intent.name == "service_ambiguous":
            state.booking_intent = "book"

    if parsed.barber_index is not None and 0 <= parsed.barber_index < len(state.barbers):
        barber = state.barbers[parsed.barber_index]
        state.barber_id = barber["id"]
        state.barber_name = barber["name"]
        state.barber_any = False
        state.resolved_barber_id = barber["id"]
        state.pending_barber_query = barber["name"]
    elif parsed.barber_any:
        state.barber_any = True
        state.barber_id = None
        state.barber_name = "Qualquer barbeiro disponível"
        state.resolved_barber_id = None
        state.pending_barber_query = "qualquer barbeiro"

    if parsed.date_from is not None:
        state.requested_date = parsed.date_from
        state.pref_date_from = parsed.date_from
    if parsed.weekday is not None:
        state.requested_weekday = parsed.weekday
        state.pref_weekday = parsed.weekday
    if parsed.days is not None:
        state.pref_days = parsed.days
    if parsed.after_hour is not None:
        state.requested_after_hour = parsed.after_hour
        state.pref_after_hour = parsed.after_hour
    if parsed.before_hour is not None:
        state.requested_before_hour = parsed.before_hour
        state.pref_before_hour = parsed.before_hour
    if parsed.period is not None:
        state.requested_period = parsed.period
    if parsed.first_slot:
        state.pref_first_slot = True
    if parsed.requested_week:
        state.requested_week = True


def sync_legacy_fields(state: BookingSessionState) -> None:
    """Mantém campos legados alinhados ao contexto explícito."""
    if state.service_id:
        state.resolved_service_id = state.service_id
    if state.barber_id:
        state.resolved_barber_id = state.barber_id


def describe_noted_context(state: BookingSessionState) -> str | None:
    """Resume o que já foi anotado para respostas naturais."""
    parts: list[str] = []

    service_label = state.service_name or state.pending_service_query
    if service_label:
        parts.append(service_label)

    if state.barber_name and not state.barber_any:
        parts.append(f"com {state.barber_name}")
    elif state.barber_any:
        parts.append("com qualquer barbeiro")

    time_part = _describe_time_prefs(state)
    if time_part:
        parts.append(time_part)

    if not parts:
        return None

    if len(parts) == 1 and service_label and parts[0] == service_label:
        return f"Já anotei {service_label}"
    return "Já anotei " + " ".join(parts)


def _describe_time_prefs(state: BookingSessionState) -> str | None:
    if state.pref_first_slot:
        return "primeiro horário disponível"
    if state.requested_week or (
        state.pref_date_from and state.pref_days and state.pref_days >= 7
    ):
        return "para a próxima semana"
    if state.pref_date_from and state.pref_days and state.pref_days > 1:
        return "para esta semana"
    if state.requested_date or state.pref_date_from:
        d = state.requested_date or state.pref_date_from
        today = date.today()
        if d == today:
            return "para hoje"
        if d == today + timedelta(days=1):
            return "para amanhã"
        return f"a partir de {d.strftime('%d/%m')}"
    if state.requested_weekday is not None:
        return f"para {_WEEKDAY_NAMES[state.requested_weekday].lower()}"
    if state.requested_period:
        return _PERIOD_LABELS.get(state.requested_period, state.requested_period)
    if state.requested_after_hour is not None:
        return f"depois das {state.requested_after_hour}h"
    if state.requested_before_hour is not None:
        return f"antes das {state.requested_before_hour}h"
    return None


def describe_service_period(state: BookingSessionState) -> str:
    """Descreve serviço + período para confirmação parcial."""
    service = state.service_name or state.pending_service_query or "seu serviço"
    time_part = _describe_time_prefs(state)
    if time_part:
        return f"{service} {time_part}"
    return service


def clear_booking_context(state: BookingSessionState, *, keep_client: bool = False) -> None:
    """Limpa contexto de agendamento (cancelamento explícito)."""
    state.booking_intent = None
    state.pending_service_query = None
    state.resolved_service_id = None
    state.pending_barber_query = None
    state.resolved_barber_id = None
    state.service_id = None
    state.service_name = None
    state.barber_id = None
    state.barber_any = False
    state.barber_name = None
    state.selected_slot = None
    state.requested_date = None
    state.requested_weekday = None
    state.requested_week = False
    state.requested_after_hour = None
    state.requested_before_hour = None
    state.requested_period = None
    state.pref_date_from = None
    state.pref_weekday = None
    state.pref_after_hour = None
    state.pref_before_hour = None
    state.pref_first_slot = False
    state.pref_days = None
    state.current_slots = []
    state.week_date_from = None
    if not keep_client:
        state.client_name = None
        state.client_whatsapp = None
