use std::path::Path;
use std::fs;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub matches: Vec<SearchMatch>,
    pub total_matches: usize,
    pub files_searched: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileTreeItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileTreeItem>>,
    pub size: Option<u64>,
    pub extension: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgentAction {
    pub id: String,
    pub action_type: String,
    pub description: String,
    pub payload: serde_json::Value,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CodeEditRequest {
    pub file_path: String,
    pub line_number: usize,
    pub column_number: Option<usize>,
    pub old_code: String,
    pub new_code: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileOperationRequest {
    pub operation_type: String,
    pub path: String,
    pub content: Option<String>,
    pub new_path: Option<String>,
    pub line_range: Option<(usize, usize)>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AgentSearchRequest {
    pub query: String,
    pub search_type: String,
    pub scope: Option<String>,
    pub case_sensitive: Option<bool>,
    pub use_regex: Option<bool>,
}

// AI Agent File System Operations
#[derive(serde::Deserialize, Debug)]
pub struct AIAgentRequest {
    pub action: String,
    pub parameters: serde_json::Value,
    pub context: Option<String>,
}

#[derive(serde::Serialize, Debug)]
pub struct AIAgentResponse {
    pub success: bool,
    pub data: serde_json::Value,
    pub message: String,
    pub execution_time_ms: u64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_file_content(file_path: String) -> Result<String, String> {
    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(content),
        Err(_) => {
            let path = Path::new(&file_path);
            if path.is_relative() {
                let possible_roots = vec![
                    "/Users/savior/Desktop/ide",
                    "/Users/savior/Desktop/ide/supreme-ide-ai",
                ];
                
                for root in possible_roots {
                    let full_path = Path::new(root).join(&file_path);
                    if let Ok(content) = fs::read_to_string(&full_path) {
                        return Ok(content);
                    }
                }
            }
            Err(format!("Failed to read file {}: File not found", file_path))
        }
    }
}

#[tauri::command]
fn get_directory_tree(dir_path: String) -> Result<FileTreeItem, String> {
    fn build_tree(path: &Path, max_depth: usize, current_depth: usize) -> Result<FileTreeItem, Box<dyn std::error::Error>> {
        let metadata = fs::metadata(path)?;
        let name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let path_str = path.to_string_lossy().to_string();
        
        // Skip hidden files/folders (bắt đầu với .)
        if name.starts_with('.') && !matches!(name.as_str(), "." | "..") {
            return Err("Hidden file/folder".into());
        }
        
        if metadata.is_dir() {
            let mut children = Vec::new();
            
            // Skip common folders that shouldn't be indexed (giống VS Code)
            let skip_folders = [
                "node_modules", "target", "dist", "build", "__pycache__",
                ".git", ".svn", ".hg", ".vs", ".vscode",
                "bin", "obj", "packages", ".nuget"
            ];
            
            if skip_folders.contains(&name.as_str()) {
                println!("⏭️  Skipping folder: {}", name);
                return Err("Skipped folder".into());
            }
            
            // Limit depth để tránh quá sâu (VS Code style)
            if current_depth < max_depth {
                if let Ok(entries) = fs::read_dir(path) {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            if let Ok(child_tree) = build_tree(&entry.path(), max_depth, current_depth + 1) {
                                children.push(child_tree);
                            }
                        }
                    }
                } else {
                    println!("⚠️  Cannot read directory: {}", path_str);
                }
            }
            
            // Sort: directories first, then files, alphabetically
            children.sort_by(|a, b| {
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });
            
            println!("📁 Directory: {} ({} children)", name, children.len());
            
            Ok(FileTreeItem {
                name,
                path: path_str,
                is_directory: true,
                children: Some(children),
                size: None,
                extension: None,
            })
        } else {
            let extension = path.extension()
                .map(|ext| ext.to_string_lossy().to_string());
            
            // Show only common file types (expandable)
            let supported_extensions = [
                // Code files
                "rs", "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "php", "rb", "swift", "kt",
                // Web files  
                "html", "css", "scss", "sass", "less", "vue", "svelte",
                // Config files
                "json", "yaml", "yml", "toml", "xml", "ini", "cfg", "conf",
                // Text files
                "txt", "md", "rst", "tex", "org",
                // Data files
                "csv", "sql", "db",
                // Scripts
                "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
                // Others
                "env", "gitignore", "dockerfile", "makefile", "cmake"
            ];
            
            let show_file = extension.as_ref()
                .map(|ext| supported_extensions.contains(&ext.to_lowercase().as_str()))
                .unwrap_or(false) || 
                // Show files without extension (like README, Dockerfile, Makefile)
                extension.is_none();
            
            if !show_file {
                return Err("Unsupported file type".into());
            }
            
            println!("📄 File: {} ({} bytes)", name, metadata.len());
            
            Ok(FileTreeItem {
                name,
                path: path_str,
                is_directory: false,
                children: None,
                size: Some(metadata.len()),
                extension,
            })
        }
    }
    
    println!("🔍 Building directory tree for: {}", dir_path);
    let path = Path::new(&dir_path);
    
    // Check if path exists
    if !path.exists() {
        return Err(format!("Path does not exist: {}", dir_path));
    }
    
    // Max depth 10 levels (như VS Code default)
    build_tree(path, 10, 0).map_err(|e| format!("Failed to build directory tree: {}", e))
}

#[tauri::command]
fn search_in_files(
    query: String, 
    workspaceRoot: String,
    caseSensitive: Option<bool>
) -> Result<SearchResult, String> {
    println!("🔍 Backend: Search started - query: '{}', workspace: '{}', case_sensitive: {:?}", 
             query, workspaceRoot, caseSensitive);
    
    let case_sensitive = caseSensitive.unwrap_or(false);
    let search_query = if case_sensitive { query.clone() } else { query.to_lowercase() };
    
    let mut matches = Vec::new();
    let mut files_searched = 0;
    
    let searchable_extensions = vec![
        "txt", "md", "js", "jsx", "ts", "tsx", "py", "rs", "css", "html", 
        "json", "xml", "yaml", "yml", "toml", "sql", "sh", "bat"
    ];
    
    fn search_directory(
        dir: &Path, 
        query: &str, 
        case_sensitive: bool,
        extensions: &[&str],
        matches: &mut Vec<SearchMatch>,
        files_searched: &mut usize,
        workspace_root: &str
    ) -> Result<(), Box<dyn std::error::Error>> {
        if dir.is_dir() {
            if let Some(dir_name) = dir.file_name() {
                if let Some(dir_str) = dir_name.to_str() {
                    if ["node_modules", "target", "dist", "build", "__pycache__"].contains(&dir_str) {
                        return Ok(());
                    }
                }
            }
            
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_dir() {
                    search_directory(&path, query, case_sensitive, extensions, matches, files_searched, workspace_root)?;
                } else {
                    if let Some(extension) = path.extension() {
                        if let Some(ext_str) = extension.to_str() {
                            if extensions.contains(&ext_str) {
                                search_in_file(&path, query, case_sensitive, matches, files_searched, workspace_root)?;
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }
    
    fn search_in_file(
        file_path: &Path,
        query: &str,
        case_sensitive: bool,
        matches: &mut Vec<SearchMatch>,
        files_searched: &mut usize,
        workspace_root: &str
    ) -> Result<(), Box<dyn std::error::Error>> {
        *files_searched += 1;
        
        let content = fs::read_to_string(file_path)?;
        let lines: Vec<&str> = content.lines().collect();
        
        let mut file_matches = 0;
        
        for (line_index, line) in lines.iter().enumerate() {
            let search_line = if case_sensitive { line.to_string() } else { line.to_lowercase() };
            
            if let Some(match_start) = search_line.find(query) {
                file_matches += 1;
                // Use absolute path instead of relative for frontend compatibility
                let absolute_path = file_path.to_string_lossy().to_string();
                
                let context_before: Vec<String> = if line_index >= 2 {
                    lines[line_index.saturating_sub(2)..line_index]
                        .iter()
                        .map(|s| s.to_string())
                        .collect()
                } else {
                    lines[0..line_index]
                        .iter()
                        .map(|s| s.to_string())
                        .collect()
                };
                
                let context_after: Vec<String> = if line_index + 3 < lines.len() {
                    lines[line_index + 1..line_index + 3]
                        .iter()
                        .map(|s| s.to_string())
                        .collect()
                } else {
                    lines[line_index + 1..]
                        .iter()
                        .map(|s| s.to_string())
                        .collect()
                };
                
                matches.push(SearchMatch {
                    file_path: absolute_path,
                    line_number: line_index + 1,
                    line_content: line.to_string(),
                    match_start,
                    match_end: match_start + query.len(),
                    context_before,
                    context_after,
                });
            }
        }
        
        if file_matches > 0 {
            println!("📄 Backend: Found {} matches in file: {}", 
                     file_matches, file_path.to_string_lossy());
        }
        
        Ok(())
    }
    
    let workspace_path = Path::new(&workspaceRoot);
    search_directory(
        workspace_path, 
        &search_query, 
        case_sensitive,
        &searchable_extensions, 
        &mut matches, 
        &mut files_searched,
        &workspaceRoot
    ).map_err(|e| format!("Search error: {}", e))?;
    
    println!("✅ Backend: Search completed - found {} matches in {} files", 
             matches.len(), files_searched);
    
    Ok(SearchResult {
        total_matches: matches.len(),
        matches,
        files_searched,
    })
}

#[tauri::command]
fn agent_execute_action(_action: AgentAction) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "success",
        "message": "Action executed (placeholder)"
    }))
}

#[tauri::command]
fn agent_search_files(request: AgentSearchRequest) -> Result<SearchResult, String> {
    // Use workspace from request, fallback to default if not provided
    let workspace_root = request.scope.unwrap_or_else(|| "/Users/savior/Desktop/ide/supreme-ide-ai".to_string());
    search_in_files(request.query, workspace_root, request.case_sensitive)
}

#[tauri::command]
fn agent_edit_code(_request: CodeEditRequest) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "success",
        "message": "Code edit placeholder"
    }))
}

