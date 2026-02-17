# KYA Policy Editor UI

A web-based visual editor for creating, testing, and managing KYA (Know Your AI) validation policies.

## Overview

The KYA Policy Editor provides an intuitive interface for:
- Creating custom validation policies
- Testing policies against manifests
- Using pre-built policy templates
- Importing and exporting policies
- Visualizing validation results

## Features

### Policy Builder
- **Drag-and-drop rule composition** - Easily organize validation rules
- **Visual rule editor** - Intuitive interface for configuring each rule
- **Real-time validation** - See policy changes instantly
- **Import/Export** - Share policies as JSON files

### Test Panel
- **Live validation** - Test policies against manifests in real-time
- **Detailed reports** - View comprehensive validation results
- **Performance metrics** - Track validation timing
- **Result history** - Compare multiple test runs

### Preset Templates
- **5 built-in presets** covering common use cases:
  - Basic Validation
  - Strict Security
  - Financial Services
  - Enterprise
  - Development

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd kya-validator/ui
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5174`

### Building for Production

```bash
npm run build
```

Build artifacts will be in the `dist/` directory.

## Architecture

### Components

```
src/
├── components/
│   ├── PolicyEditor.tsx      # Main policy editing interface
│   ├── TestPanel.tsx          # Testing and results panel
│   ├── PresetSelector.tsx      # Preset selection menu
│   └── RuleBuilder.tsx        # Rule configuration dialog
├── presets/
│   └── index.ts              # Built-in policy templates
├── store.ts                  # Zustand state management
├── types.ts                  # TypeScript definitions
├── App.tsx                   # Root application component
└── main.tsx                  # Application entry point
```

### State Management

The application uses Zustand for state management:

```typescript
interface EditorStore {
  policies: Policy[];
  currentPolicy: Policy | null;
  testManifest: Manifest | null;
  testResults: TestResult[];
  // ... actions
}
```

### Policy Structure

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}
```

### Rule Types

- **schema** - Validate against KYA schema
- **ttl** - Time-to-live checks
- **crypto** - Cryptographic verification
- **tee** - TEE evidence validation
- **solvency** - Blockchain solvency checks
- **region** - Geographic restrictions
- **transaction_value** - Transaction limits
- **time_window** - Time-based constraints
- **custom** - Custom validation logic

## Usage

### Creating a Policy

1. **Select a preset** or start fresh
2. **Edit policy metadata** (name, version, description)
3. **Add validation rules** as needed
4. **Configure each rule** with specific parameters
5. **Save or export** the policy

### Testing a Policy

1. **Load a manifest** JSON in the Test Panel
2. **Click "Run Validation Test"**
3. **Review the validation report**
4. **Adjust policy** based on results

### Using Presets

1. **Click "Load Preset"** in the toolbar
2. **Select a preset** from the dropdown
3. **Confirm loading** the preset
4. **Customize** as needed

## Integration with WASM Validator

The Policy Editor is designed to work with the KYA Validator WASM module:

```typescript
// Import the WASM module
import init, { validate_manifest } from 'kya-validator-wasm';

// Initialize WASM
await init();

// Validate manifest
const result = validate_manifest(manifestJson, configJson);
```

### Example Integration

```typescript
const handleRunTest = async () => {
  try {
    // Initialize WASM if not already done
    await initWasm();
    
    // Convert policy to config
    const config = convertPolicyToConfig(currentPolicy);
    
    // Run validation
    const report = await validate_manifest(manifest, config);
    
    // Display results
    addTestResult({
      policyId: currentPolicy.id,
      manifest: testManifest,
      report,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Validation failed:', error);
  }
};
```

## Deployment

### Static Site Deployment

The Policy Editor can be deployed as a static site:

```bash
npm run build
```

Deploy the `dist/` directory to:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables

No environment variables are required for basic operation.

### Customization

Edit `src/App.tsx` to customize:
- Theme colors
- Layout
- Branding

## Development

### Adding a New Rule Type

1. **Add to `types.ts`**:
```typescript
export type RuleType =
  | 'schema'
  | 'ttl'
  | 'your_new_rule';  // Add here
```

2. **Create rule parameters interface**:
```typescript
export interface YourRuleParams {
  param1: string;
  param2: number;
}
```

3. **Update PolicyEditor** to support the new rule type

### Adding a New Preset

Add to `src/presets/index.ts`:

```typescript
{
  id: 'your-preset',
  name: 'Your Preset Name',
  description: 'Description of your preset',
  category: 'basic',  // or 'strict', 'financial', 'enterprise', 'development'
  policy: {
    id: 'your-preset-policy',
    name: 'Your Policy Name',
    version: '1.0.0',
    description: 'Policy description',
    rules: [
      // Add your rules here
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}
```

## Testing

### Component Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Type Checking

```bash
npm run type-check
```

## Performance

- **Initial load:** <2s
- **Policy rendering:** <100ms
- **Test execution:** <500ms (with WASM)
- **Bundle size:** <500KB (gzipped)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - See main KYA Validator repository for details.

## Contributing

Contributions are welcome! Please see the main KYA Validator repository for guidelines.

## Support

For issues and questions:
- GitHub Issues: [repository-url]
- Documentation: [docs-url]
