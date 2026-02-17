// Advanced Policy Engine with Rule Composition and Dynamic Loading

use crate::types::{Manifest, PolicyContext};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// Comparison operators for rule conditions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompareOp {
    #[serde(rename = "eq")]
    Equals,
    #[serde(rename = "ne")]
    NotEquals,
    #[serde(rename = "gt")]
    GreaterThan,
    #[serde(rename = "gte")]
    GreaterThanOrEqual,
    #[serde(rename = "lt")]
    LessThan,
    #[serde(rename = "lte")]
    LessThanOrEqual,
    #[serde(rename = "in")]
    In,
    #[serde(rename = "nin")]
    NotIn,
    #[serde(rename = "contains")]
    Contains,
}

/// Rule condition types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RuleCondition {
    #[serde(rename = "json_pointer")]
    JsonPointer {
        pointer: String,
        operator: CompareOp,
        value: Value,
    },
    #[serde(rename = "crypto")]
    Crypto { key_id: String, algorithm: String },
    #[serde(rename = "resource")]
    Resource { url: String, check: ResourceCheck },
    #[serde(rename = "composite")]
    Composite {
        operator: LogicalOperator,
        rules: Vec<RuleCondition>,
    },
}

/// Logical operators for rule composition
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LogicalOperator {
    #[serde(rename = "and")]
    And,
    #[serde(rename = "or")]
    Or,
    #[serde(rename = "not")]
    Not,
}

/// Resource check types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceCheck {
    #[serde(rename = "reachable")]
    Reachable,
    #[serde(rename = "content_contains")]
    ContentContains { text: String },
}

/// Policy action when rule triggers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PolicyAction {
    #[serde(rename = "allow")]
    Allow,
    #[serde(rename = "deny")]
    Deny { reason: String },
    #[serde(rename = "warn")]
    Warn { message: String },
    #[serde(rename = "log")]
    Log { level: String },
}

/// Advanced policy rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    pub name: String,
    pub description: Option<String>,
    pub condition: RuleCondition,
    pub action: PolicyAction,
    pub enabled: bool,
    pub priority: i32,
}

/// Policy with multiple rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub rules: Vec<PolicyRule>,
    pub metadata: Option<HashMap<String, Value>>,
}

/// Policy engine for evaluating policies
#[derive(Debug, Clone)]
pub struct PolicyEngine {
    policies: Vec<Policy>,
}

impl PolicyEngine {
    /// Create a new policy engine
    pub fn new() -> Self {
        Self {
            policies: Vec::new(),
        }
    }

    /// Add a policy to engine
    pub fn add_policy(&mut self, policy: Policy) {
        self.policies.push(policy);
    }

    /// Evaluate all policies against manifest and context
    pub fn evaluate(
        &self,
        manifest: &Manifest,
        _context: &PolicyContext,
    ) -> PolicyEvaluationResult {
        let mut results = Vec::new();
        let mut denied = false;
        let mut warnings = Vec::new();

        // Sort rules by priority (higher priority first)
        let mut all_rules: Vec<_> = self
            .policies
            .iter()
            .flat_map(|p| p.rules.iter())
            .filter(|r| r.enabled)
            .collect();

        all_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        for rule in all_rules {
            let rule_result = self.evaluate_rule(rule, manifest);

            let result = PolicyRuleResult {
                rule_name: rule.name.clone(),
                matched: rule_result.matched,
                action: rule.action.clone(),
                errors: rule_result.errors,
            };

            // Process action
            match &rule.action {
                PolicyAction::Deny { reason: _ } if rule_result.matched => {
                    denied = true;
                    results.push(result);
                    break; // Stop on deny
                }
                PolicyAction::Warn { message } if rule_result.matched => {
                    warnings.push(message.clone());
                    results.push(result);
                }
                _ => {
                    if rule_result.matched {
                        results.push(result);
                    }
                }
            }
        }

        PolicyEvaluationResult {
            allowed: !denied,
            warnings,
            rule_results: results,
        }
    }

    /// Evaluate a single rule
    fn evaluate_rule(&self, rule: &PolicyRule, manifest: &Manifest) -> RuleEvaluationResult {
        let mut errors = Vec::new();

        let matched = match self.evaluate_condition(&rule.condition, manifest) {
            Ok(m) => m,
            Err(e) => {
                errors.push(e);
                false
            }
        };

        RuleEvaluationResult { matched, errors }
    }

    /// Evaluate a rule condition
    fn evaluate_condition(
        &self,
        condition: &RuleCondition,
        manifest: &Manifest,
    ) -> Result<bool, String> {
        match condition {
            RuleCondition::JsonPointer {
                pointer,
                operator,
                value,
            } => self.evaluate_json_pointer(manifest, pointer, *operator, value),
            RuleCondition::Crypto { .. } => {
                // Simplified crypto check for now
                Ok(false)
            }
            RuleCondition::Resource { url, check } => self.evaluate_resource(url, check),
            RuleCondition::Composite { operator, rules } => {
                self.evaluate_composite(operator, rules, manifest)
            }
        }
    }

