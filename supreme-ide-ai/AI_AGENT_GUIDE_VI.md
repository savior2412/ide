# 🤖 Hướng Dẫn AI Agent File System Integration

## 📖 Tổng Quan

AI Agent của Supreme IDE có khả năng tương tác hoàn toàn với hệ thống file, giống như một lập trình viên chuyên nghiệp. Agent có thể:

- 📂 **Quản lý file/folder**: Tạo, đọc, sửa, xóa, đổi tên
- 🔍 **Tìm kiếm thông minh**: Tìm content trong code, file name, structure
- 🧮 **Phân tích code**: Detect language, functions, imports, structure
- 💡 **Đề xuất hành động**: Smart suggestions dựa trên context
- 🚀 **Thực thi tự động**: Execute các thao tác được suggest

## 🏗️ Kiến Trúc Hệ Thống

### Backend (Rust Tauri)
```
📁 src-tauri/src/lib.rs
├── AIAgentRequest struct       → Request structure
├── AIAgentResponse struct      → Response with execution time
├── ai_agent_file_operation()   → Main file operations handler
├── ai_agent_code_analysis()    → Code analysis engine
└── File Operations:
    ├── read_file              → Đọc content file
    ├── write_file             → Ghi content vào file  
    ├── create_file            → Tạo file mới
    ├── delete_file            → Xóa file
    ├── create_directory       → Tạo folder
    ├── delete_directory       → Xóa folder
    ├── rename_file            → Đổi tên file/folder
    ├── list_files             → List files trong directory
    ├── search_content         → Tìm kiếm content
    └── get_file_info          → Lấy metadata file
```

### Frontend (React + TypeScript)
```
📁 src/utils/aiAgentService.ts
├── AIAgentService class        → Main service class
├── executeFileOperation()      → Execute file operations
├── analyzeCode()              → Analyze code structure  
├── chatWithFileContext()      → AI chat với file context
├── executeAISuggestedAction() → Execute suggested actions
└── batchFileOperations()      → Batch operations

📁 src/components/AssistantPanel/
├── AIFileAgent.tsx            → Main UI component
├── AIFileAgent.module.css     → Professional styling
└── AssistantPanel.tsx         → Integration với tab system
```

## 🚀 Cách Sử Dụng

### 1. Thiết Lập API Key

```typescript
// Trong AgentSettings.tsx
const apiKey = "your-api-key";
const model = "gpt-4"; // hoặc claude-3, etc.
const baseUrl = "https://api.openai.com/v1"; // tùy chọn

localStorage.setItem('ai_agent_api_key', apiKey);
localStorage.setItem('ai_agent_model', model);
localStorage.setItem('ai_agent_base_url', baseUrl);
```

### 2. Khởi Tạo AI Agent

```typescript
import { AIAgentService } from './utils/aiAgentService';

const aiAgent = new AIAgentService(apiKey, model, baseUrl);
aiAgent.setWorkspace('/path/to/your/workspace');
```

### 3. File Operations

#### Đọc File
```typescript
// Cách 1: Direct command
await aiAgent.executeFileOperation({
  type: 'read',
  path: 'src/App.tsx'
});

// Cách 2: Natural language
await aiAgent.chatWithFileContext("Đọc file src/App.tsx và phân tích structure");
```

#### Tạo File
```typescript
// Tạo file với content
await aiAgent.executeFileOperation({
  type: 'create',
  path: 'src/components/NewComponent.tsx',
  content: `import React from 'react';

const NewComponent: React.FC = () => {
  return <div>Hello World</div>;
};

export default NewComponent;`
});
```

#### Tìm Kiếm
```typescript
// Tìm kiếm content
await aiAgent.executeFileOperation({
  type: 'search',
  path: workspacePath,
  query: 'useState'
});
```

### 4. Code Analysis

```typescript
// Phân tích code structure
const analysis = await aiAgent.analyzeCode('src/App.tsx');
console.log(analysis);
/* Output:
{
  file_path: "src/App.tsx",
  total_lines: 50,
  language: "TypeScript",
  size_bytes: 1250,
  analysis: {
    imports: [
      { line: 1, statement: "import React from 'react'" }
    ],
    functions: [
      { line: 5, name: "App", signature: "const App: React.FC = () => {" }
    ],
    comments: 3,
    empty_lines: 8
  }
}
*/
```

### 5. AI Chat với File Context

```typescript
// Chat với context của multiple files
const response = await aiAgent.chatWithFileContext(
  "Hãy review code này và suggest improvements",
  ['src/App.tsx', 'src/components/Header.tsx'], // files for context
  true // include workspace context
);
```

### 6. Batch Operations

```typescript
// Thực hiện nhiều operations cùng lúc
const operations = [
  { type: 'create', path: 'src/utils/helper.ts', content: '// Helper functions' },
  { type: 'create', path: 'src/types/index.ts', content: '// Type definitions' },
  { type: 'read', path: 'package.json' }
];

const results = await aiAgent.batchFileOperations(operations);
```

## 💬 Natural Language Commands

