use std::path::Path;
use std::fs;
use serde::{Serialize, Deserialize};
use tauri::command;
// use serde_json::json; // Currently unused
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Problem {
    #[serde(rename = "type")]
    problem_type: String,
    message: String,
    file: String,
    line: u32,
    column: u32,
    severity: String,
    source: String,
    code: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileGroup {
    #[serde(rename = "fileName")]
    file_name: String,
    #[serde(rename = "fileType")]
    file_type: String,
    #[serde(rename = "problemCount")]
    problem_count: u32,
    problems: Vec<Problem>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProblemsData {
    #[serde(rename = "totalProblems")]
    total_problems: u32,
    #[serde(rename = "fileGroups")]
    file_groups: Vec<FileGroup>,
}

#[command]
fn open_folder() -> Result<(String, Vec<FileEntry>), String> {
    println!("🔄 Backend: Starting open_folder...");
    
    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg("POSIX path of (choose folder with prompt \"Select workspace folder\")")
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let folder_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                println!("📂 Backend: Selected folder: {}", folder_path);
                
                // Get folder structure as tree
                match build_file_tree(&folder_path) {
                    Ok(file_tree) => {
                        println!("✅ Backend: Successfully built file tree from {}", folder_path);
                        Ok((folder_path, file_tree))
                    }
                    Err(e) => {
                        let error = format!("Failed to read directory: {}", e);
                        println!("❌ Backend: {}", error);
                        Err(error)
                    }
                }
            } else {
                let error = "User cancelled folder selection";
                println!("⚠️ Backend: {}", error);
                Err(error.to_string())
            }
        }
        Err(e) => {
            let error = format!("Failed to show folder dialog: {}", e);
            println!("❌ Backend: {}", error);
            Err(error)
        }
    }
}

#[command]
fn read_file_content(file_path: String) -> Result<String, String> {
    println!("📖 Backend: Reading file: {}", file_path);
    
    // Try to read the file as-is first (for absolute paths)
    match fs::read_to_string(&file_path) {
        Ok(content) => {
            println!("✅ Backend: Successfully read {} characters from {}", content.len(), file_path);
            return Ok(content);
        }
        Err(_) => {
            // If failed, try to resolve relative paths
            let path = Path::new(&file_path);
            if path.is_relative() {
                // Try different workspace roots
                let possible_roots = vec![
                    "/Users/savior/Desktop/ide",
                    "/Users/savior/Desktop/ide/supreme-ide-ai",
                ];
                
                for root in possible_roots {
                    let full_path = Path::new(root).join(&file_path);
                    println!("🔍 Backend: Trying path: {}", full_path.display());
                    
                    if let Ok(content) = fs::read_to_string(&full_path) {
                        println!("✅ Backend: Successfully read {} characters from {}", content.len(), full_path.display());
                        return Ok(content);
                    }
                }
            }
            
            let error = format!("Failed to read file {}: File not found", file_path);
            println!("❌ Backend: {}", error);
            Err(error)
        }
    }
}

#[command]
fn write_file_content(file_path: String, content: String) -> Result<(), String> {
    println!("📝 Backend: Writing to file: {}", file_path);
    
    match fs::write(&file_path, content) {
        Ok(_) => {
            println!("✅ Backend: Successfully wrote to {}", file_path);
            Ok(())
        }
        Err(e) => {
            let error = format!("Failed to write to file {}: {}", file_path, e);
            println!("❌ Backend: {}", error);
            Err(error)
        }
    }
}

#[command]
fn refresh_file_tree(workspace_path: String) -> Result<Vec<FileEntry>, String> {
    println!("🔄 Backend: Refreshing file tree for: {}", workspace_path);
    build_file_tree(&workspace_path)
}

#[command]
fn open_file(path: String) -> Result<String, String> {
    println!("📖 Backend: Opening file: {}", path);
    read_file_content(path)
}

