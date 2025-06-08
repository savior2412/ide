import subprocess
import os
import platform

# --- Helper Functions ---
def run_command(command, cwd=None):
    """Runs a command in the shell and prints its output."""
    print(f"🏃 Đang chạy lệnh: {' '.join(command)}")
    try:
        # Use shell=True on Windows for npm/npx commands
        use_shell = platform.system() == "Windows"
        subprocess.run(
            command,
            check=True,
            shell=use_shell,
            text=True,
            cwd=cwd
        )
        print(f"✅ Lệnh thực thi thành công.")
    except subprocess.CalledProcessError as e:
        print(f"❌ LỖI khi chạy lệnh: {' '.join(command)}")
        print(f"   Lỗi: {e}")
        exit(1)

def write_to_file(filepath, content):
    """Writes content to a file."""
    print(f"📝 Đang ghi đè file: {filepath}")
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Ghi file thành công.")
    except Exception as e:
        print(f"❌ LỖI khi ghi file {filepath}: {e}")
        exit(1)

# --- Main Script ---
project_path = os.getcwd()
print(f"📁 Bắt đầu dọn dẹp và cấu hình lại Monaco Editor trong: {project_path}\n")

# 1. Uninstall problematic packages
print("--- Bước 1: Gỡ bỏ các gói cũ và gây lỗi ---")
run_command(["pnpm", "uninstall", "vite-plugin-monaco-editor", "react-monaco-editor"], cwd=project_path)

# 2. Install the official, modern package
print("\n--- Bước 2: Cài đặt gói chính thức @monaco-editor/react ---")
run_command(["pnpm", "install", "@monaco-editor/react"], cwd=project_path)

# 3. Simplify and fix vite.config.ts
print("\n--- Bước 3: Dọn dẹp và đơn giản hóa vite.config.ts ---")
vite_config_content = """
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
"""
write_to_file(os.path.join(project_path, "vite.config.ts"), vite_config_content)

# 4. Rewrite CodeEditor.tsx to use the new library
print("\n--- Bước 4: Viết lại CodeEditor.tsx bằng thư viện mới ---")
code_editor_content = """
import React from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

const CodeEditor = () => {
  const initialCode = `def calculate_total(items):
    total = 0
    for item in items:
        total += item["price"]
    return total

items = [
    { "name": "Pen", "price": 1.5 },
    { "name": "Notebook", "price": 3.0 }
]

print(f"Total: {calculate_total(items)}")`;

  return (
    <div className={styles.editorContainer}>
      <Editor
        height="100%"
        defaultLanguage="python"
        defaultValue={initialCode}
        theme="vs-dark"
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;
"""
code_editor_path = os.path.join(project_path, "src", "components", "CodeEditor", "CodeEditor.tsx")
write_to_file(code_editor_path, code_editor_content)

print("\n\n🎉 HOÀN TẤT! Đã cấu hình lại Monaco Editor thành công.")
print("Mọi vấn đề về plugin đã được loại bỏ.")
print("Bây giờ, hãy khởi động lại server để áp dụng thay đổi.")