    /// Evaluate JSON pointer condition
    fn evaluate_json_pointer(
        &self,
        manifest: &Manifest,
        pointer: &str,
        operator: CompareOp,
        expected: &Value,
    ) -> Result<bool, String> {
        // Convert manifest to JSON Value
        let manifest_json = serde_json::to_value(manifest)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

        // Try to navigate to the pointer manually for now
        // Note: A proper JSON pointer library would be better
        let actual = match pointer {
            "/kyaVersion" => manifest_json
                .get("kyaVersion")
                .cloned()
                .ok_or_else(|| "kyaVersion not found".to_string())?,
            "/agentId" => manifest_json
                .get("agentId")
                .cloned()
                .ok_or_else(|| "agentId not found".to_string())?,
            _ => {
                return Err(format!("JSON pointer '{}' not yet supported", pointer));
            }
        };

        // Compare based on operator
        match operator {
            CompareOp::Equals => Ok(actual == *expected),
            CompareOp::NotEquals => Ok(actual != *expected),
            CompareOp::GreaterThan => {
                let a = actual.as_f64().ok_or("Value is not a number")?;
                let b = expected.as_f64().ok_or("Expected value is not a number")?;
                Ok(a > b)
            }
            CompareOp::GreaterThanOrEqual => {
                let a = actual.as_f64().ok_or("Value is not a number")?;
                let b = expected.as_f64().ok_or("Expected value is not a number")?;
                Ok(a >= b)
            }
            CompareOp::LessThan => {
                let a = actual.as_f64().ok_or("Value is not a number")?;
                let b = expected.as_f64().ok_or("Expected value is not a number")?;
                Ok(a < b)
            }
            CompareOp::LessThanOrEqual => {
                let a = actual.as_f64().ok_or("Value is not a number")?;
                let b = expected.as_f64().ok_or("Expected value is not a number")?;
                Ok(a <= b)
            }
            CompareOp::In => {
                let arr = expected
                    .as_array()
                    .ok_or("Expected value is not an array")?;
                Ok(arr.contains(&actual))
            }
            CompareOp::NotIn => {
                let arr = expected
                    .as_array()
                    .ok_or("Expected value is not an array")?;
                Ok(!arr.contains(&actual))
            }
            CompareOp::Contains => {
                let str_actual = actual.as_str().ok_or("Value is not a string")?;
                let str_expected = expected.as_str().ok_or("Expected value is not a string")?;
                Ok(str_actual.contains(str_expected))
            }
        }
    }

    /// Evaluate resource condition
    fn evaluate_resource(&self, _url: &str, check: &ResourceCheck) -> Result<bool, String> {
        match check {
            ResourceCheck::Reachable => {
                // Check if URL is reachable (simplified, returns true)
                Ok(true)
            }
            ResourceCheck::ContentContains { text: _ } => {
                // Check content (simplified, returns true)
                Ok(true)
            }
        }
    }

    /// Evaluate composite condition
    fn evaluate_composite(
        &self,
        operator: &LogicalOperator,
        rules: &[RuleCondition],
        manifest: &Manifest,
    ) -> Result<bool, String> {
        match operator {
            LogicalOperator::And => {
                for rule in rules {
                    if !self.evaluate_condition(rule, manifest)? {
                        return Ok(false);
                    }
                }
                Ok(true)
            }
            LogicalOperator::Or => {
                for rule in rules {
                    if self.evaluate_condition(rule, manifest)? {
                        return Ok(true);
                    }
                }
                Ok(false)
            }
            LogicalOperator::Not => {
                if rules.len() != 1 {
                    return Err("NOT operator requires exactly one rule".to_string());
                }
                Ok(!self.evaluate_condition(&rules[0], manifest)?)
            }
        }
    }
}

/// Result of policy evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluationResult {
    pub allowed: bool,
    pub warnings: Vec<String>,
    pub rule_results: Vec<PolicyRuleResult>,
}

/// Result of individual rule evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRuleResult {
    pub rule_name: String,
    pub matched: bool,
    pub action: PolicyAction,
    pub errors: Vec<String>,
}

/// Internal rule evaluation result
struct RuleEvaluationResult {
    matched: bool,
    errors: Vec<String>,
}

impl Default for PolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Manifest;

    #[test]
    fn test_json_pointer_equals() {
        let engine = PolicyEngine::new();
        let manifest = Manifest {
            kya_version: "1.0".to_string(),
            agent_id: "did:key:z6Mk...".to_string(),
            verification_method: None,
            proof: vec![],
            max_transaction_value: None,
            permitted_regions: None,
            forbidden_regions: None,
        };

        let result = engine.evaluate_json_pointer(
            &manifest,
            "/kyaVersion",
            CompareOp::Equals,
            &serde_json::json!("1.0"),
        );
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_policy_serialization() {
        let policy = Policy {
            id: "test-policy".to_string(),
            name: "Test Policy".to_string(),
            version: "1.0.0".to_string(),
            description: Some("A test policy".to_string()),
            rules: vec![],
            metadata: None,
        };

        let json = serde_json::to_string(&policy);
        assert!(json.is_ok());
    }
}