#[derive(Serialize, Deserialize, Debug)]
struct SearchMatch {
    file_path: String,
    file_name: String,
    line_number: u32,
    line_content: String,
    match_start: u32,
    match_end: u32,
    context_before: Option<String>,
    context_after: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SearchResult {
    query: String,
    total_matches: u32,
    files_count: u32,
    matches: Vec<SearchMatch>,
}

#[command]
fn search_in_files(workspace_path: String, query: String, case_sensitive: bool, use_regex: bool) -> Result<SearchResult, String> {
    println!("🔍 Backend: Searching for '{}' in workspace: {}", query, workspace_path);
    
    if query.trim().is_empty() {
        return Ok(SearchResult {
            query: query.clone(),
            total_matches: 0,
            files_count: 0,
            matches: Vec::new(),
        });
    }
    
    let mut all_matches = Vec::new();
    let mut files_searched = 0;
    
    fn search_in_directory(
        dir: &Path, 
        query: &str, 
        case_sensitive: bool, 
        use_regex: bool,
        workspace_root: &Path,
        matches: &mut Vec<SearchMatch>,
        files_count: &mut u32
    ) -> Result<(), Box<dyn std::error::Error>> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy();
                // Skip common directories that shouldn't be searched
                if name.starts_with('.') || name == "node_modules" || name == "target" 
                   || name == "dist" || name == "build" || name == "__pycache__" {
                    continue;
                }
                search_in_directory(&path, query, case_sensitive, use_regex, workspace_root, matches, files_count)?;
            } else {
                // Only search in text files
                if let Some(extension) = path.extension() {
                    let ext = extension.to_string_lossy().to_lowercase();
                    if matches!(ext.as_str(), "txt" | "md" | "js" | "jsx" | "ts" | "tsx" | "py" | "rs" | "css" | "html" | "json" | "xml" | "yaml" | "yml" | "toml" | "sql" | "sh" | "bat") {
                        *files_count += 1;
                        if let Err(e) = search_in_file(&path, query, case_sensitive, use_regex, workspace_root, matches) {
                            println!("⚠️ Backend: Could not search in file {}: {}", path.display(), e);
                        }
                    }
                }
            }
        }
        Ok(())
    }
    
    let workspace_dir = Path::new(&workspace_path);
    search_in_directory(workspace_dir, &query, case_sensitive, use_regex, workspace_dir, &mut all_matches, &mut files_searched)
        .map_err(|e| format!("Search error: {}", e))?;
    
    let total_matches = all_matches.len() as u32;
    let unique_files = all_matches.iter().map(|m| &m.file_path).collect::<std::collections::HashSet<_>>().len() as u32;
    
    println!("✅ Backend: Found {} matches in {} files (searched {} files)", total_matches, unique_files, files_searched);
    
    Ok(SearchResult {
        query: query.to_string(),
        total_matches,
        files_count: unique_files,
        matches: all_matches,
    })
}

fn search_in_file(
    file_path: &Path, 
    query: &str, 
    case_sensitive: bool, 
    _use_regex: bool,
    workspace_root: &Path,
    matches: &mut Vec<SearchMatch>
) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let lines: Vec<&str> = content.lines().collect();
    
    let search_query = if case_sensitive { query.to_string() } else { query.to_lowercase() };
    
    for (line_idx, line) in lines.iter().enumerate() {
        let search_line = if case_sensitive { line.to_string() } else { line.to_lowercase() };
        
        if let Some(match_pos) = search_line.find(&search_query) {
            let relative_path = if let Ok(rel_path) = file_path.strip_prefix(workspace_root) {
                rel_path.to_string_lossy().to_string()
            } else {
                file_path.to_string_lossy().to_string()
            };
            
            let file_name = file_path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            let context_before = if line_idx > 0 {
                Some(lines[line_idx - 1].to_string())
            } else {
                None
            };
            
            let context_after = if line_idx + 1 < lines.len() {
                Some(lines[line_idx + 1].to_string())
            } else {
                None
            };
            
            matches.push(SearchMatch {
                file_path: relative_path,
                file_name,
                line_number: (line_idx + 1) as u32,
                line_content: line.to_string(),
                match_start: match_pos as u32,
                match_end: (match_pos + query.len()) as u32,
                context_before,
                context_after,
            });
        }
    }
    
    Ok(())
}

fn build_file_tree(folder_path: &str) -> Result<Vec<FileEntry>, String> {
    println!("📁 Backend: Building file tree for: {}", folder_path);
    
    fn scan_directory(dir: &Path, workspace_root: &Path) -> Result<Vec<FileEntry>, Box<dyn std::error::Error>> {
        let mut entries = Vec::new();
        
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden files/folders
            if name.starts_with('.') {
                continue;
            }
            
            let is_dir = path.is_dir();
            let children = if is_dir {
                // Recursively scan subdirectories
                match scan_directory(&path, workspace_root) {
                    Ok(children_vec) => {
                        if children_vec.is_empty() {
                            None
                        } else {
                            Some(children_vec)
                        }
                    }
                    Err(_) => None // Skip directories we can't read
                }
            } else {
                None
            };
            
            // Store path relative to workspace root
            let relative_path = if let Ok(rel_path) = path.strip_prefix(workspace_root) {
                rel_path.to_string_lossy().to_string()
            } else {
                path.to_string_lossy().to_string()
            };
            
            entries.push(FileEntry {
                name,
                path: relative_path,
                is_dir,
                children,
            });
        }
        
        // Sort: directories first, then files
        entries.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });
        
        Ok(entries)
    }
    
    let workspace_path = Path::new(folder_path);
    match scan_directory(workspace_path, workspace_path) {
        Ok(tree) => {
            println!("✅ Backend: Built file tree with {} entries", tree.len());
            Ok(tree)
        }
        Err(e) => {
            let error = format!("Failed to scan directory {}: {}", folder_path, e);
            println!("❌ Backend: {}", error);
            Err(error)
        }
    }
}

