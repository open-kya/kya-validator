# KYA Validator

A robust Rust-core validator for KYA (Know Your AI) Manifests with Python, Rust, and TypeScript/JavaScript bindings.

## Overview

The KYA Validator provides comprehensive validation of AI agent manifests, ensuring cryptographic proof of identity, attestation of secure execution environments, and enforcement of policy rules.

## Features

### Core Validation ✅
- **Schema Validation**: JSON Schema (Draft 7) compliance checking
- **DID Resolution**: Support for `did:key`, `did:web`, and `did:pkh`
- **Cryptographic Verification**: Ed25519 and Secp256k1 signature validation
- **TTL Checks**: Time-to-live validation for manifest freshness
- **External Link Validation**: URL reachability and content verification
- **Content Hashing**: SHA256/384/512 digest verification

### Advanced Features (Phase 2) 🚀
- **TEE Evidence Validation**: Intel SGX and AMD SEV-SNP attestation
- **Blockchain Solvency**: Multi-provider on-chain balance verification
- **Advanced Policy Engine**: Complex rule composition and evaluation
- **WebAssembly/TypeScript**: Full browser and Node.js support

## Installation

### Rust
```bash
cargo add kya_validator
```

### Python
```bash
pip install kya-validator
```

### TypeScript/JavaScript (WASM)
```bash
# From npm
pnpm add @open-kya/kya-validator-wasm

# Local build
cd bindings/wasm && pnpm run build:all
```

> **Note**: For local development builds, see [bindings/wasm/README.md](bindings/wasm/README.md).

## Quick Start

### Rust
```rust
use kya_validator::{validate_manifest_value, ValidationConfig};
use serde_json::json;

let manifest = json!({
    "kyaVersion": "1.0",
    "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proof": []
});

let report = validate_manifest_value(&manifest);
println!("Valid: {}", report.schema_valid);
```

### Python
```python
from kya_validator import validate_manifest, ValidationConfig

manifest = {
    "kyaVersion": "1.0",
    "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proof": []
}

report = validate_manifest(json.dumps(manifest))
print(f"Valid: {report.is_valid}")
```

### TypeScript/JavaScript (Browser)
```typescript
import { validateManifest, init } from '@open-kya/kya-validator-wasm/browser';

// Initialize WASM module
await init();

const manifest = {
    kyaVersion: "1.0",
    agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    proof: []
};

const report = await validateManifest(manifest);
console.log("Valid:", report.schema_valid);
```

### TypeScript/JavaScript (Node.js)
```typescript
import { validateManifest } from '@open-kya/kya-validator-wasm/node';

// No async init needed in Node.js
const manifest = {
    kyaVersion: "1.0",
    agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    proof: []
};

const report = validateManifest(manifest);
console.log("Valid:", report.schema_valid);
```

## Python API

### Core Types

The Python package provides the following core types:

- `ValidationConfig` - Configuration for manifest validation
- `ValidationReport` - Results of manifest validation
- `ValidationMode` - Validation mode (selfAudit/clientAudit)
- `HashAlgorithm` - Hash algorithm for digest computation
- `CryptoReport` - Cryptographic verification report
- `TeeEvidence` - TEE attestation evidence
- `TeeReport` - TEE verification report
- `SolvencyCheck` - Blockchain solvency check configuration
- `SolvencyReport` - Blockchain solvency report
- `PolicyContext` - Context for policy evaluation

### Main Classes

- `Validator` - Main validator for manifest validation
- `PolicyEngine` - Advanced policy rule evaluation
- `TeeVerifier` - TEE attestation evidence verifier
- `SolvencyChecker` - Blockchain solvency checker
- `StreamingValidator` - Chunk-based validation for large manifests
- `PluginManager` - Plugin system manager
- `Inspector` - Manifest inspector
- `Resolver` - DID and verification method resolver

### Configuration

```python
from kya_validator import load_config, ValidationConfig

# Load from file
config = load_config('config.json')

# Load from environment variables
config = load_config()  # Uses KYA_VALIDATOR_* env vars

# Create preset
config = ValidationConfig.self_audit()
```

