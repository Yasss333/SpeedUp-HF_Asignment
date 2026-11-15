from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PA AI Email Dashboard"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    mongodb_uri: SecretStr | None = None
    mongodb_database: str = "pa_ai_email_dashboard"
    openai_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    google_api_key: SecretStr | None = None
    demo_enabled: bool = True
    openrouter_model: str = "openai/gpt-4o-mini"


@lru_cache
def get_settings() -> Settings:
    return Settings()
