use crate::db::connection::{DbPool, MultiDbState};
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize)]
pub struct ImportPreview {
    pub headers: Vec<String>,
    pub sample_rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: usize,
    pub detected_types: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ColumnMapping {
    pub source_column: String,
    pub target_column: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportOptions {
    pub file_path: String,
    pub file_type: String, // "csv" or "json"
    pub table_name: String,
    pub column_mappings: Vec<ColumnMapping>,
    pub skip_errors: bool,
    pub batch_size: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub total_rows: usize,
    pub imported_rows: usize,
    pub failed_rows: usize,
    pub errors: Vec<ImportError>,
}

#[derive(Debug, Serialize)]
pub struct ImportError {
    pub row_number: usize,
    pub error: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ImportProgress {
    pub processed: usize,
    pub imported: usize,
    pub failed: usize,
}

#[tauri::command]
pub async fn preview_import_file(
    file_path: String,
    file_type: String,
) -> Result<ImportPreview, AppError> {
    match file_type.as_str() {
        "csv" => preview_csv(&file_path).await,
        "json" => preview_json(&file_path).await,
        _ => Err(AppError::Import("Unsupported file type".to_string())),
    }
}

async fn preview_csv(file_path: &str) -> Result<ImportPreview, AppError> {
    let mut reader = csv::Reader::from_path(file_path)
        .map_err(|e| AppError::Import(format!("Failed to read CSV: {}", e)))?;

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| AppError::Import(format!("Failed to read headers: {}", e)))?
        .iter()
        .map(|s| s.to_string())
        .collect();

    let mut sample_rows = Vec::new();
    let mut total_rows = 0;

    for (i, result) in reader.records().enumerate() {
        total_rows += 1;
        if i < 10 {
            // Preview first 10 rows
            let record = result
                .map_err(|e| AppError::Import(format!("Row {} error: {}", i + 1, e)))?;
            let row: Vec<serde_json::Value> = record
                .iter()
                .map(|s| serde_json::Value::String(s.to_string()))
                .collect();
            sample_rows.push(row);
        }
    }

    // Detect types from sample data
    let detected_types = detect_column_types(&sample_rows, headers.len());

    Ok(ImportPreview {
        headers,
        sample_rows,
        total_rows,
        detected_types,
    })
}

async fn preview_json(file_path: &str) -> Result<ImportPreview, AppError> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| AppError::Import(format!("Failed to read JSON: {}", e)))?;

    let data: Vec<serde_json::Map<String, serde_json::Value>> = serde_json::from_str(&content)
        .map_err(|e| AppError::Import(format!("Invalid JSON: {}", e)))?;

    if data.is_empty() {
        return Err(AppError::Import("JSON file is empty".to_string()));
    }

    // Extract headers from first object
    let headers: Vec<String> = data[0].keys().cloned().collect();

    // Sample rows
    let sample_rows: Vec<Vec<serde_json::Value>> = data
        .iter()
        .take(10)
        .map(|obj| {
            headers
                .iter()
                .map(|h| obj.get(h).cloned().unwrap_or(serde_json::Value::Null))
                .collect()
        })
        .collect();

    let detected_types = detect_column_types(&sample_rows, headers.len());

    Ok(ImportPreview {
        headers,
        sample_rows,
        total_rows: data.len(),
        detected_types,
    })
}

fn detect_column_types(rows: &[Vec<serde_json::Value>], col_count: usize) -> Vec<String> {
    (0..col_count)
        .map(|i| {
            let values: Vec<&serde_json::Value> = rows.iter().filter_map(|r| r.get(i)).collect();
            infer_type(&values)
        })
        .collect()
}

fn infer_type(values: &[&serde_json::Value]) -> String {
    if values.is_empty() {
        return "TEXT".to_string();
    }

    let mut has_number = false;
    let mut has_bool = false;

    for value in values {
        match value {
            serde_json::Value::Number(_) => has_number = true,
            serde_json::Value::Bool(_) => has_bool = true,
            _ => {}
        }
    }

    if has_number && !has_bool {
        "NUMERIC".to_string()
    } else if has_bool && !has_number {
        "BOOLEAN".to_string()
    } else {
        "TEXT".to_string()
    }
}

#[tauri::command]
pub async fn import_data(
    workspace_id: String,
    options: ImportOptions,
    state: tauri::State<'_, MultiDbState>,
    window: tauri::Window,
) -> Result<ImportResult, AppError> {
    let conns = state.connections.read().await;
    let conn_info = conns
        .get(&workspace_id)
        .ok_or_else(|| AppError::Connection("Not connected".to_string()))?;

    let batch_size = options.batch_size.unwrap_or(100);
    let mut result = ImportResult {
        total_rows: 0,
        imported_rows: 0,
        failed_rows: 0,
        errors: Vec::new(),
    };

    match options.file_type.as_str() {
        "csv" => {
            import_csv(&conn_info.pool, &options, &mut result, batch_size, &window).await?;
        }
        "json" => {
            import_json(&conn_info.pool, &options, &mut result, batch_size, &window).await?;
        }
        _ => return Err(AppError::Import("Unsupported file type".to_string())),
    }

    Ok(result)
}

