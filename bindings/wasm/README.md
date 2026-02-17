# @open-kya/kya-validator-wasm

WebAssembly bindings for KYA (Know Your Agent) Validator, supporting both browser and Node.js environments.

## Installation

```bash
# From source (local development)
cd bindings/wasm
npm install
npm run build:all

# From git (when published)
npm install @open-kya/kya-validator-wasm
```

## Prerequisites

- **Rust** 1.70+ with `wasm32-unknown-unknown` target
- **wasm-pack** 0.12+ (`cargo install wasm-pack`)
- **Node.js** 18+ (for Node.js usage)
- **TypeScript** 5.0+ (for development)

## Usage

### Browser (ESM)

```typescript
import { 
  validateManifest, 
  init, 
  getDefaultConfig,
  getVersion 
} from "@open-kya/kya-validator-wasm/browser";

// Initialize WASM module
await init();

// Validate a manifest
const manifest = {
  kyaVersion: "1.0",
  agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  proof: []
};

const report = await validateManifest(manifest);
console.log("Valid:", report.schema_valid);
console.log("Version:", await getVersion());
```

### Node.js (ESM/CommonJS)

```typescript
// ESM
import { 
  validateManifest, 
  getDefaultConfig,
  ValidationError 
} from "@open-kya/kya-validator-wasm/node";

// Synchronous in Node.js (no async init needed)
const manifest = {
  kyaVersion: "1.0",
  agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  proof: []
};

const report = validateManifest(manifest);
console.log("Valid:", report.schema_valid);
```

### Universal Entry (Auto-detect Environment)

```typescript
import { 
  validateManifest, 
  environment,
  init 
} from "@open-kya/kya-validator-wasm";

// Initialize (only required for browser)
await init();

// Auto-detects environment
console.log("Running in browser:", environment.isBrowser);
console.log("Running in Node:", environment.isNode);

const report = await validateManifest(manifest);
// Note: Returns Promise in browser, direct value in Node.js
```

## API Reference

### Functions

#### `init(): Promise<void>`
Initialize the WASM module. Required in browser before validation; automatic in Node.js.

#### `validateManifest(manifest, options?): ValidationReport | Promise<ValidationReport>`
Validate a KYA manifest with optional configuration.

```typescript
const report = validateManifest(manifest, {
  config: {
    mode: "ClientAudit",
    allowed_kya_versions: ["1.0"],
    required_fields: ["/agentId", "/proof"],
    enforce_controller_match: true,
    // ... other config options
  },
  throwOnFailure: true  // Throws ValidationError on failure
});
```

#### `validateManifestDefault(manifest): ValidationReport | Promise<ValidationReport>`
Validate with default configuration.

#### `getDefaultConfig(): ValidationConfig | Promise<ValidationConfig>`
Get the default validation configuration object.

#### `isValidJson(input): boolean | Promise<boolean>`
Check if a string is valid JSON.

#### `formatJson(input): string | Promise<string>`
Pretty-print JSON string.

#### `getVersion(): string | Promise<string>`
Get the validator version.

#### `getName(): string | Promise<string>`
Get the package name.

### Types

```typescript
interface ValidationReport {
  schema_valid: boolean;
  schema_errors: string[]; 
  ttl_valid: boolean;
  ttl_errors: string[];
  inspector_valid: boolean;
  inspector_errors: string[];
  crypto_valid: boolean;
  crypto_errors: string[];
  policy_valid: boolean;
  policy_errors: string[];
}

interface ValidationConfig {
  mode: "SelfAudit" | "ClientAudit";
  allowed_kya_versions: string[];
  required_fields: string[];
  enforce_controller_match: boolean;
  check_external_links: boolean;
  link_checks: LinkCheckConfig[];
  require_all_proofs: boolean;
  required_field_pairs: [string, string][];
  allowed_controllers: string[];
  required_vc_types: string[];
  attestation_checks: AttestationCheckConfig[];
}

class ValidationError extends Error {
  report: ValidationReport;
}
```

## Building from Source

```bash
# Install dependencies
npm install

# Build WASM for both targets + TypeScript wrappers
npm run build:all

# Build individual components
npm run build:wasm-web   # Browser target only
npm run build:wasm-node  # Node.js target only
npm run build:ts         # TypeScript wrappers only

# Type checking
npm run typecheck

# Package dry-run (verify packaging without publishing)
npm run pack:dry-run

# Create tarball artifact
npm run pack:artifact
```

## Output Structure

```
bindings/wasm/
├── dist/                    # Compiled TypeScript wrappers
│   ├── index.js
│   ├── browser.js
│   ├── node.js
│   ├── types.js
│   └── *.d.ts
├── pkg-web/                 # Browser WASM output
│   ├── kya_validator.js
│   ├── kya_validator_bg.wasm
│   ├── kya_validator_bg.js
│   └── kya_validator.d.ts
├── pkg-node/                # Node.js WASM output
│   ├── kya_validator.js
│   ├── kya_validator_bg.wasm
│   └── kya_validator.d.ts
├── src/                     # TypeScript source
│   ├── index.ts
│   ├── browser.ts
│   ├── node.ts
│   └── types.ts
└── scripts/
    └── build.js             # Build orchestration
```

## Examples

See the `bindings/wasm/` directory for additional example files:
- `wasm-usage.ts` - Basic usage patterns
- `wasm-async-usage.ts` - Async validation examples
- `streaming-validation.ts` - Streaming large manifest validation
- `custom-plugin-example.ts` - Plugin integration examples

## CI/CD

This package includes a dry-run CI workflow that:
1. Builds the WASM package
2. Runs `npm pack --dry-run` to verify packaging
3. Uploads build artifacts
4. **Does not** publish to npm

See `.github/workflows/wasm-package.yml`.

## License

MPL-2.0 - See [LICENSE](../../LICENSE)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)
