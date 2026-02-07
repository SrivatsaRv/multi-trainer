import pytest

from app.core.config import Settings


def test_settings_defaults():
    settings = Settings()

    assert settings.API_V1_STR == "/api/v1"
    assert settings.PROJECT_NAME == "Multi-Trainer Gym SaaS"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24 * 8


def test_cors_origins_empty():
    settings = Settings(BACKEND_CORS_ORIGINS="")
    assert settings.cors_origins == []


def test_cors_origins_single():
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000")
    assert settings.cors_origins == ["http://localhost:3000"]


def test_cors_origins_multiple():
    origins = "http://localhost:3000,https://example.com,http://127.0.0.1:8000"
    settings = Settings(BACKEND_CORS_ORIGINS=origins)
    expected = ["http://localhost:3000", "https://example.com", "http://127.0.0.1:8000"]
    assert settings.cors_origins == expected


def test_cors_origins_with_spaces():
    origins = "http://localhost:3000, https://example.com , http://127.0.0.1:8000"
    settings = Settings(BACKEND_CORS_ORIGINS=origins)
    expected = ["http://localhost:3000", "https://example.com", "http://127.0.0.1:8000"]
    assert settings.cors_origins == expected
