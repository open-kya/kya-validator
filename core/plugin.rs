// Plugin system for KYA Validator
// Enables custom validation rules and extensibility

use chrono::Timelike;
use serde::{Deserialize, Serialize};
use crate::types::{Manifest, ValidationReport, PolicyContext};

/// Plugin trait for custom validation rules
pub trait ValidationPlugin: Send + Sync {
    /// Get plugin name
    fn name(&self) -> &str;
    
    /// Get plugin version
    fn version(&self) -> &str;
    
    /// Get plugin description
    fn description(&self) -> &str;
    
    /// Hook: Called before validation starts
    fn before_validation(&self, _manifest: &Manifest) -> Result<(), String> {
        Ok(())
    }
    
    /// Hook: Called after validation completes
    fn after_validation(&self, _report: &mut ValidationReport) {
        // Default: no-op
    }
    
    /// Get custom validation rules
    fn custom_rules(&self) -> Vec<Box<dyn ValidationRule>> {
        Vec::new()
    }
}

/// Validation rule trait
pub trait ValidationRule: Send + Sync {
    /// Get rule name
    fn name(&self) -> &str;
    
    /// Get rule description
    fn description(&self) -> &str;
    
    /// Execute validation rule
    fn validate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<RuleResult, String>;
}

/// Result of rule execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleResult {
    pub rule_name: String,
    pub passed: bool,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

/// Example: Permitted Regions Rule
#[derive(Debug)]
pub struct PermittedRegionsRule;

impl ValidationRule for PermittedRegionsRule {
    fn name(&self) -> &str {
        "permitted_regions"
    }
    
    fn description(&self) -> &str {
        "Validates permitted regions against policy context"
    }
    
    fn validate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<RuleResult, String> {
        // If no permitted regions specified, rule passes
        let permitted_regions = match &manifest.permitted_regions {
            Some(regions) => regions,
            None => {
                return Ok(RuleResult {
                    rule_name: self.name().to_string(),
                    passed: true,
                    message: "No permitted regions specified".to_string(),
                    details: None,
                })
            }
        };
        
        // If no requested region in context, rule passes
        let requested_region = match &context.requested_region {
            Some(region) => region,
            None => {
                return Ok(RuleResult {
                    rule_name: self.name().to_string(),
                    passed: true,
                    message: "No requested region in context".to_string(),
                    details: Some(serde_json::json!({
                        "permitted_regions": permitted_regions
                    })),
                })
            }
        };
        
        // Check if requested region is permitted
        let passed = permitted_regions.contains(requested_region);
        
        Ok(RuleResult {
            rule_name: self.name().to_string(),
            passed,
            message: format!(
                "Region '{}' {} permitted regions",
                requested_region,
                if passed { "is in" } else { "is not in" }
            ),
            details: Some(serde_json::json!({
                "requested_region": requested_region,
                "permitted_regions": permitted_regions,
                "is_permitted": passed
            })),
        })
    }
}

/// Example: Forbidden Regions Rule
#[derive(Debug)]
pub struct ForbiddenRegionsRule;

impl ValidationRule for ForbiddenRegionsRule {
    fn name(&self) -> &str {
        "forbidden_regions"
    }
    
    fn description(&self) -> &str {
        "Validates that requested region is not forbidden"
    }
    
    fn validate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<RuleResult, String> {
        // If no forbidden regions specified, rule passes
        let forbidden_regions = match &manifest.forbidden_regions {
            Some(regions) => regions,
            None => {
                return Ok(RuleResult {
                    rule_name: self.name().to_string(),
                    passed: true,
                    message: "No forbidden regions specified".to_string(),
                    details: None,
                })
            }
        };
        
        // If no requested region in context, rule passes
        let requested_region = match &context.requested_region {
            Some(region) => region,
            None => {
                return Ok(RuleResult {
                    rule_name: self.name().to_string(),
                    passed: true,
                    message: "No requested region in context".to_string(),
                    details: Some(serde_json::json!({
                        "forbidden_regions": forbidden_regions
                    })),
                })
            }
        };
        
        // Check if requested region is forbidden
        let is_forbidden = forbidden_regions.contains(requested_region);
        
        Ok(RuleResult {
            rule_name: self.name().to_string(),
            passed: !is_forbidden,
            message: format!(
                "Region '{}' {} forbidden regions",
                requested_region,
                if is_forbidden { "is in" } else { "is not in" }
            ),
            details: Some(serde_json::json!({
                "requested_region": requested_region,
                "forbidden_regions": forbidden_regions,
                "is_forbidden": is_forbidden
            })),
        })
    }
}

/// Example: Transaction Value Rule
#[derive(Debug)]
pub struct TransactionValueRule {
    pub max_value: i64,
}

impl ValidationRule for TransactionValueRule {
    fn name(&self) -> &str {
        "transaction_value"
    }
    
    fn description(&self) -> &str {
        "Validates transaction value against maximum limit"
    }
    
