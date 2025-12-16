use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Query error: {0}")]
    Query(String),
    #[error("Connection error: {0}")]
    Connection(String),
    #[error("Import error: {0}")]
    Import(String),
    #[error("SSH tunnel error: {0}")]
    SshTunnel(String),
    #[error("IO error: {0}")]
    Io(String),
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<ssh2::Error> for AppError {
    fn from(err: ssh2::Error) -> Self {
        AppError::SshTunnel(err.to_string())
    }
}
