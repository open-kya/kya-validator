"""Unit tests for KYA Validator Python API.

This module contains unit tests for the Python package.
"""

import pytest
import json
from kya_validator import (
    Validator,
    ValidationConfig,
    ValidationReport,
    PolicyEngine,
    PolicyContext,
    TeeVerifier,
    TeeEvidence,
    SolvencyChecker,
    SolvencyCheck,
    StreamingValidator,
    ChunkValidationResult,
    StreamingValidationState,
    PluginManager,
    ValidationPlugin,
    Inspector,
    Resolver,
    load_config,
    validate_manifest,
    validate_manifest_with_config,
)


class TestValidationConfig:
    """Tests for ValidationConfig."""

    def test_default_config(self):
        """Test default configuration."""
        config = ValidationConfig.default()
        assert config.mode.value == 'selfAudit'
        assert config.allowed_kya_versions == ['1.0', '1.1']
        assert config.enforce_controller_match is True
        assert config.check_external_links is False

    def test_self_audit_preset(self):
        """Test self-audit preset."""
        config = ValidationConfig.self_audit()
        assert config.mode.value == 'selfAudit'
        assert '/agentId' in config.required_fields
        assert '/proof' in config.required_fields
        assert config.check_external_links is True
        assert config.require_all_proofs is True

    def test_client_audit_preset(self):
        """Test client-audit preset."""
        config = ValidationConfig.client_audit()
        assert config.mode.value == 'clientAudit'
        assert '/agentId' in config.required_fields
        assert '/proof' in config.required_fields
        assert config.check_external_links is False
        assert config.require_all_proofs is True

    def test_to_json(self):
        """Test JSON serialization."""
        config = ValidationConfig.default()
        json_str = config.to_json()
        data = json.loads(json_str)
        assert data['mode'] == 'selfAudit'
        assert data['allowedKyaVersions'] == ['1.0', '1.1']


class TestValidationReport:
    """Tests for ValidationReport."""

    def test_from_json_valid(self):
        """Test parsing valid report."""
        json_str = json.dumps({
            'schemaValid': True,
            'schemaErrors': [],
            'ttlValid': True,
            'ttlErrors': [],
            'inspectorValid': True,
            'inspectorErrors': [],
            'cryptoValid': True,
            'cryptoErrors': [],
            'policyValid': True,
            'policyErrors': [],
        })
        report = ValidationReport.from_json(json_str)
        assert report.is_valid is True
        assert report.total_errors == 0

    def test_from_json_invalid(self):
        """Test parsing invalid report."""
        json_str = json.dumps({
            'schemaValid': False,
            'schemaErrors': ['Invalid version'],
            'ttlValid': False,
            'ttlErrors': ['Expired'],
            'inspectorValid': False,
            'inspectorErrors': ['Missing field'],
            'cryptoValid': False,
            'cryptoErrors': ['Invalid signature'],
            'policyValid': False,
            'policyErrors': ['Region not allowed'],
        })
        report = ValidationReport.from_json(json_str)
        assert report.is_valid is False
        assert report.total_errors == 6
        assert len(report.schema_errors) == 1
        assert len(report.ttl_errors) == 1
        assert len(report.inspector_errors) == 1
        assert len(report.crypto_errors) == 1
        assert len(report.policy_errors) == 1


class TestValidator:
    """Tests for Validator."""

    def test_validate_valid_manifest(self):
        """Test validating a valid manifest."""
        manifest = {
            'kyaVersion': '1.0',
            'agentId': 'did:key:z6MkhaXg3eN5EVXuui3aiWyPRWZQG6VtLTrf',
        'proof': [{
                'type': 'Ed25519Signature2020',
                'verificationMethod': 'did:key:z6MkhaXg3eN5EVXuui3aiWyPRWZQG6VtLTrf#key-1',
                'proofPurpose': 'assertionMethod',
                'proofValue': 'signature',
            }],
        }

        validator = Validator()
        report = validator.validate(json.dumps(manifest))
        assert report.is_valid is True

    def test_validate_invalid_json(self):
        """Test validating invalid JSON."""
        validator = Validator()
        with pytest.raises(Exception):
            validator.validate('not valid json')

    def test_with_config(self):
        """Test validation with custom config."""
        manifest = {
            'kyaVersion': '1.0',
            'agentId': 'did:key:z6MkhaXg3eN5EVXuui3aiWyPRWZQG6VtLTrf',
            'proof': [],
        }

        config = ValidationConfig(
            mode=ValidationMode.SELF_AUDIT,
            required_fields=['/agentId'],
        )

        validator = Validator(config=config)
        report = validator.validate(json.dumps(manifest))
        assert report.is_valid is False
        assert len(report.inspector_errors) > 0


