# kya-validator/CONTRIBUTING.md
# Contributing to KYA Validator

## Development Setup

### Prerequisites

- Rust 1.70+ (via rustup)
- Python 3.12+
- uv (for Python dependencies)
- Node.js 18+ (optional, for WASM/UI demos)

### Quick Start

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Python dependencies
uv sync

# Build the project
make build

# Run tests
make test
```

## Development Workflow

### Core Development (Rust + Python)

```bash
# Build with Python bindings
make build

# Run Rust tests
cargo test

# Run Python tests
python -m pytest tests/

# Format code
cargo fmt
```

### Linting & Type Checking

```bash
# Run Rust linter
make lint

# Format code
make fmt
```

### Optional Components

The following are **not required** for core development:

- **UI Demo**: `make demo-install && make run` (runs both backend and frontend)
- **Backend only**: `make demo-backend`
- **Frontend only**: `make demo-frontend`

## CI Notes

### Pre-commit Hooks

The project uses pre-commit configuration (`.pre-commit-config.yaml`). Install with:

```bash
pip install pre-commit
pre-commit install
```

## Release Process

### Version Bump

1. Update `Cargo.toml` version
2. Update `pyproject.toml` version to match
3. Update README.md version footer

### Release Steps

```bash
# Tag the release
git tag -a v0.x.x -m "Release v0.x.x"
git push --tags

# Build Python package
uv tool run maturin build --release

# Publish to PyPI (if authorized)
uv publish
```

### Release Checklist

- [ ] All tests passing
- [ ] Version numbers updated in both Cargo.toml and pyproject.toml
- [ ] CHANGELOG.md updated (if present)
- [ ] Tag created and pushed
- [ ] Python package built successfully
- [ ] Documentation updated

## Code Style

### Rust

- Follow standard Rust naming conventions
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Document public APIs

### Python

- Use `ruff` for linting and formatting
- Follow PEP 8 conventions
- Type hints required for public functions
- Use `loguru` for logging (no `print()`)

## Testing

### Core Tests

```bash
# Run all tests
make test

# Run specific test
cargo test test_name

# Run Python tests
python -m pytest tests/ -v
```

### Test Coverage

```bash
# Python coverage (TODO: add coverage tooling)
python -m pytest --cov=bindings/python tests/
```

## Release Process

### CI Workflow (Manual Activation Required)

The CI workflow does **not** run automatically. It must be triggered manually and requires explicit opt-in to publish.

#### Running CI Without Publishing (Default)

To run validation and build jobs without publishing:

1. Go to [GitHub Actions > CI workflow](../../actions/workflows/ci.yml)
2. Click **Run workflow**
3. Leave **Enable publish to crates.io, PyPI, and GitHub Releases** unchecked
4. Click **Run workflow**

This runs all validation jobs:
- Rust tests and linting (Ubuntu + macOS)
- Python bindings build
- Frontend lint and tests

#### Running CI With Publishing (Maintainers Only)

To publish to crates.io, PyPI, and create GitHub Releases:

1. Go to [GitHub Actions > CI workflow](../../actions/workflows/ci.yml)
2. Click **Run workflow**
3. Check **Enable publish to crates.io, PyPI, and GitHub Releases**
4. Click **Run workflow**

The workflow publishes to:
- **crates.io**: Rust crate (`kya-validator`)
- **PyPI**: Python package (`kya-validator`)
- **GitHub Releases**: Pre-built wheels as release artifacts

#### Prerequisites for Publishing

1. **crates.io Token** (for maintainer):
   - Create a token at https://crates.io/settings/tokens
   - Add as repository secret: `CRATES_IO_TOKEN`

2. **PyPI Trusted Publishing** (for maintainer):
   - Configure PyPI project at https://pypi.org/manage/project/kya-validator/settings/publishing/
   - Add GitHub repository as trusted publisher (no password/token needed)

#### Why Manual Activation?

- Prevents accidental publishes from branch pushes
- Requires intentional maintainer action
- Build/test jobs still run on every manual dispatch for validation
- Publish jobs only run when explicitly enabled

### Manual Local Release

For manual publishing:

```bash
# Build and publish Rust crate
cargo login <crates-io-token>
cargo publish

# Build and publish Python package
uv sync
uv run maturin build --release
twine upload dist/*
```

### Trust Model

| Method | Security | Convenience |
|--------|----------|--------------|
| CI + Trusted Publishing | High (OIDC, no long-lived secrets) | High |
| CI + Token Secret | Medium (secret rotation required) | Medium |
| Manual Local | Low (token on local machine) | Low |

**Why CI + Trusted Publishing is recommended:**
- No long-lived API tokens stored in GitHub secrets
- OIDC-based authentication with time-limited tokens
- Audit trail via GitHub Actions
- Automatic build verification before publish
- Reduce risk of accidental or compromised token exposure

## Issue Reporting

When reporting issues, include:
- Version number
- Minimal reproducible example
- Expected vs actual behavior
- Environment details (OS, Rust/Python versions)

## License

By contributing to this project, you agree to the following terms:
1. You certify that you own the rights to your contribution or have the right to submit it.
2. You grant the project maintainers Lars Kæraa Lücke a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to use, reproduce, modify, display, and distribute your contribution, including the right to relicense the contribution under different terms (including proprietary licenses) for any purpose.
3. Your contribution is otherwise licensed to the public under the project's standard license (AGPLv3).
