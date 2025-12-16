use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SshAuthMethod {
    Password { password: String },
    PrivateKey {
        #[serde(rename = "privateKeyPath")]
        private_key_path: String,
        passphrase: Option<String>,
    },
    Agent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshTunnelConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: SshAuthMethod,
    pub remote_host: String,
    pub remote_port: u16,
    pub local_port: Option<u16>,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

fn default_timeout() -> u64 {
    30
}
