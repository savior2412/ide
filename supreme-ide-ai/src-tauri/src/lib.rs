#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![open_folder, open_file, open_file_dialog, save_file, save_as_file])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

use tauri::command;
use tauri_plugin_dialog::DialogExt;
use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

fn read_dir_recursive(path: &str) -> Vec<FileEntry> {
    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(path) {
        for entry in read_dir.flatten() {
            let path_buf = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = path_buf.is_dir();
            let children = if is_dir {
                Some(read_dir_recursive(path_buf.to_string_lossy().as_ref()))
            } else {
                None
            };
            entries.push(FileEntry {
                name,
                path: path_buf.to_string_lossy().to_string(),
                is_dir,
                children,
            });
        }
    }
    entries
}

#[command]
async fn open_folder(app: tauri::AppHandle) -> Result<Vec<FileEntry>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    if let Some(folder) = folder {
        let folder_path = PathBuf::from(folder.to_string());
        let entries = read_dir_recursive(folder_path.to_string_lossy().as_ref());
        Ok(entries)
    } else {
        Err("No folder selected".to_string())
    }
}

#[command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<(String, String), String> {
    let file = app.dialog().file().blocking_pick_file();
    if let Some(file) = file {
        let file_path = PathBuf::from(file.to_string());
        let path = file_path.to_string_lossy().to_string();
        match fs::read_to_string(&path) {
            Ok(content) => Ok((path, content)),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("No file selected".to_string())
    }
}

#[command]
async fn open_file(path: String) -> Result<String, String> {
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[command]
async fn save_as_file(app: tauri::AppHandle, content: String) -> Result<String, String> {
    let file = app.dialog().file().set_title("Save As").blocking_save_file();
    if let Some(file) = file {
        let file_path = PathBuf::from(file.to_string());
        let path = file_path.to_string_lossy().to_string();
        match fs::write(&path, content) {
            Ok(_) => Ok(path),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("No file selected".to_string())
    }
}