#[tauri::command]
fn agent_manage_files(_request: FileOperationRequest) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "success",
        "message": "File operation placeholder"
    }))
}

#[tauri::command]
async fn open_folder() -> Result<(String, Vec<FileTreeItem>), String> {
    // Sử dụng rfd cho folder dialog
    let folder_path = rfd::FileDialog::new()
        .pick_folder();
    
    match folder_path {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            println!("🔄 Backend: Selected folder: {}", path_str);
            println!("🔍 Backend: Starting to scan entire folder structure...");
            
            // Build file tree cho folder được chọn
            match get_directory_tree(path_str.clone()) {
                Ok(tree) => {
                    // Convert single FileTreeItem to Vec<FileTreeItem> (children)
                    let children = if tree.is_directory {
                        tree.children.unwrap_or_default()
                    } else {
                        vec![tree]
                    };
                    
                    // Count statistics
                    fn count_items(items: &[FileTreeItem]) -> (usize, usize) {
                        let mut files = 0;
                        let mut folders = 0;
                        
                        for item in items {
                            if item.is_directory {
                                folders += 1;
                                if let Some(ref children) = item.children {
                                    let (child_files, child_folders) = count_items(children);
                                    files += child_files;
                                    folders += child_folders;
                                }
                            } else {
                                files += 1;
                            }
                        }
                        
                        (files, folders)
                    }
                    
                    let (total_files, total_folders) = count_items(&children);
                    
                    println!("✅ Backend: Successfully scanned workspace!");
                    println!("📊 Backend: Found {} files and {} folders", total_files, total_folders);
                    println!("🏠 Backend: Workspace ready at: {}", path_str);
                    
                    Ok((path_str, children))
                },
                Err(e) => {
                    println!("❌ Backend: Error building tree: {}", e);
                    Err(format!("Failed to build directory tree: {}", e))
                }
            }
        },
        None => {
            println!("❌ Backend: No folder selected");
            Err("No folder selected".to_string())
        }
    }
}

