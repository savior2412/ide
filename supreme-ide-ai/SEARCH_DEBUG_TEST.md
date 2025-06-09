# Search Debug Test

## Bước để debug search function:

### 1. Restart app
```bash
npm run tauri dev
```

### 2. Kiểm tra workspace path
- Mở folder `/Users/savior/Desktop/ide` 
- Check console logs để xem `workspacePath` được set đúng

### 3. Test file search
- Nhập "main" vào search box
- Chuyển qua tab "📁 Files" 
- Phải thấy `main.rs`, `main.tsx` files

### 4. Test code search
- Nhập "app_lib::run" vào search box  
- Chuyển qua tab "🔍 Code"
- Phải thấy kết quả từ `src-tauri/src/main.rs` line 4

### 5. Debug logs cần xem:
```
🏠 FileTree: Received workspacePath = "/Users/savior/Desktop/ide"
🔍 Search effect triggered: query="app_lib::run", type="content", workspace="/Users/savior/Desktop/ide"
🔍 Searching for "app_lib::run" in workspace: /Users/savior/Desktop/ide
🔍 Backend: Search started - query: 'app_lib::run', workspace: '/Users/savior/Desktop/ide', case_sensitive: false
📄 Backend: Found 1 matches in file: /Users/savior/Desktop/ide/supreme-ide-ai/src-tauri/src/main.rs
✅ Backend: Search completed - found 1 matches in 1 files
✅ Found 1 matches in 1 files
```

### Known Issues:
1. **Interface mismatch**: Fixed CodeSearchMatch interface để match Rust SearchMatch struct
2. **Parameter mismatch**: Fixed workspace_root parameter trong invoke call  
3. **Hardcoded workspace**: Fixed agent_search_files hardcoded path
4. **Context array display**: Fixed context_before/context_after từ string[] thành proper display

### Current Status:
- ✅ Backend search function có debug logging
- ✅ Frontend interface đã fix
- ✅ Parameter names đã match
- 🔄 Đang test với actual search query 