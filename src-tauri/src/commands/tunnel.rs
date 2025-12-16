use crate::tunnel::manager::SshTunnelManager;
use crate::tunnel::config::SshTunnelConfig;
use crate::tunnel::ssh::TunnelState;
use crate::error::AppError;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TunnelStatus {
    pub local_port: u16,
    pub state: String,
}

#[tauri::command]
pub async fn create_ssh_tunnel(
    workspace_id: String,
    config: SshTunnelConfig,
    state: tauri::State<'_, SshTunnelManager>,
) -> Result<u16, AppError> {
    let local_port = state.create_tunnel(&workspace_id, &config).await?;
    Ok(local_port)
}

#[tauri::command]
pub async fn close_ssh_tunnel(
    workspace_id: String,
    state: tauri::State<'_, SshTunnelManager>,
) -> Result<(), AppError> {
    state.close_tunnel(&workspace_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_tunnel_status(
    workspace_id: String,
    state: tauri::State<'_, SshTunnelManager>,
) -> Result<Option<TunnelStatus>, AppError> {
    if let Some(tunnel) = state.get_tunnel(&workspace_id).await {
        let tunnel_state = tunnel.state().await;
        let state_str = match tunnel_state {
            TunnelState::Connecting => "Connecting",
            TunnelState::Connected => "Connected",
            TunnelState::Disconnected => "Disconnected",
            TunnelState::Error => "Error",
        };

        Ok(Some(TunnelStatus {
            local_port: tunnel.local_port(),
            state: state_str.to_string(),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn test_ssh_connection(config: SshTunnelConfig) -> Result<String, AppError> {
    use crate::tunnel::ssh::SshTunnel;

    // Try to connect
    let tunnel = SshTunnel::connect(&config).await?;
    let local_port = tunnel.local_port();

    // Close immediately after testing
    tunnel.close().await?;

    Ok(format!("SSH connection successful. Local port: {}", local_port))
}
