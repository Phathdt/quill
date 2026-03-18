// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod models;
mod providers;
mod tunnel;

use db::connection::MultiDbState;
use providers::ProviderRegistry;
use tunnel::manager::SshTunnelManager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(MultiDbState::new())
        .manage(ProviderRegistry::new())
        .manage(SshTunnelManager::new())
        .invoke_handler(tauri::generate_handler![
            // Legacy commands (backward compatible)
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
            // New provider-based commands (includes MySQL support)
            commands::provider::provider_connect,
            commands::provider::provider_disconnect,
            commands::provider::provider_is_connected,
            commands::provider::provider_get_type,
            commands::provider::provider_test_connection,
            commands::provider::provider_execute_query,
            commands::provider::provider_execute_query_with_count,
            commands::provider::provider_get_tables,
            commands::provider::provider_get_table_structure,
            commands::provider::provider_get_primary_key,
            commands::provider::provider_insert_row,
            commands::provider::provider_update_row,
            commands::provider::provider_delete_row,
            commands::provider::provider_delete_rows,
            // SSH tunnel commands
            commands::tunnel::create_ssh_tunnel,
            commands::tunnel::close_ssh_tunnel,
            commands::tunnel::get_tunnel_status,
            commands::tunnel::test_ssh_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
