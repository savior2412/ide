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
    fn build_tree(path: &Path) -> Result<FileTreeItem, Box<dyn std::error::Error>> {
        let metadata = fs::metadata(path)?;
        let name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let path_str = path.to_string_lossy().to_string();
        
        if metadata.is_dir() {
            let mut children = Vec::new();
            
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    if let Ok(child_tree) = build_tree(&entry.path()) {
                        children.push(child_tree);
                    }
                }
            }
            
            children.sort_by(|a, b| {
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.cmp(&b.name),
                }
            });
            
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
    
    let path = Path::new(&dir_path);
    build_tree(path).map_err(|e| format!("Failed to build directory tree: {}", e))
}

#[tauri::command]
fn search_in_files(
    query: String, 
    workspace_root: String,
    case_sensitive: Option<bool>
) -> Result<SearchResult, String> {
    let case_sensitive = case_sensitive.unwrap_or(false);
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
        
        for (line_index, line) in lines.iter().enumerate() {
            let search_line = if case_sensitive { line.to_string() } else { line.to_lowercase() };
            
            if let Some(match_start) = search_line.find(query) {
                let relative_path = file_path.strip_prefix(workspace_root)
                    .unwrap_or(file_path)
                    .to_string_lossy()
                    .to_string();
                
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
                    file_path: relative_path,
                    line_number: line_index + 1,
                    line_content: line.to_string(),
                    match_start,
                    match_end: match_start + query.len(),
                    context_before,
                    context_after,
                });
            }
        }
        
        Ok(())
    }
    
    let workspace_path = Path::new(&workspace_root);
    search_directory(
        workspace_path, 
        &search_query, 
        case_sensitive,
        &searchable_extensions, 
        &mut matches, 
        &mut files_searched,
        &workspace_root
    ).map_err(|e| format!("Search error: {}", e))?;
    
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
    let workspace_root = "/Users/savior/Desktop/ide/supreme-ide-ai".to_string();
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
            agent_manage_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 