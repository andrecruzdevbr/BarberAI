"""Serviços de negócio — equipe."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, normalize_email
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.team import TeamMemberCreate, TeamMemberResponse, TeamMemberUpdate


def list_team_members(db: Session, user: User) -> list[TeamMemberResponse]:
    """Lista todos os usuários da barbearia (somente owner)."""
    members = (
        db.query(User)
        .filter(User.barbershop_id == user.barbershop_id)
        .order_by(User.role.asc(), User.name.asc())
        .all()
    )
    return [TeamMemberResponse.model_validate(m) for m in members]


def get_team_member(db: Session, user: User, user_id: UUID) -> TeamMemberResponse:
    """Obtém membro da equipe com isolamento por barbearia."""
    member = _get_member_or_404(db, user, user_id)
    _assert_can_view_member(user, member)
    return TeamMemberResponse.model_validate(member)


def create_team_member(
    db: Session,
    user: User,
    data: TeamMemberCreate,
) -> TeamMemberResponse:
    """Cria barbeiro ou recepcionista na barbearia do owner."""
    email = normalize_email(str(data.email))

    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está cadastrado.",
        )

    member = User(
        barbershop_id=user.barbershop_id,
        name=data.name,
        email=email,
        password_hash=hash_password(data.temporary_password),
        role=data.role,
        is_active=True,
    )

    try:
        db.add(member)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está cadastrado.",
        ) from None

    db.refresh(member)
    return TeamMemberResponse.model_validate(member)


def update_team_member(
    db: Session,
    user: User,
    user_id: UUID,
    data: TeamMemberUpdate,
) -> TeamMemberResponse:
    """Atualiza membro da equipe (somente barbeiro/recepcionista)."""
    member = _get_member_or_404(db, user, user_id)
    _assert_can_manage_member(user, member)

    if member.role == UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é permitido alterar o dono da barbearia.",
        )

    updates = data.model_dump(exclude_unset=True)

    if updates.get("is_active") is False and member.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O dono não pode desativar a própria conta.",
        )

    if "name" in updates and updates["name"] is not None:
        member.name = updates["name"]
    if "role" in updates and updates["role"] is not None:
        member.role = updates["role"]
    if "is_active" in updates and updates["is_active"] is not None:
        member.is_active = updates["is_active"]

    db.commit()
    db.refresh(member)
    return TeamMemberResponse.model_validate(member)


def deactivate_team_member(
    db: Session,
    user: User,
    user_id: UUID,
) -> TeamMemberResponse:
    """Desativa membro da equipe (soft delete)."""
    member = _get_member_or_404(db, user, user_id)
    _assert_can_manage_member(user, member)

    if member.role == UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é permitido desativar o dono da barbearia.",
        )

    if member.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O dono não pode desativar a própria conta.",
        )

    member.is_active = False
    db.commit()
    db.refresh(member)
    return TeamMemberResponse.model_validate(member)


def _get_member_or_404(db: Session, user: User, user_id: UUID) -> User:
    member = (
        db.query(User)
        .filter(User.id == user_id, User.barbershop_id == user.barbershop_id)
        .first()
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membro da equipe não encontrado.",
        )
    return member


def _assert_can_view_member(current: User, member: User) -> None:
    if current.role == UserRole.OWNER:
        return
    if current.role == UserRole.BARBER and current.id == member.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permissão insuficiente.",
    )


def _assert_can_manage_member(current: User, member: User) -> None:
    if current.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente.",
        )
    if member.barbershop_id != current.barbershop_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membro da equipe não encontrado.",
        )
