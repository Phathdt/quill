use crate::db::connection::{DbPool, MultiDbState};
use crate::error::AppError;
use serde::Serialize;
use sqlx::Row;

/// Validate identifier name to prevent SQL injection in SQLite PRAGMA queries.
/// SQLite identifiers can contain letters, digits, underscores, and dollar signs.
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableColumn {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub default_value: Option<String>,
    pub is_primary_key: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableIndex {
    pub name: String,
    pub columns: Vec<String>,
    pub is_unique: bool,
    pub is_primary: bool,
    pub index_type: String,
    pub definition: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKey {
    pub name: String,
    pub column: String,
    pub references_table: String,
    pub references_column: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableStructure {
    pub table_name: String,
    pub columns: Vec<TableColumn>,
    pub indexes: Vec<TableIndex>,
    pub foreign_keys: Vec<ForeignKey>,
}

#[tauri::command]
pub async fn get_table_structure(
    workspace_id: String,
    table_name: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<TableStructure, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            // Get columns with primary key information
            let columns_query = r#"
                SELECT
                    c.column_name,
                    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                    c.is_nullable,
                    c.column_default,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
                FROM information_schema.columns c
                JOIN pg_attribute a ON a.attrelid = $1::regclass
                    AND a.attname = c.column_name
                    AND a.attnum > 0
                    AND NOT a.attisdropped
                LEFT JOIN (
                    SELECT a.attname as column_name
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = $1::regclass AND i.indisprimary
                ) pk ON pk.column_name = c.column_name
                WHERE c.table_schema = 'public' AND c.table_name = $1
                ORDER BY c.ordinal_position
            "#;

            let column_rows = sqlx::query(columns_query)
                .bind(&table_name)
                .fetch_all(pool)
                .await?;

            let columns: Vec<TableColumn> = column_rows
                .iter()
                .map(|row| TableColumn {
                    name: row.get("column_name"),
                    data_type: row.get("data_type"),
                    nullable: row.get::<String, _>("is_nullable") == "YES",
                    default_value: row.get("column_default"),
                    is_primary_key: row.get("is_primary_key"),
                })
                .collect();

            // Get indexes
            let indexes_query = r#"
                SELECT
                    i.indexname as name,
                    array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
                    ix.indisunique as is_unique,
                    ix.indisprimary as is_primary,
                    am.amname as index_type,
                    pg_get_indexdef(ix.indexrelid) as definition
                FROM pg_indexes i
                JOIN pg_class c ON c.relname = i.indexname
                JOIN pg_index ix ON ix.indexrelid = c.oid
                JOIN pg_am am ON am.oid = c.relam
                JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
                WHERE i.tablename = $1 AND i.schemaname = 'public'
                GROUP BY i.indexname, ix.indisunique, ix.indisprimary, am.amname, ix.indexrelid
            "#;

            let index_rows = sqlx::query(indexes_query)
                .bind(&table_name)
                .fetch_all(pool)
                .await?;

            let indexes: Vec<TableIndex> = index_rows
                .iter()
                .map(|row| TableIndex {
                    name: row.get("name"),
                    columns: row.get("columns"),
                    is_unique: row.get("is_unique"),
                    is_primary: row.get("is_primary"),
                    index_type: row.get("index_type"),
                    definition: row.get("definition"),
                })
                .collect();

            // Get foreign keys
            let fk_query = r#"
                SELECT
                    conname as name,
                    a.attname as column,
                    confrelid::regclass::text as references_table,
                    af.attname as references_column
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
                WHERE c.conrelid = $1::regclass AND c.contype = 'f'
            "#;

            let fk_rows = sqlx::query(fk_query)
                .bind(&table_name)
                .fetch_all(pool)
                .await?;

            let foreign_keys: Vec<ForeignKey> = fk_rows
                .iter()
                .map(|row| ForeignKey {
                    name: row.get("name"),
                    column: row.get("column"),
                    references_table: row.get("references_table"),
                    references_column: row.get("references_column"),
                })
                .collect();

            Ok(TableStructure {
                table_name,
                columns,
                indexes,
                foreign_keys,
            })
        }
        DbPool::Sqlite(pool) => {
            // Validate table name to prevent SQL injection
            validate_identifier(&table_name)?;

            // Get columns
            let table_info_query = format!("PRAGMA table_info(\"{}\")", table_name);
            let column_rows = sqlx::query(&table_info_query).fetch_all(pool).await?;

            let columns: Vec<TableColumn> = column_rows
                .iter()
                .map(|row| TableColumn {
                    name: row.get("name"),
                    data_type: row.get("type"),
                    nullable: row.get::<i64, _>("notnull") == 0,
                    default_value: row.get("dflt_value"),
                    is_primary_key: row.get::<i64, _>("pk") > 0,
                })
                .collect();

            // Get indexes
            let index_list_query = format!("PRAGMA index_list(\"{}\")", table_name);
            let index_rows = sqlx::query(&index_list_query).fetch_all(pool).await?;

            let mut indexes = Vec::new();
            for idx_row in index_rows {
                let idx_name: String = idx_row.get("name");
                let is_unique: i64 = idx_row.get("unique");
                let origin: String = idx_row.get("origin");

                // Get index columns - idx_name comes from SQLite so already validated
                validate_identifier(&idx_name)?;
                let index_info_query = format!("PRAGMA index_info(\"{}\")", idx_name);
                let col_rows = sqlx::query(&index_info_query).fetch_all(pool).await?;

                let columns: Vec<String> = col_rows
                    .iter()
                    .map(|row| row.get("name"))
                    .collect();

                indexes.push(TableIndex {
                    name: idx_name.clone(),
                    columns,
                    is_unique: is_unique == 1,
                    is_primary: origin == "pk",
                    index_type: "btree".to_string(), // SQLite uses B-tree
                    definition: None,
                });
            }

            // Get foreign keys
            let fk_query = format!("PRAGMA foreign_key_list(\"{}\")", table_name);
            let fk_rows = sqlx::query(&fk_query).fetch_all(pool).await?;

            let foreign_keys: Vec<ForeignKey> = fk_rows
                .iter()
                .map(|row| {
                    let id: i64 = row.get("id");
                    ForeignKey {
                        name: format!("fk_{}", id),
                        column: row.get("from"),
                        references_table: row.get("table"),
                        references_column: row.get("to"),
                    }
                })
                .collect();

            Ok(TableStructure {
                table_name,
                columns,
                indexes,
                foreign_keys,
            })
        }
    }
}

#[tauri::command]
pub async fn get_tables_list(
    workspace_id: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<Vec<String>, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            let query = r#"
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            "#;

            let rows = sqlx::query(query).fetch_all(pool).await?;
            Ok(rows.iter().map(|row| row.get("table_name")).collect())
        }
        DbPool::Sqlite(pool) => {
            let query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
            let rows = sqlx::query(query).fetch_all(pool).await?;
            Ok(rows.iter().map(|row| row.get("name")).collect())
        }
    }
}

#[tauri::command]
pub async fn get_primary_key(
    workspace_id: String,
    table_name: String,
    state: tauri::State<'_, MultiDbState>,
) -> Result<Vec<String>, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Workspace not connected".to_string()))?;

    match &conn_info.pool {
        DbPool::Postgres(pool) => {
            let sql = r#"
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid
                    AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = $1::regclass
                AND i.indisprimary
            "#;
            let rows = sqlx::query_scalar::<_, String>(sql)
                .bind(&table_name)
                .fetch_all(pool)
                .await?;
            Ok(rows)
        }
        DbPool::Sqlite(pool) => {
            // Validate table name to prevent SQL injection
            validate_identifier(&table_name)?;
            let sql = format!("PRAGMA table_info(\"{}\")", table_name);
            let rows = sqlx::query(&sql).fetch_all(pool).await?;

            let pk_cols: Vec<String> = rows
                .iter()
                .filter_map(|row| {
                    let pk: i64 = row.get("pk");
                    if pk > 0 {
                        Some(row.get("name"))
                    } else {
                        None
                    }
                })
                .collect();

            Ok(pk_cols)
        }
    }
}
