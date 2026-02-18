# kya-validator/Makefile
PYTHON ?= $(shell (pyenv which python >/dev/null 2>&1 && pyenv which python) || which python3)

.PHONY: build test fmt lint python release verify demo-install demo-backend demo-frontend run fix-verify install-tools clean get-lastest-schema install check-version sync-version

# Schema URL (raw content URL for downloading)
# TODO: Update this URL when the Open KYA standard repo is available
KYA_SCHEMA_URL := https://raw.githubusercontent.com/fut-ai/open-kya-standard/main/schema/kya-manifest.schema.json

# Download latest KYA schema from Open KYA standard repo
get-lastest-schema:
	@echo "Downloading latest KYA schema from $(KYA_SCHEMA_URL)..."
	@curl -fsSL "$(KYA_SCHEMA_URL)" -o schema/kya-manifest.schema.json
	@echo "✅ Schema updated: schema/kya-manifest.schema.json"

# Install: refresh schema first, then run setup
install: get-lastest-schema
	@echo "Running install..."

build:
	PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 PYO3_PYTHON=$(PYTHON) cargo build --features cli

test:
	cargo test --features cli

fmt:
	cargo fmt

lint:
	PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 PYO3_PYTHON=$(PYTHON) cargo clippy --all-targets --all-features -- -D warnings

python:
	PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 PYO3_PYTHON=$(PYTHON) uv tool run maturin develop

release: build
	PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 PYO3_PYTHON=$(PYTHON) uv tool run maturin build --release

install-tools:
	uv tool install maturin

