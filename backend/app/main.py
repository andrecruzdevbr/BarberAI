"""Ponto de entrada da API BarberAI (FastAPI)."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.appointments import router as appointments_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router
from app.api.public import router as public_router
from app.api.public_home import router as public_home_router
from app.api.services import router as services_router
from app.api.settings import router as settings_router
from app.api.team import router as team_router
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
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(clients_router, prefix="/api/v1/clients", tags=["clients"])
    app.include_router(services_router, prefix="/api/v1/services", tags=["services"])
    app.include_router(team_router, prefix="/api/v1/team", tags=["team"])
    app.include_router(settings_router, prefix="/api/v1/settings", tags=["settings"])
    app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])
    app.include_router(appointments_router, prefix="/api/v1/appointments", tags=["appointments"])
    app.include_router(public_router, prefix="/api/v1/public/barbershops", tags=["public"])
    app.include_router(public_home_router, prefix="/api/v1/public/booking-agent", tags=["public"])

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
