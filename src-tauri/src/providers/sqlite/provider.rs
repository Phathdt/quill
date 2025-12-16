use async_trait::async_trait;
use base64::{engine::general_purpose, Engine as _};
use serde_json::Value;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::{Arguments, Column as SqlxColumn, Row, TypeInfo, ValueRef};
use std::time::Instant;

use crate::commands::schema::{ForeignKey, TableColumn, TableIndex, TableStructure};
use crate::error::AppError;
use crate::models::query_result::{Column, QueryResult};
use crate::providers::{
    ConnectionConfig, ConnectionInfo, DatabaseParadigm, DatabaseProvider, ProviderType,
    SqlProvider,
};

/// SQLite database provider
pub struct SqliteProvider {
    pool: SqlitePool,
}

impl SqliteProvider {
    /// Connect to a SQLite database
    pub async fn connect(config: ConnectionConfig) -> Result<Self, AppError> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&config.connection_string)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;

        Ok(Self { pool })
    }

    /// Extract a value from a SQLite row
    fn extract_value(row: &sqlx::sqlite::SqliteRow, i: usize) -> Value {
        match row.try_get_raw(i) {
            Ok(raw_value) => {
                if raw_value.is_null() {
                    Value::Null
                } else if let Ok(v) = row.try_get::<i64, _>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.try_get::<f64, _>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.try_get::<String, _>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                    serde_json::json!(general_purpose::STANDARD.encode(v))
                } else {
                    Value::Null
                }
            }
            Err(_) => Value::Null,
        }
    }

    /// Validate identifier to prevent SQL injection
    fn validate_identifier(name: &str) -> Result<(), AppError> {
        if name.is_empty() {
            return Err(AppError::Query("Identifier cannot be empty".to_string()));
        }

        let first = name.chars().next().unwrap();
        if first.is_ascii_digit() {
            return Err(AppError::Query(
                "Identifier cannot start with a digit".to_string(),
            ));
        }

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

    /// Add a JSON value to SQLite query arguments
    fn add_value_to_args(args: &mut sqlx::sqlite::SqliteArguments, value: &Value) {
        match value {
            Value::Null => args.add(None::<String>),
            Value::Bool(b) => args.add(*b),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    args.add(i)
                } else if let Some(f) = n.as_f64() {
                    args.add(f)
                } else {
                    args.add(n.to_string())
                }
            }
            Value::String(s) => args.add(s.clone()),
            Value::Array(_) | Value::Object(_) => args.add(value.to_string()),
        };
    }
}

#[async_trait]
impl DatabaseProvider for SqliteProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Sqlite
    }

    fn paradigm(&self) -> DatabaseParadigm {
        DatabaseParadigm::Sql
    }

    async fn ping(&self) -> Result<(), AppError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;
        Ok(())
    }

    async fn close(&self) -> Result<(), AppError> {
        self.pool.close().await;
        Ok(())
    }

    fn connection_info(&self) -> ConnectionInfo {
        ConnectionInfo {
            provider_type: ProviderType::Sqlite,
            host: None,
            database: None,
        }
    }
}

