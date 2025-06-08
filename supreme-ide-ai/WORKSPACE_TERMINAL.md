# Workspace Terminal Features

## Overview
Terminal đã được tích hợp hoàn toàn vào MainPanel với workspace context, giống như VSCode và Cursor AI. Terminal chỉ hoạt động khi có workspace/folder được mở và luôn thao tác trong context của workspace đó.

## Key Features

### 1. Workspace Context
- **Chỉ hoạt động khi có workspace**: Terminal chỉ xuất hiện và hoạt động khi user đã mở một folder
- **Working Directory**: Tất cả commands được execute trong workspace directory
- **Path Display**: Hiển thị tên workspace trong prompt (giống VSCode)

### 2. Multiple Terminal Support
- **Multiple Tabs**: Cho phép tạo nhiều terminal tabs
- **Tab Management**: 
  - Tạo terminal mới với nút "+" 
  - Đóng terminal với nút "×" (chỉ khi có >1 terminal)
  - Switch giữa các terminals
- **Auto Naming**: Terminal được đặt tên tự động (Terminal 1, Terminal 2, ...)

### 3. Built-in Commands
- `help` - Hiển thị danh sách commands
- `pwd` - Hiển thị current directory
- `ls` - List files trong workspace
- `cd <path>` - Change directory (relative hoặc absolute)
- `echo <text>` - Echo text
- `date` - Hiển thị current date/time
- **System Commands**: npm, yarn, cargo, git, và mọi system command khác

### 4. Workspace Integration
- **File → Open Folder**: Khi mở folder, workspace được set và terminal tự động tạo
- **Path Parsing**: Tự động parse workspace path từ opened folder
- **Relative Paths**: Hỗ trợ relative paths trong cd command

## UI Features

### 1. Layout Integration
- **Integrated Panel**: Terminal được tích hợp trong MainPanel (bottom panel)
- **Resizable**: Có thể resize panel size
- **70/30 Split**: Editor (70%) + Terminal (30%) default

### 2. Visual Design
- **Cyberpunk Theme**: Consistent với overall theme
- **Active Tab Indicator**: Tab hiện tại được highlight
- **Workspace Name**: Hiển thị tên workspace ở góc phải
- **Prompt Style**: `{workspace-name}:~$ ` format

### 3. No Workspace State
- **Empty State**: Hiển thị thông báo khi chưa mở workspace
- **Instructions**: Hướng dẫn user mở folder để sử dụng terminal
- **Visual Cues**: Icon và shortcut hints

## Technical Implementation

### 1. Tauri Backend
```rust
#[command]
async fn execute_command_in_workspace(command: String, workspace_path: String) -> Result<String, String>
```

### 2. React Components
- **MainPanel**: Tích hợp terminal với editor
- **Terminal State**: Quản lý multiple terminal sessions
- **Workspace Context**: Pass workspace path từ App.tsx

### 3. Keyboard Shortcuts
- **Removed**: Ctrl+` (terminal toggle) - không cần vì luôn visible khi có workspace

## Usage Examples

### 1. Development Workflow
```bash
# Mở folder project
File → Open Folder → select folder

# Terminal tự động available
workspace-name:~$ ls
src/ package.json README.md

# Run development commands
workspace-name:~$ npm install
workspace-name:~$ npm run dev
```

### 2. Multiple Terminals
```bash
# Terminal 1: Development server
workspace-name:~$ npm run dev

# Tạo Terminal 2: Git operations
workspace-name:~$ git status
workspace-name:~$ git add .
```

### 3. Navigation
```bash
# Change to subdirectory
workspace-name:~$ cd src
workspace-name:~$ pwd
/path/to/workspace/src

# Back to workspace root
workspace-name:~$ cd ~
workspace-name:~$ pwd
/path/to/workspace
```

## Error Handling

### 1. No Workspace
- Hiển thị friendly message
- Hướng dẫn mở folder
- Disable terminal input

### 2. Command Errors
- Show error output
- Maintain command history
- Continue operation

### 3. Directory Navigation
- Invalid paths show error
- Maintain current directory
- Support both relative/absolute paths

## Benefits vs VSCode/Cursor AI

### ✅ Similarities
- Integrated terminal trong editor
- Multiple terminal support
- Workspace context awareness
- Built-in command support

### ⚡ Enhancements
- **Cyberpunk Theme**: Unique visual design
- **Always Visible**: Không cần toggle (simplified UX)
- **Workspace Required**: Prevents directory confusion
- **Visual Cues**: Clear workspace indicators

## Future Enhancements

### 1. Advanced Features
- [ ] Terminal themes/colors
- [ ] Command history persistence
- [ ] Terminal search functionality
- [ ] Split terminal support

### 2. Development Tools
- [ ] Task runner integration
- [ ] Debug console integration
- [ ] Git terminal shortcuts
- [ ] Package manager detection

### 3. UX Improvements
- [ ] Terminal drag & drop
- [ ] Custom terminal names
- [ ] Terminal session saving
- [ ] Quick command palette

---

**Note**: Terminal feature được thiết kế để mang lại trải nghiệm tương tự VSCode/Cursor AI nhưng với twist riêng của Supreme IDE với cyberpunk theme và simplified UX. 