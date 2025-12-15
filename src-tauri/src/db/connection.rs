use sqlx::{postgres::{PgPoolOptions, PgConnectOptions, PgSslMode}, sqlite::SqlitePoolOptions, PgPool, SqlitePool};
use std::collections::HashMap;
use std::sync::Arc;
use std::str::FromStr;
use tokio::sync::RwLock;
use serde::Deserialize;

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

/// Enum to hold different database pool types
pub enum DbPool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

pub struct ConnectionInfo {
    pub pool: DbPool,
}

pub struct MultiDbState {
    pub connections: Arc<RwLock<HashMap<String, ConnectionInfo>>>,
}

impl MultiDbState {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn connect_with_ssl(
        &self,
        workspace_id: &str,
        connection_string: &str,
        ssl_config: Option<SslConfig>,
    ) -> Result<String, sqlx::Error> {
        let (pool, db_type) = if connection_string.starts_with("postgres://")
            || connection_string.starts_with("postgresql://")
        {
            // PostgreSQL with SSL support
            let mut options = PgConnectOptions::from_str(connection_string)?;

            // Apply SSL configuration
            if let Some(ssl) = ssl_config {
                let mode = match ssl.mode.as_str() {
                    "disable" => PgSslMode::Disable,
                    "prefer" => PgSslMode::Prefer,
                    "require" => PgSslMode::Require,
                    "verify-ca" => PgSslMode::VerifyCa,
                    "verify-full" => PgSslMode::VerifyFull,
                    _ => PgSslMode::Prefer,
                };
                options = options.ssl_mode(mode);

                // Set root certificate
                if let Some(root_cert) = ssl.root_cert_path {
                    options = options.ssl_root_cert(&root_cert);
                }

                // Client certificate auth
                if let Some(client_cert) = ssl.client_cert_path {
                    options = options.ssl_client_cert(&client_cert);
                }
                if let Some(client_key) = ssl.client_key_path {
                    options = options.ssl_client_key(&client_key);
                }
            }

            let pg_pool = PgPoolOptions::new()
                .max_connections(5)
                .connect_with(options)
                .await?;
            (DbPool::Postgres(pg_pool), "PostgreSQL")
        } else {
            // SQLite - no SSL
            let sqlite_pool = SqlitePoolOptions::new()
                .max_connections(5)
                .connect(connection_string)
                .await?;
            (DbPool::Sqlite(sqlite_pool), "SQLite")
        };

        let info = ConnectionInfo { pool };

        self.connections
            .write()
            .await
            .insert(workspace_id.to_string(), info);

        Ok(db_type.to_string())
    }

    pub async fn disconnect(&self, workspace_id: &str) -> Result<(), String> {
        let mut conns = self.connections.write().await;
        if let Some(info) = conns.remove(workspace_id) {
            match info.pool {
                DbPool::Postgres(pool) => pool.close().await,
                DbPool::Sqlite(pool) => pool.close().await,
            }
            Ok(())
        } else {
            Err("Workspace not found".to_string())
        }
    }

    pub async fn is_connected(&self, workspace_id: &str) -> bool {
        self.connections.read().await.contains_key(workspace_id)
    }

}