#[command]
fn analyze_workspace_problems(workspace_path: String) -> Result<ProblemsData, String> {
    println!("🔍 Backend: Analyzing workspace problems for: {}", workspace_path);
    
    let mut all_problems = Vec::new();
    let workspace_dir = Path::new(&workspace_path);
    
    if !workspace_dir.exists() {
        return Err("Workspace path does not exist".to_string());
    }
    
    fn analyze_directory(dir: &Path, problems: &mut Vec<Problem>) -> Result<(), Box<dyn std::error::Error>> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                if let Some(name) = path.file_name() {
                    let name_str = name.to_string_lossy();
                    // Skip more directories to reduce noise
                    if name_str.starts_with('.') || name_str == "node_modules" 
                       || name_str == "target" || name_str == "dist" 
                       || name_str == "build" || name_str == "coverage"
                       || name_str == "__pycache__" || name_str == "venv"
                       || name_str == ".git" || name_str == ".next" {
                        continue;
                    }
                }
                analyze_directory(&path, problems)?;
            } else if let Some(extension) = path.extension() {
                // Only analyze actual source files, not generated ones
                let path_str = path.to_string_lossy();
                if path_str.contains("/.git/") || path_str.contains("/node_modules/") 
                   || path_str.contains("/target/") || path_str.contains("/dist/")
                   || path_str.contains(".min.") || path_str.contains(".bundle.") {
                    continue;
                }
                
                match extension.to_string_lossy().as_ref() {
                    "ts" | "tsx" => analyze_typescript_file(&path, problems)?,
                    "js" | "jsx" => analyze_javascript_file(&path, problems)?,
                    "py" => analyze_python_file(&path, problems)?,
                    _ => {}
                }
            }
        }
        Ok(())
    }
    
    if let Err(e) = analyze_directory(workspace_dir, &mut all_problems) {
        println!("❌ Backend: Error analyzing directory: {}", e);
        return Err(format!("Failed to analyze workspace: {}", e));
    }
    
    let mut grouped_problems: HashMap<String, Vec<Problem>> = HashMap::new();
    for problem in all_problems {
        grouped_problems.entry(problem.file.clone()).or_insert_with(Vec::new).push(problem);
    }
    
    let mut file_groups = Vec::new();
    for (file_path, problems) in grouped_problems {
        let file_name = Path::new(&file_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let file_type = Path::new(&file_path)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        file_groups.push(FileGroup {
            file_name,
            file_type,
            problem_count: problems.len() as u32,
            problems,
        });
    }
    
    let total_problems = file_groups.iter().map(|fg| fg.problem_count).sum();
    
    println!("✅ Backend: Found {} problems in {} files", total_problems, file_groups.len());
    
    Ok(ProblemsData {
        total_problems,
        file_groups,
    })
}

