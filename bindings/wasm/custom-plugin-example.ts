/**
 * KYA Validator - Custom Plugin Examples
 * Shows how to create and register custom validation plugins
 */

import { 
    ValidationPlugin, 
    ValidationRule, 
    PluginManager,
    RuleResult,
    ValidationConfig,
    Manifest 
} from './kya_validator';

// ============================================
// Example 1: Compliance Plugin
// ============================================

class CompliancePlugin implements ValidationPlugin {
    name(): string {
        return "compliance_plugin";
    }
    
    version(): string {
        return "1.0.0";
    }
    
    description(): string {
        return "Validates compliance with industry regulations (GDPR, HIPAA, SOC2)";
    }
    
    beforeValidation(manifest: Manifest): void {
        console.log(`[CompliancePlugin] Validating manifest for agent: ${manifest.agentId}`);
        
        // Log validation mode
        console.log(`[CompliancePlugin] Validation mode: ${manifest.validationMode || 'default'}`);
    }
    
    afterValidation(report: any): void {
        console.log(`[CompliancePlugin] Validation complete. Schema valid: ${report.schemaValid}`);
        
        // Add compliance timestamp
        if (!report.metadata) {
            report.metadata = {};
        }
        report.metadata.complianceCheckedAt = new Date().toISOString();
    }
    
    customRules(): ValidationRule[] {
        return [
            new GdprComplianceRule(),
            new DataRetentionRule(),
            new ConsentTrackingRule()
        ];
    }
}

class GdprComplianceRule implements ValidationRule {
    name(): string {
        return "gdpr_compliance";
    }
    
    description(): string {
        return "Validates GDPR compliance (data residency, consent, right to delete)";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const region = manifest.geographicRegion || "unknown";
        const gdprRegions = ["EU", "UK", "DE", "FR", "IT"];
        
        // Check if agent is in GDPR region
        const isGdprRegion = gdprRegions.includes(region);
        
        // Check for consent mechanisms
        const hasConsent = manifest.consentMechanism === true;
        
        // Check data residency compliance
        const dataResidentInRegion = manifest.dataResidency === region || !manifest.dataResidency;
        
        const passed = isGdprRegion 
            ? hasConsent && dataResidentInRegion 
            : true; // No GDPR requirements outside EU
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "GDPR compliance check passed"
                : `GDPR violations: ${!hasConsent ? 'missing consent' : ''} ${!dataResidentInRegion ? 'data not resident' : ''}`,
            details: {
                region,
                isGdprRegion,
                hasConsent,
                dataResidentInRegion,
                requirements: isGdprRegion ? ["consent_mechanism", "data_residency"] : []
            }
        };
    }
}

class DataRetentionRule implements ValidationRule {
    name(): string {
        return "data_retention";
    }
    
    description(): string {
        return "Validates data retention policies comply with regulations";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const maxRetentionDays = manifest.maxRetentionDays || 365;
        const retentionPolicy = manifest.retentionPolicy || "none";
        
        // GDPR: Maximum 2 years for personal data
        const gdprCompliant = maxRetentionDays <= 730;
        
        // HIPAA: Minimum 6 years for health records
        const hipaaCompliant = retentionPolicy !== "none";
        
        const passed = gdprCompliant && hipaaCompliant;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Data retention policy compliant"
                : `Retention policy violations: ${!gdprCompliant ? 'exceeds GDPR limit (730 days)' : ''} ${!hipaaCompliant ? 'missing retention policy' : ''}`,
            details: {
                maxRetentionDays,
                retentionPolicy,
                gdprCompliant,
                hipaaCompliant
            }
        };
    }
}

class ConsentTrackingRule implements ValidationRule {
    name(): string {
        return "consent_tracking";
    }
    
    description(): string {
        return "Validates consent tracking mechanisms are in place";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const hasConsentTimestamps = manifest.consentTimestamps?.length > 0;
        const hasWithdrawalMechanism = manifest.consentWithdrawal === true;
        
        const passed = hasConsentTimestamps && hasWithdrawalMechanism;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Consent tracking properly configured"
                : `Consent tracking issues: ${!hasConsentTimestamps ? 'missing timestamps' : ''} ${!hasWithdrawalMechanism ? 'no withdrawal mechanism' : ''}`,
            details: {
                hasConsentTimestamps,
                hasWithdrawalMechanism,
                consentCount: manifest.consentTimestamps?.length || 0
            }
        };
    }
}