Agent hiểu các câu lệnh tiếng Việt và tiếng Anh:

### File Operations
```
✅ "Đọc file src/App.tsx"
✅ "Read file src/App.tsx"  
✅ "Tạo file component mới ở src/components/Button.tsx"
✅ "Create file src/components/Button.tsx"
✅ "Xóa file old-component.tsx"
✅ "Delete file old-component.tsx"
✅ "Đổi tên file từ old.tsx thành new.tsx"
```

### Search & Analysis
```
✅ "Tìm kiếm 'useState' trong workspace"
✅ "Search for 'handleClick' function"
✅ "Phân tích code trong file App.tsx"
✅ "Analyze code structure of src/components/"
```

### Code Generation
```
✅ "Tạo React component cho Button với TypeScript"
✅ "Generate API service for user management"
✅ "Viết test case cho component Header"
✅ "Create utility function for date formatting"
```

## 🔧 Advanced Features

### 1. Action Suggestions

Agent tự động extract các action suggestions từ AI response:

```typescript
// AI response: "You should create a new component at src/components/Button.tsx"
// → Auto tạo suggestion button để execute action
```

### 2. File Context Selection

```typescript
// Select multiple files for context
const selectedFiles = ['src/App.tsx', 'src/styles/App.css'];
await aiAgent.chatWithFileContext(
  "Optimize the styling and component structure",
  selectedFiles
);
```

### 3. Real-time Code Analysis

```typescript
// Auto analyze khi mở file
useEffect(() => {
  if (isCodeFile(currentFile)) {
    aiAgent.analyzeCode(currentFile).then(setCurrentAnalysis);
  }
}, [currentFile]);
```

### 4. Workspace Intelligence

```typescript
// Get workspace summary for context
const summary = await aiAgent.getWorkspaceSummary();
// Agent biết structure toàn bộ workspace
```

## 🛡️ Security & Permissions

### File System Security
- ✅ Sandbox trong workspace folder
- ✅ Validate file paths  
- ✅ Prevent directory traversal
- ✅ Check file permissions

### API Security
- ✅ API keys stored locally
- ✅ No sensitive data in logs
- ✅ Request/response validation
- ✅ Rate limiting support

## 🚀 Integration Examples

### Với Code Editor
```typescript
// Auto-complete với AI suggestions
const handleCodeCompletion = async (currentCode: string, position: number) => {
  const suggestion = await aiAgent.chatWithFileContext(
    `Complete this code: ${currentCode}`,
    [currentFile]
  );
  return suggestion;
};
```

### Với File Explorer  
```typescript
// Right-click context menu
const contextMenuItems = [
  {
    label: "🤖 Ask AI about this file",
    onClick: () => aiAgent.analyzeCode(selectedFile)
  },
  {
    label: "🔍 Find similar files", 
    onClick: () => aiAgent.executeFileOperation({
      type: 'search',
      path: workspacePath,
      query: extractKeywords(selectedFile)
    })
  }
];
```

### Với Terminal
```typescript
// Execute AI-suggested terminal commands  
const executeAICommand = async (description: string) => {
  const response = await aiAgent.chatWithFileContext(
    `Generate terminal command for: ${description}`
  );
  // Parse and execute command safely
};
```

## 📊 Performance Monitoring

```typescript
// Tracking execution performance
interface AIAgentResponse {
  success: boolean;
  data: any;
  message: string;
  execution_time_ms: number; // ⭐ Built-in performance tracking
}

// Log analytics
console.log(`Operation completed in ${response.execution_time_ms}ms`);
```

## 🔄 Error Handling

```typescript
try {
  const result = await aiAgent.executeFileOperation(operation);
  // Handle success
} catch (error) {
  // Comprehensive error handling
  if (error.message.includes('Permission denied')) {
    // Handle permission error
  } else if (error.message.includes('File not found')) {
    // Handle missing file
  } else {
    // Handle other errors
  }
}
```

## 🎯 Best Practices

### 1. Context Management
- Chỉ include files cần thiết vào context
- Sử dụng batch operations cho multiple files
- Clear context khi không cần

### 2. Performance Optimization
- Cache analysis results cho files ít thay đổi
- Debounce API calls
- Use pagination cho large search results

### 3. User Experience
- Show loading states
- Provide clear error messages
- Implement undo/redo functionality

### 4. Code Quality
- Validate AI-generated code before execution
- Format code automatically  
- Run linting checks

## 🔮 Future Enhancements

- [ ] **Multi-model support**: OpenAI, Claude, Local LLMs
- [ ] **Visual diff**: Show changes before applying
- [ ] **Version control**: Git integration
- [ ] **Collaborative**: Multi-user workspace
- [ ] **Templates**: Pre-built project templates
- [ ] **Debugging**: AI-powered debugging assistance

---

**💡 Tip**: Agent học từ mỗi tương tác để cải thiện suggestions và hiểu better về workspace structure của bạn!

**🎉 Kết quả**: Với AI Agent này, bạn có một "lập trình viên AI" có thể thực hiện mọi thao tác file system như một developer thật! 