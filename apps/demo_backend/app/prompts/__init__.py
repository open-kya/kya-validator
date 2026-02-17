"""
Prompt management system for agent prompts.
Supports file-based YAML prompt storage with template rendering.
"""
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
import re


class PromptManager:
    """
    Manages loading and rendering of agent prompts from YAML files.
    Supports Jinja2-style template variables for dynamic content.
    """

    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Initialize the PromptManager.

        Args:
            prompts_dir: Directory containing YAML prompt files.
                         Defaults to 'prompts' relative to the backend directory.
        """
        if prompts_dir is None:
            # Default to prompts directory in the backend
            backend_dir = Path(__file__).parent.parent.parent
            self.prompts_dir = backend_dir / 'prompts'
        else:
            self.prompts_dir = Path(prompts_dir)

        # Cache for loaded prompts
        self._prompt_cache: Dict[str, Dict[str, Any]] = {}

    def _get_prompt_file_path(self, agent_type: str) -> Path:
        """
        Get the file path for an agent's prompt YAML file.

        Args:
            agent_type: Type of agent (e.g., 'procurement_agent', 'recipient_agent')

        Returns:
            Path to the YAML prompt file
        """
        return self.prompts_dir / f'{agent_type}.yaml'

    def _load_yaml_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Load a YAML file and return its contents.

        Args:
            file_path: Path to the YAML file

        Returns:
            Parsed YAML content or None if file doesn't exist or is invalid
        """
        if not file_path.exists():
            return None

        try:
            import yaml
            with open(file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except ImportError:
            # PyYAML not available, return None
            print('Warning: PyYAML not installed. Cannot load prompt files.')
            return None
        except Exception as e:
            print(f'Error loading YAML file {file_path}: {e}')
            return None

    def _ensure_loaded(self, agent_type: str) -> bool:
        """
        Ensure prompts for an agent type are loaded into cache.

        Args:
            agent_type: Type of agent

        Returns:
            True if prompts were loaded or already cached, False otherwise
        """
        if agent_type in self._prompt_cache:
            return True

        file_path = self._get_prompt_file_path(agent_type)
        prompts = self._load_yaml_file(file_path)

        if prompts is None:
            return False

        self._prompt_cache[agent_type] = prompts
        return True

    @staticmethod
    def render_template(template: str, context: Dict[str, Any]) -> str:
        """
        Render a Jinja2-style template with the given context.

        Supports simple variable substitution using {variable} syntax.

        Args:
            template: Template string with {variable} placeholders
            context: Dictionary of variable names to values

        Returns:
            Rendered template with variables substituted
        """
        try:
            # Use str.format for simple variable substitution
            return template.format(**context)
        except KeyError as e:
            # If a variable is missing, leave it as-is
            missing_var = str(e).strip("'")
            # Replace missing variables with a placeholder or keep as-is
            return template.replace('{' + missing_var + '}', f'{{{missing_var}}}')
        except Exception as e:
            print(f'Error rendering template: {e}')
            return template

    def load_prompt(
        self,
        agent_type: str,
        prompt_name: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Load and render a prompt for an agent.

        Args:
            agent_type: Type of agent (e.g., 'procurement_agent', 'recipient_agent')
            prompt_name: Name of the prompt to load (e.g., 'greeting', 'inquiry')
            context: Optional context dictionary for template rendering

        Returns:
            Rendered prompt string, or None if not found
        """
        context = context or {}

        # Ensure prompts are loaded
        if not self._ensure_loaded(agent_type):
            return None

        prompts = self._prompt_cache[agent_type]

        # Check if prompt_name is 'system_prompt' (top-level)
        if prompt_name == 'system_prompt' and 'system_prompt' in prompts:
            template = prompts['system_prompt']
            return self.render_template(template, context)

        # Check if prompt is in 'stages' section
        if 'stages' in prompts and prompt_name in prompts['stages']:
            stage_data = prompts['stages'][prompt_name]

            # Handle both direct template string and dict with 'template' key
            if isinstance(stage_data, str):
                template = stage_data
            elif isinstance(stage_data, dict) and 'template' in stage_data:
                template = stage_data['template']
            else:
                return None

            return self.render_template(template, context)

        return None

    def get_available_prompts(self, agent_type: str) -> List[str]:
        """
        List available prompts for an agent type.

        Args:
            agent_type: Type of agent

        Returns:
            List of available prompt names
        """
        # Ensure prompts are loaded
        if not self._ensure_loaded(agent_type):
            return []

        prompts = self._prompt_cache[agent_type]
        available = []

        # Add system_prompt if available
        if 'system_prompt' in prompts:
            available.append('system_prompt')

        # Add all stage prompts
        if 'stages' in prompts:
            available.extend(prompts['stages'].keys())

        return available

    def get_system_prompt(self, agent_type: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Get the system prompt for an agent type.

        Args:
            agent_type: Type of agent
            context: Optional context for template rendering

        Returns:
            System prompt string, or empty string if not found
        """
        prompt = self.load_prompt(agent_type, 'system_prompt', context)
        return prompt or ''

    def reload(self, agent_type: Optional[str] = None):
        """
        Reload prompts from disk.

        Args:
            agent_type: Specific agent type to reload, or None to reload all
        """
        if agent_type:
            if agent_type in self._prompt_cache:
                del self._prompt_cache[agent_type]
        else:
            self._prompt_cache.clear()


# Global prompt manager instance
_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager(prompts_dir: Optional[str] = None) -> PromptManager:
    """
    Get the global PromptManager instance.

    Args:
        prompts_dir: Optional prompts directory for initialization

    Returns:
        PromptManager instance
    """
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager(prompts_dir)
    return _prompt_manager


__all__ = ['PromptManager', 'get_prompt_manager']
