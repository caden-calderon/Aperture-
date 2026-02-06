use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use portable_pty::{Child, MasterPty, PtySize};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, warn};

pub struct TerminalSession {
    #[allow(dead_code)]
    pub id: String,
    child: Box<dyn Child + Send + Sync>,
    writer: Box<dyn Write + Send>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    reader_handle: Option<JoinHandle<()>>,
}

impl TerminalSession {
    pub fn new(
        id: String,
        child: Box<dyn Child + Send + Sync>,
        writer: Box<dyn Write + Send>,
        master: Box<dyn MasterPty + Send>,
        app: AppHandle,
    ) -> Self {
        let master = Arc::new(Mutex::new(master));
        let master_for_reader = Arc::clone(&master);
        let session_id = id.clone();

        let reader_handle = std::thread::spawn(move || {
            let reader = {
                let m = master_for_reader.lock().unwrap();
                match m.try_clone_reader() {
                    Ok(r) => r,
                    Err(e) => {
                        error!("Failed to clone PTY reader for session {session_id}: {e}");
                        return;
                    }
                }
            };

            let mut reader = reader;
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        debug!("PTY EOF for session {session_id}");
                        let _ = app.emit("terminal:exit", &session_id);
                        break;
                    }
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        if let Err(e) = app.emit("terminal:output", (&session_id, &text)) {
                            warn!("Failed to emit terminal output for {session_id}: {e}");
                            break;
                        }
                    }
                    Err(e) => {
                        debug!("PTY read error for session {session_id}: {e}");
                        let _ = app.emit("terminal:exit", &session_id);
                        break;
                    }
                }
            }
        });

        Self {
            id,
            child,
            writer,
            master,
            reader_handle: Some(reader_handle),
        }
    }

    pub fn write(&mut self, data: &str) -> Result<(), String> {
        self.writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        self.writer.flush().map_err(|e| e.to_string())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let master = self.master.lock().map_err(|e| e.to_string())?;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    pub fn kill(&mut self) {
        let _ = self.child.kill();
        if let Some(handle) = self.reader_handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for TerminalSession {
    fn drop(&mut self) {
        self.kill();
    }
}
