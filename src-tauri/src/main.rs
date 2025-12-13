// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod models;

use db::connection::DbState;

fn main() {
    tauri::Builder::default()
        .manage(DbState::new())
        .invoke_handler(tauri::generate_handler![
            commands::query::execute_query,
            commands::query::connect_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
