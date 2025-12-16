use async_trait::async_trait;
use crate::error::AppError;
use crate::models::query_result::QueryResult;
use crate::commands::schema::TableStructure;
use serde_json::Value;

/// SQL-specific provider trait
#[async_trait]
pub trait SqlProvider: Send + Sync {
    /// Execute a SQL query and return results
    async fn execute_query(&self, sql: &str) -> Result<QueryResult, AppError>;

    /// Execute a SQL query with count query for pagination
    async fn execute_query_with_count(
        &self,
        sql: &str,
        count_sql: Option<&str>,
    ) -> Result<QueryResult, AppError>;

    /// Execute a SQL command (INSERT, UPDATE, DELETE) and return rows affected
    async fn execute_command(&self, sql: &str) -> Result<u64, AppError>;

    /// Get list of all tables in the database
    async fn get_tables(&self) -> Result<Vec<String>, AppError>;

    /// Get detailed structure of a table (columns, indexes, foreign keys)
    async fn get_table_structure(&self, table_name: &str) -> Result<TableStructure, AppError>;

    /// Get primary key columns for a table
    async fn get_primary_keys(&self, table_name: &str) -> Result<Vec<String>, AppError>;

    /// Insert a new row into a table
    async fn insert_row(
        &self,
        table_name: &str,
        values: &[(String, Value)],
    ) -> Result<QueryResult, AppError>;

    /// Update a row in a table
    async fn update_row(
        &self,
        table_name: &str,
        primary_keys: &[(String, Value)],
        updates: &[(String, Value)],
    ) -> Result<u64, AppError>;

    /// Delete a single row from a table
    async fn delete_row(
        &self,
        table_name: &str,
        primary_keys: &[(String, Value)],
    ) -> Result<u64, AppError>;

    /// Delete multiple rows from a table
    async fn delete_rows(
        &self,
        table_name: &str,
        rows: &[Vec<(String, Value)>],
    ) -> Result<u64, AppError>;
}
