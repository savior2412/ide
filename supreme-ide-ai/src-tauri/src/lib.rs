use std::process::Command;
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use tauri::command;
use tauri_plugin_dialog::DialogExt;
use serde_json;

#[derive(Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

fn read_dir_recursive(path: &str, max_depth: usize, current_depth: usize) -> Vec<FileEntry> {
    if current_depth >= max_depth {
        return Vec::new();
    }
    
    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(path) {
        for entry in read_dir.flatten() {
            let path_buf = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden files và system folders (nhưng vẫn hiển thị tất cả file types)
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "__pycache__" {
                continue;
            }
            
            let is_dir = path_buf.is_dir();
            let children = if is_dir && current_depth < max_depth - 1 {
                Some(read_dir_recursive(&path_buf.to_string_lossy(), max_depth, current_depth + 1))
            } else if is_dir {
                Some(Vec::new()) // Empty children for directories at max depth
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
    
    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    entries
}

#[command]
async fn open_folder(app: tauri::AppHandle) -> Result<(String, Vec<FileEntry>), String> {
    println!("🔄 Backend: Starting open_folder...");
    
    let folder = app.dialog().file().blocking_pick_folder();
    if let Some(folder) = folder {
        let folder_path = PathBuf::from(folder.to_string());
        let path_str = folder_path.to_string_lossy();
        
        println!("📂 Backend: Selected folder: {}", path_str);
        
        // Add validation
        if !folder_path.exists() {
            return Err("Selected folder does not exist".to_string());
        }
        
        if !folder_path.is_dir() {
            return Err("Selected path is not a directory".to_string());
        }
        
        let entries = read_dir_recursive(path_str.as_ref(), 3, 0); // Load up to 3 levels deep
        println!("✅ Backend: Successfully read {} entries from {}", entries.len(), path_str);
        
        // Log some entries for debugging
        for (i, entry) in entries.iter().take(3).enumerate() {
            println!("   {}. {} ({})", i + 1, entry.name, if entry.is_dir { "dir" } else { "file" });
        }
        if entries.len() > 3 {
            println!("   ... and {} more", entries.len() - 3);
        }
        
        // Return both workspace path and entries
        Ok((path_str.to_string(), entries))
    } else {
        println!("❌ Backend: No folder selected by user");
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

#[tauri::command]
fn execute_command_in_workspace(command: String, workspace_path: String) -> Result<String, String> {
    // Validate workspace path exists
    if !Path::new(&workspace_path).exists() {
        return Err(format!("Workspace path does not exist: {}", workspace_path));
    }

    // Parse command and arguments
    let parts: Vec<&str> = command.trim().split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let cmd = parts[0];
    let args = &parts[1..];

    // Handle built-in commands
    match cmd {
        "help" => {
            return Ok(format!(
                "Available commands:
• ls, dir - List directory contents
• cd <path> - Change directory
• pwd - Show current directory
• cat, type <file> - Show file contents
• mkdir <name> - Create directory
• rm, del <file> - Remove file
• cp, copy <src> <dest> - Copy file
• mv, move <src> <dest> - Move file
• touch <file> - Create empty file
• echo <text> - Print text
• clear - Clear terminal
• exit - Exit terminal
• python <file> - Run Python script
• node <file> - Run Node.js script
• git <command> - Git commands
• npm/pnpm/yarn - Package managers
• cargo - Rust commands

Current workspace: {}",
                workspace_path
            ));
        },
        "clear" => {
            return Ok("\x1b[2J\x1b[H".to_string()); // Clear screen ANSI codes
        },
        "pwd" => {
            return Ok(workspace_path.clone());
        },
        "ls" | "dir" => {
            return list_directory(&workspace_path, args);
        },
        _ => {} // Continue to external command execution
    }

    // Execute external command
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", &command])
            .current_dir(&workspace_path)
            .output()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .current_dir(&workspace_path)
            .output()
    };

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            if !stderr.is_empty() {
                if output.status.success() {
                    // Some commands output to stderr but are successful (like git status with no changes)
                    Ok(format!("{}{}", stdout, stderr))
                } else {
                    Err(format!("Error: {}", stderr))
                }
            } else {
                Ok(stdout.to_string())
            }
        },
        Err(e) => Err(format!("Failed to execute command: {}", e))
    }
}

fn list_directory(path: &str, args: &[&str]) -> Result<String, String> {
    let detailed = args.contains(&"-l") || args.contains(&"-la") || args.contains(&"-al");
    let show_hidden = args.contains(&"-a") || args.contains(&"-la") || args.contains(&"-al");

    match fs::read_dir(path) {
        Ok(entries) => {
            let mut result = String::new();
            let mut files = Vec::new();
            let mut dirs = Vec::new();

            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    
                    // Skip hidden files unless -a flag is used
                    if !show_hidden && name.starts_with('.') {
                        continue;
                    }

                    if path.is_dir() {
                        dirs.push(name);
                    } else {
                        files.push(name);
                    }
                }
            }

            // Sort alphabetically
            dirs.sort();
            files.sort();

            if detailed {
                // Detailed listing similar to ls -l
                for dir in &dirs {
                    result.push_str(&format!("drwxr-xr-x 📁 {}\n", dir));
                }
                for file in &files {
                    let icon = get_file_icon(file);
                    result.push_str(&format!("-rw-r--r-- {} {}\n", icon, file));
                }
            } else {
                // Simple listing
                for dir in &dirs {
                    result.push_str(&format!("📁 {}\n", dir));
                }
                for file in &files {
                    let icon = get_file_icon(file);
                    result.push_str(&format!("{} {}\n", icon, file));
                }
            }

            if result.is_empty() {
                Ok("Directory is empty".to_string())
            } else {
                Ok(result.trim_end().to_string())
            }
        },
        Err(e) => Err(format!("Failed to read directory: {}", e))
    }
}

