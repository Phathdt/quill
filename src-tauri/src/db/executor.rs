use crate::db::connection::DbPool;
use crate::error::AppError;
use crate::models::query_result::{Column, QueryResult};
use sqlx::{Column as SqlxColumn, Row, TypeInfo, ValueRef};
use std::time::Instant;

pub async fn execute_sql(pool: &DbPool, sql: &str) -> Result<QueryResult, AppError> {
    match pool {
        DbPool::Sqlite(sqlite_pool) => execute_sqlite(sqlite_pool, sql).await,
        DbPool::Postgres(pg_pool) => execute_postgres(pg_pool, sql).await,
    }
}

async fn execute_sqlite(pool: &sqlx::SqlitePool, sql: &str) -> Result<QueryResult, AppError> {
    let start = Instant::now();
    let query = sqlx::query(sql);

    let is_select = sql.trim().to_uppercase().starts_with("SELECT")
        || sql.trim().to_uppercase().starts_with("PRAGMA")
        || sql.trim().to_uppercase().starts_with("EXPLAIN");

    if is_select {
        let rows = query.fetch_all(pool).await?;

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
                let value = extract_sqlite_value(row, i);
                result_row.push(value);
            }
            result_rows.push(result_row);
        }

        Ok(QueryResult {
            columns,
            rows: result_rows,
            rows_affected: 0,
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    } else {
        let result = query.execute(pool).await?;
        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

async fn execute_postgres(pool: &sqlx::PgPool, sql: &str) -> Result<QueryResult, AppError> {
    let start = Instant::now();
    let query = sqlx::query(sql);

    let is_select = sql.trim().to_uppercase().starts_with("SELECT")
        || sql.trim().to_uppercase().starts_with("EXPLAIN")
        || sql.trim().to_uppercase().starts_with("SHOW")
        || sql.trim().to_uppercase().starts_with("WITH");

    if is_select {
        let rows = query.fetch_all(pool).await?;

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
                let value = extract_postgres_value(row, i);
                result_row.push(value);
            }
            result_rows.push(result_row);
        }

        Ok(QueryResult {
            columns,
            rows: result_rows,
            rows_affected: 0,
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    } else {
        let result = query.execute(pool).await?;
        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

fn extract_sqlite_value(row: &sqlx::sqlite::SqliteRow, i: usize) -> serde_json::Value {
    use base64::{engine::general_purpose, Engine as _};

    match row.try_get_raw(i) {
        Ok(raw_value) => {
            if raw_value.is_null() {
                serde_json::Value::Null
            } else if let Ok(v) = row.try_get::<i64, _>(i) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<f64, _>(i) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<String, _>(i) {
                serde_json::json!(v)
            } else if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                serde_json::json!(general_purpose::STANDARD.encode(v))
            } else {
                serde_json::Value::Null
            }
        }
        Err(_) => serde_json::Value::Null,
    }
}

fn extract_postgres_value(row: &sqlx::postgres::PgRow, i: usize) -> serde_json::Value {
    use base64::{engine::general_purpose, Engine as _};

    match row.try_get_raw(i) {
        Ok(raw_value) => {
            if raw_value.is_null() {
                return serde_json::Value::Null;
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
            if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                return serde_json::json!(general_purpose::STANDARD.encode(v));
            }
            // Fallback: try to get as string representation
            serde_json::Value::Null
        }
        Err(_) => serde_json::Value::Null,
    }
}
