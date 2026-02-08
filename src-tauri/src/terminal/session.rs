use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use portable_pty::{Child, MasterPty, PtySize};
use tauri::{AppHandle, Emitter};
use tracing::{debug, warn};

use super::error::TerminalError;

fn clone_session_reader(
    master: &Arc<Mutex<Box<dyn MasterPty + Send>>>,
) -> Result<Box<dyn Read + Send>, TerminalError> {
    let locked_master = master
        .lock()
        .map_err(|e| TerminalError::ReaderInitFailed(e.to_string()))?;
    locked_master
        .try_clone_reader()
        .map_err(|e| TerminalError::ReaderInitFailed(e.to_string()))
}

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
    ) -> Result<Self, TerminalError> {
        let master = Arc::new(Mutex::new(master));
        let session_id = id.clone();

        let mut reader = clone_session_reader(&master)?;

        let reader_handle = std::thread::spawn(move || {
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

        Ok(Self {
            id,
            child,
            writer,
            master,
            reader_handle: Some(reader_handle),
        })
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

#[cfg(test)]
mod tests {
    use std::io;
    use std::sync::Arc;

    use anyhow::{anyhow, Error};
    use portable_pty::{MasterPty, PtySize};

    use super::{clone_session_reader, TerminalError};

    struct WorkingMaster;

    impl MasterPty for WorkingMaster {
        fn resize(&self, _size: PtySize) -> Result<(), Error> {
            Ok(())
        }

        fn get_size(&self) -> Result<PtySize, Error> {
            Ok(PtySize::default())
        }

        fn try_clone_reader(&self) -> Result<Box<dyn io::Read + Send>, Error> {
            Ok(Box::new(io::Cursor::new(Vec::<u8>::new())))
        }

        fn take_writer(&self) -> Result<Box<dyn io::Write + Send>, Error> {
            Ok(Box::new(io::sink()))
        }

        #[cfg(unix)]
        fn process_group_leader(&self) -> Option<std::os::raw::c_int> {
            None
        }

        #[cfg(unix)]
        fn as_raw_fd(&self) -> Option<portable_pty::unix::RawFd> {
            None
        }

        #[cfg(unix)]
        fn tty_name(&self) -> Option<std::path::PathBuf> {
            None
        }
    }

    struct FailingMaster;

    impl MasterPty for FailingMaster {
        fn resize(&self, _size: PtySize) -> Result<(), Error> {
            Ok(())
        }

        fn get_size(&self) -> Result<PtySize, Error> {
            Ok(PtySize::default())
        }

        fn try_clone_reader(&self) -> Result<Box<dyn io::Read + Send>, Error> {
            Err(anyhow!("reader clone failed"))
        }

        fn take_writer(&self) -> Result<Box<dyn io::Write + Send>, Error> {
            Ok(Box::new(io::sink()))
        }

        #[cfg(unix)]
        fn process_group_leader(&self) -> Option<std::os::raw::c_int> {
            None
        }

        #[cfg(unix)]
        fn as_raw_fd(&self) -> Option<portable_pty::unix::RawFd> {
            None
        }

        #[cfg(unix)]
        fn tty_name(&self) -> Option<std::path::PathBuf> {
            None
        }
    }

    #[test]
    fn test_clone_session_reader_maps_clone_failure() {
        let master = Arc::new(std::sync::Mutex::new(
            Box::new(FailingMaster) as Box<dyn MasterPty + Send>
        ));

        let result = clone_session_reader(&master);
        assert!(matches!(result, Err(TerminalError::ReaderInitFailed(_))));
    }

    #[test]
    fn test_clone_session_reader_maps_poisoned_lock() {
        let master = Arc::new(std::sync::Mutex::new(
            Box::new(WorkingMaster) as Box<dyn MasterPty + Send>
        ));
        let poisoned = Arc::clone(&master);

        let _ = std::thread::spawn(move || {
            let _guard = poisoned.lock().expect("lock should succeed");
            panic!("poison lock for test");
        })
        .join();

        let result = clone_session_reader(&master);
        assert!(matches!(result, Err(TerminalError::ReaderInitFailed(_))));
    }
}
