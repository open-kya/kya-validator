"""
Plugin system API for KYA Validator.

This module provides interfaces for managing validation plugins
and custom rules.
"""

from typing import Optional, Any, Callable
from dataclasses import dataclass, field
from .errors import PluginError


@dataclass
class RuleResult:
    """Result of executing a validation rule.

    This dataclass contains the result of a single
    validation rule execution.

    Attributes
    ----------
    rule_name : str
        Name of the rule.
    passed : bool
        Whether the rule passed.
    message : str
        Result message.
    details : dict, optional
        Additional details about the result.
    """

    rule_name: str
    passed: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary.

        Returns
        -------
        dict
            Dictionary representation of result.
        """
        return {
            'ruleName': self.rule_name,
            'passed': self.passed,
            'message': self.message,
            'details': self.details,
        }


@dataclass
class PluginInfo:
    """Information about a registered plugin.

    This dataclass contains metadata about a plugin.

    Attributes
    ----------
    name : str
        Plugin name.
    version : str
        Plugin version.
    description : str
        Plugin description.
    enabled : bool
        Whether plugin is enabled.
    rule_count : int
        Number of rules in plugin.
    """

    name: str
    version: str
    description: str
    enabled: bool
    rule_count: int

    def to_dict(self) -> dict[str, Any]:
        """Convert plugin info to dictionary.

        Returns
        -------
        dict
            Dictionary representation of plugin info.
        """
        return {
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'enabled': self.enabled,
            'ruleCount': self.rule_count,
        }


class ValidationPlugin:
    """Base class for validation plugins.

    This is an abstract base class that users can extend
    to create custom validation rules.

    Examples
    --------
    >>> class MyPlugin(ValidationPlugin):
    ...     def name(self):
    ...         return 'my_plugin'
    ...
    >>> plugin = MyPlugin()
    >>> print(plugin.name())
    my_plugin
    """

    def name(self) -> str:
        """Get plugin name.

        Returns
        -------
        str
            Plugin name.
        """
        raise NotImplementedError('Subclasses must implement name()')

    def version(self) -> str:
        """Get plugin version.

        Returns
        -------
        str
            Plugin version.
        """
        raise NotImplementedError('Subclasses must implement version()')

    def description(self) -> str:
        """Get plugin description.

        Returns
        -------
        str
            Plugin description.
        """
        raise NotImplementedError('Subclasses must implement description()')

    def before_validation(self, manifest: dict[str, Any]) -> None:
        """Hook called before validation starts.

        Parameters
        ----------
        manifest : dict
            Manifest to be validated.
        """
        pass

    def after_validation(
        self,
        report: dict[str, Any],
    ) -> None:
        """Hook called after validation completes.

        Parameters
        ----------
        report : dict
            Validation report.
        """
        pass

    def custom_rules(self) -> list[Callable]:
        """Get custom validation rules.

        Returns
        -------
        list[Callable]
            List of validation rule functions.
        """
        return []


class PluginManager:
    """Manager for validation plugins.

    This class handles plugin registration, lifecycle management,
    and execution of custom rules.

    Examples
    --------
    >>> manager = PluginManager()
    >>> plugin = MyPlugin()
    >>> manager.register(plugin)
    >>> info = manager.get_plugin_info('my_plugin')
    >>> print(info.enabled)
    True
    """

    def __init__(self):
        """Initialize plugin manager."""
        self._plugins = {}
        self._enabled = set()

    def register(self, plugin: ValidationPlugin) -> None:
        """Register a validation plugin.

        Parameters
        ----------
        plugin : ValidationPlugin
            Plugin to register.

        Raises
        ------
        PluginError
            If plugin with same name is already registered.
        """
        name = plugin.name()
        if name in self._plugins:
            raise PluginError(
                f'Plugin "{name}" already registered',
                plugin_name=name,
            )

        self._plugins[name] = plugin
        self._enabled.add(name)

    def unregister(self, name: str) -> None:
        """Unregister a validation plugin.

        Parameters
        ----------
        name : str
            Name of plugin to unregister.

        Raises
        ------
        PluginError
            If plugin is not registered.
        """
        if name not in self._plugins:
            raise PluginError(
                f'Plugin "{name}" not found',
                plugin_name=name,
            )

        del self._plugins[name]
        self._enabled.discard(name)

    def enable(self, name: str) -> None:
        """Enable a registered plugin.

        Parameters
        ----------
        name : str
            Name of plugin to enable.

        Raises
        ------
        PluginError
            If plugin is not registered.
        """
        if name not in self._plugins:
            raise PluginError(
                f'Plugin "{name}" not found',
                plugin_name=name,
            )

        self._enabled.add(name)

    def disable(self, name: str) -> None:
        """Disable a registered plugin.

        Parameters
        ----------
        name : str
            Name of plugin to disable.

        Raises
        ------
        PluginError
            If plugin is not registered.
        """
        if name not in self._plugins:
            raise PluginError(
                f'Plugin "{name}" not found',
                plugin_name=name,
            )

        self._enabled.discard(name)

    def is_enabled(self, name: str) -> bool:
        """Check if a plugin is enabled.

        Parameters
        ----------
        name : str
            Name of plugin to check.

        Returns
        -------
        bool
            True if plugin is enabled.
        """
        return name in self._enabled

    def get_registered_plugins(self) -> list[str]:
        """Get list of registered plugin names.

        Returns
        -------
        list[str]
            Names of all registered plugins.
        """
        return list(self._plugins.keys())

    def get_enabled_plugins(self) -> list[str]:
        """Get list of enabled plugin names.

        Returns
        -------
        list[str]
            Names of enabled plugins.
        """
        return list(self._enabled)

    def get_plugin_info(self, name: str) -> PluginInfo:
        """Get information about a plugin.

        Parameters
        ----------
        name : str
            Name of plugin.

        Returns
        -------
        PluginInfo
            Plugin information.

        Raises
        ------
        PluginError
            If plugin is not registered.
        """
        if name not in self._plugins:
            raise PluginError(
                f'Plugin "{name}" not found',
                plugin_name=name,
            )

        plugin = self._plugins[name]
        return PluginInfo(
            name=plugin.name(),
            version=plugin.version(),
            description=plugin.description(),
            enabled=name in self._enabled,
            rule_count=len(plugin.custom_rules()),
        )

    def get_all_plugin_info(self) -> list[PluginInfo]:
        """Get information about all plugins.

        Returns
        -------
        list[PluginInfo]
            Information for all registered plugins.
        """
        return [
            self.get_plugin_info(name)
            for name in self._plugins
        ]

    def execute_before_validation(
        self,
        manifest: dict[str, Any],
    ) -> None:
        """Execute before_validation hooks for all enabled plugins.

        Parameters
        ----------
        manifest : dict
            Manifest to be validated.
        """
        for name in self._enabled:
            plugin = self._plugins[name]
            plugin.before_validation(manifest)

    def execute_after_validation(
        self,
        report: dict[str, Any],
    ) -> None:
        """Execute after_validation hooks for all enabled plugins.

        Parameters
        ----------
        report : dict
            Validation report.
        """
        for name in self._enabled:
            plugin = self._plugins[name]
            plugin.after_validation(report)

    def execute_custom_rules(
        self,
        manifest: dict[str, Any],
        context: dict[str, Any],
    ) -> list[RuleResult]:
        """Execute custom rules from all enabled plugins.

        Parameters
        ----------
        manifest : dict
            Manifest to validate.
        context : dict
            Validation context.

        Returns
        -------
        list[RuleResult]
            Results from all custom rules.
        """
        results = []
        for name in self._enabled:
            plugin = self._plugins[name]
            for rule_func in plugin.custom_rules():
                try:
                    result = rule_func(manifest, context)
                    if isinstance(result, RuleResult):
                        results.append(result)
                    elif isinstance(result, bool):
                        results.append(RuleResult(
                            rule_name=rule_func.__name__,
                            passed=result,
                            message='Rule passed' if result else 'Rule failed',
                        ))
                except Exception as e:
                    results.append(RuleResult(
                        rule_name=rule_func.__name__,
                        passed=False,
                        message=f'Rule error: {e}',
                    ))

        return results
