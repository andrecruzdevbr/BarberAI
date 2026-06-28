"""Rotas e handlers HTTP da API."""

from app.api.health import router as health_router

__all__ = ["health_router"]
