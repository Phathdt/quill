use async_trait::async_trait;
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use serde_json::Value;
use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions, PgSslMode};
use sqlx::{Arguments, Column as SqlxColumn, Row, TypeInfo, ValueRef};
use std::str::FromStr;
use std::time::Instant;

use crate::commands::schema::{ForeignKey, TableColumn, TableIndex, TableStructure};
use crate::error::AppError;
use crate::models::query_result::{Column, QueryResult};
use crate::providers::{
    ConnectionConfig, ConnectionInfo, DatabaseParadigm, DatabaseProvider, ProviderType,
    SqlProvider,
};

/// PostgreSQL database provider
pub struct PostgresProvider {
    pool: PgPool,
    database_name: Option<String>,
}

impl PostgresProvider {
    /// Connect to a PostgreSQL database
    pub async fn connect(config: ConnectionConfig) -> Result<Self, AppError> {
        let mut options = PgConnectOptions::from_str(&config.connection_string)
            .map_err(|e| AppError::Connection(e.to_string()))?;

        // Apply SSL configuration if provided
        if let Some(ssl) = config.ssl_config {
            let mode = match ssl.mode.as_str() {
                "disable" => PgSslMode::Disable,
                "prefer" => PgSslMode::Prefer,
                "require" => PgSslMode::Require,
                "verify-ca" => PgSslMode::VerifyCa,
                "verify-full" => PgSslMode::VerifyFull,
                _ => PgSslMode::Prefer,
            };
            options = options.ssl_mode(mode);

            if let Some(root_cert) = ssl.root_cert_path {
                options = options.ssl_root_cert(&root_cert);
            }

            if let Some(client_cert) = ssl.client_cert_path {
                options = options.ssl_client_cert(&client_cert);
            }

            if let Some(client_key) = ssl.client_key_path {
                options = options.ssl_client_key(&client_key);
            }
        }

        let database_name = options.get_database().map(|s| s.to_string());

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;

        Ok(Self {
            pool,
            database_name,
        })
    }

    /// Extract a value from a PostgreSQL row
    fn extract_value(row: &sqlx::postgres::PgRow, i: usize) -> Value {
        match row.try_get_raw(i) {
            Ok(raw_value) => {
                if raw_value.is_null() {
                    return Value::Null;
                }

                // Try common PostgreSQL types
                if let Ok(v) = row.try_get::<bool, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<i16, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<i32, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<i64, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<f32, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<f64, _>(i) {
                    return serde_json::json!(v);
                }
                if let Ok(v) = row.try_get::<String, _>(i) {
                    return serde_json::json!(v);
                }
                // Handle timestamp types
                if let Ok(v) = row.try_get::<NaiveDateTime, _>(i) {
                    return serde_json::json!(v.format("%Y-%m-%d %H:%M:%S%.3f").to_string());
                }
                if let Ok(v) = row.try_get::<DateTime<Utc>, _>(i) {
                    return serde_json::json!(v.format("%Y-%m-%d %H:%M:%S%.3f %Z").to_string());
                }
                if let Ok(v) = row.try_get::<NaiveDate, _>(i) {
                    return serde_json::json!(v.format("%Y-%m-%d").to_string());
                }
                if let Ok(v) = row.try_get::<NaiveTime, _>(i) {
                    return serde_json::json!(v.format("%H:%M:%S%.3f").to_string());
                }
                // Handle JSONB/JSON types
                if let Ok(v) = row.try_get::<Value, _>(i) {
                    return v;
                }
                if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                    return serde_json::json!(general_purpose::STANDARD.encode(v));
                }
                Value::Null
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

    /// Add a JSON value to PostgreSQL query arguments
    fn add_value_to_args(args: &mut sqlx::postgres::PgArguments, value: &Value) {
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
            Value::String(s) => {
                // Try to parse as timestamp
                if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f") {
                    args.add(dt)
                } else if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
                    args.add(dt)
                } else {
                    args.add(s.clone())
                }
            }
            Value::Array(_) | Value::Object(_) => args.add(value.clone()),
        };
    }
}

#[async_trait]
impl DatabaseProvider for PostgresProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Postgres
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
            provider_type: ProviderType::Postgres,
            host: None, // Could parse from connection string if needed
            database: self.database_name.clone(),
        }
    }
}

#[async_trait]
impl SqlProvider for PostgresProvider {
    async fn execute_query(&self, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let query = sqlx::query(sql);

        let is_select = sql.trim().to_uppercase().starts_with("SELECT")
            || sql.trim().to_uppercase().starts_with("EXPLAIN")
            || sql.trim().to_uppercase().starts_with("SHOW")
            || sql.trim().to_uppercase().starts_with("WITH");

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
        let query = r#"
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        "#;

        let rows = sqlx::query(query).fetch_all(&self.pool).await?;
        Ok(rows.iter().map(|row| row.get("table_name")).collect())
    }

    async fn get_table_structure(&self, table_name: &str) -> Result<TableStructure, AppError> {
        // Get columns with primary key information
        let columns_query = r#"
            SELECT
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
            FROM information_schema.columns c
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
            .bind(table_name)
            .fetch_all(&self.pool)
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
            .bind(table_name)
            .fetch_all(&self.pool)
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
            .bind(table_name)
            .fetch_all(&self.pool)
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
            table_name: table_name.to_string(),
            columns,
            indexes,
            foreign_keys,
        })
    }

    async fn get_primary_keys(&self, table_name: &str) -> Result<Vec<String>, AppError> {
        let sql = r#"
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid
                AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass
            AND i.indisprimary
        "#;
        let rows = sqlx::query_scalar::<_, String>(sql)
            .bind(table_name)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
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
        let placeholders: Vec<String> = (1..=values.len()).map(|i| format!("${}", i)).collect();

        let sql = format!(
            r#"INSERT INTO "{}" ({}) VALUES ({}) RETURNING *"#,
            table_name,
            columns.join(", "),
            placeholders.join(", ")
        );

        let mut args = sqlx::postgres::PgArguments::default();
        for (_, val) in values {
            Self::add_value_to_args(&mut args, val);
        }

        let query = sqlx::query_with(&sql, args);
        let rows = query.fetch_all(&self.pool).await?;

        let columns: Vec<Column> = if let Some(first_row) = rows.first() {
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
            rows_affected: rows.len() as u64,
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
            .enumerate()
            .map(|(i, (col, _))| format!("\"{}\" = ${}", col, i + 1))
            .collect();

        let where_clauses: Vec<String> = primary_keys
            .iter()
            .enumerate()
            .map(|(i, (col, _))| format!("\"{}\" = ${}", col, i + updates.len() + 1))
            .collect();

        let sql = format!(
            r#"UPDATE "{}" SET {} WHERE {}"#,
            table_name,
            set_clauses.join(", "),
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::postgres::PgArguments::default();
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
            .enumerate()
            .map(|(i, (col, _))| format!("\"{}\" = ${}", col, i + 1))
            .collect();

        let sql = format!(
            r#"DELETE FROM "{}" WHERE {}"#,
            table_name,
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::postgres::PgArguments::default();
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
                .enumerate()
                .map(|(i, (col, _))| format!("\"{}\" = ${}", col, i + 1))
                .collect();

            let sql = format!(
                r#"DELETE FROM "{}" WHERE {}"#,
                table_name,
                where_clauses.join(" AND ")
            );

            let mut args = sqlx::postgres::PgArguments::default();
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
