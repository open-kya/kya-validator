"""
LLM client implementations for various providers.
"""
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
from loguru import logger

# Import OpenAI SDK for GLM/Z.ai API
from openai import OpenAI
import openai

# Configure loguru to handle all logging
logger.remove()  # Remove default handler
logger.add(
    sink=lambda msg: print(msg, end=''),
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)


class BaseLLMClient(ABC):
    """Base class for LLM clients."""

    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        """Generate a response from the LLM."""
        pass


class GLMClient(BaseLLMClient):
    """
    GLM/Z.ai API client for chat completions using the OpenAI Python library.
    Compatible with GLM-4 and other models.
    """

    def __init__(
        self,
        api_key: str,
        api_url: str = 'https://api.z.ai/api/coding/paas/v4',
        model: str = 'glm-5',
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: int = 30,
    ):
        """
        Initialize the GLM client using OpenAI Python library.

        Args:
            api_key: GLM/Z.ai API key
            api_url: API endpoint URL
            model: Model name (e.g., 'glm-5', 'glm-4-flash')
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.api_url = api_url
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout

        # Initialize OpenAI client with custom base URL
        self.client = OpenAI(api_key=api_key, base_url=api_url)

        # Log initialization
        logger.info("GLMClient Initialized (using OpenAI Python library)")
        logger.info(f"Model: {self.model}")
        logger.info(f"Temperature: {self.temperature}")
        logger.info(f"Max Tokens: {self.max_tokens}")
        logger.info(f"Timeout: {self.timeout}")
        logger.info(f"API Key: {api_key[:8]}...{api_key[-4:]}")

    async def generate_response(self, prompt: str) -> str:
        """
        Generate a response using the OpenAI Python library.

        Args:
            prompt: The input prompt

        Returns:
            Generated response text

        Raises:
            openai.APIError: If the API returns an error
            openai.APITimeoutError: If the request times out
            Exception: For other errors
        """
        # Log request details
        logger.debug("GLM API Request - generate_response (using OpenAI Python library)")
        logger.debug(f"Model: {self.model}")
        logger.debug(f"Temperature: {self.temperature}")
        logger.debug(f"Max Tokens: {self.max_tokens}")
        logger.debug(f"Prompt (length: {len(prompt)} chars):")
        logger.debug(f"{prompt}")

        try:
            # Use Zai SDK to create chat completion
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            # Extract the response content
            content = response.choices[0].message.content

            # Log response details
            logger.debug("GLM API Response - generate_response (using OpenAI Python library)")
            logger.debug(f"Response Content (length: {len(content)} chars):")
            logger.debug(f"{content}")

            # Log token usage if available
            if hasattr(response, 'usage') and response.usage:
                logger.debug("Token Usage:")
                logger.debug(f"  Prompt Tokens: {getattr(response.usage, 'prompt_tokens', 'N/A')}")
                logger.debug(f"  Completion Tokens: {getattr(response.usage, 'completion_tokens', 'N/A')}")
                logger.debug(f"  Total Tokens: {getattr(response.usage, 'total_tokens', 'N/A')}")
            return content

        except openai.APIError as err:
            error_msg = f'GLM API error: {err}'
            logger.error("GLM API Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            raise
        except openai.APITimeoutError as err:
            error_msg = f'GLM API timeout error: {err}'
            logger.error("GLM API Timeout Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            raise
        except Exception as err:
            error_msg = f'GLM API error: {err}'
            logger.error("GLM API Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            logger.error(f"Error type: {type(err).__name__}")
            raise

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate a chat completion with full message history using OpenAI Python library.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max_tokens

        Returns:
            Generated response text
        """
        # Log request details
        logger.debug("GLM API Request - chat_completion (using OpenAI Python library)")
        logger.debug(f"Model: {self.model}")
        logger.debug(f"Temperature: {temperature if temperature is not None else self.temperature}")
        logger.debug(f"Max Tokens: {max_tokens if max_tokens is not None else self.max_tokens}")
        logger.debug(f"Number of Messages: {len(messages)}")
        for i, msg in enumerate(messages):
            logger.debug(f"Message {i+1} [{msg.get('role', 'unknown')}]:")
            logger.debug(f"  Content: {msg.get('content', '')}")

        try:
            # Use Zai SDK to create chat completion
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.max_tokens,
            )

            # Extract the response content
            content = response.choices[0].message.content

            # Log response details
            logger.debug("GLM API Response - chat_completion (using OpenAI Python library)")
            logger.debug(f"Response Content (length: {len(content)} chars):")
            logger.debug(f"{content}")

            # Log token usage if available
            if hasattr(response, 'usage') and response.usage:
                logger.debug("Token Usage:")
                logger.debug(f"  Prompt Tokens: {getattr(response.usage, 'prompt_tokens', 'N/A')}")
                logger.debug(f"  Completion Tokens: {getattr(response.usage, 'completion_tokens', 'N/A')}")
                logger.debug(f"  Total Tokens: {getattr(response.usage, 'total_tokens', 'N/A')}")
            return content

        except openai.APIError as err:
            error_msg = f'GLM API error: {err}'
            logger.error("GLM API Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            raise
        except openai.APITimeoutError as err:
            error_msg = f'GLM API timeout error: {err}'
            logger.error("GLM API Timeout Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            raise
        except Exception as err:
            error_msg = f'GLM API error: {err}'
            logger.error("GLM API Error (using OpenAI Python library)")
            logger.error(f"Error: {err}")
            logger.error(f"Error type: {type(err).__name__}")
            raise


def create_glm_client(
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs,
) -> Optional[GLMClient]:
    """
    Create a GLM client if API key is provided.

    Args:
        api_key: GLM API key (if None, returns None)
        api_url: API endpoint URL (deprecated, kept for compatibility)
        model: Model name (uses default if None)
        **kwargs: Additional arguments for GLMClient

    Returns:
        GLMClient instance or None if no API key
    """
    logger.info("create_glm_client called")
    if not api_key:
        logger.warning("No API key provided - returning None (GLM client will not be available)")
        return None

    logger.info("API key provided - creating GLM client (using OpenAI Python library)")
    client = GLMClient(
        api_key=api_key,
        api_url=api_url or 'https://api.z.ai/api/coding/paas/v4',
        model=model or 'glm-5',
        **kwargs,
    )
    logger.info("GLM client created successfully")
    return client


__all__ = ['BaseLLMClient', 'GLMClient', 'create_glm_client']
