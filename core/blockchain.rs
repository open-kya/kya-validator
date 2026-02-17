// Blockchain Solvency Verification
// Multi-provider support for checking on-chain balances and transactions

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Blockchain provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProviderType {
    #[serde(rename = "alchemy")]
    Alchemy,
    #[serde(rename = "infura")]
    Infura,
    #[serde(rename = "ankr")]
    Ankr,
    #[serde(rename = "quicknode")]
    QuickNode,
}

/// Blockchain network
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Network {
    #[serde(rename = "ethereum")]
    Ethereum,
    #[serde(rename = "polygon")]
    Polygon,
    #[serde(rename = "arbitrum")]
    Arbitrum,
    #[serde(rename = "optimism")]
    Optimism,
    #[serde(rename = "bsc")]
    Bsc,
}

impl Network {
    /// Get chain ID for the network
    pub fn chain_id(&self) -> u64 {
        match self {
            Network::Ethereum => 1,
            Network::Polygon => 137,
            Network::Arbitrum => 42161,
            Network::Optimism => 10,
            Network::Bsc => 56,
        }
    }
}

/// Blockchain provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainProvider {
    pub provider_type: ProviderType,
    pub api_key: Option<String>,
    pub rpc_url: Option<String>,
}

impl BlockchainProvider {
    /// Create new provider with API key
    pub fn new(provider_type: ProviderType, api_key: Option<String>) -> Self {
        Self {
            provider_type,
            api_key,
            rpc_url: None,
        }
    }

    /// Create provider with custom RPC URL
    pub fn with_rpc_url(provider_type: ProviderType, rpc_url: String) -> Self {
        Self {
            provider_type,
            api_key: None,
            rpc_url: Some(rpc_url),
        }
    }

    /// Get RPC endpoint URL for the provider
    pub fn rpc_url(&self, network: Network) -> String {
        if let Some(custom_url) = &self.rpc_url {
            return custom_url.clone();
        }

        match (self.provider_type, network) {
            (ProviderType::Alchemy, Network::Ethereum) => {
                if let Some(key) = &self.api_key {
                    format!("https://eth-mainnet.g.alchemy.com/v2/{}", key)
                } else {
                    "https://eth-mainnet.g.alchemy.com/v2/demo".to_string()
                }
            }
            (ProviderType::Infura, Network::Ethereum) => {
                if let Some(key) = &self.api_key {
                    format!("https://mainnet.infura.io/v3/{}", key)
                } else {
                    "https://mainnet.infura.io/v3/demo".to_string()
                }
            }
            (ProviderType::Ankr, Network::Ethereum) => "https://rpc.ankr.com/eth".to_string(),
            (ProviderType::QuickNode, Network::Ethereum) => {
                if let Some(key) = &self.api_key {
                    format!("https://{}.quiknode.pro/{}", key, "eth-mainnet")
                } else {
                    "https://demo.quiknode.pro/eth-mainnet".to_string()
                }
            }
            (ProviderType::Alchemy, Network::Polygon) => {
                if let Some(key) = &self.api_key {
                    format!("https://polygon-mainnet.g.alchemy.com/v2/{}", key)
                } else {
                    "https://polygon-mainnet.g.alchemy.com/v2/demo".to_string()
                }
            }
            _ => format!("https://rpc.{}.com", network.chain_id()),
        }
    }
}

/// Solvency check configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolvencyCheck {
    pub address: String,
    pub network: Network,
    pub min_balance: String, // in wei
    pub provider: BlockchainProvider,
    pub check_transactions: bool,
    pub transaction_window_days: Option<u64>,
}

/// Result of solvency check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolvencyReport {
    pub address: String,
    pub network: Network,
    pub balance: String,
    pub balance_ether: f64,
    pub meets_minimum: bool,
    pub minimum_balance: String,
    pub provider: ProviderType,
    pub transaction_count: Option<u64>,
    pub last_activity: Option<u64>, // timestamp
    pub errors: Vec<String>,
    pub cached: bool,
}

/// JSON-RPC request structure
#[derive(Debug, Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'a str,
    method: &'a str,
    params: &'a [serde_json::Value],
    id: u64,
}

/// JSON-RPC response for eth_getBalance
#[derive(Debug, Deserialize)]
struct BalanceResponse {
    result: String,
}

/// JSON-RPC response for eth_getTransactionCount
#[derive(Debug, Deserialize)]
struct TransactionCountResponse {
    result: String,
}

/// Balance cache entry
#[derive(Debug, Clone)]
struct CacheEntry {
    balance: String,
    balance_ether: f64,
    transaction_count: Option<u64>,
    timestamp: u64,
}

/// Balance cache with TTL
#[derive(Debug)]
struct BalanceCache {
    entries: Arc<RwLock<HashMap<String, CacheEntry>>>,
    ttl_secs: u64,
}

impl BalanceCache {
    fn new(ttl_secs: u64) -> Self {
        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
            ttl_secs,
        }
    }

    async fn get(&self, key: &str) -> Option<CacheEntry> {
        let entries: tokio::sync::RwLockReadGuard<'_, HashMap<String, CacheEntry>> =
            self.entries.read().await;
        let entry = entries.get(key)?;

        // Check TTL
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if now - entry.timestamp > self.ttl_secs {
            return None;
        }

        Some(entry.clone())
    }

    async fn set(&self, key: String, entry: CacheEntry) {
        let mut entries: tokio::sync::RwLockWriteGuard<'_, HashMap<String, CacheEntry>> =
            self.entries.write().await;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let entry = CacheEntry {
            timestamp: now,
            ..entry
        };
        entries.insert(key, entry);
    }
}