    fn validate(&self, manifest: &Manifest, context: &PolicyContext) -> Result<RuleResult, String> {
        // Get max from manifest if not specified in rule
        let max_from_manifest = manifest.max_transaction_value.unwrap_or(i64::MAX);
        let max_allowed = self.max_value.min(max_from_manifest);
        
        // Get transaction value from context
        let transaction_value = match context.transaction_value {
            Some(value) => value,
            None => {
                return Ok(RuleResult {
                    rule_name: self.name().to_string(),
                    passed: true,
                    message: "No transaction value in context".to_string(),
                    details: Some(serde_json::json!({
                        "max_allowed": max_allowed
                    })),
                })
            }
        };
        
        let passed = transaction_value <= max_allowed;
        
        Ok(RuleResult {
            rule_name: self.name().to_string(),
            passed,
            message: format!(
                "Transaction value {} {} maximum allowed {}",
                transaction_value,
                if passed { "within" } else { "exceeds" },
                max_allowed
            ),
            details: Some(serde_json::json!({
                "transaction_value": transaction_value,
                "max_allowed": max_allowed,
                "within_limit": passed
            })),
        })
    }
}

/// Example: Time Window Rule
#[derive(Debug)]
pub struct TimeWindowRule {
    pub start_hour: u8,
    pub end_hour: u8,
}

impl ValidationRule for TimeWindowRule {
    fn name(&self) -> &str {
        "time_window"
    }
    
    fn description(&self) -> &str {
        "Validates current time against allowed window"
    }
    
    fn validate(&self, _manifest: &Manifest, _context: &PolicyContext) -> Result<RuleResult, String> {
        let current_hour = chrono::Utc::now().hour() as u8;
        
        let passed = if self.start_hour <= self.end_hour {
            current_hour >= self.start_hour && current_hour <= self.end_hour
        } else {
            // Overnight window (e.g., 22:00 - 06:00)
            current_hour >= self.start_hour || current_hour <= self.end_hour
        };
        
        Ok(RuleResult {
            rule_name: self.name().to_string(),
            passed,
            message: format!(
                "Current hour {} {} time window {}-{}",
                current_hour,
                if passed { "is within" } else { "is outside" },
                self.start_hour,
                self.end_hour
            ),
            details: Some(serde_json::json!({
                "current_hour": current_hour,
                "start_hour": self.start_hour,
                "end_hour": self.end_hour
            })),
        })
    }
}

/// Helper: Create rule result
pub fn create_rule_result(
    rule_name: &str,
    passed: bool,
    message: String,
    details: Option<serde_json::Value>,
) -> RuleResult {
    RuleResult {
        rule_name: rule_name.to_string(),
        passed,
        message,
        details,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    fn create_test_manifest(json_str: &str) -> Manifest {
        let value: serde_json::Value = serde_json::from_str(json_str).unwrap();
        Manifest::from_value(&value).unwrap()
    }
    
    #[test]
    fn test_permitted_regions_rule() {
        let rule = PermittedRegionsRule;
        
        assert_eq!(rule.name(), "permitted_regions");
        
        let manifest_json = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "permittedRegions": ["US", "EU"],
            "proof": []
        }"#;
        
        let manifest = create_test_manifest(manifest_json);
        
        // Test with permitted region
        let context = PolicyContext {
            requested_region: Some("US".to_string()),
            transaction_value: None,
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(result.passed);
        
        // Test with non-permitted region
        let context = PolicyContext {
            requested_region: Some("CN".to_string()),
            transaction_value: None,
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(!result.passed);
    }
    
    #[test]
    fn test_forbidden_regions_rule() {
        let rule = ForbiddenRegionsRule;
        
        let manifest_json = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "forbiddenRegions": ["CN", "RU"],
            "proof": []
        }"#;
        
        let manifest = create_test_manifest(manifest_json);
        
        // Test with forbidden region
        let context = PolicyContext {
            requested_region: Some("CN".to_string()),
            transaction_value: None,
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(!result.passed);
        
        // Test with non-forbidden region
        let context = PolicyContext {
            requested_region: Some("US".to_string()),
            transaction_value: None,
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(result.passed);
    }
    
    #[test]
    fn test_transaction_value_rule() {
        let rule = TransactionValueRule { max_value: 1000 };
        
        let manifest_json = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "proof": []
        }"#;
        
        let manifest = create_test_manifest(manifest_json);
        
        // Test within limit
        let context = PolicyContext {
            requested_region: None,
            transaction_value: Some(500),
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(result.passed);
        
        // Test exceeding limit
        let context = PolicyContext {
            requested_region: None,
            transaction_value: Some(1500),
        };
        let result = rule.validate(&manifest, &context).unwrap();
        assert!(!result.passed);
    }
    
    #[test]
    fn test_time_window_rule() {
        let rule = TimeWindowRule {
            start_hour: 9,
            end_hour: 17,
        };
        
        let manifest_json = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "proof": []
        }"#;
        
        let manifest = create_test_manifest(manifest_json);
        let context = PolicyContext::default();
        
        let result = rule.validate(&manifest, &context).unwrap();
        // Should pass if current hour is between 9-17
        assert_eq!(result.rule_name, "time_window");
    }
    
    #[test]
    fn test_create_rule_result() {
        let result = create_rule_result(
            "test_rule",
            true,
            "Test passed".to_string(),
            Some(json!({"key": "value"}))
        );
        
        assert_eq!(result.rule_name, "test_rule");
        assert_eq!(result.passed, true);
        assert_eq!(result.message, "Test passed");
        assert!(result.details.is_some());
    }
}
