"""Interpretação de intenção para o assistente de agendamento."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any


def normalize_text(text: str) -> str:
    """Normaliza texto: minúsculas, sem acentos, hífen como espaço."""
    value = unicodedata.normalize("NFKD", text.lower().strip())
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.replace("-", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


WEEKDAYS = {
    "segunda": 0,
    "segunda feira": 0,
    "terca": 1,
    "terca feira": 1,
    "quarta": 2,
    "quarta feira": 2,
    "quinta": 3,
    "quinta feira": 3,
    "sexta": 4,
    "sexta feira": 4,
    "sabado": 5,
    "domingo": 6,
}


@dataclass
class DetectedIntent:
    """Intenção detectada a partir da mensagem livre."""

    name: str
    service_query: str | None = None
    barber_query: str | None = None
    shop_query: str | None = None
    weekday: int | None = None
    date_from: date | None = None
    days: int | None = None
    period: str | None = None  # morning | afternoon | evening
    after_hour: int | None = None
    before_hour: int | None = None
    first_slot: bool = False
    entities: dict[str, Any] = field(default_factory=dict)


def _has_any(text: str, words: tuple[str, ...]) -> bool:
    for word in words:
        if " " in word or len(word) > 3:
            if word in text:
                return True
        else:
            if re.search(rf"(?<!\w){re.escape(word)}(?!\w)", text):
                return True
    return False


def _extract_time_prefs(text: str, intent: DetectedIntent) -> None:
    today = date.today()
    if "depois de amanha" in text:
        intent.date_from = today + timedelta(days=2)
    elif "hoje" in text:
        intent.date_from = today
    elif "amanha" in text:
        intent.date_from = today + timedelta(days=1)

    if _has_any(text, ("proxima semana", "semana que vem", "semana seguinte")):
        # início da próxima semana (segunda-feira)
        intent.date_from = today + timedelta(days=(7 - today.weekday()))
        intent.days = 7
    elif _has_any(text, ("esta semana", "essa semana", "nesta semana", "ainda esta semana", "ainda essa semana")):
        intent.date_from = today
        intent.days = 7 - today.weekday()

    for label, weekday in WEEKDAYS.items():
        if label in text:
            intent.weekday = weekday
            break

    if _has_any(text, ("de manha", "a manha", "pela manha")):
        intent.period = "morning"
        intent.before_hour = 12
    elif re.search(r"(?<![a-z])manha(?![a-z])", text):
        intent.period = "morning"
        intent.before_hour = 12
    elif _has_any(text, ("tarde", "a tarde", "de tarde")):
        intent.period = "afternoon"
        intent.after_hour = 12
        intent.before_hour = 18
    elif _has_any(text, ("noite", "a noite", "de noite")):
        intent.period = "evening"
        intent.after_hour = 18

    after_match = re.search(r"depois das?\s*(\d{1,2})", text)
    if after_match:
        intent.after_hour = int(after_match.group(1))
        intent.before_hour = None

    before_match = re.search(r"antes das?\s*(\d{1,2})", text)
    if before_match:
        intent.before_hour = int(before_match.group(1))

    if _has_any(text, ("primeiro horario", "primeiro disponivel", "mais cedo", "proximo horario")):
        intent.first_slot = True


def _match_catalog_item(text: str, items: list[dict[str, Any]], key: str = "name") -> int | None:
    for index, item in enumerate(items):
        name = normalize_text(str(item.get(key, "")))
        if not name:
            continue
        if name in text or text in name:
            return index
        tokens = [t for t in name.split() if len(t) > 2]
        if tokens and all(token in text for token in tokens):
            return index
        # partial: "cabelo" matches "Corte de cabelo"
        for token in tokens:
            if token in text and len(token) >= 4:
                return index
    return None


def _service_concept(normalized_name: str) -> str | None:
    """Classifica o nome de um serviço real em um conceito canônico."""
    has_barba = "barba" in normalized_name
    has_cabelo = _has_any(normalized_name, ("cabelo", "corte", "cortar", "cabeleire"))
    if has_barba and has_cabelo:
        return "combo"
    if has_barba:
        return "barba"
    if has_cabelo:
        return "corte"
    return None


def _requested_service_concept(text: str) -> tuple[str | None, str | None]:
    """Detecta o conceito de serviço pedido pelo cliente (com aliases)."""
    has_barba = _has_any(text, ("barba",))
    has_cabelo = _has_any(text, ("cabelo", "corte", "cortar", "cabeleireiro"))
    if has_barba and has_cabelo:
        return "combo", "Cabelo + barba"
    if has_barba:
        return "barba", "Barba"
    if has_cabelo:
        return "corte", "Corte de cabelo"
    return None, None


def resolve_service_request(
    text: str,
    services: list[dict[str, Any]],
) -> DetectedIntent | None:
    """Resolve um pedido de serviço usando apenas serviços reais cadastrados.

    Retorna:
    - select_service: correspondência única com serviço ativo;
    - service_ambiguous: mais de um serviço ativo compatível;
    - service_not_available: cliente pediu um serviço conhecido que não existe;
    - None: nenhuma menção a serviço encontrada.
    """
    if not services:
        return None
    normalized = normalize_text(text)
    concept, label = _requested_service_concept(normalized)
    if concept is not None:
        matches = [
            i
            for i, s in enumerate(services)
            if _service_concept(normalize_text(str(s.get("name", "")))) == concept
        ]
        if len(matches) == 1:
            index = matches[0]
            return DetectedIntent(
                name="select_service",
                service_query=services[index]["name"],
                entities={"service_index": index},
            )
        if len(matches) > 1:
            return DetectedIntent(name="service_ambiguous", entities={"service_indices": matches})
        return DetectedIntent(name="service_not_available", entities={"requested_label": label})

    index = _match_catalog_item(normalized, services)
    if index is not None:
        return DetectedIntent(
            name="select_service",
            service_query=services[index]["name"],
            entities={"service_index": index},
        )
    return None


_STOP_NAME_WORDS = {"barbearia", "barbearias", "por", "favor", "agora", "hoje", "ai", "la"}


def _extract_shop_name(text: str) -> str | None:
    """Extrai o nome da barbearia de frases como 'agendar na Barbearia X'."""
    match = re.search(r"(?:agendar|marcar|agenda|horario|atende)\s+(?:na|no|em)\s+(.+)", text)
    if not match:
        match = re.search(r"\bbarbearia\s+([a-z0-9].+)", text)
    if not match:
        return None
    name = match.group(1).strip()
    name = re.sub(r"^barbearia\s+", "", name).strip()
    name = re.sub(r"\b(por favor|agora|hoje)\b", "", name).strip()
    tokens = [t for t in name.split() if t not in _STOP_NAME_WORDS]
    if not tokens or len(" ".join(tokens)) < 2:
        return None
    return " ".join(tokens)


def detect_home_intent(message: str, shop_choices: list[dict[str, Any]] | None = None) -> DetectedIntent:
    """Detecta intenção na home, antes da barbearia ser escolhida."""
    text = normalize_text(message)
    shops = shop_choices or []

    if message.startswith("action:"):
        action = message[len("action:") :]
        if action.startswith("shop:"):
            return DetectedIntent(name="select_barbershop", entities={"index": int(action.split(":")[1])})
        if action in ("list_shops", "list_barbershops"):
            return DetectedIntent(name="list_barbershops")
        if action == "search_again":
            return DetectedIntent(name="search_again")
        return DetectedIntent(name="unknown")

    from app.services.booking_agent.context import has_booking_signals, parse_message

    parsed = parse_message(message)
    if has_booking_signals(parsed):
        return DetectedIntent(name="booking_context")

    if message in ("", "__start__"):
        return DetectedIntent(name="greeting")

    if _has_any(text, ("ola", "oi", "bom dia", "boa tarde", "boa noite", "eae", "e ai")):
        return DetectedIntent(name="greeting")

    if _has_any(
        text,
        (
            "o que voce consegue",
            "o que voce faz",
            "como funciona",
            "me ajuda",
            "ajuda",
            "help",
            "pode fazer",
        ),
    ):
        return DetectedIntent(name="help")

    if _has_any(
        text,
        (
            "tenho o link",
            "link da barbearia",
            "ja tenho o link",
            "entrar pelo link",
        ),
    ):
        return DetectedIntent(name="help_link")

    if _has_any(text, ("procurar outra", "buscar outra", "outra barbearia", "trocar barbearia")):
        return DetectedIntent(name="search_again")

    # nome explícito dentro de uma frase: "agendar na Barbearia André Cruz"
    explicit_name = _extract_shop_name(text)
    if explicit_name:
        return DetectedIntent(name="search_barbershop", shop_query=explicit_name)

    if shops and _has_any(text, ("quero agendar", "vamos agendar", "continuar", "comecar agendamento")):
        if len(shops) == 1:
            return DetectedIntent(name="select_barbershop", entities={"index": 0})
        return DetectedIntent(name="list_barbershops")

    if _has_any(
        text,
        (
            "quais barbearias",
            "barbearias disponiveis",
            "mostrar opcoes",
            "mostrar opcao",
            "mostrar barbearias",
            "listar barbearias",
            "ver barbearias",
            "ver opcoes",
            "opcoes de barbearia",
            "agendar",
            "marcar horario",
        ),
    ):
        return DetectedIntent(name="list_barbershops")

    # seleção por nome entre opções já listadas
    if shops:
        index = _match_catalog_item(text, shops)
        if index is not None:
            return DetectedIntent(name="select_barbershop", entities={"index": index})

    # busca por nome: só quando parece um nome, não uma frase completa
    question_markers = (
        "quais",
        "quanto",
        "quando",
        "como",
        "onde",
        "porque",
        "por que",
        "voce",
        "pode",
        "tem ",
        "quero",
        "preciso",
        "me fala",
        "me diga",
        "?",
    )
    looks_like_question = _has_any(text, question_markers) or text.endswith("?")
    word_count = len(text.split())
    if not looks_like_question and 1 <= word_count <= 5:
        return DetectedIntent(name="search_barbershop", shop_query=message.strip())

    if looks_like_question:
        return DetectedIntent(name="help")

    return DetectedIntent(name="unknown")


def detect_shop_intent(
    message: str,
    *,
    step: str,
    services: list[dict[str, Any]] | None = None,
    barbers: list[dict[str, Any]] | None = None,
) -> DetectedIntent:
    """Detecta intenção com barbearia já definida."""
    services = services or []
    barbers = barbers or []
    text = normalize_text(message)

    if message.startswith("action:"):
        return _action_intent(message[len("action:") :])

    if message in ("", "__start__"):
        return DetectedIntent(name="greeting")

    # coleta de dados: prioriza entrada livre quando o passo pede nome/whatsapp
    if step == "collect_name" and not _looks_like_question(text):
        if len(message.strip()) >= 2 and not _has_any(text, ("servico", "barbeiro", "horario", "preco", "whatsapp")):
            return DetectedIntent(name="provide_name", entities={"value": message.strip()})

    if step == "collect_whatsapp" and not _looks_like_question(text):
        digits = re.sub(r"\D", "", message)
        if len(digits) >= 10:
            return DetectedIntent(name="provide_whatsapp", entities={"value": message.strip()})

    # ---- Contexto de confirmação: nunca reiniciar sem ação explícita ----
    if step == "confirm":
        if text in ("ok", "ok!", "isso", "isso mesmo") or _has_any(
            text, ("sim", "confirmar", "confirma", "pode confirmar", "pode marcar", "fechado")
        ):
            return DetectedIntent(name="confirm_booking")
        if _has_any(text, ("cancelar", "cancela", "desistir", "esquece")):
            return DetectedIntent(name="cancel_flow")
        if _has_any(text, ("alterar servico", "mudar servico", "trocar servico", "outro servico", "trocar de servico")):
            return DetectedIntent(name="change_service_menu")
        if _has_any(text, ("alterar barbeiro", "mudar barbeiro", "trocar barbeiro", "outro barbeiro")):
            return DetectedIntent(name="change_barber_menu")
        if _has_any(
            text,
            (
                "alterar horario",
                "mudar horario",
                "outro horario",
                "trocar horario",
                "mudar o horario",
                "trocar de horario",
            ),
        ):
            return DetectedIntent(name="change_slot_menu")
        service_res = resolve_service_request(text, services)
        if service_res is not None:
            if service_res.name == "select_service":
                return DetectedIntent(name="propose_service_change", entities=service_res.entities)
            return service_res  # service_not_available | service_ambiguous
        return DetectedIntent(name="confirm_context_help")

    if _has_any(text, ("ola", "oi", "bom dia", "boa tarde", "boa noite")):
        return DetectedIntent(name="greeting")

    if _has_any(
        text,
        (
            "o que voce consegue",
            "o que voce faz",
            "como funciona",
            "me ajuda",
            "ajuda",
            "help",
        ),
    ):
        return DetectedIntent(name="help")

    if _has_any(text, ("cancelar depois", "posso cancelar", "desmarcar", "cancelamento")):
        return DetectedIntent(name="cancel_policy")

    if _has_any(text, ("whatsapp", "whats app", "telefone", "contato", "falar com a barbearia")):
        return DetectedIntent(name="contact_barbershop")

    if _has_any(text, ("preco", "precos", "quanto custa", "valor", "custa")):
        intent = DetectedIntent(name="ask_service_price")
        service_index = _match_catalog_item(text, services)
        if service_index is not None:
            intent.entities["service_index"] = service_index
            intent.service_query = services[service_index]["name"]
        return intent

    if _has_any(text, ("servicos", "quais servicos", "o que voces fazem", "o que voces oferecem", "menu")):
        return DetectedIntent(name="list_services")

    if _has_any(text, ("barbeiros", "quais barbeiros", "quem atende", "equipe")):
        return DetectedIntent(name="list_barbers")

    if _has_any(text, ("alterar servico", "mudar servico", "trocar servico", "trocar de servico")):
        return DetectedIntent(name="change_service_menu")

    if _has_any(
        text,
        (
            "alterar horario",
            "mudar horario",
            "trocar horario",
            "mudar o horario",
            "trocar de horario",
        ),
    ):
        return DetectedIntent(name="change_slot_menu")

    if _has_any(
        text,
        ("alterar barbeiro", "mudar barbeiro", "trocar barbeiro", "trocar de barbeiro"),
    ):
        return DetectedIntent(name="change_barber_menu")

    if _has_any(text, ("proxima semana", "semana que vem", "semana seguinte")):
        return DetectedIntent(name="next_week")

    if _has_any(text, ("ver semana", "horarios da semana", "toda a semana", "ver a semana")):
        return DetectedIntent(name="week_view")

    if _has_any(text, ("qualquer barbeiro", "qualquer um", "tanto faz o barbeiro", "tanto faz")):
        return DetectedIntent(name="any_available_barber")

    barber_index = _match_catalog_item(text, barbers)
    barber_kw = _has_any(text, ("barbeiro", "prefiro", "com o ", "com a ", "quero o ", "quero a ", "atende com"))

    # disponibilidade / horário
    availability_markers = (
        "horario",
        "horarios",
        "disponivel",
        "disponibilidade",
        "vaga",
        "tem hora",
        "hoje",
        "amanha",
        "depois de amanha",
        "sabado",
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "manha",
        "tarde",
        "noite",
        "depois das",
        "antes das",
        "esta semana",
        "essa semana",
        "nesta semana",
        "primeiro horario",
        "primeiro disponivel",
        "mais cedo",
    )
    service_res = resolve_service_request(text, services)
    has_availability = _has_any(text, availability_markers)
    wants_booking = _has_any(text, ("quero", "marcar", "agendar", "agenda", "reservar"))

    # Serviço conhecido mas inexistente / ambíguo tem prioridade — nunca converter sozinho
    if service_res is not None and service_res.name in ("service_not_available", "service_ambiguous"):
        return service_res

    trigger_availability = (
        has_availability
        or (service_res is not None and service_res.name == "select_service" and wants_booking)
        or (barber_index is not None and (has_availability or wants_booking))
    )
    if trigger_availability:
        intent = DetectedIntent(name="ask_availability")
        _extract_time_prefs(text, intent)
        if service_res is not None and service_res.name == "select_service":
            index = service_res.entities["service_index"]
            intent.entities["service_index"] = index
            intent.service_query = services[index]["name"]
        if barber_index is not None:
            intent.entities["barber_index"] = barber_index
            intent.barber_query = barbers[barber_index]["name"]
        if _has_any(text, ("qualquer barbeiro", "qualquer um", "primeiro disponivel")):
            intent.entities["any_barber"] = True
        return intent

    # seleção simples de serviço (sem menção a data)
    if service_res is not None and service_res.name == "select_service":
        return service_res

    # seleção simples de barbeiro
    if barber_index is not None and (barber_kw or step == "choose_barber"):
        return DetectedIntent(
            name="select_barber",
            barber_query=barbers[barber_index]["name"],
            entities={"barber_index": barber_index},
        )

    if step == "choose_slot" and state_has_slot_index(text):
        return DetectedIntent(name="select_slot", entities={"index": int(text) - 1})

    if _has_any(text, ("quero agendar", "agendar", "marcar horario", "quero marcar")):
        return DetectedIntent(name="list_services")

    if _has_any(text, ("cancelar", "recomecar", "comecar de novo")):
        return DetectedIntent(name="cancel_flow")

    return DetectedIntent(name="unknown")


def _looks_like_question(text: str) -> bool:
    return _has_any(text, ("quais", "quanto", "quando", "como", "onde", "porque", "por que", "?"))


def state_has_slot_index(text: str) -> bool:
    return text.isdigit()


def _action_intent(action: str) -> DetectedIntent:
    if action.startswith("svc:"):
        return DetectedIntent(name="select_service", entities={"service_index": int(action.split(":")[1])})
    if action == "barber:any":
        return DetectedIntent(name="any_available_barber")
    if action.startswith("barber:"):
        return DetectedIntent(name="select_barber", entities={"barber_index": int(action.split(":")[1])})
    if action.startswith("slot:"):
        return DetectedIntent(name="select_slot", entities={"index": int(action.split(":")[1])})
    if action == "view_week":
        return DetectedIntent(name="week_view")
    if action == "view_next_week":
        return DetectedIntent(name="next_week")
    if action == "confirm":
        return DetectedIntent(name="confirm_booking")
    if action == "change_slot":
        return DetectedIntent(name="ask_availability")
    if action == "change_service":
        return DetectedIntent(name="change_service_menu")
    if action == "change_barber":
        return DetectedIntent(name="change_barber_menu")
    if action == "keep":
        return DetectedIntent(name="keep_appointment")
    if action == "cancel":
        return DetectedIntent(name="cancel_flow")
    if action == "contact":
        return DetectedIntent(name="contact_barbershop")
    if action == "period:today":
        return DetectedIntent(name="ask_availability", date_from=date.today(), days=1)
    if action == "period:tomorrow":
        return DetectedIntent(name="ask_availability", date_from=date.today() + timedelta(days=1), days=1)
    if action == "period:this_week":
        return DetectedIntent(
            name="ask_availability",
            date_from=date.today(),
            days=max(1, 7 - date.today().weekday()),
        )
    if action == "period:saturday":
        return DetectedIntent(name="ask_availability", weekday=5)
    if action == "period:first":
        return DetectedIntent(name="ask_availability", first_slot=True)
    if action.startswith("shop:"):
        return DetectedIntent(name="select_barbershop", entities={"index": int(action.split(":")[1])})
    return DetectedIntent(name="unknown")