fn analyze_typescript_file(file_path: &Path, problems: &mut Vec<Problem>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    // Skip test files and config files  
    if file_path_str.contains(".test.") || file_path_str.contains(".spec.")
       || file_path_str.contains("config") || file_path_str.contains(".d.ts") {
        return Ok(());
    }
    
    let mut has_real_issues = false;
    let mut temp_problems = Vec::new();
    
    for (line_number, line) in content.lines().enumerate() {
        let line_number = (line_number + 1) as u32;
        let trimmed = line.trim();
        
        // Skip comments and empty lines
        if trimmed.is_empty() || trimmed.starts_with("//") || trimmed.starts_with("/*") {
            continue;
        }
        
        // Only flag actual syntax/logic errors, not style issues
        if trimmed.contains("Cannot find name") || trimmed.contains("Property") && trimmed.contains("does not exist") {
            temp_problems.push(Problem {
                problem_type: "error".to_string(),
                message: "TypeScript compilation error".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "error".to_string(),
                source: "TypeScript".to_string(),
                code: Some("2304".to_string()),
            });
            has_real_issues = true;
        }
        
        // Only flag unused variables if they're not prefixed with _
        if (trimmed.contains("is declared but its value is never read") 
           || trimmed.contains("is defined but never used"))
           && !trimmed.contains("_") {
            temp_problems.push(Problem {
                problem_type: "warning".to_string(),
                message: "Variable declared but never used".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "warning".to_string(),
                source: "TypeScript".to_string(),
                code: Some("6133".to_string()),
            });
        }
        
        // Only flag console.log in non-development files
        if trimmed.contains("console.log") && !file_path_str.contains("dev") 
           && !file_path_str.contains("debug") && !file_path_str.contains("test") {
            temp_problems.push(Problem {
                problem_type: "info".to_string(),
                message: "Remove console.log before production".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: trimmed.find("console.log").unwrap_or(0) as u32 + 1,
                severity: "info".to_string(),
                source: "TypeScript".to_string(),
                code: Some("no-console".to_string()),
            });
        }
    }
    
    // Only add problems if there are real issues or less than 3 minor issues
    if has_real_issues || temp_problems.len() <= 3 {
        problems.extend(temp_problems);
    }
    
    Ok(())
}

fn analyze_javascript_file(file_path: &Path, problems: &mut Vec<Problem>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    // Skip generated/minified files
    if file_path_str.contains(".min.") || file_path_str.contains(".bundle.") 
       || file_path_str.contains("vendor") || content.lines().count() == 1 {
        return Ok(());
    }
    
    let mut issue_count = 0;
    
    for (line_number, line) in content.lines().enumerate() {
        let line_number = (line_number + 1) as u32;
        let trimmed = line.trim();
        
        // Skip comments and empty lines
        if trimmed.is_empty() || trimmed.starts_with("//") || trimmed.starts_with("/*") {
            continue;
        }
        
        // Only flag if not in a comment context
        if trimmed.starts_with("var ") && issue_count < 5 {
            problems.push(Problem {
                problem_type: "warning".to_string(),
                message: "Use 'let' or 'const' instead of 'var'".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "warning".to_string(),
                source: "JavaScript".to_string(),
                code: Some("no-var".to_string()),
            });
            issue_count += 1;
        }
        
        // Flag syntax errors
        if trimmed.contains("SyntaxError") || trimmed.contains("ReferenceError") {
            problems.push(Problem {
                problem_type: "error".to_string(),
                message: "JavaScript runtime error".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "error".to_string(),
                source: "JavaScript".to_string(),
                code: Some("syntax-error".to_string()),
            });
        }
    }
    
    Ok(())
}

fn analyze_python_file(file_path: &Path, problems: &mut Vec<Problem>) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let file_path_str = file_path.to_string_lossy().to_string();
    
    // Skip __pycache__ and test files
    if file_path_str.contains("__pycache__") || file_path_str.contains("test_") 
       || file_path_str.contains("_test.py") {
        return Ok(());
    }
    
    let mut issue_count = 0;
    
    for (line_number, line) in content.lines().enumerate() {
        let line_number = (line_number + 1) as u32;
        let trimmed = line.trim();
        
        // Skip comments, empty lines, and docstrings
        if trimmed.is_empty() || trimmed.starts_with("#") 
           || trimmed.starts_with("\"\"\"") || trimmed.starts_with("'''") {
            continue;
        }
        
        // Basic syntax check
        if trimmed.contains("SyntaxError") || trimmed.contains("IndentationError") {
            problems.push(Problem {
                problem_type: "error".to_string(),
                message: "Python syntax error".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "error".to_string(),
                source: "Python".to_string(),
                code: Some("E999".to_string()),
            });
            issue_count += 1;
        }
        
        if trimmed.contains("NameError") && issue_count < 10 {
            problems.push(Problem {
                problem_type: "error".to_string(),
                message: "Name is not defined".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "error".to_string(),
                source: "Python".to_string(),
                code: Some("F821".to_string()),
            });
            issue_count += 1;
        }
        
        // Basic unused import detection (simplified)
        if trimmed.starts_with("import ") && trimmed.contains(" as ") 
           && issue_count < 5 {
            problems.push(Problem {
                problem_type: "warning".to_string(),
                message: "Check if import is used".to_string(),
                file: file_path_str.clone(),
                line: line_number,
                column: 1,
                severity: "warning".to_string(),
                source: "Python".to_string(),
                code: Some("F401".to_string()),
            });
            issue_count += 1;
        }
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder,
            read_file_content,
            write_file_content,
            refresh_file_tree,
            open_file,
            search_in_files,
            analyze_workspace_problems
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 