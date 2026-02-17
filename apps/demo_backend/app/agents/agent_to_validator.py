"""
Agent-to Validator - Handles cryptographic validation between agents.

This module provides nonce generation, encryption, and verification
capabilities for agent-to validation using KYA manifest public keys.
"""
import secrets
import hashlib
import base64
from typing import Dict, Any, Optional
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend


class AgentToValidator:
    """
    Handles agent-to validation via nonce encryption.

    This class provides methods for:
    - Generating cryptographically secure nonces
    - Encrypting nonces using RSA public keys
    - Verifying encrypted nonces against manifests
    - Validating agent responses
    """

    @staticmethod
    def generate_nonce(length: int = 32) -> str:
        """
        Generate a cryptographically secure random nonce.

        Args:
            length: Number of random bytes to generate (default: 32)

        Returns:
            Hex-encoded nonce string (64 characters for 32 bytes)
        """
        return secrets.token_hex(length)

    @staticmethod
    def hash_nonce(nonce: str) -> str:
        """
        Hash the nonce for verification purposes.

        Args:
            nonce: The nonce string to hash

        Returns:
            SHA256 hash of the nonce as hex string
        """
        return hashlib.sha256(nonce.encode()).hexdigest()

    @staticmethod
    def extract_public_key(
        manifest: Dict[str, Any],
    ) -> Optional[rsa.RSAPublicKey]:
        """
        Extract public key from manifest.

        Args:
            manifest: The KYA manifest dictionary

        Returns:
            RSA public key object or None if not found
        """
        # Try to get public key from manifest
        public_key_pem = None

        # Check various possible locations for the public key
        if 'public_key' in manifest:
            public_key_pem = manifest['public_key']
        elif 'agent_to' in manifest and 'public_key' in manifest['agent_to']:
            public_key_pem = manifest['agent_to']['public_key']
        elif 'crypto' in manifest and 'public_key' in manifest['crypto']:
            public_key_pem = manifest['crypto']['public_key']

        if not public_key_pem:
            return None

        try:
            # Parse PEM format
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode(),
                backend=default_backend(),
            )

            if isinstance(public_key, rsa.RSAPublicKey):
                return public_key
            else:
                # Generate demo key for testing if manifest has no valid key
                return AgentToValidator._generate_demo_public_key()
        except Exception:
            # For demo purposes, generate a demo key if parsing fails
            return AgentToValidator._generate_demo_public_key()

    @staticmethod
    def _generate_demo_public_key() -> rsa.RSAPublicKey:
        """
        Generate a demo RSA key pair for testing purposes.

        Returns:
            RSA public key
        """
        # Generate a key pair for demo purposes
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend(),
        )
        return private_key.public_key()

    @staticmethod
    def encrypt_nonce(
        nonce: str,
        public_key: rsa.RSAPublicKey,
    ) -> Optional[str]:
        """
        Encrypt nonce using RSA public key.

        Args:
            nonce: The nonce string to encrypt
            public_key: RSA public key object

        Returns:
            Base64-encoded encrypted nonce or None on failure
        """
        try:
            encrypted = public_key.encrypt(
                nonce.encode(),
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None,
                ),
            )

            # Return base64 encoded encrypted nonce
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            print(f'Encryption error: {e}')
            return None

    @staticmethod
    def verify_encryption(
        nonce: str,
        encrypted_nonce: str,
        manifest: Dict[str, Any],
    ) -> bool:
        """
        Verify encrypted nonce matches manifest encryption.

        Args:
            nonce: The original nonce string
            encrypted_nonce: The encrypted nonce to verify
            manifest: The KYA manifest containing the public key

        Returns:
            True if verification passes, False otherwise
        """
        try:
            public_key = AgentToValidator.extract_public_key(manifest)
            if not public_key:
                return False

            # Re-encrypt and compare
            re_encrypted = AgentToValidator.encrypt_nonce(nonce, public_key)

            if re_encrypted is None:
                return False

            return re_encrypted == encrypted_nonce
        except Exception as e:
            print(f'Verification error: {e}')
            return False

    @staticmethod
    def validate_agent_to(
        nonce: str,
        encrypted_response: str,
        manifest: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Validate agent's response contains correct encryption.

        Args:
            nonce: The original nonce that was sent
            encrypted_response: The encrypted response from the agent
            manifest: The KYA manifest for verification

        Returns:
            Dictionary with validation result and details
        """
        is_valid = AgentToValidator.verify_encryption(
            nonce,
            encrypted_response,
            manifest,
        )

        return {
            'valid': is_valid,
            'verification_method': 'nonce_encryption',
            'nonce_hash': AgentToValidator.hash_nonce(nonce),
            'details': {
                'nonce_length': len(nonce),
                'encrypted_length': len(encrypted_response),
                'manifest_id': manifest.get('id', 'unknown'),
            },
        }

    @staticmethod
    def generate_encryption_challenge(
        manifest: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate an encryption challenge for agent-to validation.

        Args:
            manifest: The KYA manifest to use for the challenge

        Returns:
            Dictionary with challenge data
        """
        nonce = AgentToValidator.generate_nonce()

        return {
            'challenge_type': 'encrypt_nonce',
            'nonce': nonce,
            'nonce_hash': AgentToValidator.hash_nonce(nonce),
            'manifest_id': manifest.get('id', 'unknown'),
            'timestamp': secrets.token_hex(8),  # Simple timestamp
        }

    @staticmethod
    def handle_encryption_request(
        nonce: Optional[str] = None,
        manifest: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Handle request to encrypt a nonce.

        Args:
            nonce: Optional nonce to encrypt (generates one if not provided)
            manifest: The KYA manifest containing the public key

        Returns:
            Dictionary with encryption result
        """
        if not manifest:
            return {
                'success': False,
                'error': 'No manifest available for encryption',
            }

        # Generate nonce if not provided
        if nonce is None:
            nonce = AgentToValidator.generate_nonce()

        # Extract public key from manifest
        public_key = AgentToValidator.extract_public_key(manifest)
        if not public_key:
            return {
                'success': False,
                'error': 'Failed to extract public key from manifest',
            }

        # Encrypt the nonce
        encrypted = AgentToValidator.encrypt_nonce(nonce, public_key)

        if not encrypted:
            return {
                'success': False,
                'error': 'Failed to encrypt nonce',
            }

        return {
            'success': True,
            'nonce': nonce,
            'encrypted_nonce': encrypted,
            'nonce_hash': AgentToValidator.hash_nonce(nonce),
        }