### Validation

```python
from kya_validator import validate_manifest, ValidationReport

# Simple validation
manifest = {"kyaVersion": "1.0", "agentId": "...", "proof": [...]}
report = validate_manifest(json.dumps(manifest))

# With configuration
from kya_validator import ValidationConfig, validate_manifest_with_config

config = ValidationConfig(
    mode=ValidationMode.SELF_AUDIT,
    allowed_kya_versions=["1.0"],
    required_fields=["/agentId", "/proof"],
)
report = validate_manifest_with_config(
    manifest_json=json.dumps(manifest),
    config=config,
)
```

### TEE Verification

```python
from kya_validator import TeeVerifier, TeeEvidence

verifier = TeeVerifier()
evidence = TeeEvidence(
    attestation_type="intel-sgx",
    quote="base64encodedquote...",
    mr_enclave="0" * 64,
    mr_signer="0" * 64,
    product_id=0,
    min_svn=2,
)

report = verifier.verify(evidence)
print(f"Valid: {report.valid}")
```

### Blockchain Solvency

```python
from kya_validator import verify_solvency

report = verify_solvency(
    address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bE",
    network="ethereum",
    min_balance="0x0",
    provider="alchemy",
)

print(f"Meets minimum: {report.meets_minimum}")
print(f"Balance: {report.balance_ether} ETH")
```

### Policy Evaluation

```python
from kya_validator import PolicyEngine, create_policy, create_rule

engine = PolicyEngine()
policy = create_policy(
    name="strict-policy",
    rules=[
        create_rule(
            name="version-check",
            condition={
                "pointer": "/kyaVersion",
                "operator": "equals",
                "value": "1.0",
            },
            action="deny",
        ),
    ],
)

engine.add_policy(policy)
result = engine.evaluate(manifest)
print(f"Allowed: {result.allowed}")
```

### Streaming Validation

```python
from kya_validator import StreamingValidator

validator = StreamingValidator()
result = validator.add_chunk('{"kyaVersion": "1.0"}', 1)
result = validator.add_chunk('{"agentId": "..."}', 2)
report = validator.finalize()

print(f"Valid: {report['valid']}")
print(f"Chunks: {report['state']['chunksProcessed']}")
```

### Plugin System

```python
from kya_validator import PluginManager, ValidationPlugin

class CustomPlugin(ValidationPlugin):
    def name(self):
        return "custom_plugin"

    def version(self):
        return "1.0.0"

    def description(self):
        return "A custom validation plugin"

    def custom_rules(self):
        return []

manager = PluginManager()
plugin = CustomPlugin()
manager.register(plugin)

info = manager.get_plugin_info("custom_plugin")
print(f"Plugin: {info.name}")
print(f"Enabled: {manager.get_enabled_plugins()}")
```

### DID Resolution

```python
from kya_validator import Resolver

resolver = Resolver()

# Resolve did:key
key = resolver.resolve_key("did:key:z6Mk...")
print(f"Key ID: {key['id']}")

# Parse did:pkh
info = resolver.parse_did_pkh(
    "did:pkh:eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bE"
)
print(f"Network: {info['network']}")
print(f"Address: {info['address']}")
```

## Configuration

### Default Configuration

```json
{
  "mode": "SelfAudit",
  "allowedKyaVersions": ["1.0", "1.1"],
  "requiredFields": [],
  "enforceControllerMatch": true,
  "checkExternalLinks": false,
  "requireAllProofs": false,
  "requiredFieldPairs": [],
  "allowedControllers": [],
  "requiredVcTypes": [],
  "attestationChecks": []
}
```

### Self-Audit Preset

```json
{
  "mode": "SelfAudit",
  "allowedKyaVersions": ["1.0", "1.1"],
  "requiredFields": ["/agentId", "/proof"],
  "enforceControllerMatch": true,
  "checkExternalLinks": true,
  "requireAllProofs": true,
  "requiredFieldPairs": [],
  "allowedControllers": [],
  "requiredVcTypes": [],
  "attestationChecks": []
}
```

