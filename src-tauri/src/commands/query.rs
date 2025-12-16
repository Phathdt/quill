use crate::db::connection::{DbPool, MultiDbState, SslConfig};
use crate::db::executor::{execute_sql, execute_sql_with_count};
use crate::error::AppError;
use crate::models::query_result::QueryResult;
use serde::Deserialize;

/// Validate identifier name to prevent SQL injection.
/// Identifiers can contain letters, digits, underscores, and dollar signs.
/// They cannot start with a digit.
fn validate_identifier(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::Query("Identifier cannot be empty".to_string()));
    }

    // Check first character (must not be digit)
    let first = name.chars().next().unwrap();
    if first.is_ascii_digit() {
        return Err(AppError::Query(
            "Identifier cannot start with a digit".to_string(),
        ));
    }

    // Allow only alphanumeric, underscore, and dollar sign
    for c in name.chars() {
        if !c.is_ascii_alphanumeric() && c != '_' && c != '$' {
            return Err(AppError::Query(format!(
                "Invalid character '{}' in identifier",
                c
            )));
        }
    }

    Ok(())
}

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
pub async fn execute_query_with_count(
    workspace_id: String,
    sql: String,
    count_sql: Option<String>,
    state: tauri::State<'_, MultiDbState>,
) -> Result<QueryResult, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    execute_sql_with_count(&conn_info.pool, &sql, count_sql.as_deref()).await
}

#[derive(Debug, Deserialize)]
pub struct ConnectOptions {
    #[serde(rename = "connectionString")]
    pub connection_string: String,
    #[serde(rename = "sslConfig")]
    pub ssl_config: Option<SslConfig>,
}

#[tauri::command]
pub async fn connect_workspace(
    workspace_id: String,
    options: ConnectOptions,
    state: tauri::State<'_, MultiDbState>,
) -> Result<String, AppError> {
    state
        .connect_with_ssl(&workspace_id, &options.connection_string, options.ssl_config)
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
pub async fn test_connection(options: ConnectOptions) -> Result<String, AppError> {
    use sqlx::postgres::{PgPoolOptions, PgConnectOptions, PgSslMode};
    use sqlx::sqlite::SqlitePoolOptions;
    use std::str::FromStr;

    // Detect connection type and test
    if options.connection_string.starts_with("postgresql://") || options.connection_string.starts_with("postgres://") {
        // PostgreSQL with SSL support
        let mut pg_options = PgConnectOptions::from_str(&options.connection_string)
            .map_err(|e| AppError::Connection(e.to_string()))?;

        // Apply SSL configuration
        if let Some(ssl) = options.ssl_config {
            let mode = match ssl.mode.as_str() {
                "disable" => PgSslMode::Disable,
                "prefer" => PgSslMode::Prefer,
                "require" => PgSslMode::Require,
                "verify-ca" => PgSslMode::VerifyCa,
                "verify-full" => PgSslMode::VerifyFull,
                _ => PgSslMode::Prefer,
            };
            pg_options = pg_options.ssl_mode(mode);

            // Set root certificate
            if let Some(root_cert) = ssl.root_cert_path {
                pg_options = pg_options.ssl_root_cert(&root_cert);
            }

            // Client certificate auth
            if let Some(client_cert) = ssl.client_cert_path {
                pg_options = pg_options.ssl_client_cert(&client_cert);
            }
            if let Some(client_key) = ssl.client_key_path {
                pg_options = pg_options.ssl_client_key(&client_key);
            }
        }

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect_with(pg_options)
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
        // SQLite - no SSL
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&options.connection_string)
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

// Row management commands (Phase 2)
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

#[tauri::command]
pub async fn insert_row(
    workspace_id: String,
    table_name: String,
    values: Vec<ColumnValue>,
    state: tauri::State<'_, MultiDbState>,
) -> Result<QueryResult, AppError> {
    // Validate identifiers to prevent SQL injection
    validate_identifier(&table_name)?;
    for val in &values {
        validate_identifier(&val.column)?;
    }

    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            use crate::db::executor::extract_postgres_value;
            use sqlx::{postgres::PgArguments, query::Query, Postgres, Row, Column as SqlxColumn, TypeInfo};

            let columns: Vec<String> = values.iter().map(|v| format!("\"{}\"", v.column)).collect();
            let placeholders: Vec<String> = (1..=values.len()).map(|i| format!("${}", i)).collect();

            let sql = format!(
                r#"INSERT INTO "{}" ({}) VALUES ({}) RETURNING *"#,
                table_name,
                columns.join(", "),
                placeholders.join(", ")
            );

            let mut args = PgArguments::default();
            for val in &values {
                add_value_to_args(&mut args, &val.value);
            }

            let query: Query<Postgres, PgArguments> = sqlx::query_with(&sql, args);
            let rows = query.fetch_all(pool).await?;

            // Convert rows to QueryResult (similar to execute_postgres in executor.rs)
            let columns: Vec<crate::models::query_result::Column> = if let Some(first_row) = rows.first() {
                first_row.columns().iter().map(|col: &<Postgres as sqlx::Database>::Column| crate::models::query_result::Column {
                    name: col.name().to_string(),
                    type_name: col.type_info().name().to_string(),
                }).collect()
            } else {
                vec![]
            };

            // Extract the returned row data
            let mut result_rows = Vec::new();
            for row in &rows {
                let mut result_row = Vec::new();
                for (i, _col) in row.columns().iter().enumerate() {
                    let value = extract_postgres_value(row, i);
                    result_row.push(value);
                }
                result_rows.push(result_row);
            }

            Ok(QueryResult {
                columns,
                rows: result_rows,
                rows_affected: rows.len() as u64,
                execution_time_ms: 0,
                total_count: None,
            })
        }
        DbPool::Sqlite(pool) => {
            use sqlx::{sqlite::SqliteArguments, query::Query, Sqlite};

            let columns: Vec<String> = values.iter().map(|v| format!("\"{}\"", v.column)).collect();
            let placeholders: Vec<String> = (0..values.len()).map(|_| "?").map(String::from).collect();

            let sql = format!(
                r#"INSERT INTO "{}" ({}) VALUES ({}) RETURNING *"#,
                table_name,
                columns.join(", "),
                placeholders.join(", ")
            );

            let mut args = SqliteArguments::default();
            for val in &values {
                add_value_to_sqlite_args(&mut args, &val.value);
            }

            let query: Query<Sqlite, SqliteArguments> = sqlx::query_with(&sql, args);
            let result = query.execute(pool).await?;

            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                rows_affected: result.rows_affected(),
                execution_time_ms: 0,
                total_count: None,
            })
        }
    }
}

