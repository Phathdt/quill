use crate::db::connection::MultiDbState;
use crate::db::executor::execute_sql;
use crate::error::AppError;
use crate::models::query_result::QueryResult;

#[tauri::command]
pub async fn execute_query(
    workspace_id: String,
    sql: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<QueryResult, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    execute_sql(&conn_info.pool, &sql).await
}

#[tauri::command]
pub async fn connect_workspace(
    workspace_id: String,
    connection_string: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<String, AppError> {
    state
        .connect(&workspace_id, &connection_string)
        .await
        .map_err(|e| AppError::Connection(e.to_string()))
}

#[tauri::command]
pub async fn disconnect_workspace(
    workspace_id: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<(), AppError> {
    state
        .disconnect(&workspace_id)
        .await
        .map_err(AppError::Connection)
}

#[tauri::command]
pub async fn get_workspace_connection_status(
    workspace_id: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<bool, AppError> {
    Ok(state.is_connected(&workspace_id).await)
}

#[tauri::command]
pub async fn test_connection(connection_string: String) -> Result<String, AppError> {
    use sqlx::postgres::PgPoolOptions;
    use sqlx::sqlite::SqlitePoolOptions;

    // Detect connection type and test
    if connection_string.starts_with("postgresql://") || connection_string.starts_with("postgres://") {
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect(&connection_string)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;

        // Test with simple query
        sqlx::query("SELECT 1")
            .execute(&pool)
            .await
            .map_err(|e| AppError::Query(e.to_string()))?;

        pool.close().await;
        Ok("PostgreSQL connection successful".to_string())
    } else {
        // SQLite
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&connection_string)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;

        sqlx::query("SELECT 1")
            .execute(&pool)
            .await
            .map_err(|e| AppError::Query(e.to_string()))?;

        pool.close().await;
        Ok("SQLite connection successful".to_string())
    }
}
