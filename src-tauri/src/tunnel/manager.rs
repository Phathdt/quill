use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::error::AppError;
use super::ssh::SshTunnel;
use super::config::SshTunnelConfig;

pub struct SshTunnelManager {
    tunnels: Arc<RwLock<HashMap<String, Arc<SshTunnel>>>>,
}

impl SshTunnelManager {
    pub fn new() -> Self {
        Self {
            tunnels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_tunnel(
        &self,
        workspace_id: &str,
        config: &SshTunnelConfig,
    ) -> Result<u16, AppError> {
        // Close existing tunnel if any
        if self.has_tunnel(workspace_id).await {
            self.close_tunnel(workspace_id).await?;
        }

        // Create new tunnel
        let tunnel = SshTunnel::connect(config).await?;
        let local_port = tunnel.local_port();

        // Store tunnel
        let mut tunnels = self.tunnels.write().await;
        tunnels.insert(workspace_id.to_string(), Arc::new(tunnel));

        Ok(local_port)
    }

    pub async fn get_tunnel(&self, workspace_id: &str) -> Option<Arc<SshTunnel>> {
        let tunnels = self.tunnels.read().await;
        tunnels.get(workspace_id).cloned()
    }

    pub async fn get_local_port(&self, workspace_id: &str) -> Option<u16> {
        let tunnel = self.get_tunnel(workspace_id).await?;
        Some(tunnel.local_port())
    }

    pub async fn close_tunnel(&self, workspace_id: &str) -> Result<(), AppError> {
        let mut tunnels = self.tunnels.write().await;

        if let Some(tunnel) = tunnels.remove(workspace_id) {
            tunnel.close().await?;
        }

        Ok(())
    }

    pub async fn has_tunnel(&self, workspace_id: &str) -> bool {
        let tunnels = self.tunnels.read().await;
        tunnels.contains_key(workspace_id)
    }
}

impl Default for SshTunnelManager {
    fn default() -> Self {
        Self::new()
    }
}