class TestTeeVerifier:
    """Tests for TeeVerifier."""

    def test_verify_evidence(self):
        """Test TEE evidence verification."""
        verifier = TeeVerifier()
        evidence = TeeEvidence(
            attestation_type='intel-sgx',
            quote='base64encodedquote',
            mr_enclave='0' * 64,
            mr_signer='0' * 64,
            product_id=0,
            min_svn=0,
        )

        report = verifier.verify(evidence)
        assert report.valid is False  # Placeholder returns False
        assert report.tee_type == 'intel-sgx'


class TestSolvencyChecker:
    """Tests for SolvencyChecker."""

    def test_verify_solvency(self):
        """Test solvency verification."""
        checker = SolvencyChecker()
        check = SolvencyCheck(
            address='0x742d35Cc6634C0532925a3b844Bc9e7595f0bE',
            network='ethereum',
            min_balance='0x0',
            provider='alchemy',
        )

        report = checker.verify(check)
        assert report.valid is False  # Placeholder returns False
        assert report.network == 'ethereum'


class TestStreamingValidator:
    """Tests for StreamingValidator."""

    def test_add_chunk(self):
        """Test adding chunks."""
        validator = StreamingValidator()
        chunk = '{"kyaVersion": "1.0"}'
        result = validator.add_chunk(chunk, 1)

        assert result.valid is True
        assert validator.state.chunks_processed == 1
        assert validator.state.chunks_total == 1

    def test_finalize(self):
        """Test finalizing validation."""
        validator = StreamingValidator()
        validator.add_chunk('{"kyaVersion": "1.0"}', 1)

        report = validator.finalize()
        assert report['valid'] is True
        assert len(validator.chunk_results) == 1


class TestPluginManager:
    """Tests for PluginManager."""

    class TestPlugin(ValidationPlugin):
        """Test plugin for testing."""

        def name(self):
            return 'test_plugin'

        def version(self):
            return '1.0.0'

        def description(self):
            return 'Test plugin'

        def custom_rules(self):
            return []

    def test_register_plugin(self):
        """Test plugin registration."""
        manager = PluginManager()
        plugin = self.TestPlugin()

        manager.register(plugin)

        info = manager.get_plugin_info('test_plugin')
        assert info.name == 'test_plugin'
        assert info.version == '1.0.0'
        assert info.enabled is True
        assert info.rule_count == 0

        assert manager.is_enabled('test_plugin') is True

        manager.unregister('test_plugin')
        assert manager.is_enabled('test_plugin') is False


class TestInspector:
    """Tests for Inspector."""

    def test_inspect_manifest(self):
        """Test manifest inspection."""
        inspector = Inspector()
        manifest = {
            'kyaVersion': '1.0',
            'agentId': 'did:key:z6Mk...',
            'proof': [],
        }

        info = inspector.inspect(manifest)
        assert info['kyaVersion'] == '1.0'
        assert info['agentId'] == 'did:key:z6Mk...'
        assert info['hasProofs'] is False


class TestResolver:
    """Tests for Resolver."""

    def test_parse_did_pkh(self):
        """Test did:pkh parsing."""
        resolver = Resolver()
        did = 'did:pkh:eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bE'
        info = resolver.parse_did_pkh(did)

        assert info['network'] == 'ethereum'
        assert info['chain_id'] == 1
        assert info['address'] == '0x742d35cc6634c0532925a3b844bc9e7595f0be'


class TestConfig:
    """Tests for config module."""

    def test_load_config_from_dict(self):
        """Test loading config from dict."""
        config_dict = {
            'mode': 'selfAudit',
            'allowedKyaVersions': ['1.0'],
        }

        config = load_config(config_dict)
        assert config.mode.value == 'selfAudit'
        assert config.allowed_kya_versions == ['1.0']

    def test_load_config_from_json(self, tmp_path):
        """Test loading config from JSON file."""
        import tempfile
        config_dict = {
            'mode': 'selfAudit',
            'allowedKyaVersions': ['1.0'],
        }

        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            delete=False,
        ) as f:
            json.dump(config_dict, f)
            config = load_config(f.name)

        assert config.mode.value == 'selfAudit'
        assert config.allowed_kya_versions == ['1.0']
