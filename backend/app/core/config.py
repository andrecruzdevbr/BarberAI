"""Configurações centrais da aplicação."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variáveis de ambiente carregadas de forma segura via pydantic-settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "BarberAI API"
    app_env: str = "development"
    app_debug: bool = True

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001"
    )

    database_url: str = (
        "postgresql+psycopg://barberai:barberai@localhost:5432/barberai"
    )

    jwt_secret_key: str = "change-me-in-local-env-only"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    booking_agent_mode: str = "local"
    booking_agent_api_base_url: str = ""
    booking_agent_api_key: str = ""
    booking_agent_model: str = ""

    require_barbershop_whatsapp_for_public_booking: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        """Converte CORS_ORIGINS (string separada por vírgula) em lista."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retorna instância única de configurações (cache em memória)."""
    return Settings()
