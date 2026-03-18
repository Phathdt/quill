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
            total_count: None,
        })
    } else {
        let result = query.execute(pool).await?;
        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
            total_count: None,
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
            total_count: None,
        })
    } else {
        let result = query.execute(pool).await?;
        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: start.elapsed().as_millis() as u64,
            total_count: None,
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

pub fn extract_postgres_value(row: &sqlx::postgres::PgRow, i: usize) -> serde_json::Value {
    use base64::{engine::general_purpose, Engine as _};
    use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
    use rust_decimal::Decimal;
    use uuid::Uuid;

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
            // Handle NUMERIC/DECIMAL type (preserves precision, avoids float rounding)
            if let Ok(v) = row.try_get::<Decimal, _>(i) {
                return serde_json::json!(v.to_string());
            }
            // Handle UUID type (must come before String to avoid binary decode failure)
            if let Ok(v) = row.try_get::<Uuid, _>(i) {
                return serde_json::json!(v.to_string());
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
            if let Ok(v) = row.try_get::<serde_json::Value, _>(i) {
                return v;
            }
            if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                return serde_json::json!(general_purpose::STANDARD.encode(v));
            }
            // Fallback for custom types (ENUMs, etc.): decode raw bytes as UTF-8
            if let Ok(raw) = row.try_get_raw(i) {
                use sqlx::ValueRef;
                if let Ok(bytes) = <&[u8] as sqlx::Decode<sqlx::Postgres>>::decode(raw) {
                    if let Ok(s) = std::str::from_utf8(bytes) {
                        return serde_json::json!(s);
                    }
                }
            }
            serde_json::Value::Null
        }
        Err(_) => serde_json::Value::Null,
    }
}

async fn execute_count_sqlite(pool: &sqlx::SqlitePool, sql: &str) -> Result<i64, AppError> {
    let row = sqlx::query(sql).fetch_one(pool).await?;
    Ok(row.try_get::<i64, _>(0).unwrap_or(0))
}

async fn execute_count_postgres(pool: &sqlx::PgPool, sql: &str) -> Result<i64, AppError> {
    let row = sqlx::query(sql).fetch_one(pool).await?;
    Ok(row.try_get::<i64, _>(0).unwrap_or(0))
}

pub async fn execute_sql_with_count(
    pool: &DbPool,
    sql: &str,
    count_sql: Option<&str>,
) -> Result<QueryResult, AppError> {
    let total_count = if let Some(count_query) = count_sql {
        match pool {
            DbPool::Sqlite(p) => Some(execute_count_sqlite(p, count_query).await?),
            DbPool::Postgres(p) => Some(execute_count_postgres(p, count_query).await?),
        }
    } else {
        None
    };

    let mut result = execute_sql(pool, sql).await?;
    result.total_count = total_count;
    Ok(result)
}