// ============================================
// Example 2: Security Plugin
// ============================================

class SecurityPlugin implements ValidationPlugin {
    name(): string {
        return "security_plugin";
    }
    
    version(): string {
        return "1.0.0";
    }
    
    description(): string {
        return "Validates security posture (encryption, access controls, audit logging)";
    }
    
    customRules(): ValidationRule[] {
        return [
            new EncryptionRule(),
            new AccessControlRule(),
            new AuditLogRule()
        ];
    }
}

class EncryptionRule implements ValidationRule {
    name(): string {
        return "encryption";
    }
    
    description(): string {
        return "Validates encryption strength and key management";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const encryptionLevel = manifest.encryptionLevel || "none";
        const keyRotation = manifest.keyRotationDays || 0;
        
        // Minimum encryption requirements
        const allowedEncryption = ["AES-256", "RSA-4096", "ChaCha20-Poly1305"];
        const validEncryption = allowedEncryption.includes(encryptionLevel);
        
        // Key rotation requirements
        const validRotation = keyRotation > 0 && keyRotation <= 90;
        
        const passed = validEncryption && validRotation;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Encryption requirements met"
                : `Encryption issues: ${!validEncryption ? 'weak encryption' : ''} ${!validRotation ? 'key rotation too long' : ''}`,
            details: {
                encryptionLevel,
                validEncryption,
                keyRotationDays: keyRotation,
                validRotation
            }
        };
    }
}

class AccessControlRule implements ValidationRule {
    name(): string {
        return "access_control";
    }
    
    description(): string {
        return "Validates access control mechanisms";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const hasMfa = manifest.multiFactorAuth === true;
        const hasRoleBasedAccess = manifest.rbacEnabled === true;
        const hasLeastPrivilege = manifest.principleOfLeastPrivilege === true;
        
        const passed = hasMfa && hasRoleBasedAccess && hasLeastPrivilege;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Access controls properly configured"
                : `Access control issues: ${!hasMfa ? 'missing MFA' : ''} ${!hasRoleBasedAccess ? 'no RBAC' : ''} ${!hasLeastPrivilege ? 'no least privilege' : ''}`,
            details: {
                hasMfa,
                hasRoleBasedAccess,
                hasLeastPrivilege
            }
        };
    }
}

class AuditLogRule implements ValidationRule {
    name(): string {
        return "audit_logging";
    }
    
    description(): string {
        return "Validates audit logging capabilities";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const auditLogRetention = manifest.auditLogRetentionDays || 0;
        const auditLogEnabled = manifest.auditLogging === true;
        const hasImmutableLogs = manifest.immutableAuditLogs === true;
        
        // Minimum retention: 90 days
        const validRetention = auditLogRetention >= 90;
        
        const passed = auditLogEnabled && hasImmutableLogs && validRetention;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Audit logging properly configured"
                : `Audit logging issues: ${!auditLogEnabled ? 'disabled' : ''} ${!hasImmutableLogs ? 'not immutable' : ''} ${!validRetention ? 'insufficient retention' : ''}`,
            details: {
                auditLogEnabled,
                hasImmutableLogs,
                auditLogRetentionDays: auditLogRetention,
                validRetention
            }
        };
    }
}

// ============================================
// Example 3: Business Logic Plugin
// ============================================

class BusinessLogicPlugin implements ValidationPlugin {
    name(): string {
        return "business_logic_plugin";
    }
    
    version(): string {
        return "1.0.0";
    }
    
    description(): string {
        return "Validates business-specific rules (SLAs, rate limits, pricing)";
    }
    
    customRules(): ValidationRule[] {
        return [
            new SlaComplianceRule(),
            new RateLimitRule(),
            new PricingRule()
        ];
    }
}

class SlaComplianceRule implements ValidationRule {
    name(): string {
        return "sla_compliance";
    }
    
    description(): string {
        return "Validates SLA compliance requirements";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const slaUptime = manifest.slaUptime || 99.9;
        const slaResponseTime = manifest.slaResponseTimeMs || 1000;
        
        // Minimum SLA requirements
        const minUptime = 99.5;
        const maxResponseTime = 2000;
        
        const passed = slaUptime >= minUptime && slaResponseTime <= maxResponseTime;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "SLA requirements met"
                : `SLA violations: ${slaUptime < minUptime ? 'uptime below threshold' : ''} ${slaResponseTime > maxResponseTime ? 'response time too slow' : ''}`,
            details: {
                slaUptime,
                minUptime,
                slaResponseTimeMs: slaResponseTime,
                maxResponseTime
            }
        };
    }
}

