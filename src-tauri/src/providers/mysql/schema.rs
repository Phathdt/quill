use crate::commands::schema::{ForeignKey, TableColumn, TableIndex, TableStructure};
use crate::error::AppError;
use sqlx::{MySqlPool, Row};

/// Get the structure of a MySQL table
pub async fn get_mysql_table_structure(
    pool: &MySqlPool,
    table_name: &str,
) -> Result<TableStructure, AppError> {
    // Get columns with primary key information
    let columns_query = r#"
        SELECT
            c.COLUMN_NAME as column_name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE as is_nullable,
            c.COLUMN_DEFAULT as column_default,
            c.EXTRA as extra,
            CASE WHEN k.CONSTRAINT_NAME = 'PRIMARY' THEN 1 ELSE 0 END as is_primary_key
        FROM information_schema.COLUMNS c
        LEFT JOIN information_schema.KEY_COLUMN_USAGE k
            ON k.TABLE_SCHEMA = c.TABLE_SCHEMA
            AND k.TABLE_NAME = c.TABLE_NAME
            AND k.COLUMN_NAME = c.COLUMN_NAME
            AND k.CONSTRAINT_NAME = 'PRIMARY'
        WHERE c.TABLE_SCHEMA = DATABASE()
            AND c.TABLE_NAME = ?
        ORDER BY c.ORDINAL_POSITION
    "#;

    let column_rows = sqlx::query(columns_query)
        .bind(table_name)
        .fetch_all(pool)
        .await?;

    let columns: Vec<TableColumn> = column_rows
        .iter()
        .map(|row| {
            let is_nullable: String = row.get("is_nullable");
            let is_primary: i32 = row.get("is_primary_key");
            TableColumn {
                name: row.get("column_name"),
                data_type: row.get("data_type"),
                nullable: is_nullable == "YES",
                default_value: row.get("column_default"),
                is_primary_key: is_primary == 1,
            }
        })
        .collect();

    // Get indexes
    let indexes_query = r#"
        SELECT
            s.INDEX_NAME as name,
            GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX) as columns,
            s.NON_UNIQUE as non_unique,
            s.INDEX_TYPE as index_type
        FROM information_schema.STATISTICS s
        WHERE s.TABLE_SCHEMA = DATABASE()
            AND s.TABLE_NAME = ?
        GROUP BY s.INDEX_NAME, s.NON_UNIQUE, s.INDEX_TYPE
    "#;

    let index_rows = sqlx::query(indexes_query)
        .bind(table_name)
        .fetch_all(pool)
        .await?;

    let indexes: Vec<TableIndex> = index_rows
        .iter()
        .map(|row| {
            let name: String = row.get("name");
            let columns_str: String = row.get("columns");
            let non_unique: i64 = row.get("non_unique");
            let columns: Vec<String> = columns_str.split(',').map(|s| s.to_string()).collect();

            TableIndex {
                name: name.clone(),
                columns,
                is_unique: non_unique == 0,
                is_primary: name == "PRIMARY",
                index_type: row.get("index_type"),
                definition: Some(format!("INDEX {} ({})", name, columns_str)),
            }
        })
        .collect();

    // Get foreign keys
    let fk_query = r#"
        SELECT
            k.CONSTRAINT_NAME as name,
            k.COLUMN_NAME as column_name,
            k.REFERENCED_TABLE_NAME as references_table,
            k.REFERENCED_COLUMN_NAME as references_column
        FROM information_schema.KEY_COLUMN_USAGE k
        JOIN information_schema.REFERENTIAL_CONSTRAINTS r
            ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
            AND r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
        WHERE k.TABLE_SCHEMA = DATABASE()
            AND k.TABLE_NAME = ?
            AND k.REFERENCED_TABLE_NAME IS NOT NULL
    "#;

    let fk_rows = sqlx::query(fk_query).bind(table_name).fetch_all(pool).await?;

    let foreign_keys: Vec<ForeignKey> = fk_rows
        .iter()
        .map(|row| ForeignKey {
            name: row.get("name"),
            column: row.get("column_name"),
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

/// Get list of all tables in the current MySQL database
pub async fn get_mysql_tables(pool: &MySqlPool) -> Result<Vec<String>, AppError> {
    let query = r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY table_name
    "#;

    let rows = sqlx::query_scalar::<_, String>(query)
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

/// Get primary key columns for a MySQL table
pub async fn get_mysql_primary_keys(
    pool: &MySqlPool,
    table_name: &str,
) -> Result<Vec<String>, AppError> {
    let query = r#"
        SELECT COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND CONSTRAINT_NAME = 'PRIMARY'
        ORDER BY ORDINAL_POSITION
    "#;

    let rows = sqlx::query_scalar::<_, String>(query)
        .bind(table_name)
        .fetch_all(pool)
        .await?;
    Ok(rows)
}