#[tauri::command]
pub async fn delete_row(
    workspace_id: String,
    table_name: String,
    primary_keys: Vec<PrimaryKeyValue>,
    state: tauri::State<'_, MultiDbState>,
) -> Result<u64, AppError> {
    // Validate identifiers to prevent SQL injection
    validate_identifier(&table_name)?;
    for pk in &primary_keys {
        validate_identifier(&pk.column)?;
    }

    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            use sqlx::{postgres::PgArguments, query::Query, Postgres};

            let where_clauses: Vec<String> = primary_keys
                .iter()
                .enumerate()
                .map(|(i, pk)| format!("\"{}\" = ${}", pk.column, i + 1))
                .collect();

            let sql = format!(
                r#"DELETE FROM "{}" WHERE {}"#,
                table_name,
                where_clauses.join(" AND ")
            );

            let mut args = PgArguments::default();
            for pk in &primary_keys {
                add_value_to_args(&mut args, &pk.value);
            }

            let query: Query<Postgres, PgArguments> = sqlx::query_with(&sql, args);
            let result = query.execute(pool).await?;
            Ok(result.rows_affected())
        }
        DbPool::Sqlite(pool) => {
            use sqlx::{sqlite::SqliteArguments, query::Query, Sqlite};

            let where_clauses: Vec<String> = primary_keys
                .iter()
                .map(|pk| format!("\"{}\" = ?", pk.column))
                .collect();

            let sql = format!(
                r#"DELETE FROM "{}" WHERE {}"#,
                table_name,
                where_clauses.join(" AND ")
            );

            let mut args = SqliteArguments::default();
            for pk in &primary_keys {
                add_value_to_sqlite_args(&mut args, &pk.value);
            }

            let query: Query<Sqlite, SqliteArguments> = sqlx::query_with(&sql, args);
            let result = query.execute(pool).await?;
            Ok(result.rows_affected())
        }
    }
}

#[tauri::command]
pub async fn delete_rows(
    workspace_id: String,
    table_name: String,
    rows: Vec<Vec<PrimaryKeyValue>>,
    state: tauri::State<'_, MultiDbState>,
) -> Result<u64, AppError> {
    // Validate identifiers to prevent SQL injection
    validate_identifier(&table_name)?;
    for pk_row in &rows {
        for pk in pk_row {
            validate_identifier(&pk.column)?;
        }
    }

    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Not connected".to_string()))?;

    let mut total_affected = 0u64;

    // Batch delete - execute each DELETE separately
    // TODO: Use transaction for atomicity in future
    for primary_keys in rows {
        match &conn_info.pool {
            DbPool::Postgres(pool) => {
                use sqlx::{postgres::PgArguments, query::Query, Postgres};

                let where_clauses: Vec<String> = primary_keys
                    .iter()
                    .enumerate()
                    .map(|(i, pk)| format!("\"{}\" = ${}", pk.column, i + 1))
                    .collect();

                let sql = format!(
                    r#"DELETE FROM "{}" WHERE {}"#,
                    table_name,
                    where_clauses.join(" AND ")
                );

                let mut args = PgArguments::default();
                for pk in &primary_keys {
                    add_value_to_args(&mut args, &pk.value);
                }

                let query: Query<Postgres, PgArguments> = sqlx::query_with(&sql, args);
                let result = query.execute(pool).await?;
                total_affected += result.rows_affected();
            }
            DbPool::Sqlite(pool) => {
                use sqlx::{sqlite::SqliteArguments, query::Query, Sqlite};

                let where_clauses: Vec<String> = primary_keys
                    .iter()
                    .map(|pk| format!("\"{}\" = ?", pk.column))
                    .collect();

                let sql = format!(
                    r#"DELETE FROM "{}" WHERE {}"#,
                    table_name,
                    where_clauses.join(" AND ")
                );

                let mut args = SqliteArguments::default();
                for pk in &primary_keys {
                    add_value_to_sqlite_args(&mut args, &pk.value);
                }

                let query: Query<Sqlite, SqliteArguments> = sqlx::query_with(&sql, args);
                let result = query.execute(pool).await?;
                total_affected += result.rows_affected();
            }
        }
    }

    Ok(total_affected)
}

