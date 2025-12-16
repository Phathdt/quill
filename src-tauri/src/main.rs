// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod models;

use db::connection::MultiDbState;

fn main() {
    tauri::Builder::default()
        .manage(MultiDbState::new())
        .invoke_handler(tauri::generate_handler![
            commands::query::execute_query,
            commands::query::execute_query_with_count,
            commands::query::connect_workspace,
            commands::query::disconnect_workspace,
            commands::query::get_workspace_connection_status,
            commands::query::test_connection,
            commands::schema::get_table_structure,
            commands::schema::get_tables_list,
            commands::schema::get_primary_key,
            commands::query::insert_row,
            commands::query::delete_row,
            commands::query::delete_rows,
            commands::query::update_row,
            commands::import::preview_import_file,
            commands::import::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
