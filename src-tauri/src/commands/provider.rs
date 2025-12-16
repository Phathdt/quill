// Commands using the new provider architecture
use crate::error::AppError;
use crate::models::query_result::QueryResult;
use crate::providers::{
    ConnectionConfig, DatabaseProvider, ProviderRegistry, ProviderType, SslConfig,
};
use crate::commands::schema::TableStructure;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnectOptions {
    pub connection_string: String,
    #[serde(rename = "sslConfig")]
    pub ssl_config: Option<SslConfig>,
}

/// Connect using new provider architecture
#[tauri::command]
pub async fn provider_connect(
    workspace_id: String,
    options: ProviderConnectOptions,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<String, AppError> {
    let config = ConnectionConfig {
        connection_string: options.connection_string,
        ssl_config: options.ssl_config,
    };

    let provider_type = state.connect(&workspace_id, config).await?;

    Ok(match provider_type {
        ProviderType::Postgres => "PostgreSQL",
        ProviderType::Sqlite => "SQLite",
        ProviderType::Mysql => "MySQL",
    }
    .to_string())
}

/// Disconnect using new provider architecture
#[tauri::command]
pub async fn provider_disconnect(
    workspace_id: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<(), AppError> {
    state.disconnect(&workspace_id).await
}

/// Check connection status using new provider architecture
#[tauri::command]
pub async fn provider_is_connected(
    workspace_id: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<bool, AppError> {
    Ok(state.is_connected(&workspace_id).await)
}

/// Get provider type for a workspace
#[tauri::command]
pub async fn provider_get_type(
    workspace_id: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<Option<String>, AppError> {
    if let Some(provider) = state.get(&workspace_id).await {
        Ok(Some(
            match provider.provider_type() {
                ProviderType::Postgres => "postgres",
                ProviderType::Sqlite => "sqlite",
                ProviderType::Mysql => "mysql",
            }
            .to_string(),
        ))
    } else {
        Ok(None)
    }
}

/// Test connection using new provider architecture
#[tauri::command]
pub async fn provider_test_connection(options: ProviderConnectOptions) -> Result<String, AppError> {
    use crate::providers::{MySqlProvider, PostgresProvider, SqliteProvider};

    let config = ConnectionConfig {
        connection_string: options.connection_string.clone(),
        ssl_config: options.ssl_config,
    };

    // Determine provider type and test
    let (provider_name, result) = if options.connection_string.starts_with("postgresql://")
        || options.connection_string.starts_with("postgres://")
    {
        let provider = PostgresProvider::connect(config).await?;
        provider.ping().await?;
        provider.close().await?;
        ("PostgreSQL", "connection successful")
    } else if options.connection_string.starts_with("mysql://") {
        let provider = MySqlProvider::connect(config).await?;
        provider.ping().await?;
        provider.close().await?;
        ("MySQL", "connection successful")
    } else {
        let provider = SqliteProvider::connect(config).await?;
        provider.ping().await?;
        provider.close().await?;
        ("SQLite", "connection successful")
    };

    Ok(format!("{} {}", provider_name, result))
}

/// Execute query using new provider architecture
#[tauri::command]
pub async fn provider_execute_query(
    workspace_id: String,
    sql: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<QueryResult, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    provider.execute_query(&sql).await
}

/// Execute query with count using new provider architecture
#[tauri::command]
pub async fn provider_execute_query_with_count(
    workspace_id: String,
    sql: String,
    count_sql: Option<String>,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<QueryResult, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    provider
        .execute_query_with_count(&sql, count_sql.as_deref())
        .await
}

/// Get tables list using new provider architecture
#[tauri::command]
pub async fn provider_get_tables(
    workspace_id: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<Vec<String>, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    provider.get_tables().await
}

/// Get table structure using new provider architecture
#[tauri::command]
pub async fn provider_get_table_structure(
    workspace_id: String,
    table_name: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<TableStructure, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    provider.get_table_structure(&table_name).await
}

/// Get primary key columns using new provider architecture
#[tauri::command]
pub async fn provider_get_primary_key(
    workspace_id: String,
    table_name: String,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<Vec<String>, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    provider.get_primary_keys(&table_name).await
}

// Row management commands
#[derive(Debug, Deserialize)]
pub struct ColumnValue {
    pub column: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct PrimaryKeyValue {
    pub column: String,
    pub value: serde_json::Value,
}

/// Insert row using new provider architecture
#[tauri::command]
pub async fn provider_insert_row(
    workspace_id: String,
    table_name: String,
    values: Vec<ColumnValue>,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<QueryResult, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    let values: Vec<(String, serde_json::Value)> =
        values.into_iter().map(|v| (v.column, v.value)).collect();

    provider.insert_row(&table_name, &values).await
}

/// Update row using new provider architecture
#[tauri::command]
pub async fn provider_update_row(
    workspace_id: String,
    table_name: String,
    primary_keys: Vec<PrimaryKeyValue>,
    updates: Vec<ColumnValue>,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<u64, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    let primary_keys: Vec<(String, serde_json::Value)> = primary_keys
        .into_iter()
        .map(|pk| (pk.column, pk.value))
        .collect();

    let updates: Vec<(String, serde_json::Value)> =
        updates.into_iter().map(|u| (u.column, u.value)).collect();

    provider
        .update_row(&table_name, &primary_keys, &updates)
        .await
}

/// Delete row using new provider architecture
#[tauri::command]
pub async fn provider_delete_row(
    workspace_id: String,
    table_name: String,
    primary_keys: Vec<PrimaryKeyValue>,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<u64, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    let primary_keys: Vec<(String, serde_json::Value)> = primary_keys
        .into_iter()
        .map(|pk| (pk.column, pk.value))
        .collect();

    provider.delete_row(&table_name, &primary_keys).await
}

/// Delete multiple rows using new provider architecture
#[tauri::command]
pub async fn provider_delete_rows(
    workspace_id: String,
    table_name: String,
    rows: Vec<Vec<PrimaryKeyValue>>,
    state: tauri::State<'_, ProviderRegistry>,
) -> Result<u64, AppError> {
    let provider = state
        .get_sql(&workspace_id)
        .await
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    let rows: Vec<Vec<(String, serde_json::Value)>> = rows
        .into_iter()
        .map(|row| row.into_iter().map(|pk| (pk.column, pk.value)).collect())
        .collect();

    provider.delete_rows(&table_name, &rows).await
}
