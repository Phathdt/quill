use crate::error::AppError;
use crate::providers::{
    ConnectionConfig, DatabaseProvider, MySqlProvider, PostgresProvider, ProviderType,
    SqliteProvider, SqlProvider,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Registry for managing multiple database provider instances
pub struct ProviderRegistry {
    providers: Arc<RwLock<HashMap<String, Arc<dyn DatabaseProvider>>>>,
}

impl ProviderRegistry {
    /// Create a new provider registry
    pub fn new() -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Connect to a database and register the provider
    pub async fn connect(
        &self,
        workspace_id: &str,
        config: ConnectionConfig,
    ) -> Result<ProviderType, AppError> {
        // Determine provider type from connection string
        let provider_type = if config.connection_string.starts_with("postgres://")
            || config.connection_string.starts_with("postgresql://")
        {
            ProviderType::Postgres
        } else if config.connection_string.starts_with("mysql://") {
            ProviderType::Mysql
        } else {
            ProviderType::Sqlite
        };

        // Create the appropriate provider
        let provider: Arc<dyn DatabaseProvider> = match provider_type {
            ProviderType::Postgres => {
                let pg_provider = PostgresProvider::connect(config).await?;
                Arc::new(pg_provider)
            }
            ProviderType::Sqlite => {
                let sqlite_provider = SqliteProvider::connect(config).await?;
                Arc::new(sqlite_provider)
            }
            ProviderType::Mysql => {
                let mysql_provider = MySqlProvider::connect(config).await?;
                Arc::new(mysql_provider)
            }
        };

        // Ping to verify connection
        provider.ping().await?;

        // Store in registry
        self.providers
            .write()
            .await
            .insert(workspace_id.to_string(), provider);

        Ok(provider_type)
    }

    /// Get a provider by workspace ID
    pub async fn get(&self, workspace_id: &str) -> Option<Arc<dyn DatabaseProvider>> {
        self.providers.read().await.get(workspace_id).cloned()
    }

    /// Get a SQL provider by workspace ID
    pub async fn get_sql(&self, workspace_id: &str) -> Option<Arc<dyn SqlProvider>> {
        let providers = self.providers.read().await;
        let provider = providers.get(workspace_id)?;

        // Downcast to SqlProvider
        // Since we know Postgres, Sqlite, and MySQL all implement SqlProvider,
        // we can use Arc::clone and downcast
        match provider.provider_type() {
            ProviderType::Postgres => {
                // Re-acquire as PostgresProvider
                drop(providers);
                let providers = self.providers.read().await;
                let provider = providers.get(workspace_id)?;
                let raw_ptr = Arc::as_ptr(provider) as *const PostgresProvider;
                unsafe {
                    let pg_provider = Arc::from_raw(raw_ptr);
                    let result: Arc<dyn SqlProvider> = pg_provider.clone();
                    // Don't drop, we're just borrowing
                    let _ = Arc::into_raw(pg_provider);
                    Some(result)
                }
            }
            ProviderType::Sqlite => {
                drop(providers);
                let providers = self.providers.read().await;
                let provider = providers.get(workspace_id)?;
                let raw_ptr = Arc::as_ptr(provider) as *const SqliteProvider;
                unsafe {
                    let sqlite_provider = Arc::from_raw(raw_ptr);
                    let result: Arc<dyn SqlProvider> = sqlite_provider.clone();
                    let _ = Arc::into_raw(sqlite_provider);
                    Some(result)
                }
            }
            ProviderType::Mysql => {
                drop(providers);
                let providers = self.providers.read().await;
                let provider = providers.get(workspace_id)?;
                let raw_ptr = Arc::as_ptr(provider) as *const MySqlProvider;
                unsafe {
                    let mysql_provider = Arc::from_raw(raw_ptr);
                    let result: Arc<dyn SqlProvider> = mysql_provider.clone();
                    let _ = Arc::into_raw(mysql_provider);
                    Some(result)
                }
            }
        }
    }

    /// Disconnect a provider
    pub async fn disconnect(&self, workspace_id: &str) -> Result<(), AppError> {
        let mut providers = self.providers.write().await;
        if let Some(provider) = providers.remove(workspace_id) {
            provider.close().await?;
            Ok(())
        } else {
            Err(AppError::Connection("Workspace not found".to_string()))
        }
    }

    /// Check if a workspace is connected
    pub async fn is_connected(&self, workspace_id: &str) -> bool {
        self.providers.read().await.contains_key(workspace_id)
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
