.PHONY: help up down build logs shell-backend test-backend test-e2e seed-demo-users clean-demo-users clean-all sitrep

help:
	@echo "Available commands:"
	@echo "  make up                - Start services in background"
	@echo "  make down              - Stop services"
	@echo "  make build             - Rebuild and start services"
	@echo "  make logs              - Tail logs"
	@echo "  make sitrep            - Show system status (DB counts, Health)"
	@echo "  make seed-demo-users   - Create all demo users (Gyms + Trainers + Admin)"
	@echo "  make seed-gyms         - Create demo Gyms only"
	@echo "  make seed-trainers     - Create demo Trainers only"
	@echo "  make clean-demo-users  - Remove all demo users"
	@echo "  make clean-gyms        - Remove demo Gyms only"
	@echo "  make clean-trainers    - Remove demo Trainers only"
	@echo "  make test-backend      - Run backend tests"
	@echo "  make test-e2e          - Run frontend E2E tests"
	@echo "  make shell-backend     - Access backend container shell"

# --- System Status ---
sitrep:
	@docker-compose exec backend python app/db/sitrep.py || echo "⚠️  Backend container might be down"


# --- Docker Control ---
up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose up -d --build

logs:
	docker-compose logs -f

# --- Data Management ---
seed-demo-users:
	@echo "Seeding All Demo Users..."
	docker-compose exec backend python app/db/demo_data.py seed

seed-gyms:
	@echo "Seeding Demo Gyms..."
	docker-compose exec backend python app/db/demo_data.py seed-gyms

seed-trainers:
	@echo "Seeding Demo Trainers..."
	docker-compose exec backend python app/db/demo_data.py seed-trainers

clean-demo-users:
	@echo "Cleaning All Demo Users..."
	docker-compose exec backend python app/db/demo_data.py clean

clean-gyms:
	@echo "Cleaning Demo Gyms..."
	docker-compose exec backend python app/db/demo_data.py clean-gyms

clean-trainers:
	@echo "Cleaning Demo Trainers..."
	docker-compose exec backend python app/db/demo_data.py clean-trainers

# --- Testing ---
test-backend:
	docker-compose exec -e PYTHONPATH=. backend pytest tests

test-e2e:
	@echo "Running E2E Tests..."
	cd frontend && npx playwright test

# --- Utilities ---
shell-backend:
	docker-compose exec backend /bin/bash

db-shell:
	docker-compose exec db psql -U postgres -d app

format:
	docker-compose exec backend black .
	docker-compose exec backend isort .

# --- Admin CLI ---
# Usage: make admin cmd="list-gyms"
# Usage: make admin cmd="create-gym --name 'My Gym' ..."
admin:
	@docker-compose exec backend python app/cli.py $(cmd)

# --- CI/CD ---
test-all: test-backend test-e2e
	@echo "All tests passed!"

# --- Full Lifecycle ---
# Usage: make all
all: down build
	@echo "Waiting for services to stabilize..."
	@sleep 10
	@$(MAKE) seed-demo-users
	@$(MAKE) test-all
	@$(MAKE) sitrep
	@echo "==================================================="
	@echo "Application Ready & Verified"
	@echo "==================================================="
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔌 API Docs: http://localhost:8000/docs"
	@echo "==================================================="