class RateLimitRule implements ValidationRule {
    name(): string {
        return "rate_limit";
    }
    
    description(): string {
        return "Validates rate limiting configuration";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const rateLimit = manifest.rateLimitPerMinute || 0;
        const burstLimit = manifest.burstLimit || 0;
        
        // Rate limiting must be configured
        const validRate = rateLimit > 0 && rateLimit <= 1000;
        const validBurst = burstLimit > 0 && burstLimit <= rateLimit * 2;
        
        const passed = validRate && validBurst;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Rate limits properly configured"
                : `Rate limit issues: ${!validRate ? 'invalid rate limit' : ''} ${!validBurst ? 'invalid burst limit' : ''}`,
            details: {
                rateLimitPerMinute: rateLimit,
                burstLimit,
                validRate,
                validBurst
            }
        };
    }
}

class PricingRule implements ValidationRule {
    name(): string {
        return "pricing";
    }
    
    description(): string {
        return "Validates pricing and billing rules";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const pricingModel = manifest.pricingModel || "unknown";
        const costPerValidation = manifest.costPerValidation || 0;
        
        // Valid pricing models
        const validModels = ["pay_as_you_go", "tiered", "enterprise", "free"];
        const validPricing = validModels.includes(pricingModel);
        
        // Cost limits
        const reasonableCost = costPerValidation >= 0 && costPerValidation <= 100; // Max $100 per validation
        
        const passed = validPricing && reasonableCost;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Pricing rules valid"
                : `Pricing issues: ${!validPricing ? 'invalid pricing model' : ''} ${!reasonableCost ? 'cost out of range' : ''}`,
            details: {
                pricingModel,
                validPricing,
                costPerValidation,
                reasonableCost
            }
        };
    }
}

// ============================================
// Example 4: Industry-Specific Plugin (Healthcare)
// ============================================

class HealthcarePlugin implements ValidationPlugin {
    name(): string {
        return "healthcare_plugin";
    }
    
    version(): string {
        return "1.0.0";
    }
    
    description(): string {
        return "Validates healthcare-specific requirements (HIPAA, HL7, FHIR)";
    }
    
    customRules(): ValidationRule[] {
        return [
            new HipaaRule(),
            new DeidentificationRule(),
            new AuditTrailRule()
        ];
    }
}

class HipaaRule implements ValidationRule {
    name(): string {
        return "hipaa_compliance";
    }
    
    description(): string {
        return "Validates HIPAA compliance requirements";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const hasPhi = manifest.containsPhi === true;
        const hasBaa = manifest.businessAssociateAgreement === true;
        const hasSecurityRule = manifest.hipaaSecurityRule === true;
        
        // If containing PHI, HIPAA requirements must be met
        const passed = !hasPhi || (hasBaa && hasSecurityRule);
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "HIPAA compliance valid"
                : `HIPAA violations: ${hasPhi && !hasBaa ? 'missing BAA' : ''} ${hasPhi && !hasSecurityRule ? 'missing security rule' : ''}`,
            details: {
                containsPhi: hasPhi,
                hasBaa,
                hasSecurityRule
            }
        };
    }
}

class DeidentificationRule implements ValidationRule {
    name(): string {
        return "deidentification";
    }
    
    description(): string {
        return "Validates data deidentification methods";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const deidMethod = manifest.deidentificationMethod || "none";
        const safeHarborMethod = manifest.safeHarborUsed === true;
        
        // Valid deidentification methods
        const validMethods = ["safe_harbor", "statistical", "expert_determination", "none"];
        const validMethod = validMethods.includes(deidMethod);
        
        // If using data, must have deidentification
        const passed = deidMethod === "none" ? true : (validMethod && safeHarborMethod);
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Deidentification valid"
                : `Deidentification issues: ${!validMethod ? 'invalid method' : ''} ${!safeHarborMethod ? 'missing safe harbor' : ''}`,
            details: {
                deidentificationMethod: deidMethod,
                validMethod,
                safeHarborUsed: safeHarborMethod
            }
        };
    }
}

class AuditTrailRule implements ValidationRule {
    name(): string {
        return "audit_trail";
    }
    
