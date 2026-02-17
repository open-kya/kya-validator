// Plugin Manager for KYA Validator
// Manages plugin registration, execution, and lifecycle

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use crate::plugin::{ValidationPlugin, ValidationRule, RuleResult};
use crate::types::{Manifest, ValidationReport, PolicyContext};

/// Plugin Manager
pub struct PluginManager {
    plugins: Arc<RwLock<HashMap<String, Arc<dyn ValidationPlugin>>>>,
    enabled_plugins: Arc<RwLock<Vec<String>>>,
}

impl PluginManager {
    /// Create a new plugin manager
    pub fn new() -> Self {
        Self {
            plugins: Arc::new(RwLock::new(HashMap::new())),
            enabled_plugins: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Register a plugin
    pub fn register_plugin(&self, plugin: Arc<dyn ValidationPlugin>) -> Result<(), String> {
        let name = plugin.name().to_string();
        let mut plugins = self.plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        
        if plugins.contains_key(&name) {
            return Err(format!("Plugin '{}' already registered", name));
        }
        
        plugins.insert(name.clone(), plugin);
        
        // Enable by default
        let mut enabled = self.enabled_plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        enabled.push(name);
        
        Ok(())
    }

    /// Unregister a plugin
    pub fn unregister_plugin(&self, name: &str) -> Result<(), String> {
        let mut plugins = self.plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        
        plugins.remove(name)
            .ok_or_else(|| format!("Plugin '{}' not found", name))?;
        
        // Disable if enabled
        let mut enabled = self.enabled_plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        enabled.retain(|n| n != name);
        
        Ok(())
    }

    /// Enable a plugin
    pub fn enable_plugin(&self, name: &str) -> Result<(), String> {
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        if !plugins.contains_key(name) {
            return Err(format!("Plugin '{}' not found", name));
        }
        
        let mut enabled = self.enabled_plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        
        if !enabled.contains(&name.to_string()) {
            enabled.push(name.to_string());
        }
        
        Ok(())
    }

    /// Disable a plugin
    pub fn disable_plugin(&self, name: &str) -> Result<(), String> {
        let mut enabled = self.enabled_plugins.write()
            .map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        
        if !enabled.contains(&name.to_string()) {
            return Err(format!("Plugin '{}' not enabled", name));
        }
        
        enabled.retain(|n| n != name);
        Ok(())
    }

    /// Check if plugin is enabled
    pub fn is_plugin_enabled(&self, name: &str) -> Result<bool, String> {
        let enabled = self.enabled_plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        Ok(enabled.contains(&name.to_string()))
    }

    /// Get all registered plugins
    pub fn get_registered_plugins(&self) -> Result<Vec<String>, String> {
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        Ok(plugins.keys().cloned().collect())
    }

    /// Get all enabled plugins
    pub fn get_enabled_plugins(&self) -> Result<Vec<String>, String> {
        let enabled = self.enabled_plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        Ok(enabled.clone())
    }

    /// Execute before validation hooks
    pub fn execute_before_validation(
        &self,
        manifest: &Manifest,
    ) -> Result<(), String> {
        let enabled = self.enabled_plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        for plugin_name in enabled.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                plugin.before_validation(manifest)
                    .map_err(|e| format!("Plugin '{}' before_validation failed: {}", plugin_name, e))?;
            }
        }
        
        Ok(())
    }

    /// Execute after validation hooks
    pub fn execute_after_validation(
        &self,
        report: &mut ValidationReport,
    ) -> Result<(), String> {
        let enabled = self.enabled_plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        for plugin_name in enabled.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                plugin.after_validation(report);
            }
        }
        
        Ok(())
    }

    /// Execute custom rules from all enabled plugins
    pub fn execute_custom_rules(
        &self,
        manifest: &Manifest,
        context: &PolicyContext,
    ) -> Result<Vec<RuleResult>, String> {
        let enabled = self.enabled_plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let mut results = Vec::new();
        
        for plugin_name in enabled.iter() {
            if let Some(plugin) = plugins.get(plugin_name) {
                let rules = plugin.custom_rules();
                
                for rule in rules {
                    let result = rule.validate(manifest, context)
                        .map_err(|e| format!("Rule '{}' failed: {}", rule.name(), e))?;
                    results.push(result);
                }
            }
        }
        
        Ok(results)
    }

    /// Get plugin info
    pub fn get_plugin_info(&self, name: &str) -> Result<PluginInfo, String> {
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let plugin = plugins.get(name)
            .ok_or_else(|| format!("Plugin '{}' not found", name))?;
        
        let enabled = self.is_plugin_enabled(name)?;
        
        Ok(PluginInfo {
            name: plugin.name().to_string(),
            version: plugin.version().to_string(),
            description: plugin.description().to_string(),
            enabled,
            rule_count: plugin.custom_rules().len(),
        })
    }

    /// Get all plugin info
    pub fn get_all_plugin_info(&self) -> Result<Vec<PluginInfo>, String> {
        let plugins = self.plugins.read()
            .map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        
        let mut infos = Vec::new();
        
        for name in plugins.keys() {
            if let Ok(info) = self.get_plugin_info(name) {
                infos.push(info);
            }
        }
        
        Ok(infos)
    }
}

