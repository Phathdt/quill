use crate::db::connection::DbState;
use crate::db::executor::execute_sql;
use crate::error::AppError;
use crate::models::query_result::QueryResult;

#[tauri::command]
pub async fn execute_query(
    sql: String,
    state: tauri::State<'_, DbState>,
) -> Result<QueryResult, AppError> {
    let pool_guard = state.pool.lock().await;
    let pool = pool_guard
        .as_ref()
        .ok_or_else(|| AppError::Connection("No database connected".to_string()))?;

    execute_sql(pool, &sql).await
}

#[tauri::command]
pub async fn connect_database(
    connection_string: String,
    state: tauri::State<'_, DbState>,
) -> Result<String, AppError> {
    state
        .connect(&connection_string)
        .await
        .map_err(|e| AppError::Connection(e.to_string()))?;

    // Return the database type for UI feedback
    let db_type = if connection_string.starts_with("postgres://")
        || connection_string.starts_with("postgresql://")
    {
        "PostgreSQL"
    } else {
        "SQLite"
    };

    Ok(db_type.to_string())
}