#[tauri::command]
pub async fn update_row(
    workspace_id: String,
    table_name: String,
    primary_keys: Vec<PrimaryKeyValue>,
    updates: Vec<ColumnValue>,
    state: tauri::State<'_, MultiDbState>,
) -> Result<u64, AppError> {
    // Validate identifiers to prevent SQL injection
    validate_identifier(&table_name)?;
    for pk in &primary_keys {
        validate_identifier(&pk.column)?;
    }
    for upd in &updates {
        validate_identifier(&upd.column)?;
    }

    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            use sqlx::{postgres::PgArguments, query::Query, Postgres};

            // Build SET clause
            let set_clauses: Vec<String> = updates
                .iter()
                .enumerate()
                .map(|(i, col)| format!("\"{}\" = ${}", col.column, i + 1))
                .collect();

            // Build WHERE clause
            let where_clauses: Vec<String> = primary_keys
                .iter()
                .enumerate()
                .map(|(i, pk)| format!("\"{}\" = ${}", pk.column, i + updates.len() + 1))
                .collect();

            let sql = format!(
                r#"UPDATE "{}" SET {} WHERE {}"#,
                table_name,
                set_clauses.join(", "),
                where_clauses.join(" AND ")
            );

            // Build arguments: first updates, then primary keys
            let mut args = PgArguments::default();

            for val in &updates {
                add_value_to_args(&mut args, &val.value);
            }

            for pk in &primary_keys {
                add_value_to_args(&mut args, &pk.value);
            }

            let query: Query<Postgres, PgArguments> = sqlx::query_with(&sql, args);
            let result = query.execute(pool).await?;

            Ok(result.rows_affected())
        }
        DbPool::Sqlite(pool) => {
            use sqlx::{sqlite::SqliteArguments, query::Query, Sqlite};

            // Build SET clause (SQLite uses ? placeholders)
            let set_clauses: Vec<String> = updates
                .iter()
                .map(|col| format!("\"{}\" = ?", col.column))
                .collect();

            // Build WHERE clause
            let where_clauses: Vec<String> = primary_keys
                .iter()
                .map(|pk| format!("\"{}\" = ?", pk.column))
                .collect();

            let sql = format!(
                r#"UPDATE "{}" SET {} WHERE {}"#,
                table_name,
                set_clauses.join(", "),
                where_clauses.join(" AND ")
            );

            // Build arguments: first updates, then primary keys
            let mut args = SqliteArguments::default();

            for val in &updates {
                add_value_to_sqlite_args(&mut args, &val.value);
            }

            for pk in &primary_keys {
                add_value_to_sqlite_args(&mut args, &pk.value);
            }

            let query: Query<Sqlite, SqliteArguments> = sqlx::query_with(&sql, args);
            let result = query.execute(pool).await?;

            Ok(result.rows_affected())
        }
    }
}

// Helper to add JSON value to PostgreSQL arguments
fn add_value_to_args(args: &mut sqlx::postgres::PgArguments, value: &serde_json::Value) {
    use chrono::NaiveDateTime;
    use sqlx::Arguments;
    match value {
        serde_json::Value::Null => args.add(None::<String>),
        serde_json::Value::Bool(b) => args.add(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                args.add(i)
            } else if let Some(f) = n.as_f64() {
                args.add(f)
            } else {
                args.add(n.to_string())
            }
        }
        serde_json::Value::String(s) => {
            // Try to parse as timestamp (format: "2025-12-10 07:48:17.276")
            if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f") {
                args.add(dt)
            } else if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
                args.add(dt)
            } else {
                // Regular string
                args.add(s.clone())
            }
        }
        // Pass JSON objects/arrays directly for JSONB columns
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
            args.add(value.clone())
        }
    };
}

// Helper to add JSON value to SQLite arguments
fn add_value_to_sqlite_args(args: &mut sqlx::sqlite::SqliteArguments, value: &serde_json::Value) {
    use sqlx::Arguments;
    match value {
        serde_json::Value::Null => args.add(None::<String>),
        serde_json::Value::Bool(b) => args.add(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                args.add(i)
            } else if let Some(f) = n.as_f64() {
                args.add(f)
            } else {
                args.add(n.to_string())
            }
        }
        serde_json::Value::String(s) => args.add(s.clone()),
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
            args.add(value.to_string())
        }
    };
}
