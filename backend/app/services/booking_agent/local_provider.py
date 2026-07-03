"""Provedor local conversacional — intenções + dados reais."""

from __future__ import annotations

import re
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.phone import normalize_and_validate_whatsapp
from app.models.barbershop import Barbershop
from app.schemas.booking_agent import (
    BookingAgentChoice,
    BookingAgentResponse,
    BookingSlotCard,
    BookingSummary,
)
from app.services.booking_agent import tools
from app.services.booking_agent.intent import DetectedIntent, detect_shop_intent
from app.services.booking_agent.provider import BookingAgentProvider
from app.services.booking_agent.session import BookingSessionState, SlotSelection
from app.services.public_booking import INCOMPLETE_BOOKING_MESSAGE, check_booking_readiness

TZ = ZoneInfo("America/Sao_Paulo")

_WEEKDAY_NAMES = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
]


def _format_price(price: str) -> str:
    """Formata preço em reais: '45.00' -> 'R$ 45,00'."""
    try:
        value = float(price)
    except (TypeError, ValueError):
        return f"R$ {price}"
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"


class LocalBookingAgentProvider(BookingAgentProvider):
    """Fluxo conversacional baseado em intenções e dados reais."""

    def handle_message(
        self,
        db: Session,
        barbershop: Barbershop,
        state: BookingSessionState,
        message: str,
    ) -> BookingAgentResponse:
        ready, _ = check_booking_readiness(db, barbershop.id)
        self._ensure_catalog(db, state)

        if not ready:
            return self._handle_incomplete(barbershop, state, message)

        intent = detect_shop_intent(
            message,
            step=state.step,
            services=state.services,
            barbers=state.barbers,
        )
        return self._dispatch(db, barbershop, state, intent, message)

    def _ensure_catalog(self, db: Session, state: BookingSessionState) -> None:
        if state.barbershop_id is None or state.slug is None:
            return
        if not state.services:
            state.services = tools.list_active_services(db, state.barbershop_id)
        if not state.barbers:
            state.barbers = tools.list_active_barbers(db, state.slug)

    def _handle_incomplete(
        self,
        barbershop: Barbershop,
        state: BookingSessionState,
        message: str,
    ) -> BookingAgentResponse:
        intent = detect_shop_intent(message, step=state.step, services=[], barbers=[])
        if intent.name == "contact_barbershop":
            return self._contact_response(barbershop, state)
        if intent.name in ("greeting", "help", "unknown") or message in ("", "__start__"):
            state.step = "unavailable"
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message=INCOMPLETE_BOOKING_MESSAGE,
                step="unavailable",
                choices=self._contact_choices(barbershop),
            )
        state.step = "unavailable"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=INCOMPLETE_BOOKING_MESSAGE,
            step="unavailable",
            choices=self._contact_choices(barbershop),
        )

    def _dispatch(
        self,
        db: Session,
        barbershop: Barbershop,
        state: BookingSessionState,
        intent: DetectedIntent,
        message: str,
    ) -> BookingAgentResponse:
        handlers = {
            "greeting": lambda: self._welcome(db, state),
            "help": lambda: self._help(state),
            "list_services": lambda: self._list_services(state),
            "ask_service_price": lambda: self._list_prices(state, intent),
            "select_service": lambda: self._select_service(db, state, intent.entities.get("service_index")),
            "service_ambiguous": lambda: self._service_ambiguous(state, intent.entities.get("service_indices", [])),
            "service_not_available": lambda: self._service_not_available(
                state, intent.entities.get("requested_label")
            ),
            "list_barbers": lambda: self._list_barbers(state),
            "select_barber": lambda: self._select_barber(db, state, intent.entities.get("barber_index")),
            "any_available_barber": lambda: self._select_barber_any(db, state),
            "ask_availability": lambda: self._ask_availability(db, state, intent),
            "select_slot": lambda: self._select_slot(state, intent.entities.get("index")),
            "week_view": lambda: self._show_slots(db, state, view="week"),
            "next_week": lambda: self._next_week(db, state),
            "provide_name": lambda: self._provide_name(state, intent.entities.get("value", message)),
            "provide_whatsapp": lambda: self._provide_whatsapp(state, intent.entities.get("value", message)),
            "confirm_booking": lambda: self._confirm(db, barbershop, state),
            "propose_service_change": lambda: self._propose_service_change(
                state, intent.entities.get("service_index")
            ),
            "change_service_menu": lambda: self._change_service_menu(state),
            "change_barber_menu": lambda: self._change_barber_menu(state),
            "keep_appointment": lambda: self._keep_appointment(state),
            "confirm_context_help": lambda: self._confirm_context_help(state),
            "cancel_flow": lambda: self._cancel_flow(db, state),
            "cancel_policy": lambda: self._cancel_policy(barbershop, state),
            "contact_barbershop": lambda: self._contact_response(barbershop, state),
            "unknown": lambda: self._unknown(state),
        }
        handler = handlers.get(intent.name, lambda: self._unknown(state))
        return handler()

    def _welcome(self, db: Session, state: BookingSessionState) -> BookingAgentResponse:
        self._ensure_catalog(db, state)
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                f"Olá, eu sou a assistente da {state.barbershop_name}.\n\n"
                "Vou te ajudar a encontrar um horário disponível.\n\n"
                "Qual serviço você deseja?"
            ),
            step=state.step,
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _help(self, state: BookingSessionState) -> BookingAgentResponse:
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Posso ajudar a encontrar um horário, mostrar serviços, preços, "
                "barbeiros ou o WhatsApp da barbearia.\n\n"
                'Por exemplo: "Quero cabelo amanhã à tarde".'
            ),
            step=state.step or "choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _unknown(self, state: BookingSessionState) -> BookingAgentResponse:
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Posso ajudar a encontrar um horário, mostrar serviços, preços, "
                "barbeiros ou falar com a barbearia.\n\n"
                'Por exemplo: "Quero cabelo amanhã à tarde".'
            ),
            step=state.step or "choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _list_services(self, state: BookingSessionState) -> BookingAgentResponse:
        if not state.services:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="No momento não há serviços ativos cadastrados.",
                step=state.step,
                booking_summary=self._summary(state),
            )
        lines = ["Estes são os serviços disponíveis:"]
        for service in state.services:
            lines.append(
                f"• {service['name']} — {service['duration_minutes']} min — R$ {service['price']}",
            )
        lines.append("\nQual serviço você deseja?")
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="\n".join(lines),
            step=state.step,
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _list_prices(self, state: BookingSessionState, intent: DetectedIntent) -> BookingAgentResponse:
        index = intent.entities.get("service_index")
        if index is not None and 0 <= index < len(state.services):
            service = state.services[index]
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message=(
                    f"{service['name']} custa R$ {service['price']} "
                    f"e dura cerca de {service['duration_minutes']} minutos.\n\n"
                    "Quer agendar esse serviço?"
                ),
                step=state.step or "choose_service",
                choices=[BookingAgentChoice(label=service["name"], action=f"svc:{index}")],
                booking_summary=self._summary(state),
            )
        return self._list_services(state)

    def _list_barbers(self, state: BookingSessionState) -> BookingAgentResponse:
        if not state.barbers:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="No momento não há barbeiros ativos cadastrados.",
                step=state.step,
                booking_summary=self._summary(state),
            )
        names = ", ".join(b["name"] for b in state.barbers)
        state.step = "choose_barber" if state.service_id else state.step
        choices = [BookingAgentChoice(label="Qualquer barbeiro disponível", action="barber:any")]
        choices.extend(
            BookingAgentChoice(label=b["name"], action=f"barber:{i}")
            for i, b in enumerate(state.barbers)
        )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                f"Os barbeiros que atendem são: {names}.\n\n"
                "Você pode escolher um ou preferir qualquer barbeiro disponível."
            ),
            step=state.step or "choose_barber",
            choices=choices,
            booking_summary=self._summary(state),
        )

    def _select_service(
        self,
        db: Session,
        state: BookingSessionState,
        index: int | None,
    ) -> BookingAgentResponse:
        if index is None or index < 0 or index >= len(state.services):
            return self._list_services(state)
        service = state.services[index]
        state.service_id = service["id"]
        state.service_name = service["name"]
        state.selected_slot = None
        if not state.barbers:
            state.barbers = tools.list_active_barbers(db, state.slug)

        # Se já sabemos o barbeiro (ou o cliente pediu período antes), avançamos direto.
        if state.barber_id is not None or state.barber_any or self._has_prefs(state):
            if state.barber_id is None and not state.barber_any:
                state.barber_any = True
                state.barber_name = "Primeiro horário disponível"
            return self._show_filtered_slots(db, state)

        state.step = "choose_barber"
        return self._barber_prompt(state)

    def _barber_prompt(self, state: BookingSessionState) -> BookingAgentResponse:
        choices = [
            BookingAgentChoice(label=b["name"], action=f"barber:{i}")
            for i, b in enumerate(state.barbers)
        ]
        choices.append(BookingAgentChoice(label="Primeiro disponível", action="barber:any"))
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Boa escolha.\n\n"
                "Você prefere algum barbeiro específico ou quer o primeiro horário disponível?"
            ),
            step="choose_barber",
            choices=choices,
            booking_summary=self._summary(state),
        )

    def _period_prompt(self, state: BookingSessionState) -> BookingAgentResponse:
        barber_label = state.barber_name or "qualquer barbeiro"
        state.step = "choose_period"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                f"Perfeito. Vou procurar horários para {barber_label}.\n\n"
                "Você prefere algum dia ou período?"
            ),
            step="choose_period",
            choices=[
                BookingAgentChoice(label="Hoje", action="period:today"),
                BookingAgentChoice(label="Amanhã", action="period:tomorrow"),
                BookingAgentChoice(label="Esta semana", action="period:this_week"),
                BookingAgentChoice(label="Sábado", action="period:saturday"),
                BookingAgentChoice(label="Primeiro horário disponível", action="period:first"),
            ],
            booking_summary=self._summary(state),
        )

    def _select_barber_any(self, db: Session, state: BookingSessionState) -> BookingAgentResponse:
        if state.service_id is None:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Claro! Antes disso, me diga qual serviço você deseja.",
                step="choose_service",
                choices=self._service_choices(state),
                booking_summary=self._summary(state),
            )
        state.barber_any = True
        state.barber_id = None
        state.barber_name = "Primeiro horário disponível"
        state.selected_slot = None
        self._clear_prefs(state)
        return self._show_filtered_slots(db, state)

    def _select_barber(
        self,
        db: Session,
        state: BookingSessionState,
        index: int | None,
    ) -> BookingAgentResponse:
        if index is None or index < 0 or index >= len(state.barbers):
            return self._list_barbers(state)
        barber = state.barbers[index]
        state.barber_any = False
        state.barber_id = barber["id"]
        state.barber_name = barber["name"]
        state.selected_slot = None

        if state.service_id is None:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message=(
                    f"Combinado, será com {barber['name']}.\n\n"
                    "Qual serviço você deseja?"
                ),
                step="choose_service",
                choices=self._service_choices(state),
                booking_summary=self._summary(state),
            )

        if self._has_prefs(state):
            return self._show_filtered_slots(db, state)
        return self._period_prompt(state)

    def _ask_availability(
        self,
        db: Session,
        state: BookingSessionState,
        intent: DetectedIntent,
    ) -> BookingAgentResponse:
        service_index = intent.entities.get("service_index")
        if service_index is not None and 0 <= service_index < len(state.services):
            service = state.services[service_index]
            state.service_id = service["id"]
            state.service_name = service["name"]

        barber_index = intent.entities.get("barber_index")
        if barber_index is not None and 0 <= barber_index < len(state.barbers):
            barber = state.barbers[barber_index]
            state.barber_any = False
            state.barber_id = barber["id"]
            state.barber_name = barber["name"]
        elif intent.entities.get("any_barber"):
            state.barber_any = True
            state.barber_id = None
            state.barber_name = "Primeiro horário disponível"

        self._store_prefs(state, intent)

        # Sem serviço ainda: guardamos barbeiro e preferências e pedimos o serviço.
        if state.service_id is None:
            hints = []
            if state.barber_id is not None:
                hints.append(f"com {state.barber_name}")
            if self._prefs_label(state):
                hints.append(self._prefs_label(state))
            extra = f" ({', '.join(hints)})" if hints else ""
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message=(
                    f"Claro, já anotei sua preferência{extra}.\n\n"
                    "Só preciso saber qual serviço você deseja:"
                ),
                step="choose_service",
                choices=self._service_choices(state),
                booking_summary=self._summary(state),
            )

        if state.barber_id is None and not state.barber_any:
            state.barber_any = True
            state.barber_name = "Primeiro horário disponível"

        return self._show_filtered_slots(db, state)

    def _has_prefs(self, state: BookingSessionState) -> bool:
        return any(
            [
                state.pref_date_from is not None,
                state.pref_weekday is not None,
                state.pref_after_hour is not None,
                state.pref_before_hour is not None,
                state.pref_first_slot,
            ]
        )

    def _store_prefs(self, state: BookingSessionState, intent: DetectedIntent) -> None:
        state.pref_date_from = intent.date_from
        state.pref_weekday = intent.weekday
        state.pref_after_hour = intent.after_hour
        state.pref_before_hour = intent.before_hour
        state.pref_first_slot = intent.first_slot
        state.pref_days = intent.days

    def _clear_prefs(self, state: BookingSessionState) -> None:
        state.pref_date_from = None
        state.pref_weekday = None
        state.pref_after_hour = None
        state.pref_before_hour = None
        state.pref_first_slot = False
        state.pref_days = None

    def _prefs_label(self, state: BookingSessionState) -> str | None:
        if state.pref_first_slot:
            return "primeiro horário disponível"
        if state.pref_date_from is not None:
            return f"a partir de {state.pref_date_from.strftime('%d/%m')}"
        if state.pref_weekday is not None:
            return _WEEKDAY_NAMES[state.pref_weekday]
        return None

    def _show_filtered_slots(
        self,
        db: Session,
        state: BookingSessionState,
    ) -> BookingAgentResponse:
        state.selected_slot = None
        state.step = "choose_slot"

        first = state.pref_first_slot
        date_from = state.pref_date_from
        weekday = state.pref_weekday
        after_hour = state.pref_after_hour
        before_hour = state.pref_before_hour
        days = state.pref_days
        had_filter = self._has_prefs(state)

        if first:
            base = date_from or date.today()
            days = days or 14
        elif date_from is not None:
            base = date_from
            days = days or 1
        elif weekday is not None:
            base = self._next_weekday(weekday)
            days = days or 1
        else:
            base = None

        state.week_date_from = base
        if base is None and not first:
            slots = tools.fetch_available_slots(db, state, view="next5")
        else:
            slots = tools.fetch_available_slots(
                db, state, view="week", date_from=base, days=days, limit=60
            )

        if weekday is not None:
            slots = [s for s in slots if s.starts_at.astimezone(TZ).weekday() == weekday]
        if after_hour is not None:
            slots = [s for s in slots if s.starts_at.astimezone(TZ).hour >= after_hour]
        if before_hour is not None:
            slots = [s for s in slots if s.starts_at.astimezone(TZ).hour < before_hour]

        slots = slots[:1] if first else slots[:5]

        if not slots:
            self._clear_prefs(state)
            broader = tools.fetch_available_slots(db, state, view="next5", date_from=None)
            if broader:
                state.current_slots = broader[:5]
                return BookingAgentResponse(
                    session_id=state.session_id,
                    assistant_message=(
                        "Não encontrei horário nesse período.\n\n"
                        "Mas separei os próximos disponíveis:"
                    ),
                    step="choose_slot",
                    slot_cards=self._slot_cards(state),
                    choices=self._slot_choices(),
                    booking_summary=self._summary(state),
                )
            state.current_slots = []
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message=(
                    "Ainda não encontrei horários abertos por aqui.\n\n"
                    "Quer que eu veja a próxima semana?"
                ),
                step="choose_slot",
                choices=[BookingAgentChoice(label="Ver próxima semana", action="view_next_week")],
                booking_summary=self._summary(state),
            )

        state.current_slots = slots
        self._clear_prefs(state)
        if first:
            intro = "O primeiro horário disponível é este. É só tocar para escolher:"
        elif had_filter:
            intro = "Encontrei estes horários para você. Qual deles você prefere?"
        else:
            intro = "Encontrei estes horários para você. Qual deles você prefere?"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=intro,
            step="choose_slot",
            slot_cards=self._slot_cards(state),
            choices=self._slot_choices(),
            booking_summary=self._summary(state),
        )

    def _next_weekday(self, weekday: int) -> date:
        today = date.today()
        delta = (weekday - today.weekday()) % 7
        return today + timedelta(days=delta)

    def _next_week(self, db: Session, state: BookingSessionState) -> BookingAgentResponse:
        if state.service_id is None:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Para ver horários, escolha um serviço primeiro.",
                step="choose_service",
                choices=self._service_choices(state),
            )
        if not state.barber_any and state.barber_id is None:
            state.barber_any = True
            state.barber_name = "Qualquer barbeiro disponível"
        base = state.week_date_from or date.today()
        state.week_date_from = base + timedelta(days=7)
        state.step = "choose_slot"
        return self._show_slots(db, state, view="week")

    def _show_slots(
        self,
        db: Session,
        state: BookingSessionState,
        *,
        view: str,
    ) -> BookingAgentResponse:
        if state.service_id is None:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Para ver horários, escolha um serviço primeiro.",
                step="choose_service",
                choices=self._service_choices(state),
            )
        if not state.barber_any and state.barber_id is None:
            state.barber_any = True
            state.barber_name = "Qualquer barbeiro disponível"
        slots = tools.fetch_available_slots(db, state, view=view, date_from=state.week_date_from)
        if not slots:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Não encontrei horários neste período. Posso mostrar a próxima semana.",
                step="choose_slot",
                choices=[BookingAgentChoice(label="Ver próxima semana", action="view_next_week")],
                booking_summary=self._summary(state),
            )
        intro = "Estes são os horários da semana:" if view == "week" else "Encontrei estes horários disponíveis:"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=intro,
            step="choose_slot",
            slot_cards=self._slot_cards(state),
            choices=self._slot_choices(),
            booking_summary=self._summary(state),
        )

    def _select_slot(self, state: BookingSessionState, index: int | None) -> BookingAgentResponse:
        if index is None or index < 0 or index >= len(state.current_slots):
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Horário inválido. Escolha uma das opções abaixo:",
                step="choose_slot",
                slot_cards=self._slot_cards(state),
                choices=self._slot_choices(),
                booking_summary=self._summary(state),
            )
        state.selected_slot = state.current_slots[index]
        if state.barber_any:
            state.barber_name = state.selected_slot.barber_name
        state.step = "collect_name"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Ótima escolha! Estamos quase lá.\n\n"
                "Para finalizar, me diga seu nome completo."
            ),
            step=state.step,
            booking_summary=self._summary(state),
        )

    def _provide_name(self, state: BookingSessionState, name: str) -> BookingAgentResponse:
        name = name.strip()
        if len(name) < 2:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Por favor, informe seu nome completo.",
                step="collect_name",
                booking_summary=self._summary(state),
            )
        state.client_name = name
        state.step = "collect_whatsapp"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="Agora me informe seu WhatsApp com DDD.",
            step=state.step,
            booking_summary=self._summary(state),
        )

    def _provide_whatsapp(self, state: BookingSessionState, value: str) -> BookingAgentResponse:
        try:
            state.client_whatsapp = normalize_and_validate_whatsapp(value)
        except HTTPException:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="WhatsApp inválido. Informe com DDD, por exemplo: 11999998888.",
                step="collect_whatsapp",
                booking_summary=self._summary(state),
            )
        state.step = "confirm"
        return self._confirm_prompt(state)

    def _confirm_choices(self) -> list[BookingAgentChoice]:
        return [
            BookingAgentChoice(label="Confirmar agendamento", action="confirm"),
            BookingAgentChoice(label="Alterar serviço", action="change_service"),
            BookingAgentChoice(label="Alterar barbeiro", action="change_barber"),
            BookingAgentChoice(label="Alterar horário", action="change_slot"),
            BookingAgentChoice(label="Cancelar", action="cancel"),
        ]

    def _confirm_prompt(
        self,
        state: BookingSessionState,
        lead: str | None = None,
    ) -> BookingAgentResponse:
        summary = self._summary(state)
        lines = []
        if lead:
            lines.extend([lead, ""])
        lines.extend(
            [
                "Confira seu agendamento:",
                "",
                f"Serviço: {summary.service}",
                f"Barbeiro: {summary.barber}",
                f"Data: {summary.date}",
                f"Horário: {summary.time}",
                f"Cliente: {summary.client_name}",
                f"WhatsApp: {summary.client_whatsapp}",
                "",
                "Deseja confirmar?",
            ]
        )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="\n".join(lines),
            step="confirm",
            choices=self._confirm_choices(),
            booking_summary=summary,
            requires_confirmation=True,
        )

    def _confirm(
        self,
        db: Session,
        barbershop: Barbershop,
        state: BookingSessionState,
    ) -> BookingAgentResponse:
        if state.step != "confirm" or state.selected_slot is None:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Ainda não temos um horário selecionado para confirmar. Vamos continuar o agendamento?",
                step=state.step or "choose_service",
                choices=self._service_choices(state),
                booking_summary=self._summary(state),
            )
        try:
            tools.confirm_booking(db, barbershop, state)
        except HTTPException as exc:
            if exc.status_code == status.HTTP_409_CONFLICT:
                state.step = "choose_slot"
                state.selected_slot = None
                response = self._show_slots(db, state, view="next5")
                response.assistant_message = (
                    "Esse horário acabou de ser ocupado. Vou mostrar outras opções disponíveis."
                )
                return response
            raise

        state.step = "success"
        if barbershop.whatsapp:
            success_message = (
                "Seu horário foi confirmado.\n\n"
                "A barbearia entrará em contato pelo WhatsApp caso seja necessário."
            )
        else:
            success_message = (
                "Seu horário foi confirmado.\n\n"
                "A barbearia registrou seu agendamento com sucesso."
            )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=success_message,
            step=state.step,
            booking_summary=self._summary(state),
        )

    def _cancel_flow(self, db: Session, state: BookingSessionState) -> BookingAgentResponse:
        state.service_id = None
        state.service_name = None
        state.barber_id = None
        state.barber_any = False
        state.barber_name = None
        state.selected_slot = None
        state.client_name = None
        state.client_whatsapp = None
        state.current_slots = []
        state.week_date_from = None
        self._clear_prefs(state)
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Tudo bem, cancelei este agendamento.\n\n"
                "Quando quiser recomeçar, é só escolher um serviço:"
            ),
            step="choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _service_ambiguous(
        self,
        state: BookingSessionState,
        indices: list[int],
    ) -> BookingAgentResponse:
        valid = [i for i in indices if 0 <= i < len(state.services)]
        if not valid:
            return self._list_services(state)
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="Encontrei mais de um serviço parecido.\n\nQual opção você prefere?",
            step="choose_service",
            choices=[
                BookingAgentChoice(
                    label=state.services[i]["name"],
                    action=f"svc:{i}",
                    description=self._service_description(state.services[i]),
                )
                for i in valid
            ],
            booking_summary=self._summary(state),
        )

    def _service_not_available(
        self,
        state: BookingSessionState,
        requested_label: str | None,
    ) -> BookingAgentResponse:
        available_lines = [f"• {s['name']}" for s in state.services]
        in_confirm = state.step == "confirm" and state.selected_slot is not None
        lines = ["No momento essa barbearia tem disponível:", "", *available_lines, ""]
        if requested_label:
            lines.append(f'O serviço "{requested_label}" ainda não está cadastrado.')
            lines.append("")
        if in_confirm:
            lines.append("Mantive seu agendamento atual. Deseja confirmar?")
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="\n".join(lines),
                step="confirm",
                choices=self._confirm_choices(),
                booking_summary=self._summary(state),
                requires_confirmation=True,
            )
        if len(state.services) == 1:
            lines.append(f"Quer escolher {state.services[0]['name']}?")
        else:
            lines.append("Quer escolher um destes?")
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="\n".join(lines),
            step="choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _propose_service_change(
        self,
        state: BookingSessionState,
        index: int | None,
    ) -> BookingAgentResponse:
        if index is None or index < 0 or index >= len(state.services):
            return self._confirm_context_help(state)
        proposed = state.services[index]
        if proposed["id"] == state.service_id:
            return self._confirm_prompt(
                state,
                lead=f"Você já está agendando {proposed['name']}.",
            )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                f"Você quer alterar o serviço para {proposed['name']}?\n\n"
                "Ao alterar o serviço, talvez seja necessário escolher outro horário."
            ),
            step="confirm",
            choices=[
                BookingAgentChoice(label="Alterar serviço", action=f"svc:{index}"),
                BookingAgentChoice(label="Manter agendamento atual", action="keep"),
            ],
            booking_summary=self._summary(state),
        )

    def _change_service_menu(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_service"
        state.selected_slot = None
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="Sem problema. Qual serviço você prefere agora?",
            step="choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _change_barber_menu(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barber"
        state.selected_slot = None
        choices = [
            BookingAgentChoice(label=b["name"], action=f"barber:{i}")
            for i, b in enumerate(state.barbers)
        ]
        choices.append(BookingAgentChoice(label="Primeiro disponível", action="barber:any"))
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="Combinado. Com qual barbeiro você prefere?",
            step="choose_barber",
            choices=choices,
            booking_summary=self._summary(state),
        )

    def _keep_appointment(self, state: BookingSessionState) -> BookingAgentResponse:
        if state.selected_slot is None or not state.client_whatsapp:
            return self._confirm_context_help(state)
        state.step = "confirm"
        return self._confirm_prompt(state, lead="Perfeito, mantive seu agendamento atual.")

    def _confirm_context_help(self, state: BookingSessionState) -> BookingAgentResponse:
        if state.selected_slot is None:
            return self._welcome_back(state)
        state.step = "confirm"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Seu agendamento está pronto para confirmação.\n\n"
                "Você pode confirmar, alterar serviço, barbeiro ou horário."
            ),
            step="confirm",
            choices=self._confirm_choices(),
            booking_summary=self._summary(state),
            requires_confirmation=True,
        )

    def _welcome_back(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_service"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message="Vamos continuar? Qual serviço você deseja?",
            step="choose_service",
            choices=self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _cancel_policy(self, barbershop: Barbershop, state: BookingSessionState) -> BookingAgentResponse:
        if barbershop.whatsapp:
            message = (
                "Ainda não há cancelamento automático por aqui.\n"
                "Para cancelar ou remarcar, fale com a barbearia pelo WhatsApp oficial."
            )
        else:
            message = (
                "Ainda não há cancelamento automático por aqui.\n"
                "Entre em contato diretamente com a barbearia para cancelar ou remarcar."
            )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=message,
            step=state.step or "choose_service",
            choices=self._contact_choices(barbershop) + self._service_choices(state),
            booking_summary=self._summary(state),
        )

    def _contact_response(self, barbershop: Barbershop, state: BookingSessionState) -> BookingAgentResponse:
        if not barbershop.whatsapp:
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Esta barbearia ainda não informou um WhatsApp oficial.",
                step=state.step or "unavailable",
                booking_summary=self._summary(state),
            )
        display = re.sub(r"(\d{2})(\d{5})(\d{4})", r"(\1) \2-\3", barbershop.whatsapp[-11:])
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=f"O WhatsApp oficial da barbearia é {display}.",
            step=state.step or "choose_service",
            choices=self._contact_choices(barbershop),
            booking_summary=self._summary(state),
        )

    def _contact_choices(self, barbershop: Barbershop) -> list[BookingAgentChoice]:
        if not barbershop.whatsapp:
            return []
        return [BookingAgentChoice(label="WhatsApp da barbearia", action="contact")]

    def _service_choices(self, state: BookingSessionState) -> list[BookingAgentChoice]:
        return [
            BookingAgentChoice(
                label=s["name"],
                action=f"svc:{i}",
                description=self._service_description(s),
            )
            for i, s in enumerate(state.services)
        ]

    def _service_description(self, service: dict) -> str:
        parts = []
        duration = service.get("duration_minutes")
        if duration:
            parts.append(f"{duration} min")
        price = service.get("price")
        if price is not None:
            parts.append(_format_price(str(price)))
        return " · ".join(parts)

    def _slot_cards(self, state: BookingSessionState) -> list[BookingSlotCard]:
        return [
            BookingSlotCard(label=s.label, action=f"slot:{i}", barber_name=s.barber_name)
            for i, s in enumerate(state.current_slots)
        ]

    def _slot_choices(self) -> list[BookingAgentChoice]:
        return [
            BookingAgentChoice(label="Ver horários da semana", action="view_week"),
            BookingAgentChoice(label="Ver próxima semana", action="view_next_week"),
        ]

    def _summary(self, state: BookingSessionState) -> BookingSummary:
        date_str = None
        time_str = None
        barber = state.barber_name
        if state.selected_slot:
            local = state.selected_slot.starts_at.astimezone(TZ)
            date_str = local.strftime("%d/%m/%Y")
            time_str = local.strftime("%H:%M")
            if state.barber_any:
                barber = state.selected_slot.barber_name
        whatsapp_display = state.client_whatsapp
        if whatsapp_display and len(whatsapp_display) > 4:
            whatsapp_display = re.sub(r"(\d{2})(\d{5})(\d{4})", r"(\1) \2-\3", whatsapp_display[-11:])
        return BookingSummary(
            service=state.service_name,
            barber=barber,
            date=date_str,
            time=time_str,
            client_name=state.client_name,
            client_whatsapp=whatsapp_display,
        )
