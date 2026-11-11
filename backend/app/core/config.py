from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DEMO_MODE: bool = True
    APP_NAME: str = "AI DisasterTwin Rescue"

    DATABASE_URL: str = "sqlite:///./disastertwin.db"

    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    OPENMETEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"

    NASA_FIRMS_MAP_KEY: Optional[str] = None

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @property
    def openai_configured(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    @property
    def nasa_firms_configured(self) -> bool:
        return bool(self.NASA_FIRMS_MAP_KEY)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
