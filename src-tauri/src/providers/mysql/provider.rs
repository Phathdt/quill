use async_trait::async_trait;
use serde_json::Value;
use sqlx::mysql::{MySqlConnectOptions, MySqlPool, MySqlPoolOptions, MySqlSslMode};
use sqlx::{Arguments, Column as SqlxColumn, Row, TypeInfo};
use std::str::FromStr;
use std::time::Instant;

use super::schema::{get_mysql_primary_keys, get_mysql_table_structure, get_mysql_tables};
use super::types::extract_mysql_value;
use crate::commands::schema::TableStructure;
use crate::error::AppError;
use crate::models::query_result::{Column, QueryResult};
use crate::providers::{
    ConnectionConfig, ConnectionInfo, DatabaseParadigm, DatabaseProvider, ProviderType,
    SqlProvider,
};

/// MySQL database provider
pub struct MySqlProvider {
    pool: MySqlPool,
    database_name: Option<String>,
}

impl MySqlProvider {
    /// Connect to a MySQL database
    pub async fn connect(config: ConnectionConfig) -> Result<Self, AppError> {
        let mut options = MySqlConnectOptions::from_str(&config.connection_string)
            .map_err(|e| AppError::Connection(format!("Invalid MySQL connection string: {}", e)))?;

        // Apply SSL configuration if provided
        if let Some(ssl) = config.ssl_config {
            let mode = match ssl.mode.as_str() {
                "disable" => MySqlSslMode::Disabled,
                "prefer" => MySqlSslMode::Preferred,
                "require" => MySqlSslMode::Required,
                "verify-ca" => MySqlSslMode::VerifyCa,
                "verify-identity" => MySqlSslMode::VerifyIdentity,
                _ => MySqlSslMode::Preferred,
            };
            options = options.ssl_mode(mode);

            if let Some(root_cert) = ssl.root_cert_path {
                options = options.ssl_ca(&root_cert);
            }

            if let Some(client_cert) = ssl.client_cert_path {
                options = options.ssl_client_cert(&client_cert);
            }

            if let Some(client_key) = ssl.client_key_path {
                options = options.ssl_client_key(&client_key);
            }
        }

        // Set charset to utf8mb4
        options = options.charset("utf8mb4");

        let database_name = options.get_database().map(|s| s.to_string());

        let pool = MySqlPoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| AppError::Connection(e.to_string()))?;

        Ok(Self {
            pool,
            database_name,
        })
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

    /// Add a JSON value to MySQL query arguments
    fn add_value_to_args(args: &mut sqlx::mysql::MySqlArguments, value: &Value) {
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
            Value::Array(_) | Value::Object(_) => args.add(serde_json::to_string(value).unwrap()),
        };
    }
}

#[async_trait]
impl DatabaseProvider for MySqlProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Mysql
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
            provider_type: ProviderType::Mysql,
            host: None,
            database: self.database_name.clone(),
        }
    }
}

#[async_trait]
impl SqlProvider for MySqlProvider {
    async fn execute_query(&self, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let query = sqlx::query(sql);

        let is_select = sql.trim().to_uppercase().starts_with("SELECT")
            || sql.trim().to_uppercase().starts_with("EXPLAIN")
            || sql.trim().to_uppercase().starts_with("SHOW")
            || sql.trim().to_uppercase().starts_with("WITH")
            || sql.trim().to_uppercase().starts_with("DESCRIBE")
            || sql.trim().to_uppercase().starts_with("DESC");

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
                    let value = extract_mysql_value(row, i);
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
        get_mysql_tables(&self.pool).await
    }

    async fn get_table_structure(&self, table_name: &str) -> Result<TableStructure, AppError> {
        get_mysql_table_structure(&self.pool, table_name).await
    }

    async fn get_primary_keys(&self, table_name: &str) -> Result<Vec<String>, AppError> {
        get_mysql_primary_keys(&self.pool, table_name).await
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

        let columns: Vec<String> = values.iter().map(|(col, _)| format!("`{}`", col)).collect();
        let placeholders: Vec<String> = values.iter().map(|_| "?".to_string()).collect();

        let sql = format!(
            "INSERT INTO `{}` ({}) VALUES ({})",
            table_name,
            columns.join(", "),
            placeholders.join(", ")
        );

        let mut args = sqlx::mysql::MySqlArguments::default();
        for (_, val) in values {
            Self::add_value_to_args(&mut args, val);
        }

        let query = sqlx::query_with(&sql, args);
        let result = query.execute(&self.pool).await?;

        // Get the inserted row using LAST_INSERT_ID() if available
        let primary_keys = self.get_primary_keys(table_name).await?;
        if primary_keys.len() == 1 {
            let pk_col = &primary_keys[0];
            let last_id = result.last_insert_id();

            let select_sql = format!("SELECT * FROM `{}` WHERE `{}` = ?", table_name, pk_col);
            let rows = sqlx::query(&select_sql)
                .bind(last_id)
                .fetch_all(&self.pool)
                .await?;

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
                    let value = extract_mysql_value(row, i);
                    result_row.push(value);
                }
                result_rows.push(result_row);
            }

            Ok(QueryResult {
                columns,
                rows: result_rows,
                rows_affected: 1,
                execution_time_ms: 0,
                total_count: None,
            })
        } else {
            // If no single primary key, just return success
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                rows_affected: result.rows_affected(),
                execution_time_ms: 0,
                total_count: None,
            })
        }
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
            .map(|(col, _)| format!("`{}` = ?", col))
            .collect();

        let where_clauses: Vec<String> = primary_keys
            .iter()
            .map(|(col, _)| format!("`{}` = ?", col))
            .collect();

        let sql = format!(
            "UPDATE `{}` SET {} WHERE {}",
            table_name,
            set_clauses.join(", "),
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::mysql::MySqlArguments::default();
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
            .map(|(col, _)| format!("`{}` = ?", col))
            .collect();

        let sql = format!(
            "DELETE FROM `{}` WHERE {}",
            table_name,
            where_clauses.join(" AND ")
        );

        let mut args = sqlx::mysql::MySqlArguments::default();
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
                .map(|(col, _)| format!("`{}` = ?", col))
                .collect();

            let sql = format!(
                "DELETE FROM `{}` WHERE {}",
                table_name,
                where_clauses.join(" AND ")
            );

            let mut args = sqlx::mysql::MySqlArguments::default();
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