#[async_trait]
impl SqlProvider for SqliteProvider {
    async fn execute_query(&self, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let query = sqlx::query(sql);

        let is_select = sql.trim().to_uppercase().starts_with("SELECT")
            || sql.trim().to_uppercase().starts_with("PRAGMA")
            || sql.trim().to_uppercase().starts_with("EXPLAIN");

        if is_select {
            let rows = query.fetch_all(&self.pool).await?;

            let columns = if let Some(first_row) = rows.first() {
                first_row
                    .columns()
                    .iter()
                    .map(|col| Column {
                        name: col.name().to_string(),
                        type_name: col.type_info().name().to_string(),
                    })
                    .collect()
            } else {
                vec![]
            };

            let mut result_rows = Vec::new();
            for row in &rows {
                let mut result_row = Vec::new();
                for (i, _col) in row.columns().iter().enumerate() {
                    let value = Self::extract_value(row, i);
                    result_row.push(value);
                }
                result_rows.push(result_row);
            }

            Ok(QueryResult {
                columns,
                rows: result_rows,
                rows_affected: 0,
                execution_time_ms: start.elapsed().as_millis() as u64,
                total_count: None,
            })
        } else {
            let result = query.execute(&self.pool).await?;
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                rows_affected: result.rows_affected(),
                execution_time_ms: start.elapsed().as_millis() as u64,
                total_count: None,
            })
        }
    }

    async fn execute_query_with_count(
        &self,
        sql: &str,
        count_sql: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        let total_count = if let Some(count_query) = count_sql {
            let row = sqlx::query(count_query).fetch_one(&self.pool).await?;
            Some(row.try_get::<i64, _>(0).unwrap_or(0))
        } else {
            None
        };

        let mut result = self.execute_query(sql).await?;
        result.total_count = total_count;
        Ok(result)
    }

    async fn execute_command(&self, sql: &str) -> Result<u64, AppError> {
        let result = sqlx::query(sql).execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    async fn get_tables(&self) -> Result<Vec<String>, AppError> {
        let query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
        let rows = sqlx::query(query).fetch_all(&self.pool).await?;
        Ok(rows.iter().map(|row| row.get("name")).collect())
    }

    async fn get_table_structure(&self, table_name: &str) -> Result<TableStructure, AppError> {
        Self::validate_identifier(table_name)?;

        // Get columns
        let table_info_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let column_rows = sqlx::query(&table_info_query)
            .fetch_all(&self.pool)
            .await?;

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
        let index_rows = sqlx::query(&index_list_query)
            .fetch_all(&self.pool)
            .await?;

        let mut indexes = Vec::new();
        for idx_row in index_rows {
            let idx_name: String = idx_row.get("name");
            let is_unique: i64 = idx_row.get("unique");
            let origin: String = idx_row.get("origin");

            Self::validate_identifier(&idx_name)?;
            let index_info_query = format!("PRAGMA index_info(\"{}\")", idx_name);
            let col_rows = sqlx::query(&index_info_query)
                .fetch_all(&self.pool)
                .await?;

            let columns: Vec<String> = col_rows.iter().map(|row| row.get("name")).collect();

            indexes.push(TableIndex {
                name: idx_name.clone(),
                columns,
                is_unique: is_unique == 1,
                is_primary: origin == "pk",
                index_type: "btree".to_string(),
                definition: None,
            });
        }

        // Get foreign keys
        let fk_query = format!("PRAGMA foreign_key_list(\"{}\")", table_name);
        let fk_rows = sqlx::query(&fk_query).fetch_all(&self.pool).await?;

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
            table_name: table_name.to_string(),
            columns,
            indexes,
            foreign_keys,
        })
    }

    async fn get_primary_keys(&self, table_name: &str) -> Result<Vec<String>, AppError> {
        Self::validate_identifier(table_name)?;
        let sql = format!("PRAGMA table_info(\"{}\")", table_name);
        let rows = sqlx::query(&sql).fetch_all(&self.pool).await?;

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

    async fn insert_row(
        &self,
        table_name: &str,
        values: &[(String, Value)],
    ) -> Result<QueryResult, AppError> {
        Self::validate_identifier(table_name)?;
        for (col, _) in values {
            Self::validate_identifier(col)?;
        }

        let columns: Vec<String> = values.iter().map(|(col, _)| format!("\"{}\"", col)).collect();
        let placeholders: Vec<String> = (0..values.len()).map(|_| "?").map(String::from).collect();

        let sql = format!(
            r#"INSERT INTO "{}" ({}) VALUES ({}) RETURNING *"#,
            table_name,
            columns.join(", "),
            placeholders.join(", ")
        );

        let mut args = sqlx::sqlite::SqliteArguments::default();
        for (_, val) in values {
            Self::add_value_to_args(&mut args, val);
        }

        let query = sqlx::query_with(&sql, args);
        let result = query.execute(&self.pool).await?;

        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: 0,
            total_count: None,
        })
    }

    async fn update_row(
        &self,
        table_name: &str,
        primary_keys: &[(String, Value)],
        updates: &[(String, Value)],
    ) -> Result<u64, AppError> {
        Self::validate_identifier(table_name)?;
        for (col, _) in primary_keys {
            Self::validate_identifier(col)?;
        }
        for (col, _) in updates {
            Self::validate_identifier(col)?;
        }

        let set_clauses: Vec<String> = updates
            .iter()
            .map(|(col, _)| format!("\"{}\" = ?", col))
            .collect();

        let where_clauses: Vec<String> = primary_keys
            .iter()
            .map(|(col, _)| format!("\"{}\" = ?", col))
            .collect();

        let sql = format!(
            r#"UPDATE "{}" SET {} WHERE {}"#,
            table_name,
            set_clauses.join(", "),
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::sqlite::SqliteArguments::default();
        for (_, val) in updates {
            Self::add_value_to_args(&mut args, val);
        }
        for (_, val) in primary_keys {
            Self::add_value_to_args(&mut args, val);
        }

        let query = sqlx::query_with(&sql, args);
        let result = query.execute(&self.pool).await?;

        Ok(result.rows_affected())
    }

    async fn delete_row(
        &self,
        table_name: &str,
        primary_keys: &[(String, Value)],
    ) -> Result<u64, AppError> {
        Self::validate_identifier(table_name)?;
        for (col, _) in primary_keys {
            Self::validate_identifier(col)?;
        }

        let where_clauses: Vec<String> = primary_keys
            .iter()
            .map(|(col, _)| format!("\"{}\" = ?", col))
            .collect();

        let sql = format!(
            r#"DELETE FROM "{}" WHERE {}"#,
            table_name,
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::sqlite::SqliteArguments::default();
        for (_, val) in primary_keys {
            Self::add_value_to_args(&mut args, val);
        }

        let query = sqlx::query_with(&sql, args);
        let result = query.execute(&self.pool).await?;

        Ok(result.rows_affected())
    }

    async fn delete_rows(
        &self,
        table_name: &str,
        rows: &[Vec<(String, Value)>],
    ) -> Result<u64, AppError> {
        Self::validate_identifier(table_name)?;
        for pk_row in rows {
            for (col, _) in pk_row {
                Self::validate_identifier(col)?;
            }
        }

        let mut total_affected = 0u64;

        for primary_keys in rows {
            let where_clauses: Vec<String> = primary_keys
                .iter()
                .map(|(col, _)| format!("\"{}\" = ?", col))
                .collect();

            let sql = format!(
                r#"DELETE FROM "{}" WHERE {}"#,
                table_name,
                where_clauses.join(" AND ")
            );

            let mut args = sqlx::sqlite::SqliteArguments::default();
            for (_, val) in primary_keys {
                Self::add_value_to_args(&mut args, val);
            }

            let query = sqlx::query_with(&sql, args);
            let result = query.execute(&self.pool).await?;
            total_affected += result.rows_affected();
        }

        Ok(total_affected)
    }
}