#[tauri::command]
fn refresh_file_tree(workspace_path: String) -> Result<Vec<FileTreeItem>, String> {
    println!("🔄 Backend: Refreshing file tree for: {}", workspace_path);
    
    match get_directory_tree(workspace_path) {
        Ok(tree) => {
            // Convert single FileTreeItem to Vec<FileTreeItem> (children)
            let children = if tree.is_directory {
                tree.children.unwrap_or_default()
            } else {
                vec![tree]
            };
            
            println!("✅ Backend: Refreshed tree with {} items", children.len());
            Ok(children)
        },
        Err(e) => {
            println!("❌ Backend: Error refreshing tree: {}", e);
            Err(format!("Failed to refresh directory tree: {}", e))
        }
    }
}

#[tauri::command]
async fn open_file_dialog() -> Result<(String, String), String> {
    // Mở file dialog để chọn file
    let file_path = rfd::FileDialog::new()
        .add_filter("All Files", &["*"])
        .add_filter("Text Files", &["txt", "md"])
        .add_filter("Code Files", &["js", "jsx", "ts", "tsx", "py", "rs", "css", "html", "json"])
        .pick_file();
    
    match file_path {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            println!("🔄 Backend: Selected file: {}", path_str);
            
            // Đọc nội dung file
            match fs::read_to_string(&path) {
                Ok(content) => {
                    println!("✅ Backend: Read file content ({} bytes)", content.len());
                    Ok((path_str, content))
                },
                Err(e) => {
                    println!("❌ Backend: Error reading file: {}", e);
                    Err(format!("Failed to read file: {}", e))
                }
            }
        },
        None => {
            println!("❌ Backend: No file selected");
            Err("No file selected".to_string())
        }
    }
}

