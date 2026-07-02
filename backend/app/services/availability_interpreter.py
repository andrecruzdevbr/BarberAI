"""Interpretação de disponibilidade em linguagem natural."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import time

from app.schemas.availability import AvailabilityInterpretResponse, AvailabilityInterpretSlot

WEEKDAY_MAP: dict[str, int] = {
    "segunda": 0,
    "segunda-feira": 0,
    "terca": 1,
    "terça": 1,
    "terca-feira": 1,
    "terça-feira": 1,
    "quarta": 2,
    "quarta-feira": 2,
    "quinta": 3,
    "quinta-feira": 3,
    "sexta": 4,
    "sexta-feira": 4,
    "sabado": 5,
    "sábado": 5,
    "domingo": 6,
}

WEEKDAY_NAMES = [
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
    "domingo",
]

EXAMPLE_MESSAGE = (
    "Exemplo: Atendo de segunda a sexta de 9h às 12h e de 13h às 18h. Sábado de 8h às 13h."
)

_TIME_PATTERN = re.compile(
    r"(\d{1,2})(?::(\d{2})|h)\s*(?:às|as|a)\s*(\d{1,2})(?::(\d{2})|h)?",
    re.IGNORECASE,
)

_RANGE_PATTERN = re.compile(
    r"(de\s+)?(?P<start_day>[a-záàâãéêíóôõúç\-]+(?:\s+e\s+[a-záàâãéêíóôõúç\-]+)?|"
    r"[a-záàâãéêíóôõúç\-]+(?:\s+a\s+[a-záàâãéêíóôõúç\-]+)?)"
    r"\s+de\s+",
    re.IGNORECASE,
)


class AvailabilityInterpreter(ABC):
    """Interface para interpretação de horários em linguagem natural."""

    @abstractmethod
    def interpret(self, message: str) -> AvailabilityInterpretResponse:
        """Interpreta mensagem e retorna slots propostos."""


def _parse_time(hour_str: str, minute_str: str | None) -> time | None:
    hour = int(hour_str)
    minute = int(minute_str) if minute_str else 0
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return time(hour, minute)


def _normalize_day_token(token: str) -> str:
    return token.strip().lower().replace("feira", "-feira").replace("--", "-")


def _expand_day_range(start_token: str, end_token: str) -> list[int] | None:
    start = WEEKDAY_MAP.get(_normalize_day_token(start_token))
    end = WEEKDAY_MAP.get(_normalize_day_token(end_token))
    if start is None or end is None:
        return None
    if start <= end:
        return list(range(start, end + 1))
    return list(range(start, 7)) + list(range(0, end + 1))


def _parse_days(day_expr: str) -> list[int]:
    expr = day_expr.strip().lower()
    expr = re.sub(r"^(de|atendo)\s+", "", expr)
    expr = expr.replace(" e ", ",")

    if " a " in expr:
        parts = expr.split(" a ", 1)
        expanded = _expand_day_range(parts[0].strip(), parts[1].strip())
        if expanded:
            return expanded

    days: list[int] = []
    for part in re.split(r"[,]", expr):
        token = part.strip()
        if not token:
            continue
        weekday = WEEKDAY_MAP.get(_normalize_day_token(token))
        if weekday is not None:
            days.append(weekday)
    return sorted(set(days))


def _find_overlaps(slots: list[AvailabilityInterpretSlot]) -> list[str]:
    warnings: list[str] = []
    by_weekday: dict[int, list[AvailabilityInterpretSlot]] = defaultdict(list)
    for slot in slots:
        by_weekday[slot.weekday].append(slot)

    for weekday, day_slots in by_weekday.items():
        sorted_slots = sorted(day_slots, key=lambda s: s.start_time)
        for index in range(len(sorted_slots) - 1):
            current = sorted_slots[index]
            nxt = sorted_slots[index + 1]
            if current.end_time > nxt.start_time:
                warnings.append(f"Horários sobrepostos em {WEEKDAY_NAMES[weekday]}.")
    return warnings


class LocalAvailabilityInterpreter(AvailabilityInterpreter):
    """Interpretação local limitada para frases simples em português."""

    def interpret(self, message: str) -> AvailabilityInterpretResponse:
        text = message.strip()
        lowered = text.lower()
        segments = re.split(r"[.;]\s*|\n+", lowered)
        segments = [s.strip() for s in segments if s.strip()]

        all_slots: list[AvailabilityInterpretSlot] = []
        warnings: list[str] = []
        parsed_any = False

        for segment in segments:
            segment_slots = self._parse_segment(segment)
            if segment_slots:
                parsed_any = True
                all_slots.extend(segment_slots)

        if not parsed_any:
            return AvailabilityInterpretResponse(
                slots=[],
                warnings=[],
                requires_confirmation=True,
                message=(
                    "Não foi possível entender os horários. "
                    f"{EXAMPLE_MESSAGE}"
                ),
            )

        for slot in all_slots:
            if slot.end_time <= slot.start_time:
                warnings.append(
                    f"Horário inválido em {WEEKDAY_NAMES[slot.weekday]}: "
                    "início deve ser anterior ao fim."
                )

        warnings.extend(_find_overlaps(all_slots))
        all_slots.sort(key=lambda s: (s.weekday, s.start_time))

        return AvailabilityInterpretResponse(
            slots=all_slots,
            warnings=warnings,
            requires_confirmation=True,
            message=None if not warnings else "Revise os horários antes de confirmar.",
        )

    def _parse_segment(self, segment: str) -> list[AvailabilityInterpretSlot]:
        slots: list[AvailabilityInterpretSlot] = []

        day_match = re.search(
            r"(?:atendo\s+)?(?:de\s+)?(.+?)\s+de\s+(.+)",
            segment,
            re.IGNORECASE,
        )
        if not day_match:
            return slots

        days_part = day_match.group(1)
        times_part = day_match.group(2)
        weekdays = _parse_days(days_part)
        if not weekdays:
            return slots

        time_matches = list(_TIME_PATTERN.finditer(times_part))
        if not time_matches:
            return slots

        for match in time_matches:
            start = _parse_time(match.group(1), match.group(2))
            end = _parse_time(match.group(3), match.group(4))
            if start is None or end is None:
                continue
            for weekday in weekdays:
                slots.append(
                    AvailabilityInterpretSlot(
                        weekday=weekday,
                        start_time=start,
                        end_time=end,
                        is_active=True,
                    ),
                )
        return slots


_default_interpreter = LocalAvailabilityInterpreter()


def interpret_availability_message(message: str) -> AvailabilityInterpretResponse:
    """Interpreta mensagem usando o interpretador local padrão."""
    return _default_interpreter.interpret(message)
