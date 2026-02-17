use crate::types::{Manifest, PolicyContext};

pub trait PolicyRule {
    fn evaluate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<(), String>;
}

pub struct AllowedRegionRule;

impl PolicyRule for AllowedRegionRule {
    fn evaluate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<(), String> {
        let region = match context.requested_region.as_ref() {
            Some(region) => region,
            None => return Ok(()),
        };

        if let Some(permitted) = manifest.permitted_regions.as_ref() {
            if !permitted
                .iter()
                .any(|item| item.eq_ignore_ascii_case(region))
            {
                return Err(format!("Region {} is not permitted", region));
            }
        }

        if let Some(forbidden) = manifest.forbidden_regions.as_ref() {
            if forbidden
                .iter()
                .any(|item| item.eq_ignore_ascii_case(region))
            {
                return Err(format!("Region {} is explicitly forbidden", region));
            }
        }

        Ok(())
    }
}

pub struct MaxTransactionValueRule;

impl PolicyRule for MaxTransactionValueRule {
    fn evaluate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<(), String> {
        let value = match context.transaction_value {
            Some(value) => value,
            None => return Ok(()),
        };

        if let Some(max) = manifest.max_transaction_value {
            if value > max {
                return Err(format!("Transaction value {} exceeds max {}", value, max));
            }
        }

        Ok(())
    }
}

pub fn apply_policy(
    manifest: &Manifest,
    context: &PolicyContext,
    rules: &[Box<dyn PolicyRule>],
) -> (bool, Vec<String>) {
    let mut errors = Vec::new();
    for rule in rules {
        if let Err(err) = rule.evaluate(manifest, context) {
            errors.push(err);
        }
    }

    (errors.is_empty(), errors)
}
