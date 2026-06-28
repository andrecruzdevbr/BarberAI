"""Endpoint de health check — validação de que a API está no ar."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Retorna status básico da API. Usado por Docker e monitoramento."""
    return {"status": "ok", "service": "barberai-api"}
