use base64::{engine::general_purpose, Engine as _};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use serde_json::Value;
use sqlx::mysql::MySqlRow;
use sqlx::{Row, ValueRef};

/// Extract a value from a MySQL row
pub fn extract_mysql_value(row: &MySqlRow, i: usize) -> Value {
    match row.try_get_raw(i) {
        Ok(raw_value) => {
            if raw_value.is_null() {
                return Value::Null;
            }

            // Try common MySQL types
            if let Ok(v) = row.try_get::<bool, _>(i) {
                return serde_json::json!(v);
            }
            if let Ok(v) = row.try_get::<i8, _>(i) {
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
            if let Ok(v) = row.try_get::<u8, _>(i) {
                return serde_json::json!(v);
            }
            if let Ok(v) = row.try_get::<u16, _>(i) {
                return serde_json::json!(v);
            }
            if let Ok(v) = row.try_get::<u32, _>(i) {
                return serde_json::json!(v);
            }
            if let Ok(v) = row.try_get::<u64, _>(i) {
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
            if let Ok(v) = row.try_get::<NaiveDate, _>(i) {
                return serde_json::json!(v.format("%Y-%m-%d").to_string());
            }
            if let Ok(v) = row.try_get::<NaiveTime, _>(i) {
                return serde_json::json!(v.format("%H:%M:%S%.3f").to_string());
            }
            // Handle JSON types
            if let Ok(v) = row.try_get::<Value, _>(i) {
                return v;
            }
            // Handle binary data (BLOB, BINARY, VARBINARY)
            if let Ok(v) = row.try_get::<Vec<u8>, _>(i) {
                return serde_json::json!(general_purpose::STANDARD.encode(v));
            }
            Value::Null
        }
        Err(_) => Value::Null,
    }
}