async fn import_csv(
    pool: &DbPool,
    options: &ImportOptions,
    result: &mut ImportResult,
    batch_size: usize,
    window: &tauri::Window,
) -> Result<(), AppError> {
    let mut reader = csv::Reader::from_path(&options.file_path)
        .map_err(|e| AppError::Import(format!("Failed to read CSV: {}", e)))?;

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| AppError::Import(e.to_string()))?
        .iter()
        .map(|s| s.to_string())
        .collect();

    // Build column index mapping
    let source_indices: Vec<usize> = options
        .column_mappings
        .iter()
        .filter_map(|m| headers.iter().position(|h| h == &m.source_column))
        .collect();

    let target_columns: Vec<&str> = options
        .column_mappings
        .iter()
        .map(|m| m.target_column.as_str())
        .collect();

    let mut batch = Vec::new();
    let mut row_num = 0;

    for record_result in reader.records() {
        row_num += 1;
        result.total_rows += 1;

        match record_result {
            Ok(record) => {
                let values: Vec<serde_json::Value> = source_indices
                    .iter()
                    .filter_map(|&i| {
                        record
                            .get(i)
                            .map(|s| serde_json::Value::String(s.to_string()))
                    })
                    .collect();
                batch.push((row_num, values));
            }
            Err(e) => {
                result.failed_rows += 1;
                result.errors.push(ImportError {
                    row_number: row_num,
                    error: e.to_string(),
                });
                if !options.skip_errors {
                    return Err(AppError::Import(format!("Row {} error: {}", row_num, e)));
                }
            }
        }

        // Process batch
        if batch.len() >= batch_size {
            let imported =
                insert_batch(pool, &options.table_name, &target_columns, &batch, result).await?;
            result.imported_rows += imported;
            batch.clear();

            // Emit progress event
            let _ = window.emit(
                "import-progress",
                ImportProgress {
                    processed: result.total_rows,
                    imported: result.imported_rows,
                    failed: result.failed_rows,
                },
            );
        }
    }

    // Process remaining batch
    if !batch.is_empty() {
        let imported =
            insert_batch(pool, &options.table_name, &target_columns, &batch, result).await?;
        result.imported_rows += imported;
    }

    Ok(())
}

async fn import_json(
    pool: &DbPool,
    options: &ImportOptions,
    result: &mut ImportResult,
    batch_size: usize,
    window: &tauri::Window,
) -> Result<(), AppError> {
    let content = std::fs::read_to_string(&options.file_path)
        .map_err(|e| AppError::Import(format!("Failed to read JSON: {}", e)))?;

    let data: Vec<serde_json::Map<String, serde_json::Value>> = serde_json::from_str(&content)
        .map_err(|e| AppError::Import(format!("Invalid JSON: {}", e)))?;

    let source_columns: Vec<&str> = options
        .column_mappings
        .iter()
        .map(|m| m.source_column.as_str())
        .collect();

    let target_columns: Vec<&str> = options
        .column_mappings
        .iter()
        .map(|m| m.target_column.as_str())
        .collect();

    let mut batch = Vec::new();

    for (row_num, obj) in data.iter().enumerate() {
        result.total_rows += 1;

        let values: Vec<serde_json::Value> = source_columns
            .iter()
            .map(|&col| obj.get(col).cloned().unwrap_or(serde_json::Value::Null))
            .collect();

        batch.push((row_num + 1, values));

        // Process batch
        if batch.len() >= batch_size {
            let imported =
                insert_batch(pool, &options.table_name, &target_columns, &batch, result).await?;
            result.imported_rows += imported;
            batch.clear();

            // Emit progress event
            let _ = window.emit(
                "import-progress",
                ImportProgress {
                    processed: result.total_rows,
                    imported: result.imported_rows,
                    failed: result.failed_rows,
                },
            );
        }
    }

    // Process remaining batch
    if !batch.is_empty() {
        let imported =
            insert_batch(pool, &options.table_name, &target_columns, &batch, result).await?;
        result.imported_rows += imported;
    }

    Ok(())
}

async fn insert_batch(
    pool: &DbPool,
    table_name: &str,
    columns: &[&str],
    batch: &[(usize, Vec<serde_json::Value>)],
    _result: &mut ImportResult,
) -> Result<usize, AppError> {
    if batch.is_empty() {
        return Ok(0);
    }

    // Build column list
    let column_list = columns.join(", ");

    match pool {
        DbPool::Postgres(pg_pool) => {
            // Build multi-row INSERT for PostgreSQL
            let mut placeholders = Vec::new();
            let mut values = Vec::new();
            let mut param_idx = 1;

            for (_, row) in batch {
                let row_placeholders: Vec<String> = (0..row.len())
                    .map(|_| {
                        let placeholder = format!("${}", param_idx);
                        param_idx += 1;
                        placeholder
                    })
                    .collect();
                placeholders.push(format!("({})", row_placeholders.join(", ")));

                for val in row {
                    values.push(json_to_sql_value(val));
                }
            }

            let sql = format!(
                "INSERT INTO {} ({}) VALUES {}",
                table_name,
                column_list,
                placeholders.join(", ")
            );

            let mut query = sqlx::query(&sql);
            for value in values {
                query = query.bind(value);
            }

            query
                .execute(pg_pool)
                .await
                .map_err(|e| AppError::Import(format!("Batch insert failed: {}", e)))?;

            Ok(batch.len())
        }
        DbPool::Sqlite(sqlite_pool) => {
            // Build multi-row INSERT for SQLite
            let mut placeholders = Vec::new();
            let mut values = Vec::new();

            for (_, row) in batch {
                let row_placeholders: Vec<&str> = (0..row.len()).map(|_| "?").collect();
                placeholders.push(format!("({})", row_placeholders.join(", ")));

                for val in row {
                    values.push(json_to_sql_value(val));
                }
            }

            let sql = format!(
                "INSERT INTO {} ({}) VALUES {}",
                table_name,
                column_list,
                placeholders.join(", ")
            );

            let mut query = sqlx::query(&sql);
            for value in values {
                query = query.bind(value);
            }

            query
                .execute(sqlite_pool)
                .await
                .map_err(|e| AppError::Import(format!("Batch insert failed: {}", e)))?;

            Ok(batch.len())
        }
    }
}

fn json_to_sql_value(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => String::new(),
        _ => val.to_string(),
    }
}
