from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class MCPStatus:
    """Status of MCP connection and availability."""
    available: bool = False
    server_reachable: bool = False
    tools_available: List[str] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.tools_available is None:
            self.tools_available = []
        if self.errors is None:
            self.errors = []


class MCPClientWrapper:
    """Wrapper for MCP client with fallback to direct API calls."""
    
    def __init__(self, server_url: Optional[str] = None, timeout: int = 30):
        self.server_url = server_url
        self.timeout = timeout
        self.client = None
        self.available_tools: List[str] = []
        self._status = MCPStatus()
        
        if server_url:
            self._initialize()
    
    def _initialize(self):
        """Initialize MCP client and check availability."""
        try:
            # Try to import MCP client (may not be installed)
            from mcp import Client
            
            self.client = Client(self.server_url)
            self._status.server_reachable = True
            
            # Try to list available tools
            try:
                self.available_tools = self._list_tools()
                self._status.tools_available = self.available_tools
                
                if self.available_tools:
                    self._status.available = True
                    logger.info(f"MCP client initialized with {len(self.available_tools)} tools")
                else:
                    self._status.errors.append("No tools available on MCP server")
                    logger.warning("MCP server reachable but no tools available")
            except Exception as e:
                self._status.errors.append(f"Failed to list tools: {e}")
                logger.warning(f"MCP server reachable but tool listing failed: {e}")
                
        except ImportError:
            self._status.errors.append("MCP client library not installed")
            logger.warning("MCP client library not available")
        except Exception as e:
            self._status.server_reachable = False
            self._status.errors.append(f"Connection failed: {e}")
            logger.warning(f"MCP initialization failed: {e}")
    
    def _list_tools(self) -> List[str]:
        """List available tools from MCP server."""
        if not self.client:
            return []
        
        try:
            # Try to call list_tools method
            tools = self.client.list_tools()
            if isinstance(tools, list):
                return [tool.get('name', str(tool)) for tool in tools]
            return []
        except Exception as e:
            logger.error(f"Failed to list MCP tools: {e}")
            return []
    
    def is_available(self) -> bool:
        """Check if MCP is available."""
        return self._status.available
    
    def get_status(self) -> MCPStatus:
        """Get current MCP status."""
        return self._status
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool via MCP."""
        if not self.is_available():
            raise RuntimeError(f"MCP not available. Tool '{tool_name}' cannot be called.")
        
        if tool_name not in self.available_tools:
            raise ValueError(f"Tool '{tool_name}' not available. Available tools: {self.available_tools}")
        
        try:
            result = await self.client.call_tool(tool_name, arguments)
            return self._parse_result(result)
        except Exception as e:
            logger.error(f"MCP tool call failed for '{tool_name}': {e}")
            raise
    
    def _parse_result(self, result: Any) -> Any:
        """Parse MCP result to standard format."""
        # Handle different result formats from MCP
        if isinstance(result, dict):
            return result
        elif hasattr(result, '__dict__'):
            return result.__dict__
        else:
            return {"result": result}
    
    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get tool definitions for LLM function calling."""
        definitions = []
        for tool_name in self.available_tools:
            # Basic tool definition - can be enhanced with schema from MCP
            definitions.append({
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": f"MCP tool: {tool_name}",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                    }
                }
            })
        return definitions


class MCPDetector:
    """Detects and validates MCP availability."""
    
    @staticmethod
    async def check_availability(server_url: Optional[str]) -> MCPStatus:
        """Check if MCP server is available and list tools."""
        if not server_url:
            return MCPStatus(
                available=False,
                server_reachable=False,
                errors=["No MCP server URL configured"]
            )
        
        client = MCPClientWrapper(server_url)
        return client.get_status()
