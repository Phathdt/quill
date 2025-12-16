use async_trait::async_trait;
use crate::error::AppError;
use serde::{Deserialize, Serialize};

/// Database provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProviderType {
    Postgres,
    Sqlite,
    Mysql, // For future use
}

/// Database paradigm classification
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatabaseParadigm {
    Sql,
    Document, // For future NoSQL support
}

/// SSL configuration for database connections
#[derive(Debug, Clone, Deserialize)]
pub struct SslConfig {
    pub mode: String, // disable, prefer, require, verify-ca, verify-full
    #[serde(rename = "rootCertPath")]
    pub root_cert_path: Option<String>,
    #[serde(rename = "clientCertPath")]
    pub client_cert_path: Option<String>,
    #[serde(rename = "clientKeyPath")]
    pub client_key_path: Option<String>,
}

/// Connection configuration for establishing database connections
#[derive(Debug, Clone)]
pub struct ConnectionConfig {
    pub connection_string: String,
    pub ssl_config: Option<SslConfig>,
}

/// Information about an active connection
#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub provider_type: ProviderType,
    pub host: Option<String>,
    pub database: Option<String>,
}

/// Base trait for all database providers
#[async_trait]
pub trait DatabaseProvider: Send + Sync {
    /// Returns the provider type
    fn provider_type(&self) -> ProviderType;

    /// Returns the database paradigm (SQL, Document, etc.)
    fn paradigm(&self) -> DatabaseParadigm;

    /// Ping the database to verify connection is alive
    async fn ping(&self) -> Result<(), AppError>;

    /// Close the database connection
    async fn close(&self) -> Result<(), AppError>;

    /// Get connection information
    fn connection_info(&self) -> ConnectionInfo;
}
