use sqlx::{postgres::PgPoolOptions, sqlite::SqlitePoolOptions, PgPool, SqlitePool};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

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

    pub async fn connect(
        &self,
        workspace_id: &str,
        connection_string: &str,
    ) -> Result<String, sqlx::Error> {
        let (pool, db_type) = if connection_string.starts_with("postgres://")
            || connection_string.starts_with("postgresql://")
        {
            let pg_pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(connection_string)
                .await?;
            (DbPool::Postgres(pg_pool), "PostgreSQL")
        } else {
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
