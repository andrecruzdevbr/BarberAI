"""Serviço de confirmação por WhatsApp — preparado para integração futura."""

from abc import ABC, abstractmethod
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.appointment import Appointment
from app.models.barbershop import Barbershop
from app.models.client import Client
from app.models.service import Service
from app.models.user import User

LOCAL_TZ = ZoneInfo("America/Sao_Paulo")


def format_confirmation_message(
    *,
    client_name: str,
    barbershop_name: str,
    service_name: str,
    barber_name: str,
    starts_at: datetime,
) -> str:
    """Gera texto de confirmação sem enviar mensagem."""
    local_dt = starts_at.astimezone(LOCAL_TZ)
    date_str = local_dt.strftime("%d/%m/%Y")
    time_str = local_dt.strftime("%H:%M")

    return (
        f"Olá, {client_name}.\n\n"
        f"Seu horário foi confirmado na {barbershop_name}.\n\n"
        f"Serviço: {service_name}\n"
        f"Barbeiro: {barber_name}\n"
        f"Data: {date_str}\n"
        f"Horário: {time_str}\n\n"
        "Caso precise cancelar ou remarcar, entre em contato com a barbearia."
    )


def attach_confirmation_message(
    appointment: Appointment,
    *,
    client: Client,
    barbershop: Barbershop,
    service: Service,
    barber: User,
) -> str:
    """Associa mensagem de confirmação ao agendamento."""
    message = format_confirmation_message(
        client_name=client.full_name,
        barbershop_name=barbershop.name,
        service_name=service.name,
        barber_name=barber.name,
        starts_at=appointment.starts_at,
    )
    appointment.confirmation_message = message
    return message


class WhatsAppConfirmationSender(ABC):
    """Interface para envio futuro de confirmações via WhatsApp Business."""

    @abstractmethod
    def send_confirmation(self, phone: str, message: str) -> bool:
        """Envia confirmação. Retorna True se enviado com sucesso."""


class NoOpWhatsAppConfirmationSender(WhatsAppConfirmationSender):
    """Implementação atual — não envia mensagens."""

    def send_confirmation(self, phone: str, message: str) -> bool:
        return False


_default_sender = NoOpWhatsAppConfirmationSender()


def get_confirmation_sender() -> WhatsAppConfirmationSender:
    """Retorna implementação de envio de confirmação."""
    return _default_sender
