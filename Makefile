.PHONY: help build push tag-compose up down logs sitrep seed-demo-users clean-demo-users lint format test-unit unit-tests test-integration playwright test admin prod-all investor-demo-setup

# --- Configuration ---
BACKEND_CMD := docker-compose exec -T -e PYTHONPATH=. backend
FRONTEND_DIR := frontend

# CI/CD Configuration (read from ci.env + VERSION)
VERSION     := $(shell cat VERSION 2>/dev/null || echo "0.0.0")
GIT_SHA     := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
IMAGE_TAG   := $(VERSION)-$(GIT_SHA)

# Source registry config
include ci.env
export

# Fully qualified image refs
BACKEND_REF  := $(REGISTRY)/$(BACKEND_IMAGE):$(IMAGE_TAG)
FRONTEND_REF := $(REGISTRY)/$(FRONTEND_IMAGE):$(IMAGE_TAG)

help:
	@echo "======================================================================"
	@echo "   MULTI-TRAINER PLATFORM - ADMIN OPERATIONS"
	@echo "======================================================================"
	@echo ""
	@echo "CORE FLOWS"
	@echo "  make prod-all            : Full Build -> Lint -> Test -> Seed -> Status"
	@echo "  make investor-demo-setup : Production Setup + Rich Demo Data"
	@echo ""
	@echo "MANAGEMENT"
	@echo "  make admin args='...'    : Run CLI Admin Commands (e.g. args='approve-trainer 5')"
	@echo "  make sitrep              : System Health & DB Statistics"
	@echo "  make logs                : Tail Logs"
	@echo ""
	@echo "DATA"
	@echo "  make seed-demo-users     : Seed Complete Demo Environment"
	@echo "  make clean-demo-users    : Wipe All Demo Data"
	@echo ""
	@echo "CI/CD"
	@echo "  make lint                : Run Flake8 & ESLint"
	@echo "  make test                : Run All Backend & Frontend Tests"
	@echo "  make format              : Format Code (Black, Isort)"
	@echo "  make build               : Build tagged images ($(IMAGE_TAG))"
	@echo "  make push                : Push images to $(REGISTRY)"
	@echo "  make tag-compose         : Update docker-compose.prod.yml tags via yq"
	@echo "======================================================================"

# --- INFRASTRUCTURE ---

# Local development: build + start from source via dev compose
up:
	docker-compose up -d

down:
	docker-compose down

# --- BUILD & SHIP ---

# Build production-tagged images
# Reads REGISTRY, image names from ci.env, version from VERSION + git SHA
build:
	docker build \
		-f backend/Dockerfile \
		--target runner \
		-t $(BACKEND_REF) \
		backend/
	docker build \
		-f frontend/Dockerfile \
		--target runner \
		-t $(FRONTEND_REF) \
		frontend/

# Push to configured registry
push:
	docker push $(BACKEND_REF)
	docker push $(FRONTEND_REF)

# Update image tags in docker-compose.prod.yml via yq
tag-compose:
	yq -i '.services.backend.image = "$(BACKEND_REF)"' docker-compose.prod.yml
	yq -i '.services.frontend.image = "$(FRONTEND_REF)"' docker-compose.prod.yml
	@echo "Updated docker-compose.prod.yml with tag: $(IMAGE_TAG)"

# --- QUALITY ---
lint:
	@$(BACKEND_CMD) flake8 app/
	@cd $(FRONTEND_DIR) && npm run lint

format:
	@$(BACKEND_CMD) black app/ tests/
	@$(BACKEND_CMD) isort app/ tests/

test-unit unit-tests:
	@echo "Running Unit Tests..."
	@$(BACKEND_CMD) pytest tests -m "not integration"
	@cd $(FRONTEND_DIR) && npm run test -- --run

test-integration:
	@echo "Running Integration Tests..."
	@$(BACKEND_CMD) pytest tests -m "integration"

playwright:
	@echo "Running Playwright E2E Tests..."
	@cd $(FRONTEND_DIR) && npm run test:e2e

test: test-unit test-integration playwright
	@echo "All tests completed."

# --- ADMINISTRATION ---
sitrep:
	@$(BACKEND_CMD) python app/db/sitrep.py

admin:
	@if [ -z "$(args)" ]; then \
		$(BACKEND_CMD) python app/cli.py; \
	else \
		$(BACKEND_CMD) python app/cli.py $(args); \
	fi

logs:
	docker-compose logs -f -n 100

# --- DATA ---
seed-demo-users:
	@echo "Seeding Full Demo Environment..."
	@$(BACKEND_CMD) python app/db/demo_data.py seed

clean-demo-users:
	@echo "Cleaning All Demo Data..."
	@$(BACKEND_CMD) python app/db/demo_data.py clean

seed-test-data:
	@echo "Seeding Test Personas..."
	@$(BACKEND_CMD) python app/db/seed_test_data.py

# --- PRIMARY ENTRY POINTS ---

prod-all: down up
	@echo "Starting Production Readiness Check..."
	@sleep 10
	@$(MAKE) format
	-@$(MAKE) lint
	@$(MAKE) test
	@$(MAKE) seed-demo-users
	@$(MAKE) sitrep
	@echo "Production Ready."

investor-demo-setup: down up
	@echo "Setting up Investor Demo..."
	@sleep 15
	@$(MAKE) seed-demo-users
	@$(MAKE) sitrep
	@echo "Investor Demo Ready: http://localhost:3000"