/// Verify solvency (check on-chain balance)
pub async fn verify_solvency(check: &SolvencyCheck) -> SolvencyReport {
    let mut errors = Vec::new();
    let provider_url = check.provider.rpc_url(check.network);
    let cache_key = format!("{}:{}", check.address, check.network.chain_id());

    // Use default cache (5 minutes TTL)
    let cache = BalanceCache::new(300);

    // Check cache first
    if let Some(cached) = cache.get(&cache_key).await {
        let meets_minimum = compare_balance(&cached.balance, &check.min_balance);

        return SolvencyReport {
            address: check.address.clone(),
            network: check.network,
            balance: cached.balance.clone(),
            balance_ether: cached.balance_ether,
            meets_minimum,
            minimum_balance: check.min_balance.clone(),
            provider: check.provider.provider_type,
            transaction_count: cached.transaction_count,
            last_activity: None,
            errors,
            cached: true,
        };
    }

    // Query balance from provider
    let balance_result = query_balance(&provider_url, &check.address).await;

    let (balance, balance_ether) = match balance_result {
        Ok(b) => b,
        Err(e) => {
            errors.push(format!("Failed to query balance: {}", e));
            return SolvencyReport {
                address: check.address.clone(),
                network: check.network,
                balance: "0".to_string(),
                balance_ether: 0.0,
                meets_minimum: false,
                minimum_balance: check.min_balance.clone(),
                provider: check.provider.provider_type,
                transaction_count: None,
                last_activity: None,
                errors,
                cached: false,
            };
        }
    };

    // Query transaction count if requested
    let transaction_count = if check.check_transactions {
        Some(
            query_transaction_count(&provider_url, &check.address)
                .await
                .unwrap_or(0),
        )
    } else {
        None
    };

    let meets_minimum = compare_balance(&balance, &check.min_balance);

    // Cache the result
    cache
        .set(
            cache_key,
            CacheEntry {
                balance: balance.clone(),
                balance_ether,
                transaction_count,
                timestamp: 0, // will be set in set()
            },
        )
        .await;

    SolvencyReport {
        address: check.address.clone(),
        network: check.network,
        balance,
        balance_ether,
        meets_minimum,
        minimum_balance: check.min_balance.clone(),
        provider: check.provider.provider_type,
        transaction_count,
        last_activity: None,
        errors,
        cached: false,
    }
}

/// Query balance from JSON-RPC endpoint
async fn query_balance(rpc_url: &str, address: &str) -> Result<(String, f64), String> {
    let client: reqwest::Client = reqwest::Client::new();
    let request = JsonRpcRequest {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: &[serde_json::json!(address), serde_json::json!("latest")],
        id: 1,
    };

    let response: reqwest::Response = client
        .post(rpc_url)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let body: BalanceResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Parse hex balance to wei
    let balance_wei = u128::from_str_radix(&body.result[2..], 16)
        .map_err(|e| format!("Failed to parse balance: {}", e))?;

    // Convert to ether
    let balance_ether = balance_wei as f64 / 1e18;

    Ok((body.result, balance_ether))
}

/// Query transaction count from JSON-RPC endpoint
async fn query_transaction_count(rpc_url: &str, address: &str) -> Result<u64, String> {
    let client: reqwest::Client = reqwest::Client::new();
    let request = JsonRpcRequest {
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: &[serde_json::json!(address), serde_json::json!("latest")],
        id: 2,
    };

    let response: reqwest::Response = client
        .post(rpc_url)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let body: TransactionCountResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let count = u64::from_str_radix(&body.result[2..], 16)
        .map_err(|e| format!("Failed to parse count: {}", e))?;

    Ok(count)
}

/// Compare two balance strings (hex wei values)
fn compare_balance(balance: &str, minimum: &str) -> bool {
    let balance_wei = u128::from_str_radix(&balance[2..], 16).unwrap_or(0);
    let min_wei = u128::from_str_radix(&minimum[2..], 16).unwrap_or(0);

    balance_wei >= min_wei
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_provider_urls() {
        let provider = BlockchainProvider::new(ProviderType::Alchemy, Some("test_key".to_string()));
        assert_eq!(
            provider.rpc_url(Network::Ethereum),
            "https://eth-mainnet.g.alchemy.com/v2/test_key"
        );
    }

    #[test]
    fn test_network_chain_ids() {
        assert_eq!(Network::Ethereum.chain_id(), 1);
        assert_eq!(Network::Polygon.chain_id(), 137);
        assert_eq!(Network::Arbitrum.chain_id(), 42161);
    }

    #[test]
    fn test_compare_balance() {
        // 1 ETH in hex = 0xde0b6b3a7640000
        let balance = "0xde0b6b3a7640000";
        let minimum = "0xde0b6b3a7640000";
        assert!(compare_balance(balance, minimum));

        let lower = "0x0de0b6b3a764000";
        assert!(!compare_balance(lower, minimum));
    }

    #[tokio::test]
    async fn test_solvency_report_structure() {
        let check = SolvencyCheck {
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bE".to_string(),
            network: Network::Ethereum,
            min_balance: "0x0".to_string(),
            provider: BlockchainProvider::new(ProviderType::Alchemy, None),
            check_transactions: false,
            transaction_window_days: None,
        };

        // This will fail due to network, but tests structure
        let report = verify_solvency(&check).await;

        assert_eq!(report.address, check.address);
        assert_eq!(report.network, check.network);
        assert_eq!(report.provider, check.provider.provider_type);
    }
}
