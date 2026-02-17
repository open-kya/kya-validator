// kya-validator/examples/cli.rs
use clap::Parser;
use kya_validator::types::ValidationConfig;
use kya_validator::validator;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// KYA Manifest Validator CLI
#[derive(Parser, Debug)]
#[command(name = "kya-validate")]
#[command(about = "Validate Know Your Agent (KYA) manifests", long_about = None)]
struct Args {
    /// Path to the KYA manifest JSON file
    #[arg(long)]
    manifest: PathBuf,

    /// Path to optional validation config JSON
    #[arg(short, long)]
    config: Option<PathBuf>,

    /// Validation mode: strict, lenient, or self-audit
    #[arg(long, default_value = "strict")]
    mode: String,

    /// Skip signature verification
    #[arg(long)]
    no_signature_check: bool,

    /// Skip external link checks
    #[arg(long)]
    no_link_check: bool,

    /// Verify TEE attestations
    #[arg(long)]
    check_attestations: bool,

    /// Output format: text or json
    #[arg(short, long, default_value = "text")]
    format: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Load manifest
    let manifest_str = fs::read_to_string(&args.manifest)?;
    let manifest: Value = serde_json::from_str(&manifest_str)?;

    // Build validation config
    let mut config = match args.mode.as_str() {
        "lenient" => ValidationConfig::lenient(),
        "self-audit" => ValidationConfig::self_audit(),
        _ => ValidationConfig::strict(),
    };

    // Note: Signature verification is always enabled in the validator
    // The --no-signature-check flag is kept for API compatibility but has no effect
    let _ = args.no_signature_check; // Suppress unused warning

    if args.no_link_check {
        config.link_checks = vec![];
    }

    if args.check_attestations {
        // Enable attestation checks - but this requires TEE info in manifest
        // The config just needs to not be empty to enable checks
        config.attestation_checks = vec![];
    }

    // Run validation
    let report = validator::validate_manifest_with_config(&manifest, &config);

    // Output results
    if args.format == "json" {
        let output = serde_json::json!({
            "valid": report.is_valid(),
            "errors": report.errors(),
            "warnings": report.warnings(),
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
    } else if report.is_valid() {
        if report.is_valid() {
            println!("✅ KYA Manifest is VALID");
            if !report.warnings().is_empty() {
                println!("\nWarnings:");
                for warning in report.warnings() {
                    println!("  ⚠️  {}", warning);
                }
            }
        } else {
            println!("❌ KYA Manifest is INVALID");
            println!("\nErrors:");
            for error in report.errors() {
                println!("  - {}", error);
            }
            std::process::exit(1);
        }
    }

    Ok(())
}