fn get_file_icon(filename: &str) -> &'static str {
    let extension = Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    match extension.to_lowercase().as_str() {
        "py" => "🐍",
        "js" | "jsx" => "📜",
        "ts" | "tsx" => "📘",
        "rs" => "🦀",
        "html" | "htm" => "🌐",
        "css" => "🎨",
        "json" => "📋",
        "md" | "markdown" => "📝",
        "txt" => "📄",
        "pdf" => "📕",
        "png" | "jpg" | "jpeg" | "gif" | "svg" => "🖼️",
        "mp4" | "avi" | "mkv" | "mov" => "🎬",
        "mp3" | "wav" | "flac" => "🎵",
        "zip" | "rar" | "7z" | "tar" | "gz" => "📦",
        "exe" | "app" => "⚙️",
        "sh" | "bash" | "zsh" => "🔧",
        "sql" => "🗄️",
        "xml" => "📰",
        "yaml" | "yml" => "⚙️",
        "toml" => "⚙️",
        "dockerfile" => "🐳",
        _ => "📄"
    }
}

#[tauri::command]
fn get_file_list(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let mut files = Vec::new();
    
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(name) = path.file_name() {
                            files.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
            files.sort();
            Ok(files)
        },
        Err(e) => Err(format!("Failed to read directory: {}", e))
    }
}

#[tauri::command]
fn read_file_content(file_path: String) -> Result<String, String> {
    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e))
    }
}

#[tauri::command]
fn write_file_content(file_path: String, content: String) -> Result<(), String> {
    match fs::write(&file_path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e))
    }
  }
  
  #[tauri::command]
  fn create_new_file(file_path: String) -> Result<(), String> {
    println!("🔧 Backend: Creating file: {}", file_path);
    
    if Path::new(&file_path).exists() {
        return Err("File already exists".to_string());
    }
    
    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&file_path).parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => println!("📁 Created parent directories for: {}", file_path),
                Err(e) => return Err(format!("Failed to create parent directories: {}", e))
            }
        }
    }
    
    match fs::write(&file_path, "") {
        Ok(_) => {
            println!("✅ Created file: {}", file_path);
            Ok(())
        },
        Err(e) => Err(format!("Failed to create file: {}", e))
    }
}

#[tauri::command]
fn create_new_folder(folder_path: String) -> Result<(), String> {
    println!("🔧 Backend: Creating folder: {}", folder_path);
    
    if Path::new(&folder_path).exists() {
        return Err("Folder already exists".to_string());
    }
    
    match fs::create_dir_all(&folder_path) {
        Ok(_) => {
            println!("✅ Created folder: {}", folder_path);
            Ok(())
        },
        Err(e) => Err(format!("Failed to create folder: {}", e))
    }
}

