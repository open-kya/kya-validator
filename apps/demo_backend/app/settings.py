"""
Configuration settings for the KYA Validator Demo Backend.

This module provides a default configuration fallback mechanism:
- If .env file is present, environment variables override the defaults
- If .env file is missing, all settings use sensible defaults
- API keys default to None, allowing the demo to run in simulated mode
- All other settings have appropriate defaults for a demo/development environment
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings with default config fallback."""

    # API Settings
    app_name: str = "KYA Validator Demo Backend"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5174", "http://localhost:3000"]

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8003
    reload: bool = True

    # WebSocket Settings
    ws_heartbeat_interval: int = 30
    ws_max_connections: int = 100

    # LLM Provider Settings
    # Note: API keys default to None - the demo will run in simulated mode
    # without API keys. Set these in .env or as environment variables for LLM mode.
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
    glm_api_key: Optional[str] = None
    glm_api_url: str = "https://api.z.ai/api/coding/paas/v4"
    glm_model: str = "glm-5"
    default_llm_provider: str = "glm"
    default_model: str = "glm-5"

    # MCP Settings
    mcp_server_url: Optional[str] = None  # e.g., "http://localhost:3000/mcp"
    mcp_timeout: int = 30
    mcp_enabled: bool = True
    mcp_fallback_to_direct: bool = True  # If MCP fails, try direct API

    # Agent Settings
    default_agent_mode: str = "llm"  # "llm" or "simulated"
    agent_timeout: int = 30  # seconds
    max_conversation_turns: int = 20

    # Validation Settings
    validation_timeout: int = 10  # seconds
    max_validation_retries: int = 3

    # KYA Validator Settings
    kya_validator_path: str = "../kya_validator"  # Relative path to kya_validator package

    # Storage Settings
    transcript_storage_path: str = "./transcripts"
    enable_transcript_persistence: bool = True

    # Demo Settings
    demo_scenario_id: str = "default"
    demo_sector: str = "cloud_infrastructure"  # cloud_infrastructure, ai_services, data_pipelines

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
