"""Provedor local do agente na home — conversacional antes da barbearia."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.booking_agent import BookingAgentChoice, BookingAgentResponse, BookingSlotCard
from app.services.booking_agent.intent import detect_home_intent, normalize_text
from app.services.booking_agent.local_provider import LocalBookingAgentProvider
from app.services.booking_agent.session import BookingSessionState
from app.services.public_booking import get_barbershop_by_slug, search_booking_ready_barbershops


class HomeLocalBookingAgentProvider:
    """Fluxo inicial da home com interpretação de intenção."""

    def __init__(self) -> None:
        self._shop_provider = LocalBookingAgentProvider()

    def handle_message(
        self,
        db: Session,
        state: BookingSessionState,
        message: str,
    ) -> BookingAgentResponse:
        if state.slug and state.barbershop_id:
            barbershop = get_barbershop_by_slug(db, state.slug)
            return self._shop_provider.handle_message(db, barbershop, state, message)

        intent = detect_home_intent(message, state.shop_choices)

        if intent.name == "greeting":
            return self._welcome(state)
        if intent.name == "help":
            return self._help(state)
        if intent.name == "help_link":
            return self._help_link(state)
        if intent.name == "search_again":
            return self._ask_name(state)
        if intent.name == "list_barbershops":
            return self._present_shops(db, state, query="", searched=False)
        if intent.name == "search_barbershop":
            return self._present_shops(db, state, query=intent.shop_query or message, searched=True)
        if intent.name == "select_barbershop":
            return self._select_shop(db, state, intent.entities.get("index"))
        return self._unknown(state)

    def _welcome(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barbershop"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Olá, eu sou a assistente de agendamento do BarberAI.\n\n"
                "Posso te ajudar a encontrar um horário.\n"
                "Você já sabe em qual barbearia deseja agendar?"
            ),
            step=state.step,
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _help(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barbershop"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Posso te ajudar a encontrar uma barbearia e agendar um horário.\n\n"
                "É só me dizer o nome da barbearia ou pedir para ver as opções disponíveis."
            ),
            step=state.step,
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _help_link(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barbershop"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Se você já tem o link da barbearia, é só abri-lo que eu começo o "
                "agendamento por lá.\n\n"
                "Se preferir, posso te mostrar as barbearias disponíveis aqui."
            ),
            step=state.step,
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _ask_name(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barbershop"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Sem problema. Qual é o nome da barbearia que você procura?"
            ),
            step=state.step,
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _unknown(self, state: BookingSessionState) -> BookingAgentResponse:
        state.step = "choose_barbershop"
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Posso te ajudar a agendar um horário.\n\n"
                "Me diga o nome da barbearia ou peça para ver as opções disponíveis."
            ),
            step=state.step,
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _present_shops(
        self,
        db: Session,
        state: BookingSessionState,
        *,
        query: str,
        searched: bool,
    ) -> BookingAgentResponse:
        shops = search_booking_ready_barbershops(db, query)
        state.shop_choices = [{"name": s.name, "slug": s.slug} for s in shops]
        state.step = "choose_barbershop"

        if not shops:
            return self._no_result(state, query)

        if searched and query.strip():
            norm_query = normalize_text(query)
            exact = [i for i, s in enumerate(shops) if normalize_text(s.name) == norm_query]
            if exact:
                return self._found_named(state, shops[exact[0]].name, exact[0])
            if len(shops) == 1:
                return self._found_named(state, shops[0].name, 0)

        if len(shops) == 1:
            return self._single_offer(state, shops[0].name)

        return self._multiple(state, shops)

    def _found_named(self, state: BookingSessionState, name: str, index: int) -> BookingAgentResponse:
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                f"Encontrei a {name}.\n\n"
                "Posso te ajudar a escolher serviço, barbeiro e horário.\n"
                "Vamos começar?"
            ),
            step="choose_barbershop",
            choices=[
                BookingAgentChoice(label="Começar agendamento", action=f"shop:{index}"),
                BookingAgentChoice(label="Procurar outra barbearia", action="search_again"),
            ],
        )

    def _single_offer(self, state: BookingSessionState, name: str) -> BookingAgentResponse:
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Encontrei uma barbearia disponível para agendamento:\n\n"
                f"{name}\n\n"
                "Quer agendar seu horário agora?"
            ),
            step="choose_barbershop",
            choices=[
                BookingAgentChoice(label="Quero agendar", action="shop:0"),
                BookingAgentChoice(label="Procurar outra barbearia", action="search_again"),
            ],
        )

    def _multiple(self, state: BookingSessionState, shops: list) -> BookingAgentResponse:
        cards = [
            BookingSlotCard(label=shop.name, action=f"shop:{index}")
            for index, shop in enumerate(shops)
        ]
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=(
                "Encontrei algumas barbearias disponíveis para agendamento.\n\n"
                "Qual delas você prefere?"
            ),
            step="choose_barbershop",
            slot_cards=cards,
        )

    def _no_result(self, state: BookingSessionState, query: str) -> BookingAgentResponse:
        if query.strip():
            message = (
                "Não encontrei uma barbearia disponível com esse nome.\n\n"
                "Você pode tentar outro nome ou pedir para a barbearia enviar o "
                "link direto de agendamento."
            )
        else:
            message = (
                "No momento não encontrei barbearias disponíveis para agendamento.\n\n"
                "Você pode tentar mais tarde ou pedir para a barbearia enviar o "
                "link direto de agendamento."
            )
        return BookingAgentResponse(
            session_id=state.session_id,
            assistant_message=message,
            step="choose_barbershop",
            choices=[
                BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
            ],
        )

    def _select_shop(
        self,
        db: Session,
        state: BookingSessionState,
        index: int | None,
    ) -> BookingAgentResponse:
        if index is None or index < 0 or index >= len(state.shop_choices):
            return BookingAgentResponse(
                session_id=state.session_id,
                assistant_message="Não entendi qual barbearia você escolheu. Pode me dizer o nome?",
                step="choose_barbershop",
                choices=[
                    BookingAgentChoice(label="Ver barbearias disponíveis", action="list_shops"),
                ],
            )

        selected = state.shop_choices[index]
        barbershop = get_barbershop_by_slug(db, selected["slug"])
        state.slug = barbershop.slug
        state.barbershop_id = barbershop.id
        state.barbershop_name = barbershop.name
        return self._shop_provider._welcome(db, state)
