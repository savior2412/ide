# Supreme IDE AI

Một IDE hiện đại được xây dựng với **React + TypeScript + Tauri**, tích hợp AI Assistant và các chức năng quản lý file hoàn chỉnh.

## ✨ Tính năng chính

### 🗂️ Quản lý File & Thư mục
- **Open Folder** (`Ctrl+Shift+O`): Mở thư mục và hiển thị cây thư mục
- **Open File** (`Ctrl+O`): Mở file từ dialog
- **Save** (`Ctrl+S`): Lưu file hiện tại
- **Save As** (`Ctrl+Shift+S`): Lưu file với tên/vị trí mới
- **File Explorer**: Duyệt cây thư mục, click để mở file
- **Language Detection**: Tự động nhận diện ngôn ngữ lập trình

### 🎨 Giao diện & UX
- **Resizable Panels**: Có thể kéo thả để thay đổi kích thước
- **Modern UI**: Thiết kế cyberpunk với hiệu ứng glow
- **File Icons**: Icon màu sắc theo từng loại file
- **Notifications**: Thông báo đẹp mắt thay vì alert
- **Keyboard Shortcuts**: Hỗ trợ phím tắt tiện lợi

### 🤖 AI Assistant
- **Chat Interface**: Giao diện chat với AI
- **Context Files**: Thêm file vào context cho AI
- **Real-time**: Phản hồi real-time

### 💻 Code Editor
- **Monaco Editor**: Powered by VS Code
- **Syntax Highlighting**: Hỗ trợ nhiều ngôn ngữ
- **Auto-completion**: Gợi ý code thông minh
- **Multi-language Support**: Python, JavaScript, TypeScript, Rust, Go, Java, C++, v.v.

## 🚀 Cài đặt & Chạy

### Yêu cầu hệ thống
- **Node.js** 18+ 
- **Rust** 1.70+
- **pnpm** (khuyến nghị)

### Bước 1: Clone repository
\`\`\`bash
git clone <repository-url>
cd supreme-ide-ai
\`\`\`

### Bước 2: Cài đặt dependencies
\`\`\`bash
# Frontend dependencies
pnpm install

# Tauri dependencies sẽ được cài tự động
\`\`\`

### Bước 3: Chạy development
\`\`\`bash
pnpm tauri dev
\`\`\`

### Bước 4: Build production
\`\`\`bash
pnpm tauri build
\`\`\`

## 📖 Hướng dẫn sử dụng

### Mở thư mục project
1. Nhấn `Ctrl+Shift+O` hoặc **File → Open Folder**
2. Chọn thư mục chứa source code
3. Cây thư mục sẽ hiển thị bên trái

### Chỉnh sửa file
1. Click vào file trong File Explorer
2. Hoặc nhấn `Ctrl+O` để mở file từ dialog
3. File sẽ mở trong Monaco Editor
4. Chỉnh sửa và nhấn `Ctrl+S` để lưu

### Sử dụng AI Assistant
1. Nhập câu hỏi vào khung chat bên phải
2. Nhấn **SEND** hoặc `Enter`
3. AI sẽ phản hồi trong vài giây

## 🛠️ Kiến trúc kỹ thuật

### Frontend (React + TypeScript)
- **TitleBar**: Menu và window controls
- **FileExplorer**: Hiển thị cây thư mục
- **MainPanel**: Code editor + terminal
- **AssistantPanel**: AI chat interface
- **Notification**: Hệ thống thông báo

### Backend (Tauri + Rust)
- **File Operations**: open_folder, open_file, save_file, save_as_file
- **Dialog System**: Native file/folder picker
- **File System Access**: Đọc/ghi file an toàn

### State Management
- **React State**: Quản lý state tại App level
- **Props Drilling**: Truyền data xuống components
- **Callbacks**: Xử lý events từ children components

## 🔧 Cấu hình

### Supported Languages
- JavaScript/TypeScript
- Python
- Rust
- Go
- Java
- C/C++
- HTML/CSS
- JSON/YAML
- Markdown
- Shell scripts
- Và nhiều ngôn ngữ khác...

### Keyboard Shortcuts
| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Shift+O` | Open Folder |
| `Ctrl+O` | Open File |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |

## 🐛 Troubleshooting

### Lỗi build Tauri
\`\`\`bash
# Xóa cache và rebuild
rm -rf target/
pnpm tauri build
\`\`\`

### Lỗi permissions (macOS)
\`\`\`bash
# Allow app to access files
System Preferences → Security & Privacy → Files and Folders
\`\`\`

### Lỗi TypeScript
\`\`\`bash
# Type check
pnpm run lint
\`\`\`

## 📄 License

MIT License

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Được phát triển với ❤️ bởi AI Assistant & Human Collaboration**