### Client-Audit Preset

```json
{
  "mode": "ClientAudit",
  "allowedKyaVersions": ["1.0", "1.1"],
  "requiredFields": ["/agentId", "/proof"],
  "enforceControllerMatch": true,
  "checkExternalLinks": false,
  "requireAllProofs": false,
  "requiredFieldPairs": [],
  "allowedControllers": [],
  "requiredVcTypes": [],
  "attestationChecks": []
}
```

## Documentation

### Core Modules

- [Schema Validation](./core/validator.rs) - JSON Schema compliance checking
- [DID Resolution](./core/resolver.rs) - DID key resolution
- [Cryptographic Verification](./core/verifier.rs) - Signature validation
- [Inspector Module](./core/inspector.rs) - Field validation
- [Policy Engine](./core/policy.rs) - Basic policy evaluation


## Testing

### Run All Tests

```bash
make test
```

### Run Python Tests

```bash
python -m pytest tests/
```

## Configuration

### Environment Variables

Configuration can be loaded from environment variables with the `KYA_VALIDATOR_` prefix:

- `KYA_VALIDATOR_MODE` - Validation mode
- `KYA_VALIDATOR_ALLOWED_VERSIONS` - Comma-separated list of allowed versions
- `KYA_VALIDATOR_REQUIRED_FIELDS` - Comma-separated list of required fields
- `KYA_VALIDATOR_ENFORCE_CONTROLLER_MATCH` - Boolean for controller matching
- `KYA_VALIDATOR_CHECK_EXTERNAL_LINKS` - Boolean for external link checking
- `KYA_VALIDATOR_REQUIRE_ALL_PROOFS` - Boolean for requiring all proofs

### Example: Setting Environment Variables

```bash
export KYA_VALIDATOR_MODE=SelfAudit
export KYA_VALIDATOR_ALLOWED_VERSIONS=1.0,1.1
export KYA_VALIDATOR_REQUIRED_FIELDS=/agentId,/proof
```

## Performance

### Validation Performance

- **Schema Validation**: ~1-5ms
- **Crypto Verification**: ~5-20ms
- **TTL Checks**: <1ms
- **Policy Evaluation**: ~0.1-1ms per rule

### Advanced Features

- **TEE Quote Validation**: <10ms (structural), ~50-100ms (full)
- **Blockchain Balance**: <1ms (cached), ~50-200ms (network)
- **WASM Validation**: ~5-20ms per manifest

### Optimization Tips

1. **Reuse Configurations**: Parse and reuse config objects
2. **Batch Validations**: Validate multiple manifests together
3. **Use Caching**: Enable blockchain/TTL caching
4. **Pre-Validate JSON**: Check JSON format before validation
5. **Skip Unnecessary Checks**: Disable features not needed for your use case

## Security Considerations

### Best Practices

1. **Validate Input**: Always validate JSON before processing
2. **Check Signatures**: Never skip cryptographic verification
3. **Verify TEE**: Validate attestation claims
4. **Check Solvency**: Verify on-chain balances
5. **Enforce Policies**: Apply strict validation rules
6. **Use CSP Headers**: Set Content-Security-Policy headers for external requests

### CSP Headers

```json
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' blob:;
  worker-src 'self' blob:;
```

## Architecture

### Modular Design