    description(): string {
        return "Validates audit trail requirements for healthcare data";
    }
    
    validate(manifest: Manifest, context: any): RuleResult {
        const auditEnabled = manifest.healthcareAuditEnabled === true;
        const retentionYears = manifest.healthcareAuditRetentionYears || 0;
        
        // HIPAA requires 6 years retention
        const validRetention = retentionYears >= 6;
        
        const passed = auditEnabled && validRetention;
        
        return {
            ruleName: this.name(),
            passed,
            message: passed 
                ? "Healthcare audit trail valid"
                : `Audit trail issues: ${!auditEnabled ? 'not enabled' : ''} ${!validRetention ? 'insufficient retention (6 years required)' : ''}`,
            details: {
                auditEnabled,
                retentionYears,
                validRetention
            }
        };
    }
}

// ============================================
// Plugin Registration and Usage
// ============================================

async function registerAndUsePlugins(manifestJson: string) {
    // Create plugin manager
    const pluginManager = new PluginManager();
    
    // Register plugins
    const compliancePlugin = new CompliancePlugin();
    const securityPlugin = new SecurityPlugin();
    const businessLogicPlugin = new BusinessLogicPlugin();
    const healthcarePlugin = new HealthcarePlugin();
    
    await pluginManager.registerPlugin(compliancePlugin);
    await pluginManager.registerPlugin(securityPlugin);
    await pluginManager.registerPlugin(businessLogicPlugin);
    await pluginManager.registerPlugin(healthcarePlugin);
    
    console.log("Registered plugins:", await pluginManager.getRegisteredPlugins());
    console.log("Enabled plugins:", await pluginManager.getEnabledPlugins());
    
    // Get plugin info
    const complianceInfo = await pluginManager.getPluginInfo("compliance_plugin");
    console.log("Compliance Plugin Info:", complianceInfo);
    
    // Parse manifest
    const manifest = JSON.parse(manifestJson);
    
    // Execute before validation hooks
    await pluginManager.executeBeforeValidation(manifest);
    
    // Execute custom rules
    const context = { validationMode: "SelfAudit" };
    const ruleResults = await pluginManager.executeCustomRules(manifest, context);
    
    console.log("\n=== Custom Rule Results ===");
    for (const result of ruleResults) {
        console.log(`${result.passed ? "✅" : "❌"} ${result.ruleName}: ${result.message}`);
        if (result.details) {
            console.log("   Details:", result.details);
        }
    }
    
    // Get summary
    const passed = ruleResults.filter(r => r.passed).length;
    const failed = ruleResults.filter(r => !r.passed).length;
    
    console.log(`\n=== Summary ===`);
    console.log(`Total Rules: ${ruleResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    return ruleResults;
}

// ============================================
// Plugin Discovery and Marketplace
// ============================================

async function discoverPlugins() {
    // Plugin registry/marketplace
    const marketplace = [
        {
            name: "compliance_plugin",
            version: "1.0.0",
            description: "GDPR, HIPAA, SOC2 compliance",
            author: "KYA Team",
            downloadUrl: "https://kya.dev/plugins/compliance"
        },
        {
            name: "security_plugin",
            version: "1.0.0",
            description: "Encryption, access controls, audit logging",
            author: "KYA Team",
            downloadUrl: "https://kya.dev/plugins/security"
        },
        {
            name: "blockchain_plugin",
            version: "0.5.0",
            description: "Ethereum, Solana, Polygon validation",
            author: "Community",
            downloadUrl: "https://kya.dev/plugins/blockchain"
        }
    ];
    
    console.log("Available Plugins:");
    for (const plugin of marketplace) {
        console.log(`- ${plugin.name} v${plugin.version}: ${plugin.description}`);
    }
    
    return marketplace;
}

// ============================================
// Export Examples
// ============================================

export {
    // Plugins
    CompliancePlugin,
    SecurityPlugin,
    BusinessLogicPlugin,
    HealthcarePlugin,
    
    // Rules
    GdprComplianceRule,
    DataRetentionRule,
    ConsentTrackingRule,
    EncryptionRule,
    AccessControlRule,
    AuditLogRule,
    SlaComplianceRule,
    RateLimitRule,
    PricingRule,
    HipaaRule,
    DeidentificationRule,
    AuditTrailRule,
    
    // Usage
    registerAndUsePlugins,
    discoverPlugins
};