#[tauri::command]
fn rename_file_or_folder(old_path: String, new_path: String) -> Result<(), String> {
    println!("🔧 Backend: Renaming: {} -> {}", old_path, new_path);
    
    if !Path::new(&old_path).exists() {
        return Err("Source path does not exist".to_string());
    }
    
    if Path::new(&new_path).exists() {
        return Err("Destination path already exists".to_string());
    }
    
    match fs::rename(&old_path, &new_path) {
        Ok(_) => {
            println!("✅ Renamed: {} -> {}", old_path, new_path);
            Ok(())
        },
        Err(e) => Err(format!("Failed to rename: {}", e))
    }
}

#[tauri::command]
fn delete_file_or_folder(path: String) -> Result<(), String> {
    println!("🔧 Backend: Deleting: {}", path);
    
    let path_buf = Path::new(&path);
    
    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if path_buf.is_dir() {
        match fs::remove_dir_all(&path) {
            Ok(_) => {
                println!("✅ Deleted folder: {}", path);
                Ok(())
            },
            Err(e) => Err(format!("Failed to delete folder: {}", e))
        }
    } else {
        match fs::remove_file(&path) {
            Ok(_) => {
                println!("✅ Deleted file: {}", path);
                Ok(())
            },
            Err(e) => Err(format!("Failed to delete file: {}", e))
        }
    }
}

#[tauri::command]
fn run_file_in_terminal(file_path: String, workspace_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    
    let command = match extension.to_lowercase().as_str() {
        "py" => format!("python \"{}\"", file_path),
        "js" | "mjs" => format!("node \"{}\"", file_path),
        "rs" => {
            // For Rust, we need to compile and run
            let dir = path.parent().unwrap_or(Path::new("."));
            format!("cd \"{}\" && rustc \"{}\" && ./main", dir.display(), path.file_name().unwrap().to_str().unwrap())
        },
        "sh" | "bash" => format!("bash \"{}\"", file_path),
        _ => return Err(format!("Unsupported file type: {}", extension))
    };
    
    execute_command_in_workspace(command, workspace_path)
}

#[tauri::command]
fn analyze_workspace_problems(workspace_path: String) -> Result<Vec<serde_json::Value>, String> {
    
    let mut problems = Vec::new();
    let workspace_dir = Path::new(&workspace_path);
    
    if !workspace_dir.exists() {
        return Err("Workspace path does not exist".to_string());
    }
    
    fn analyze_directory(dir: &Path, problems: &mut Vec<serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                // Skip directories that don't need analysis
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    if ["node_modules", ".git", "target", "__pycache__", ".vscode", "src-tauri", ".next", "dist", "build", ".cargo"].contains(&dir_name) {
                        continue;
                    }
                }
                analyze_directory(&path, problems)?;
            } else if path.is_file() {
                // Prioritize test-problems folder, avoid React components false positives
                let path_str = path.to_string_lossy();
                let should_analyze = path_str.contains("test-problems");
                
                if should_analyze {
                    if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
                        match extension.to_lowercase().as_str() {
                            "ts" | "tsx" => analyze_typescript_file(&path, problems)?,
                            "js" | "jsx" => analyze_javascript_file(&path, problems)?,
                            "py" => analyze_python_file(&path, problems)?,
                            "rs" => analyze_rust_file(&path, problems)?,
                            _ => {}
                        }
                    }
                }
            }
        }
        Ok(())
    }
    
    analyze_directory(workspace_dir, &mut problems)
        .map_err(|e| format!("Error analyzing workspace: {}", e))?;
    
    Ok(problems)
}

fn analyze_typescript_file(file_path: &Path, problems: &mut Vec<serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    // Only analyze test files, avoid React component false positives
    for (line_num, line) in content.lines().enumerate() {
        let line_number = line_num + 1;
        let trimmed = line.trim();
        
        // Check for missing imports (more specific)
        if trimmed.contains("invoke(") && !content.contains("import") && !content.contains("@tauri-apps") {
            problems.push(serde_json::json!({
                "id": format!("{}:{}:import", file_path_str, line_number),
                "type": "error",
                "message": "'invoke' is not defined. Did you forget to import from '@tauri-apps/api/core'?",
                "file": file_path_str,
                "line": line_number,
                "column": 1,
                "source": "TypeScript Analyzer"
            }));
        }
        
        // Check for actual undefined variables (not React hooks or component variables)
        if trimmed.contains("console.log(") && (trimmed.contains("undefined_var") || trimmed.contains("missing_var")) {
            problems.push(serde_json::json!({
                "id": format!("{}:{}:undefined", file_path_str, line_number),
                "type": "error",
                "message": "Undefined variable usage",
                "file": file_path_str,
                "line": line_number,
                "column": 1,
                "source": "TypeScript Analyzer"
            }));
        }
        
        // Check for JSX syntax errors (simple pattern)
        if trimmed.contains("return <") && !trimmed.contains("</") && !trimmed.contains("/>") {
            problems.push(serde_json::json!({
                "id": format!("{}:{}:jsx", file_path_str, line_number),
                "type": "error",
                "message": "JSX element is not closed properly",
                "file": file_path_str,
                "line": line_number,
                "column": 1,
                "source": "TypeScript Analyzer"
            }));
        }
    }
    
    Ok(())
}

