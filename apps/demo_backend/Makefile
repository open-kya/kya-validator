# apps/demo_backend/Makefile
PYTHON ?= $(shell (pyenv which python >/dev/null 2>&1 && pyenv which python) || which python3)

.PHONY: install run test

install:
	# Install parent kya-validator package (using uv/maturin) from project root
	cd ../.. && uv tool run maturin develop
	# Install demo backend dependencies using uv
	uv sync --extra dev

run:
	uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload

test:
	uv run python -m pytest
