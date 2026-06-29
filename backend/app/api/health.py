"""Endpoint de health check — API e conexão com PostgreSQL."""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Valida API e conectividade com o banco (SELECT 1)."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "barberai-api",
                "database": "unavailable",
            },
        )

    return {
        "status": "ok",
        "service": "barberai-api",
        "database": "ok",
    }