#[tauri::command]
fn open_file(path: String) -> Result<String, String> {
    println!("🔄 Backend: Reading file: {}", path);
    
    match fs::read_to_string(&path) {
        Ok(content) => {
            println!("✅ Backend: Read file content ({} bytes)", content.len());
            Ok(content)
        },
        Err(e) => {
            println!("❌ Backend: Error reading file: {}", e);
            Err(format!("Failed to read file {}: {}", path, e))
        }
    }
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    println!("🔄 Backend: Saving file: {}", path);
    
    match fs::write(&path, content.as_bytes()) {
        Ok(_) => {
            println!("✅ Backend: File saved successfully");
            Ok(())
        },
        Err(e) => {
            println!("❌ Backend: Error saving file: {}", e);
            Err(format!("Failed to save file {}: {}", path, e))
        }
    }
}

#[tauri::command]
async fn save_as_file(content: String) -> Result<String, String> {
    // Mở save dialog
    let file_path = rfd::FileDialog::new()
        .add_filter("All Files", &["*"])
        .add_filter("Text Files", &["txt", "md"])
        .add_filter("Code Files", &["js", "jsx", "ts", "tsx", "py", "rs", "css", "html", "json"])
        .save_file();
    
    match file_path {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            println!("🔄 Backend: Saving as: {}", path_str);
            
            match fs::write(&path, content.as_bytes()) {
                Ok(_) => {
                    println!("✅ Backend: File saved as successfully");
                    Ok(path_str)
                },
                Err(e) => {
                    println!("❌ Backend: Error saving as file: {}", e);
                    Err(format!("Failed to save file: {}", e))
                }
            }
        },
        None => {
            println!("❌ Backend: No save location selected");
            Err("No save location selected".to_string())
        }
    }
}

#[tauri::command]
fn analyze_workspace_problems(workspace_path: String) -> Result<serde_json::Value, String> {
    println!("🔍 Backend: Analyzing workspace problems for: {}", workspace_path);
    
    // Placeholder implementation - trả về empty analysis
    Ok(serde_json::json!({
        "status": "success",
        "analysis": {
            "errors": [],
            "warnings": [],
            "info": []
        },
        "message": "Workspace analysis completed (placeholder)"
    }))
}