# Check that all version files are synchronized
check-version:
	@echo "Checking version consistency across all manifest files..."
	@CARGO_VERSION=$$(grep '^version =' Cargo.toml | head -1 | sed 's/.*"\(.*\)".*/\1/'); \
	PYPROJECT_VERSION=$$(grep '^version =' pyproject.toml | head -1 | sed 's/.*"\(.*\)".*/\1/'); \
	NPM_VERSION=$$(grep '"version":' bindings/wasm/package.json | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/'); \
	LOCK_VERSION=$$(grep -A1 '^name = "kya-validator"$$' Cargo.lock | grep '^version =' | head -1 | sed 's/.*"\(.*\)".*/\1/'); \
	ERRORS=0; \
	echo ""; \
	echo "Cargo.toml:           $$CARGO_VERSION"; \
	echo "pyproject.toml:       $$PYPROJECT_VERSION"; \
	echo "package.json:         $$NPM_VERSION"; \
	echo "Cargo.lock:           $$LOCK_VERSION"; \
	echo ""; \
	if [ "$$CARGO_VERSION" != "$$PYPROJECT_VERSION" ]; then \
		echo "❌ Cargo.toml != pyproject.toml"; \
		ERRORS=1; \
	fi; \
	if [ "$$CARGO_VERSION" != "$$NPM_VERSION" ]; then \
		echo "❌ Cargo.toml != package.json"; \
		ERRORS=1; \
	fi; \
	if [ "$$CARGO_VERSION" != "$$LOCK_VERSION" ]; then \
		echo "❌ Cargo.toml != Cargo.lock (run: make sync-version)"; \
		ERRORS=1; \
	fi; \
	if [ $$ERRORS -eq 1 ]; then \
		echo ""; \
		echo "⚠️ Version mismatch detected!"; \
		echo "Run 'make sync-version' to sync Cargo.lock"; \
		echo "Manually update Cargo.toml, pyproject.toml, and package.json to match"; \
		exit 1; \
	fi; \
	echo "✅ All versions match: $$CARGO_VERSION"

# Sync Cargo.lock with Cargo.toml version
sync-version:
	@echo "Syncing Cargo.lock..."
	@cargo update -p kya-validator
	@echo "✅ Cargo.lock updated"
	@$(MAKE) check-version

demo-install:
	$(MAKE) -C apps/demo_backend install

demo-backend:
	$(MAKE) -C apps/demo_backend run

demo-frontend:
	cd apps/ui && npm run dev

# Run both backend and frontend concurrently with named, colored streams
# -k: kill all processes if one exits (except on Ctrl-C which kills all)
run:
	@echo "Starting backend and frontend concurrently..."
	npx concurrently --kill-others-on-fail --names "backend,frontend" --prefix-colors "bgBlue.bold,bgMagenta.bold" \
		"$(MAKE) -C apps/demo_backend run" \
		"cd apps/ui && npm run dev"

# Multi-stage fix and verification pipeline
# Tracks failures across all stages and reports summary at end
# Critical stages (build, test) stop the pipeline on failure
# Non-critical stages (lint, install) continue but are tracked
# Dependent stages are skipped if prerequisites fail
fix-verify:
	@echo "=== Starting verification pipeline ==="
	@FAILED_STAGES=""; \
	CRITICAL_FAILED=0; \
	SKIP_REMAINDER=0; \
	\
	echo "=== Stage 1/7: Rust build ==="; \
	if $(MAKE) build; then \
		echo "✅ Stage 1 passed"; \
	else \
		echo "❌ Stage 1 FAILED"; \
		FAILED_STAGES="$$FAILED_STAGES 1"; \
		CRITICAL_FAILED=1; \
		SKIP_REMAINDER=1; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 2/7: Rust lint ==="; \
		if $(MAKE) lint; then \
			echo "✅ Stage 2 passed"; \
		else \
			echo "⚠️  Stage 2 had issues (non-fatal)"; \
		fi; \
	else \
		echo "=== Stage 2/7: Rust lint [SKIPPED] ==="; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 3/7: Rust test ==="; \
		if $(MAKE) test; then \
			echo "✅ Stage 3 passed"; \
		else \
			echo "❌ Stage 3 FAILED"; \
			CRITICAL_FAILED=1; \
			SKIP_REMAINDER=1; \
		fi; \
	else \
		echo "=== Stage 3/7: Rust test [SKIPPED] ==="; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 4/7: Backend install/setup ==="; \
		if $(MAKE) demo-install; then \
			echo "✅ Stage 4 passed"; \
		else \
			echo "⚠️  Stage 4 had issues (non-fatal)"; \
		fi; \
	else \
		echo "=== Stage 4/7: Backend install/setup [SKIPPED] ==="; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 5/7: Backend test ==="; \
		if $(MAKE) -C apps/demo_backend test; then \
			echo "✅ Stage 5 passed"; \
		else \
			echo "❌ Stage 5 FAILED"; \
			CRITICAL_FAILED=1; \
			SKIP_REMAINDER=1; \
		fi; \
	else \
		echo "=== Stage 5/7: Backend test [SKIPPED] ==="; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 6/7: Frontend lint ==="; \
		if (cd apps/ui && npm run lint); then \
			echo "✅ Stage 6 passed"; \
		else \
			echo "⚠️  Stage 6 had issues (non-fatal)"; \
		fi; \
	else \
		echo "=== Stage 6/7: Frontend lint [SKIPPED] ==="; \
	fi; \
	\
	if [ $$SKIP_REMAINDER -eq 0 ]; then \
		echo "=== Stage 7/7: Frontend unit test ==="; \
		if (cd apps/ui && npm run test:unit); then \
			echo "✅ Stage 7 passed"; \
		else \
			echo "❌ Stage 7 FAILED"; \
			CRITICAL_FAILED=1; \
		fi; \
	else \
		echo "=== Stage 7/7: Frontend unit test [SKIPPED] ==="; \
	fi; \
	\
	if [ $$CRITICAL_FAILED -eq 0 ]; then \
		echo "=== ✅ All critical stages passed ==="; \
	else \
		echo "=== ❌ One or more critical stages failed ==="; \
	fi; \
	exit $$CRITICAL_FAILED

# Remove all gitignored files and directories (useful before copying repo)
clean:
	git clean -fdX
