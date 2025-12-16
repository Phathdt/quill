use async_ssh2_lite::{AsyncSession, TokioTcpStream};
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, RwLock};
use crate::error::AppError;
use super::config::{SshTunnelConfig, SshAuthMethod};

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
pub enum TunnelState {
    Connecting,
    Connected,
    Disconnected,
    Error,
}

pub struct SshTunnel {
    session: Arc<AsyncSession<TokioTcpStream>>,
    local_port: u16,
    shutdown_tx: broadcast::Sender<()>,
    state: Arc<RwLock<TunnelState>>,
}

impl SshTunnel {
    pub async fn connect(config: &SshTunnelConfig) -> Result<Self, AppError> {
        let state = Arc::new(RwLock::new(TunnelState::Connecting));

        // 1. Connect TCP to SSH server
        let ssh_addr = format!("{}:{}", config.host, config.port);
        let timeout = Duration::from_secs(config.timeout_seconds);

        let tcp_stream = tokio::time::timeout(
            timeout,
            TokioTcpStream::connect(&ssh_addr)
        )
        .await
        .map_err(|_| AppError::SshTunnel(format!("Connection timeout to {}", ssh_addr)))?
        .map_err(|e| AppError::SshTunnel(format!("Failed to connect to SSH server: {}", e)))?;

        // 2. Create AsyncSession and perform handshake
        let mut session = AsyncSession::new(tcp_stream, None)
            .map_err(|e| AppError::SshTunnel(format!("Failed to create SSH session: {}", e)))?;

        session.handshake().await
            .map_err(|e| AppError::SshTunnel(format!("SSH handshake failed: {}", e)))?;

        // 3. Authenticate
        Self::authenticate(&mut session, &config.username, &config.auth).await?;

        // 4. Set up local TCP listener
        let local_addr = if let Some(port) = config.local_port {
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port)
        } else {
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0)
        };

        let listener = TcpListener::bind(local_addr).await
            .map_err(|e| AppError::SshTunnel(format!("Failed to bind local port: {}", e)))?;

        let local_port = listener.local_addr()
            .map_err(|e| AppError::SshTunnel(format!("Failed to get local address: {}", e)))?
            .port();

        let (shutdown_tx, shutdown_rx) = broadcast::channel(1);
        let session = Arc::new(session);

        // 5. Start forwarding task
        let remote_host = config.remote_host.clone();
        let remote_port = config.remote_port;
        let state_clone = state.clone();
        let session_clone = session.clone();

        tokio::spawn(async move {
            Self::forwarding_task(
                listener,
                session_clone,
                remote_host,
                remote_port,
                shutdown_rx,
                state_clone,
            ).await;
        });

        // Mark as connected
        *state.write().await = TunnelState::Connected;

        Ok(Self {
            session,
            local_port,
            shutdown_tx,
            state,
        })
    }

    async fn authenticate(
        session: &mut AsyncSession<TokioTcpStream>,
        username: &str,
        auth: &SshAuthMethod,
    ) -> Result<(), AppError> {
        match auth {
            SshAuthMethod::Password { password } => {
                session.userauth_password(username, password).await
                    .map_err(|e| AppError::SshTunnel(format!("Password authentication failed: {}", e)))?;
            }
            SshAuthMethod::PrivateKey { private_key_path, passphrase } => {
                let key_path = Path::new(private_key_path);
                session.userauth_pubkey_file(
                    username,
                    None,
                    key_path,
                    passphrase.as_deref(),
                ).await
                .map_err(|e| AppError::SshTunnel(format!("Private key authentication failed: {}", e)))?;
            }
            SshAuthMethod::Agent => {
                return Err(AppError::SshTunnel("SSH agent authentication not yet supported".to_string()));
            }
        }

        if !session.authenticated() {
            return Err(AppError::SshTunnel("Authentication failed".to_string()));
        }

        Ok(())
    }

    async fn forwarding_task(
        listener: TcpListener,
        session: Arc<AsyncSession<TokioTcpStream>>,
        remote_host: String,
        remote_port: u16,
        mut shutdown_rx: broadcast::Receiver<()>,
        state: Arc<RwLock<TunnelState>>,
    ) {
        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((local_stream, _)) => {
                            let session_clone = session.clone();
                            let remote_host_clone = remote_host.clone();

                            tokio::spawn(async move {
                                if let Err(e) = Self::forward_connection(
                                    session_clone,
                                    local_stream,
                                    &remote_host_clone,
                                    remote_port,
                                ).await {
                                    eprintln!("Forwarding error: {}", e);
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("Accept error: {}", e);
                            *state.write().await = TunnelState::Error;
                            break;
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    *state.write().await = TunnelState::Disconnected;
                    break;
                }
            }
        }
    }

    async fn forward_connection(
        session: Arc<AsyncSession<TokioTcpStream>>,
        mut local_stream: TcpStream,
        remote_host: &str,
        remote_port: u16,
    ) -> Result<(), AppError> {
        // Create direct-tcpip channel
        let mut channel = session.channel_direct_tcpip(remote_host, remote_port, None).await
            .map_err(|e| AppError::SshTunnel(format!("Failed to create channel: {}", e)))?;

        // Bidirectional copy
        let (mut local_read, mut local_write) = local_stream.split();
        let (mut channel_read, mut channel_write) = tokio::io::split(&mut channel);

        let client_to_server = async {
            let mut buf = vec![0u8; 8192];
            loop {
                match local_read.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        if channel_write.write_all(&buf[..n]).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        };

        let server_to_client = async {
            let mut buf = vec![0u8; 8192];
            loop {
                match channel_read.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        if local_write.write_all(&buf[..n]).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        };

        tokio::select! {
            _ = client_to_server => {},
            _ = server_to_client => {},
        }

        Ok(())
    }

    pub fn local_port(&self) -> u16 {
        self.local_port
    }

    pub async fn state(&self) -> TunnelState {
        *self.state.read().await
    }

    pub async fn close(&self) -> Result<(), AppError> {
        let _ = self.shutdown_tx.send(());
        *self.state.write().await = TunnelState::Disconnected;
        Ok(())
    }
}
