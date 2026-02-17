"""
Unit tests for validation implementations.
"""
import pytest

from app.validation.manifest_validator import ManifestValidator
from app.comms.schemas import ValidationStatus


@pytest.mark.unit
class TestManifestValidator:
    """Tests for ManifestValidator."""

    def test_initialization(self, manifest_validator):
        """Test ManifestValidator initialization."""
        assert manifest_validator is not None
        assert manifest_validator.config is not None

    @pytest.mark.asyncio
    async def test_validate_valid_manifest(
        self, manifest_validator, valid_manifest_data
    ):
        """Test validating a valid manifest."""
        result = await manifest_validator.validate(valid_manifest_data)
        assert result.manifest_id == 'manifest-001'
        assert result.validation_status == ValidationStatus.VALID
        assert result.mcp_validated is True
        assert result.tee_validated is True
        assert result.blockchain_validated is True

    @pytest.mark.asyncio
    async def test_validate_invalid_manifest(
        self, manifest_validator, invalid_manifest_data
    ):
        """Test validating an invalid manifest."""
        result = await manifest_validator.validate(invalid_manifest_data)
        assert result.manifest_id == 'manifest-invalid'
        assert result.validation_status == ValidationStatus.INVALID
        assert len(result.validation_errors) > 0

    @pytest.mark.asyncio
    async def test_validate_minimal_manifest(self, manifest_validator):
        """Test validating a minimal but valid manifest."""
        minimal_manifest = {
            'id': 'minimal-001',
            'version': '1.0',
            'type': 'service',
        }
        result = await manifest_validator.validate(minimal_manifest)
        assert result.manifest_id == 'minimal-001'
        assert result.validation_status == ValidationStatus.VALID

    @pytest.mark.asyncio
    async def test_validate_manifest_with_extra_fields(
        self, manifest_validator
    ):
        """Test validating a manifest with extra fields."""
        manifest_with_extra = {
            'id': 'extra-001',
            'version': '1.0',
            'type': 'service',
            'extra_field': 'value',
            'another_field': 123,
        }
        result = await manifest_validator.validate(manifest_with_extra)
        assert result.manifest_id == 'extra-001'
        assert result.validation_status == ValidationStatus.VALID

    @pytest.mark.asyncio
    async def test_validate_mcp(self, manifest_validator, valid_manifest_data):
        """Test MCP validation."""
        result = await manifest_validator.validate_mcp(valid_manifest_data)
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_tee(self, manifest_validator, valid_manifest_data):
        """Test TEE validation."""
        result = await manifest_validator.validate_tee(valid_manifest_data)
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_blockchain(
        self, manifest_validator, valid_manifest_data
    ):
        """Test blockchain validation."""
        result = await manifest_validator.validate_blockchain(
            valid_manifest_data
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_empty_manifest(self, manifest_validator):
        """Test validating an empty manifest."""
        empty_manifest = {}
        result = await manifest_validator.validate(empty_manifest)
        assert result.validation_status == ValidationStatus.INVALID
        assert len(result.validation_errors) > 0

    @pytest.mark.asyncio
    async def test_validate_manifest_missing_id(
        self, manifest_validator
    ):
        """Test validating a manifest missing ID."""
        manifest_no_id = {
            'version': '1.0',
            'type': 'service',
        }
        result = await manifest_validator.validate(manifest_no_id)
        assert result.validation_status == ValidationStatus.INVALID

    @pytest.mark.asyncio
    async def test_validate_manifest_missing_version(
        self, manifest_validator
    ):
        """Test validating a manifest missing version."""
        manifest_no_version = {
            'id': 'test-001',
            'type': 'service',
        }
        result = await manifest_validator.validate(manifest_no_version)
        assert result.validation_status == ValidationStatus.INVALID

    @pytest.mark.asyncio
    async def test_validate_manifest_missing_type(
        self, manifest_validator
    ):
        """Test validating a manifest missing type."""
        manifest_no_type = {
            'id': 'test-001',
            'version': '1.0',
        }
        result = await manifest_validator.validate(manifest_no_type)
        assert result.validation_status == ValidationStatus.INVALID

    @pytest.mark.asyncio
    async def test_simulated_validation_without_kya(
        self, manifest_validator
    ):
        """Test simulated validation when KYA Validator is not available."""
        # Force kya_validator to None
        manifest_validator.kya_validator = None

        valid_manifest = {
            'id': 'sim-001',
            'version': '1.0',
            'type': 'service',
        }
        result = await manifest_validator.validate(valid_manifest)
        assert result.validation_status == ValidationStatus.VALID

    @pytest.mark.asyncio
    async def test_validation_context_structure(
        self, manifest_validator, valid_manifest_data
    ):
        """Test that validation context has correct structure."""
        result = await manifest_validator.validate(valid_manifest_data)
        assert hasattr(result, 'manifest_id')
        assert hasattr(result, 'validation_status')
        assert hasattr(result, 'validation_errors')
        assert hasattr(result, 'mcp_validated')
        assert hasattr(result, 'tee_validated')
        assert hasattr(result, 'blockchain_validated')
        assert hasattr(result, 'policy_id')

    @pytest.mark.asyncio
    async def test_validation_errors_structure(
        self, manifest_validator, invalid_manifest_data
    ):
        """Test that validation errors have correct structure."""
        result = await manifest_validator.validate(invalid_manifest_data)
        if result.validation_errors:
            error = result.validation_errors[0]
            assert 'code' in error
            assert 'message' in error
            assert 'severity' in error

    @pytest.mark.asyncio
    async def test_validate_with_policy_id(
        self, manifest_validator, valid_manifest_data
    ):
        """Test validating a manifest with policy ID."""
        manifest_with_policy = {
            **valid_manifest_data,
            'policy_id': 'policy-001',
        }
        result = await manifest_validator.validate(manifest_with_policy)
        assert result.manifest_id == 'manifest-001'
        assert result.validation_status == ValidationStatus.VALID
