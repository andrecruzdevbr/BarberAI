"""Rotas HTTP — equipe e disponibilidade."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.schemas.availability import (
    AvailabilityInterpretRequest,
    AvailabilityInterpretResponse,
    AvailabilitySlotInput,
    AvailabilitySlotResponse,
)
from app.schemas.team import (
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMemberSelfUpdate,
    TeamMemberUpdate,
)
from app.services import availability as availability_service
from app.services import team as team_service

router = APIRouter()


@router.get("", response_model=list[TeamMemberResponse])
def list_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> list[TeamMemberResponse]:
    """Lista equipe da barbearia (somente owner)."""
    return team_service.list_team_members(db, current_user)


@router.post("", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def create_team_member(
    data: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> TeamMemberResponse:
    """Cria barbeiro ou recepcionista (somente owner)."""
    return team_service.create_team_member(db, current_user, data)


@router.put("/me", response_model=TeamMemberResponse)
def update_self_profile(
    data: TeamMemberSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamMemberResponse:
    """Atualiza nome e WhatsApp do próprio perfil."""
    return team_service.update_team_member_self(db, current_user, data)


@router.post(
    "/{barber_id}/availability/interpret",
    response_model=AvailabilityInterpretResponse,
)
def interpret_barber_availability(
    barber_id: UUID,
    data: AvailabilityInterpretRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AvailabilityInterpretResponse:
    """Interpreta horários em linguagem natural sem salvar."""
    return availability_service.interpret_availability(
        db, current_user, barber_id, data.message,
    )


@router.get("/{barber_id}/availability", response_model=list[AvailabilitySlotResponse])
def get_barber_availability(
    barber_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AvailabilitySlotResponse]:
    """Lista disponibilidade semanal de um barbeiro."""
    return availability_service.list_availability(db, current_user, barber_id)


@router.put("/{barber_id}/availability", response_model=list[AvailabilitySlotResponse])
def replace_barber_availability(
    barber_id: UUID,
    slots: list[AvailabilitySlotInput],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AvailabilitySlotResponse]:
    """Substitui disponibilidade semanal completa."""
    return availability_service.replace_availability(db, current_user, barber_id, slots)


@router.get("/{user_id}", response_model=TeamMemberResponse)
def get_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamMemberResponse:
    """Obtém membro da equipe por ID."""
    return team_service.get_team_member(db, current_user, user_id)


@router.put("/{user_id}", response_model=TeamMemberResponse)
def update_team_member(
    user_id: UUID,
    data: TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> TeamMemberResponse:
    """Atualiza membro da equipe (somente owner)."""
    return team_service.update_team_member(db, current_user, user_id, data)


@router.delete("/{user_id}", response_model=TeamMemberResponse)
def deactivate_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> TeamMemberResponse:
    """Desativa membro da equipe (somente owner)."""
    return team_service.deactivate_team_member(db, current_user, user_id)
