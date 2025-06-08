# step01_initialize_project.py (FIXED v2)
import subprocess
import os
import platform

# --- Helper Functions ---
def run_command(command, cwd=None):
    """Runs a command in the shell and prints its output."""
    print(f"🏃 Đang chạy lệnh: {' '.join(command)}")
    try:
        process = subprocess.run(
            command,
            check=True,
            shell=(platform.system() == "Windows"),
            text=True,
            capture_output=True,
            cwd=cwd
        )
        print(f"✅ Lệnh thực thi thành công.")
        if process.stdout:
            print("   --- Output ---")
            print(process.stdout)
            print("   --------------")
    except subprocess.CalledProcessError as e:
        print(f"❌ LỖI khi chạy lệnh: {' '.join(command)}")
        print(f"   Lỗi: {e}")
        print(f"   Stderr: {e.stderr}")
        print(f"   Stdout: {e.stdout}")
        exit(1)
    except FileNotFoundError:
        print(f"❌ LỖI: Lệnh không tồn tại. Hãy chắc chắn rằng bạn đã cài đặt Node.js, pnpm, và Rust/Cargo.")
        exit(1)

def write_to_file(filepath, content):
    """Writes content to a file, creating directories if necessary."""
    print(f"📝 Đang ghi vào file: {filepath}")
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Ghi file thành công.")
    except Exception as e:
        print(f"❌ LỖI khi ghi file {filepath}: {e}")
        exit(1)

# --- Main Script ---
PROJECT_NAME = "supreme-ide-ai"

# 1. Create project directory
if not os.path.exists(PROJECT_NAME):
    os.makedirs(PROJECT_NAME)
    print(f"📁 Đã tạo thư mục dự án: {PROJECT_NAME}")
else:
    print(f"📁 Thư mục dự án '{PROJECT_NAME}' đã tồn tại.")

project_path = os.path.abspath(PROJECT_NAME)

# 2. Initialize React + Vite project
print("\n--- Bước 2: Khởi tạo dự án React + Vite ---")
if not os.path.exists(os.path.join(project_path, "vite.config.ts")):
    run_command(["pnpm", "create", "vite", ".", "--template", "react-ts"], cwd=project_path)
    run_command(["pnpm", "install"], cwd=project_path)
else:
    print("   Dự án Vite đã được khởi tạo. Bỏ qua.")

# 3. Setup base pure CSS
print("\n--- Bước 3: Thiết lập CSS thuần ---")
index_css_content = """
:root {
  --font-family-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  
  --color-background: #1e1e1e;
  --color-surface: #252526;
  --color-border: #333333;
  --color-text-primary: #cccccc;
  --color-text-secondary: #999999;
  --color-primary: #007acc;
  --color-error: #f44747;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; font-family: var(--font-family-main); background-color: var(--color-background); color: var(--color-text-primary); overflow: hidden; }
#root { height: 100vh; width: 100vw; display: flex; flex-direction: column; }
"""
write_to_file(os.path.join(project_path, "src/index.css"), index_css_content)

# 4. Install Tauri CLI and API
print("\n--- Bước 4: Cài đặt Tauri CLI và API ---")
run_command(["pnpm", "install", "@tauri-apps/api"], cwd=project_path)
run_command(["pnpm", "install", "-D", "@tauri-apps/cli"], cwd=project_path)

# 5. Install other dependencies
print("\n--- Bước 5: Cài đặt các thư viện phụ trợ ---")
# For Monaco Editor
run_command(["pnpm", "install", "monaco-editor", "react-monaco-editor"], cwd=project_path)
# For xterm.js (Updated packages)
print("   Cài đặt phiên bản xterm mới nhất...")
run_command(["pnpm", "install", "@xterm/xterm", "@xterm/addon-fit"], cwd=project_path)
# For VectorDB (Corrected package name)
print("   Cài đặt ChromaDB client...")
run_command(["pnpm", "install", "chromadb"], cwd=project_path)

print("\n\n✅ Script đã chạy xong các bước tự động.")
print("--- HÀNH ĐỘNG TIẾP THEO CỦA BẠN ---")
print(f"1. Mở terminal và di chuyển vào thư mục dự án:")
print(f"   cd {PROJECT_NAME}")
print("\n2. Chạy lệnh khởi tạo Tauri thủ công:")
print("   pnpm tauri init")
print("\n   Khi được hỏi, hãy trả lời như sau:")
print("   - Tên app: supreme-ide-ai (hoặc nhấn Enter)")
print("   - Tên window title: Supreme IDE AI (hoặc nhấn Enter)")
print("   - Web asset path: http://localhost:5173")
print("   - Web dev server command: pnpm dev")
print("\nSau khi hoàn tất, hãy báo cho tôi biết để chúng ta tiếp tục bước tiếp theo.")