#!/usr/bin/env node
// bindings/wasm/scripts/build.js
// Build orchestration script for WASM package

import { execSync } from "child_process";
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function run(command, description) {
  console.log(`\n🔧 ${description}...`);
  console.log(`   Running: ${command}`);
  try {
    execSync(command, { stdio: "inherit", cwd: rootDir });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function buildWasmWeb() {
  const pkgWebDir = join(rootDir, "pkg-web");
  
  // Clean previous build
  if (existsSync(pkgWebDir)) {
    rmSync(pkgWebDir, { recursive: true });
  }
  
  run(
    "wasm-pack build --target web --out-dir pkg-web --out-name kya_validator --release",
    "Building WASM for web target"
  );
  
  console.log("✅ Web WASM package built to pkg-web/");
}

function buildWasmNode() {
  const pkgNodeDir = join(rootDir, "pkg-node");
  
  // Clean previous build
  if (existsSync(pkgNodeDir)) {
    rmSync(pkgNodeDir, { recursive: true });
  }
  
  run(
    "wasm-pack build --target nodejs --out-dir pkg-node --out-name kya_validator --release",
    "Building WASM for Node.js target"
  );
  
  console.log("✅ Node.js WASM package built to pkg-node/");
}

function buildTypeScript() {
  run("npx tsc -p tsconfig.json", "Compiling TypeScript wrappers");
  
  // Copy type definitions to dist
  const distDir = join(rootDir, "dist");
  ensureDir(distDir);
  
  console.log("✅ TypeScript compiled to dist/");
}

function createPackageReadme() {
  const distDir = join(rootDir, "dist");
  const readmeContent = `# @open-kya/kya-validator-wasm

This directory contains compiled TypeScript wrappers for KYA Validator WASM bindings.

## Usage

### Browser (ESM)
\`\`\`typescript
import { validateManifest, init } from "@open-kya/kya-validator-wasm/browser";

await init();
const report = await validateManifest(manifest);
\`\`\`

### Node.js (CommonJS/ESM)
\`\`\`typescript
import { validateManifest } from "@open-kya/kya-validator-wasm/node";

const report = validateManifest(manifest);
\`\`\`

### Universal (auto-detect)
\`\`\`typescript
import { validateManifest } from "@open-kya/kya-validator-wasm";

const report = await validateManifest(manifest); // Browser: async, Node: sync
\`\`\`

## Files
- \`browser.js\` - Browser entry point (async)
- \`node.js\` - Node.js entry point (sync)
- \`index.js\` - Universal entry point (auto-detects environment)
- \`types.js\` - TypeScript type definitions

See the main README for full documentation.
`;
  
  writeFileSync(join(distDir, "README.md"), readmeContent);
  console.log("✅ Created dist/README.md");
}

function copyLicense() {
  const rootLicense = join(rootDir, "..", "..", "LICENSE");
  const distDir = join(rootDir, "dist");
  
  if (existsSync(rootLicense)) {
    cpSync(rootLicense, join(distDir, "LICENSE"));
    console.log("✅ Copied LICENSE to dist/");
  }
}

function main() {
  const args = process.argv.slice(2);
  const buildAll = args.length === 0 || args.includes("--all");
  const buildWeb = buildAll || args.includes("--web");
  const buildNode = buildAll || args.includes("--node");
  const buildTs = buildAll || args.includes("--ts");
  
  console.log("🚀 Building KYA Validator WASM package...\n");
  console.log(`   Targets: ${buildWeb ? "web " : ""}${buildNode ? "node " : ""}${buildTs ? "typescript" : ""}`);
  
  if (buildWeb) buildWasmWeb();
  if (buildNode) buildWasmNode();
  if (buildTs) {
    buildTypeScript();
    createPackageReadme();
    copyLicense();
  }
  
  console.log("\n🎉 Build complete!\n");
  console.log("Next steps:");
  console.log("  • Test: node dist/node.js");
  console.log("  • Pack: npm pack --dry-run");
  console.log("  • Note: Publishing is intentionally disabled (private: true)");
}

main();
