"""Utilitários de normalização e validação de telefone/WhatsApp."""

import re

from fastapi import HTTPException, status

_DIGITS_ONLY = re.compile(r"\D")


def normalize_whatsapp(value: str) -> str:
    """Remove formatação e aplica prefixo 55 para números brasileiros."""
    digits = _DIGITS_ONLY.sub("", value.strip())
    if not digits:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="WhatsApp inválido.",
        )
    if len(digits) in (10, 11) and not digits.startswith("55"):
        digits = f"55{digits}"
    return digits


def validate_whatsapp_digits(digits: str) -> str:
    """Valida comprimento do número normalizado (10–15 dígitos)."""
    if len(digits) < 10 or len(digits) > 15:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="WhatsApp deve ter entre 10 e 15 dígitos após normalização.",
        )
    return digits


def normalize_and_validate_whatsapp(value: str) -> str:
    """Normaliza e valida WhatsApp para persistência."""
    return validate_whatsapp_digits(normalize_whatsapp(value))
