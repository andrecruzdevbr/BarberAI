"""Ponto de entrada da API BarberAI (FastAPI)."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Ciclo de vida da aplicação — inicialização e encerramento."""
    yield


def create_app() -> FastAPI:
    """Factory da aplicação FastAPI com configurações centralizadas."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="API SaaS para gestão inteligente de barbearias.",
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)

    @app.get("/", tags=["root"])
    def root() -> dict[str, str]:
        """Raiz da API — informações básicas do serviço."""
        return {
            "message": "BarberAI API",
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