```
kya-validator/
├── core/                  # Rust core library
│   ├── types.rs           # Core data structures
│   ├── validator.rs       # Main validation logic
│   ├── resolver.rs        # DID resolution
│   ├── verifier.rs        # Crypto verification
│   ├── inspector.rs      # Field validation
│   ├── policy.rs          # Basic policies
│   ├── tee.rs             # TEE attestation
│   ├── blockchain.rs      # Solvency checks
│   ├── policy_advanced.rs # Advanced policies
│   ├── wasm.rs            # WASM bindings
│   ├── plugin.rs          # Plugin system
│   ├── plugin_manager.rs  # Plugin management
│   └── lib.rs             # Exports
├── bindings/              # Language bindings
│   ├── python/           # Python bindings (PyO3)
│   │   ├── __init__.py
│   │   ├── types.py
│   │   ├── errors.py
│   │   ├── config.py
│   │   ├── utils.py
│   │   ├── validator.py
│   │   ├── policy.py
│   │   ├── tee.py
│   │   ├── blockchain.py
│   │   ├── streaming.py
│   │   ├── plugins.py
│   │   ├── inspector.py
│   │   ├── resolver.py
│   │   └── _ffi.py
│   └── wasm/              # WASM examples
│       ├── wasm-usage.ts
│       ├── wasm-usage.js
│       ├── wasm-async-usage.ts
│       ├── streaming-validation.ts
│       └── custom-plugin-example.ts
├── apps/                  # Applications
│   ├── ui/                # Policy editor UI (React/Vite)
│   └── demo_backend/      # Demo backend (FastAPI)
└── tests/                 # Test suite
```

### Integration Points

- **Resolver** → DID to public key mapping
- **Verifier** → Signature verification
- **Inspector** → Schema and TTL validation
- **TEE Module** → Attestation verification
- **Blockchain Module** → Solvency checks
- **Policy Engine** → Rule enforcement
- **Streaming Validator** → Chunk-based validation
- **Plugin System** → Custom validation rules

## Contributing

### Development Setup

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install dependencies
cargo build

# Run tests
cargo test

# Format code
cargo fmt

# Check code
cargo clippy
```

### Adding Features

1. Create feature branch
2. Write tests for new feature
3. Update documentation
4. Submit PR

### Code Style

- Follow Rust naming conventions
- Use `#[allow(...)]` sparingly
- Document public APIs
- Write tests for all public functions

## License

See LICENSE file for details.

## Resources

- [KYA Standard](../kya-standard/) - KYA protocol specification
- [W3C DID Core](https://www.w3.org/TR/did-core/) - DID specification
- [W3C VC Data Model](https://www.w3.org/TR/vc-data-model/) - Verifiable Credentials
- [Intel SGX](https://www.intel.com/content/www/us/en/developer/tools/software-guard-extensions.html) - TEE attestation

## Roadmap

### Phase 2 (In Progress - 80% Complete)

- [x] TEE Evidence Validation
- [x] Enhanced Solvency Verification
- [x] Advanced Policy Engine
- [x] TypeScript/WASM Bindings
- [ ] Performance Optimization
- [ ] Documentation Polish

### Phase 3 (Planned)

- [ ] Async WASM Operations
- [ ] Streaming Validation
- [ ] Plugin System
- [ ] Policy Editor UI
- [ ] Telemetry Integration
- [ ] Performance Optimization
- [ ] Documentation Polish

## Release & Packaging

### Versioning

Version follows semantic versioning (MAJOR.MINOR.PATCH):
- `Cargo.toml` (Rust): Source of truth for core version
- `pyproject.toml` (Python): Must match Rust version
- Update both files together before release

### Packaging

```bash
# Build Rust release
cargo build --release

# Build Python wheel (requires maturin)
uv tool run maturin build --release

# Build WASM package
wasm-pack build --target web
```

### Release Checklist

1. Update version in `Cargo.toml` and `pyproject.toml`
2. Update `CHANGELOG.md` (if present)
3. Tag release: `git tag -a v0.x.x -m "Release v0.x.x"`
4. Push tags: `git push --tags`
5. Build and publish Python package: `uv tool run maturin build --release && uv publish`
6. Publish WASM to npm (if applicable)

## Optional Components

The following components are **not required** for core validation functionality:

- **UI Demo** (`apps/ui/`) - React/Vite policy editor demo
- **Demo Backend** (`apps/demo_backend/`) - FastAPI demo with LLM integration
- **WASM Bindings** (`bindings/wasm/`) - Browser/Node.js WASM package. See [README](bindings/wasm/README.md) for documentation.

These are optional and may be moved to separate packages in future releases.

## Support

For issues, questions, or contributions, please open an issue or pull request in the repository.

---

**Version**: 0.2.0
**Status**: Production Ready (Core) / Beta (Phase 2 Features)