#[tauri::command]
async fn ai_agent_file_operation(request: AIAgentRequest) -> Result<AIAgentResponse, String> {
    let start_time = std::time::Instant::now();
    println!("🤖 AI Agent: Executing {} with params: {:?}", request.action, request.parameters);
    
    let result = match request.action.as_str() {
        "read_file" => {
            let file_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::read_to_string(file_path) {
                Ok(content) => Ok(serde_json::json!({
                    "content": content,
                    "path": file_path,
                    "size": content.len()
                })),
                Err(e) => Err(format!("Failed to read file: {}", e))
            }
        },
        
        "write_file" => {
            let file_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            let content = request.parameters["content"].as_str()
                .ok_or("Missing 'content' parameter")?;
            
            match fs::write(file_path, content) {
                Ok(_) => Ok(serde_json::json!({
                    "path": file_path,
                    "bytes_written": content.len()
                })),
                Err(e) => Err(format!("Failed to write file: {}", e))
            }
        },
        
        "create_file" => {
            let file_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            let content = request.parameters.get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            
            if Path::new(file_path).exists() {
                return Err("File already exists".to_string());
            }
            
            match fs::write(file_path, content) {
                Ok(_) => Ok(serde_json::json!({
                    "path": file_path,
                    "created": true
                })),
                Err(e) => Err(format!("Failed to create file: {}", e))
            }
        },
        
        "delete_file" => {
            let file_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::remove_file(file_path) {
                Ok(_) => Ok(serde_json::json!({
                    "path": file_path,
                    "deleted": true
                })),
                Err(e) => Err(format!("Failed to delete file: {}", e))
            }
        },
        
        "create_directory" => {
            let dir_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::create_dir_all(dir_path) {
                Ok(_) => Ok(serde_json::json!({
                    "path": dir_path,
                    "created": true
                })),
                Err(e) => Err(format!("Failed to create directory: {}", e))
            }
        },
        
        "delete_directory" => {
            let dir_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::remove_dir_all(dir_path) {
                Ok(_) => Ok(serde_json::json!({
                    "path": dir_path,
                    "deleted": true
                })),
                Err(e) => Err(format!("Failed to delete directory: {}", e))
            }
        },
        
        "rename_file" => {
            let old_path = request.parameters["old_path"].as_str()
                .ok_or("Missing 'old_path' parameter")?;
            let new_path = request.parameters["new_path"].as_str()
                .ok_or("Missing 'new_path' parameter")?;
            
            match fs::rename(old_path, new_path) {
                Ok(_) => Ok(serde_json::json!({
                    "old_path": old_path,
                    "new_path": new_path,
                    "renamed": true
                })),
                Err(e) => Err(format!("Failed to rename: {}", e))
            }
        },
        
        "list_files" => {
            let dir_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::read_dir(dir_path) {
                Ok(entries) => {
                    let mut files = Vec::new();
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            files.push(serde_json::json!({
                                "name": path.file_name().unwrap().to_string_lossy(),
                                "path": path.to_string_lossy(),
                                "is_directory": path.is_dir(),
                                "size": path.metadata().ok().map(|m| m.len()),
                            }));
                        }
                    }
                    Ok(serde_json::json!({
                        "directory": dir_path,
                        "files": files,
                        "count": files.len()
                    }))
                },
                Err(e) => Err(format!("Failed to list directory: {}", e))
            }
        },
        
        "search_content" => {
            let query = request.parameters["query"].as_str()
                .ok_or("Missing 'query' parameter")?;
            let workspace = request.parameters["workspace"].as_str()
                .ok_or("Missing 'workspace' parameter")?;
            let case_sensitive = request.parameters.get("case_sensitive")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            
            match search_in_files(query.to_string(), workspace.to_string(), Some(case_sensitive)) {
                Ok(results) => Ok(serde_json::json!({
                    "query": query,
                    "results": results,
                    "workspace": workspace
                })),
                Err(e) => Err(format!("Search failed: {}", e))
            }
        },
        
        "get_file_info" => {
            let file_path = request.parameters["path"].as_str()
                .ok_or("Missing 'path' parameter")?;
            
            match fs::metadata(file_path) {
                Ok(metadata) => Ok(serde_json::json!({
                    "path": file_path,
                    "size": metadata.len(),
                    "is_directory": metadata.is_dir(),
                    "is_file": metadata.is_file(),
                    "modified": metadata.modified().ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                    "created": metadata.created().ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                })),
                Err(e) => Err(format!("Failed to get file info: {}", e))
            }
        },
        
        _ => Err(format!("Unknown action: {}", request.action))
    };
    
    let execution_time = start_time.elapsed();
    
    match result {
        Ok(data) => {
            println!("✅ AI Agent: {} completed in {:?}", request.action, execution_time);
            Ok(AIAgentResponse {
                success: true,
                data,
                message: format!("Successfully executed {}", request.action),
                execution_time_ms: execution_time.as_millis() as u64,
            })
        },
        Err(error) => {
            println!("❌ AI Agent: {} failed: {}", request.action, error);
            Err(error)
        }
    }
}