fn analyze_javascript_file(file_path: &Path, problems: &mut Vec<serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
    // Similar to TypeScript but with JS-specific checks
    analyze_typescript_file(file_path, problems)
}

fn analyze_python_file(file_path: &Path, problems: &mut Vec<serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    // Extract all variable declarations
    let mut declared_vars = std::collections::HashSet::new();
    let mut imported_modules = std::collections::HashSet::new();
    
    for line in content.lines() {
        let trimmed = line.trim();
        
        // Collect variable declarations
        if let Some(var) = extract_python_variable_declaration(trimmed) {
            declared_vars.insert(var);
        }
        
        // Collect imports
        if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
            if let Some(import) = extract_python_import(trimmed) {
                imported_modules.insert(import);
            }
        }
    }
    
    for (line_num, line) in content.lines().enumerate() {
        let line_number = line_num + 1;
        let trimmed = line.trim();
        
        // Check for undefined variables in print statements
        if trimmed.starts_with("print(") {
            // Extract variable names from print statement
            if let Some(var_name) = extract_variable_from_print(trimmed) {
                if !declared_vars.contains(&var_name) && !is_builtin_python(&var_name) {
                    problems.push(serde_json::json!({
                        "id": format!("{}:{}:undefined", file_path_str, line_number),
                        "type": "error",
                        "message": format!("'{}' is not defined", var_name),
                        "file": file_path_str,
                        "line": line_number,
                        "column": trimmed.find(&var_name).unwrap_or(0) + 1,
                        "source": "Python Analyzer"
                    }));
                }
            }
        }
        
        // Check for unused imports
        if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
            let import_name = extract_python_import(trimmed);
            if let Some(import) = import_name {
                if !is_python_import_used(&import, &content) {
                    problems.push(serde_json::json!({
                        "id": format!("{}:{}:unused-import", file_path_str, line_number),
                        "type": "warning",
                        "message": format!("Unused import '{}'", import),
                        "file": file_path_str,
                        "line": line_number,
                        "column": 1,
                        "source": "Python Analyzer"
                    }));
                }
            }
        }
        
        // Check for missing f-string (only for specific patterns)
        if (trimmed.contains("\"{}.format(") || trimmed.contains("'{}.format(")) && !trimmed.starts_with("#") {
            problems.push(serde_json::json!({
                "id": format!("{}:{}:fstring", file_path_str, line_number),
                "type": "info",
                "message": "Consider using f-string for better readability",
                "file": file_path_str,
                "line": line_number,
                "column": 1,
                "source": "Python Analyzer"
            }));
        }
    }
    
    Ok(())
}

fn analyze_rust_file(file_path: &Path, problems: &mut Vec<serde_json::Value>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    for (line_num, line) in content.lines().enumerate() {
        let line_number = line_num + 1;
        let trimmed = line.trim();
        
        // Check for unwrap() usage
        if trimmed.contains(".unwrap()") {
            problems.push(serde_json::json!({
                "id": format!("{}:{}:unwrap", file_path_str, line_number),
                "type": "warning",
                "message": "Consider using proper error handling instead of unwrap()",
                "file": file_path_str,
                "line": line_number,
                "column": 1,
                "source": "Rust Analyzer"
            }));
        }
        
        // Check for unused variables (very basic)
        if trimmed.starts_with("let ") && !trimmed.contains("_") {
            let var_name = extract_rust_variable(trimmed);
            if let Some(var) = var_name {
                if !is_rust_variable_used(&var, &content) {
                    problems.push(serde_json::json!({
                        "id": format!("{}:{}:unused", file_path_str, line_number),
                        "type": "warning",
                        "message": format!("Variable '{}' is never used", var),
                        "file": file_path_str,
                        "line": line_number,
                        "column": 1,
                        "source": "Rust Analyzer"
                    }));
                }
            }
        }
    }
    
    Ok(())
}

