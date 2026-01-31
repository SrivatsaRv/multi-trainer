import pytest
from app.main import app

def test_health_check(client):
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_app_title():
    assert "Multi-Trainer Gym SaaS" in app.title

def test_openapi_url():
    assert app.openapi_url == "/api/v1/openapi.json"