#[tauri::command]
async fn ai_agent_code_analysis(file_path: String) -> Result<serde_json::Value, String> {
    println!("🔍 AI Agent: Analyzing code in: {}", file_path);
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let lines: Vec<&str> = content.lines().collect();
    let mut analysis = serde_json::json!({
        "file_path": file_path,
        "total_lines": lines.len(),
        "language": detect_language(&file_path),
        "size_bytes": content.len(),
        "analysis": {
            "imports": [],
            "functions": [],
            "classes": [],
            "comments": 0,
            "empty_lines": 0
        }
    });
    
    // Basic analysis
    let mut comments = 0;
    let mut empty_lines = 0;
    let mut imports = Vec::new();
    let mut functions = Vec::new();
    
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        
        if trimmed.is_empty() {
            empty_lines += 1;
        } else if trimmed.starts_with("//") || trimmed.starts_with("#") || trimmed.starts_with("/*") {
            comments += 1;
        } else if trimmed.starts_with("import ") || trimmed.starts_with("from ") || trimmed.starts_with("use ") {
            imports.push(serde_json::json!({
                "line": i + 1,
                "statement": trimmed
            }));
        } else if trimmed.contains("function ") || trimmed.contains("def ") || trimmed.contains("fn ") {
            functions.push(serde_json::json!({
                "line": i + 1,
                "name": extract_function_name(trimmed),
                "signature": trimmed
            }));
        }
    }
    
    analysis["analysis"]["comments"] = comments.into();
    analysis["analysis"]["empty_lines"] = empty_lines.into();
    analysis["analysis"]["imports"] = imports.into();
    analysis["analysis"]["functions"] = functions.into();
    
    Ok(analysis)
}

fn detect_language(file_path: &str) -> String {
    let extension = Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    match extension {
        "rs" => "Rust",
        "js" | "jsx" => "JavaScript",
        "ts" | "tsx" => "TypeScript", 
        "py" => "Python",
        "java" => "Java",
        "cpp" | "cxx" | "cc" => "C++",
        "c" => "C",
        "go" => "Go",
        "rb" => "Ruby",
        "php" => "PHP",
        "cs" => "C#",
        "kt" => "Kotlin",
        "swift" => "Swift",
        "html" => "HTML",
        "css" => "CSS",
        "scss" | "sass" => "SCSS",
        "json" => "JSON",
        "xml" => "XML",
        "yaml" | "yml" => "YAML",
        "md" => "Markdown",
        _ => "Unknown"
    }.to_string()
}

fn extract_function_name(line: &str) -> String {
    // Basic function name extraction (can be improved)
    if let Some(start) = line.find("function ") {
        let after_function = &line[start + 9..];
        if let Some(end) = after_function.find('(') {
            return after_function[..end].trim().to_string();
        }
    } else if let Some(start) = line.find("def ") {
        let after_def = &line[start + 4..];
        if let Some(end) = after_def.find('(') {
            return after_def[..end].trim().to_string();
        }
    } else if let Some(start) = line.find("fn ") {
        let after_fn = &line[start + 3..];
        if let Some(end) = after_fn.find('(') {
            return after_fn[..end].trim().to_string();
        }
    }
    
    "unknown".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file_content,
            get_directory_tree,
            search_in_files,
            agent_execute_action,
            agent_search_files,
            agent_edit_code,
            agent_manage_files,
            open_folder,
            refresh_file_tree,
            open_file_dialog,
            open_file,
            save_file,
            save_as_file,
            analyze_workspace_problems,
            ai_agent_file_operation,
            ai_agent_code_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 