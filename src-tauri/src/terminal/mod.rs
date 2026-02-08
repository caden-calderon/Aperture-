mod error;
mod session;

use std::collections::HashMap;
use std::sync::Mutex;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, State};
use tracing::{debug, info};
use uuid::Uuid;

use error::TerminalError;
use session::TerminalSession;

pub struct TerminalState {
    sessions: Mutex<HashMap<String, TerminalSession>>,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

impl TerminalState {
    pub fn new() -> Self {
        Self::default()
    }
}

/// Detect user's shell from $SHELL or fall back to /bin/sh.
fn detect_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
}

#[tauri::command]
pub fn spawn_shell(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, TerminalError> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: rows.unwrap_or(24),
            cols: cols.unwrap_or(80),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| TerminalError::SpawnFailed(e.to_string()))?;

    let shell = detect_shell();
    info!("Spawning shell: {shell}");

    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");

    // Inherit HOME so shell config loads
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", &home);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| TerminalError::SpawnFailed(e.to_string()))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| TerminalError::SpawnFailed(e.to_string()))?;

    let session_id = Uuid::new_v4().to_string();
    let session = TerminalSession::new(session_id.clone(), child, writer, pair.master, app)?;

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| TerminalError::SpawnFailed(e.to_string()))?;
    sessions.insert(session_id.clone(), session);

    debug!("Terminal session created: {session_id}");
    Ok(session_id)
}

#[tauri::command]
pub fn send_input(
    state: State<'_, TerminalState>,
    session_id: String,
    data: String,
) -> Result<(), TerminalError> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| TerminalError::WriteFailed(e.to_string()))?;

    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.clone()))?;

    session.write(&data).map_err(TerminalError::WriteFailed)
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), TerminalError> {
    if cols == 0 || rows == 0 || cols > 500 || rows > 500 {
        return Err(TerminalError::ResizeFailed(format!(
            "Invalid dimensions: {cols}x{rows} (must be 1-500)"
        )));
    }

    let sessions = state
        .sessions
        .lock()
        .map_err(|e| TerminalError::ResizeFailed(e.to_string()))?;

    let session = sessions
        .get(&session_id)
        .ok_or_else(|| TerminalError::SessionNotFound(session_id.clone()))?;

    session
        .resize(cols, rows)
        .map_err(TerminalError::ResizeFailed)?;

    debug!("Resized {session_id}: {cols}x{rows}");
    Ok(())
}

#[tauri::command]
pub fn kill_session(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<(), TerminalError> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| TerminalError::SessionNotFound(e.to_string()))?;

    if let Some(mut session) = sessions.remove(&session_id) {
        session.kill();
        debug!("Terminal session killed: {session_id}");
        Ok(())
    } else {
        Err(TerminalError::SessionNotFound(session_id))
    }
}
