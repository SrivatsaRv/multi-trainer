from typing import List, Union
from pydantic import field_validator, ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True, env_file=".env")
    
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Multi-Trainer Gym SaaS"
    
    # CORS
    BACKEND_CORS_ORIGINS: str = ""

    @property
    def cors_origins(self) -> List[str]:
        if not self.BACKEND_CORS_ORIGINS:
            return []
        return [i.strip() for i in self.BACKEND_CORS_ORIGINS.split(",")]

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

settings = Settings()
