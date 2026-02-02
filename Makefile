.PHONY: help build up down logs sitrep seed-demo-users seed-gyms seed-trainers clean-demo-users clean-gyms clean-trainers lint format unit-tests integration-tests test-e2e test-all investor-demo-setup prod-all dev-all shell-backend db-shell admin ci-pipeline

# --- Configuration ---
BACKEND_CMD := docker-compose exec -T -e PYTHONPATH=. backend
BACKEND_SHELL := docker-compose exec backend
FRONTEND_DIR := frontend

help:
	@echo "======================================================================"
	@echo "   MULTI-TRAINER PLATFORM - MAKEFILE HELP"
	@echo "======================================================================"
	@echo ""
	@echo "CI/CD STAGES (Pipeline Order)"
	@echo "  1. make build            : Build Docker images (Artifact Stage)"
	@echo "  2. make up               : Start Ephemeral Test Environment (infra-provision)"
	@echo "  3. make lint             : Run Static Analysis (flake8, eslint)"
	@echo "  4. make unit-tests       : Run Fast Tests (No DB required theoretically, but runs in container)"
	@echo "  5. make integration-tests: Run DB-dependent Backend Tests"
	@echo "  6. make test-e2e         : Run Full Browser Tests (Playwright)"
	@echo "  7. make down             : Cleanup Environment"
	@echo ""
	@echo "COMPOSED WORKFLOWS (Dev & Prod)"
	@echo "  make ci-pipeline         : Run FULL Pipeline (Build -> Up -> Lint -> Test-All -> Down)"
	@echo "  make prod-all            : Clean Build + Static Data + All Tests + Sitrep (Ready for Review)"
	@echo "  make dev-all             : Clean Build + Static Data + Tests + Logs (Debug Mode)"
	@echo "  make investor-demo-setup : Production-like Setup + Faker Data (Demo Ready)"
	@echo ""
	@echo "DEVELOPMENT UTILITIES"
	@echo "  make format              : Format Code (black, isort)"
	@echo "  make logs                : Tail Logs"
	@echo "  make sitrep              : System Status Check"
	@echo "  make shell-backend       : Shell into Backend"
	@echo "  make db-shell            : SQL Shell"
	@echo "  make admin cmd=...       : Run CLI Admin Commands"
	@echo ""
	@echo "DATA OPERATIONS"
	@echo "  make seed-demo-users     : Seed Static Demo Users"
	@echo "  make clean-demo-users    : Remove Demo Users"
	@echo "======================================================================"

# --- STAGE 1: BUILD ---
build:
	@echo "[CI] Building Docker Images..."
	docker-compose build

# --- STAGE 2: ENVIRONMENT ---
up:
	@echo "[CI] Starting Ephemeral Environment..."
	docker-compose up -d

down:
	@echo "[CI] Tearing Down Environment..."
	docker-compose down

# --- STAGE 3: LINT ---
lint:
	@echo "[CI] Running Static Analysis..."
	@$(BACKEND_CMD) flake8 .
	@cd $(FRONTEND_DIR) && npm run lint

# --- STAGE 4: UNIT TESTS ---
unit-tests:
	@echo "[CI] Running Unit Tests..."
	@$(BACKEND_CMD) pytest tests --ignore=tests/integration
	@cd $(FRONTEND_DIR) && npm run test

# --- STAGE 5: INTEGRATION TESTS ---
integration-tests:
	@echo "[CI] Running Integration Tests..."
	@$(BACKEND_CMD) pytest tests/integration

# --- STAGE 6: E2E TESTS ---
test-e2e:
	@echo "[CI] Running E2E Tests..."
	@cd $(FRONTEND_DIR) && npx playwright test

# --- Utilities & Composed ---
format:
	@echo "Formatting Code..."
	@$(BACKEND_CMD) black .
	@$(BACKEND_CMD) isort .

test-all: unit-tests integration-tests test-e2e
	@echo "All Tests Passed"

logs:
	docker-compose logs -f -n 100

sitrep:
	@$(BACKEND_CMD) python app/db/sitrep.py || echo "Backend container might be down"

shell-backend:
	$(BACKEND_SHELL) /bin/bash

db-shell:
	docker-compose exec db psql -U postgres -d gym_saas

admin:
	@$(BACKEND_CMD) python app/cli.py $(cmd)

# --- Data Helpers ---
seed-demo-users:
	@echo "Seeding Static Demo Users..."
	@$(BACKEND_CMD) python app/db/demo_data.py seed

clean-demo-users:
	@echo "Cleaning Demo Users..."
	@$(BACKEND_CMD) python app/db/demo_data.py clean

# --- Specific Workflows ---

ci-pipeline: build up
	@echo "Starting Full CI Pipeline..."
	@echo "Waiting for services..."
	@sleep 10
	@$(MAKE) lint
	@$(MAKE) test-all
	@$(MAKE) down
	@echo "CI Pipeline Complete - Artifacts Verified."

investor-demo-setup: down build up
	@echo "Waiting for services..."
	@sleep 10
	@$(MAKE) seed-demo-users
	@echo "Seeding Investor Analytics..."
	@$(BACKEND_CMD) python app/db/demo_data.py seed-analytics
	@echo "Investor Demo Ready: http://localhost:3000"

prod-all: down build up
	@echo "Starting Production Readiness Check..."
	@echo "Waiting for services..."
	@sleep 10
	@$(MAKE) lint
	@$(MAKE) test-all
	@$(MAKE) seed-demo-users
	@$(MAKE) sitrep
	@echo "Production Ready"

dev-all: down build up
	@echo "Starting Development Environment..."
	@echo "Waiting for services..."
	@sleep 10
	@$(MAKE) format
	@$(MAKE) lint
	@$(MAKE) test-all
	@$(MAKE) seed-demo-users
	@echo "Dev Ready. Attaching logs..."
	@$(MAKE) logs

# Alias
all: prod-all