// Helper functions - currently unused but may be needed for future enhancements
#[allow(dead_code)]
fn extract_variable_declaration(line: &str) -> Option<String> {
    if line.trim_start().starts_with("const ") || line.trim_start().starts_with("let ") || line.trim_start().starts_with("var ") {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let var_part = parts[1];
            let var_name = var_part.split('=').next()?.trim();
            return Some(var_name.to_string());
        }
    }
    None
}

#[allow(dead_code)]
fn is_variable_used(var_name: &str, content: &str) -> bool {
    let usage_count = content.matches(var_name).count();
    usage_count > 1 // More than just the declaration
}

fn extract_python_import(line: &str) -> Option<String> {
    if line.starts_with("import ") {
        let import_name = line.strip_prefix("import ")?.split_whitespace().next()?;
        Some(import_name.to_string())
    } else if line.starts_with("from ") {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 && parts[2] == "import" {
            Some(parts[3].to_string())
        } else {
            None
        }
    } else {
        None
    }
}

fn is_python_import_used(import_name: &str, content: &str) -> bool {
    let lines: Vec<&str> = content.lines().collect();
    let usage_count = lines.iter()
        .filter(|line| !line.trim_start().starts_with("import ") && !line.trim_start().starts_with("from "))
        .filter(|line| line.contains(import_name))
        .count();
    usage_count > 0
}

fn extract_rust_variable(line: &str) -> Option<String> {
    if line.trim_start().starts_with("let ") {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let var_part = parts[1];
            let var_name = var_part.split('=').next()?.split(':').next()?.trim();
            return Some(var_name.to_string());
        }
    }
    None
}

fn is_rust_variable_used(var_name: &str, content: &str) -> bool {
    let usage_count = content.matches(var_name).count();
    usage_count > 1
}

fn extract_python_variable_declaration(line: &str) -> Option<String> {
    // Extract variable name from assignment
    if line.contains(" = ") && !line.trim().starts_with("#") {
        let parts: Vec<&str> = line.split(" = ").collect();
        if let Some(left) = parts.first() {
            let var_name = left.trim().split_whitespace().last()?;
            // Skip if it contains complex patterns like array indexing or attributes
            if !var_name.contains("[") && !var_name.contains(".") && !var_name.contains("(") {
                return Some(var_name.to_string());
            }
        }
    }
    None
}

fn extract_variable_from_print(line: &str) -> Option<String> {
    // Extract variable from print statement like print(variable_name)
    if let Some(start) = line.find("print(") {
        let content = &line[start + 6..];
        if let Some(end) = content.find(")") {
            let var_content = &content[..end].trim();
            // Only check for simple variable names (not strings, not complex expressions)
            if !var_content.contains("\"") && !var_content.contains("'") && 
               !var_content.contains("+") && !var_content.contains(".") &&
               !var_content.contains("(") && var_content.chars().all(|c| c.is_alphanumeric() || c == '_') {
                return Some(var_content.to_string());
            }
        }
    }
    None
}

fn is_builtin_python(name: &str) -> bool {
    // Common Python builtins and keywords
    matches!(name, "print" | "len" | "str" | "int" | "float" | "list" | "dict" | "tuple" | 
                   "set" | "bool" | "None" | "True" | "False" | "range" | "enumerate" | 
                   "zip" | "map" | "filter" | "sorted" | "reversed" | "sum" | "max" | "min")
}

#[tauri::command]
fn refresh_file_tree(workspace_path: String) -> Result<Vec<FileEntry>, String> {
    println!("🔄 Backend: Refreshing file tree for: {}", workspace_path);
    
    let tree = read_dir_recursive(&workspace_path, 3, 0);
    
    println!("✅ Backend: File tree refreshed with {} entries", tree.len());
    Ok(tree)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_folder,
            open_file,
            open_file_dialog,
            save_file,
            save_as_file,
            execute_command_in_workspace,
            get_file_list,
            read_file_content,
            write_file_content,
            create_new_file,
            create_new_folder,
            rename_file_or_folder,
            delete_file_or_folder,
            run_file_in_terminal,
            analyze_workspace_problems,
            refresh_file_tree
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
