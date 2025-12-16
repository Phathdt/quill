use serde::{Deserialize, Serialize};

/// Provider types supported
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Postgres,
    Sqlite,
    Mysql,
}

/// Database paradigm
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseParadigm {
    Sql,
    Document,
}

/// Unified result type for all database operations
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ProviderResult {
    /// SQL query results (SELECT)
    Query(QueryResultData),
    /// Command execution result (INSERT, UPDATE, DELETE, DDL)
    Command(CommandResult),
    /// Empty result
    Empty(EmptyResult),
}

/// SQL query result with rows and columns
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResultData {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: u64,
    pub execution_time_ms: u64,
    pub provider_type: ProviderType,
    pub total_count: Option<i64>,
}

/// Column metadata
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub type_name: String,
    pub nullable: Option<bool>,
    pub is_primary_key: Option<bool>,
}

/// Command execution result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub rows_affected: u64,
    pub execution_time_ms: u64,
    pub provider_type: ProviderType,
    pub message: Option<String>,
}

/// Empty result
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmptyResult {
    pub execution_time_ms: u64,
    pub provider_type: ProviderType,
    pub message: Option<String>,
}

/// Connection info for display
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInfo {
    pub provider_type: ProviderType,
    pub paradigm: DatabaseParadigm,
    pub display_name: String,
    pub version: Option<String>,
    pub database_name: Option<String>,
}

// Conversion from old QueryResult to new format
impl From<crate::models::query_result::QueryResult> for QueryResultData {
    fn from(old: crate::models::query_result::QueryResult) -> Self {
        QueryResultData {
            columns: old
                .columns
                .into_iter()
                .map(|c| ColumnInfo {
                    name: c.name,
                    type_name: c.type_name,
                    nullable: None,
                    is_primary_key: None,
                })
                .collect(),
            rows: old.rows,
            total_rows: old.rows_affected,
            execution_time_ms: old.execution_time_ms,
            provider_type: ProviderType::Postgres, // default, will be set correctly by provider
            total_count: old.total_count,
        }
    }
}
