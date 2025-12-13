use sqlx::{postgres::PgPoolOptions, sqlite::SqlitePoolOptions, PgPool, SqlitePool};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Enum to hold different database pool types
pub enum DbPool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

pub struct DbState {
    pub pool: Arc<Mutex<Option<DbPool>>>,
}

impl DbState {
    pub fn new() -> Self {
        Self {
            pool: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(&self, connection_string: &str) -> Result<(), sqlx::Error> {
        let pool = if connection_string.starts_with("postgres://")
            || connection_string.starts_with("postgresql://")
        {
            let pg_pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(connection_string)
                .await?;
            DbPool::Postgres(pg_pool)
        } else {
            // SQLite: file path or :memory:
            let sqlite_pool = SqlitePoolOptions::new()
                .max_connections(5)
                .connect(connection_string)
                .await?;
            DbPool::Sqlite(sqlite_pool)
        };

        *self.pool.lock().await = Some(pool);
        Ok(())
    }
}