impl Default for PluginManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Plugin information
#[derive(Debug, Clone)]
pub struct PluginInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
    pub rule_count: usize,
}

/// Plugin execution result
#[derive(Debug, Clone)]
pub struct PluginExecutionResult {
    pub plugin_name: String,
    pub success: bool,
    pub error: Option<String>,
    pub rule_results: Vec<RuleResult>,
}

/// Plugin execution summary
#[derive(Debug, Clone)]
pub struct PluginExecutionSummary {
    pub total_plugins: usize,
    pub successful_plugins: usize,
    pub failed_plugins: usize,
    pub total_rules: usize,
    pub passed_rules: usize,
    pub failed_rules: usize,
}

/// Builder for PluginManager
pub struct PluginManagerBuilder {
    manager: PluginManager,
}

impl PluginManagerBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self {
            manager: PluginManager::new(),
        }
    }

    /// Register a plugin
    pub fn register_plugin(self, plugin: Arc<dyn ValidationPlugin>) -> Result<Self, String> {
        self.manager.register_plugin(plugin)?;
        Ok(self)
    }

    /// Register multiple plugins
    pub fn register_plugins(self, plugins: Vec<Arc<dyn ValidationPlugin>>) -> Result<Self, String> {
        for plugin in plugins {
            self.manager.register_plugin(plugin)?;
        }
        Ok(self)
    }

    /// Build the manager
    pub fn build(self) -> PluginManager {
        self.manager
    }
}

impl Default for PluginManagerBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin::{PermittedRegionsRule, ValidationPlugin};
    use std::sync::Arc;

    // Test plugin implementation
    struct TestPlugin;
    
    impl ValidationPlugin for TestPlugin {
        fn name(&self) -> &str {
            "test_plugin"
        }
        
        fn version(&self) -> &str {
            "1.0.0"
        }
        
        fn description(&self) -> &str {
            "Test plugin for unit tests"
        }
        
        fn custom_rules(&self) -> Vec<Box<dyn ValidationRule>> {
            vec![
                Box::new(PermittedRegionsRule)
            ]
        }
    }

    #[test]
    fn test_plugin_manager_creation() {
        let manager = PluginManager::new();
        let registered = manager.get_registered_plugins().unwrap();
        assert_eq!(registered.len(), 0);
    }

    #[test]
    fn test_register_plugin() {
        let manager = PluginManager::new();
        let plugin = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin).unwrap();
        
        let registered = manager.get_registered_plugins().unwrap();
        assert_eq!(registered.len(), 1);
        assert_eq!(registered[0], "test_plugin");
    }

    #[test]
    fn test_duplicate_plugin() {
        let manager = PluginManager::new();
        let plugin1 = Arc::new(TestPlugin);
        let plugin2 = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin1).unwrap();
        let result = manager.register_plugin(plugin2);
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already registered"));
    }

    #[test]
    fn test_enable_disable_plugin() {
        let manager = PluginManager::new();
        let plugin = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin).unwrap();
        
        // Disable
        manager.disable_plugin("test_plugin").unwrap();
        let enabled = manager.is_plugin_enabled("test_plugin").unwrap();
        assert!(!enabled);
        
        // Enable
        manager.enable_plugin("test_plugin").unwrap();
        let enabled = manager.is_plugin_enabled("test_plugin").unwrap();
        assert!(enabled);
    }

    #[test]
    fn test_plugin_info() {
        let manager = PluginManager::new();
        let plugin = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin).unwrap();
        
        let info = manager.get_plugin_info("test_plugin").unwrap();
        assert_eq!(info.name, "test_plugin");
        assert_eq!(info.version, "1.0.0");
        assert!(info.enabled);
        assert_eq!(info.rule_count, 1);
    }

    #[test]
    fn test_unregister_plugin() {
        let manager = PluginManager::new();
        let plugin = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin).unwrap();
        manager.unregister_plugin("test_plugin").unwrap();
        
        let registered = manager.get_registered_plugins().unwrap();
        assert_eq!(registered.len(), 0);
    }

    #[test]
    fn test_execute_custom_rules() {
        let manager = PluginManager::new();
        let plugin = Arc::new(TestPlugin);
        
        manager.register_plugin(plugin).unwrap();
        
        let manifest_json = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "proof": []
        }"#;
        
        let manifest = {
            let value: serde_json::Value = serde_json::from_str(manifest_json).unwrap();
            Manifest::from_value(&value).unwrap()
        };
        
        let context = PolicyContext {
            requested_region: Some("US".to_string()),
            transaction_value: None,
        };
        
        let results = manager.execute_custom_rules(&manifest, &context).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].rule_name, "permitted_regions");
    }

    #[test]
    fn test_plugin_manager_builder() {
        let plugin = Arc::new(TestPlugin);
        
        let manager = PluginManagerBuilder::new()
            .register_plugin(plugin)
            .unwrap()
            .build();
        
        let registered = manager.get_registered_plugins().unwrap();
        assert_eq!(registered.len(), 1);
    }
}
