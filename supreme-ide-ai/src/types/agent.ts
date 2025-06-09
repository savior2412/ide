export interface AgentProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  capabilities: string[];
  models: AgentModel[];
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  maxTokens?: number;
  supportedFileTypes?: string[];
}

export interface AgentModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens?: number;
  features: string[];
}

export interface AgentConfig {
  providerId: string;
  modelId: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  actions?: AgentAction[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'file' | 'image' | 'code' | 'folder';
  content?: string;
  path?: string;
  size?: number;
  mimeType?: string;
}

export interface AgentAction {
  id: string;
  type: 'file_operation' | 'search' | 'code_edit' | 'terminal' | 'analysis';
  description: string;
  payload: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'create' | 'rename' | 'move';
  path: string;
  content?: string;
  newPath?: string;
  lineRange?: [number, number];
}

export interface CodeEdit {
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  oldCode: string;
  newCode: string;
  description: string;
}

export interface SearchOperation {
  type: 'file_search' | 'content_search' | 'symbol_search';
  query: string;
  scope?: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

// Predefined Agents
export const AGENT_PROVIDERS: AgentProvider[] = [
  {
    id: 'gemini',
    name: 'LLM Agent',
    icon: '🧠',
    description: 'Gemini 2.5 Pro API (1M ctx)',
    capabilities: ['Sinh code, hiểu logic'],
    models: [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Experimental',
        description: 'Latest experimental model with enhanced reasoning',
        maxTokens: 1000000,
        features: ['Code Generation', 'Logic Understanding', 'Multi-modal']
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Production-ready model with reliable performance',
        maxTokens: 2000000,
        features: ['Code Analysis', 'File Processing', 'Context Retention']
      }
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: 'Enter your Gemini API key...',
    maxTokens: 2000000,
    supportedFileTypes: ['*']
  },
  {
    id: 'multi-agent',
    name: 'Multi-agent engine',
    icon: '🌐',
    description: 'LangGraph-style (crew.ai)',
    capabilities: ['Planner → Fixer → Tester'],
    models: [
      {
        id: 'crew-planner',
        name: 'Crew Planner',
        description: 'Multi-step task planning and execution',
        maxTokens: 500000,
        features: ['Task Decomposition', 'Workflow Planning', 'Agent Coordination']
      }
    ],
    requiresApiKey: false,
    maxTokens: 500000
  },
  {
    id: 'file-backend',
    name: 'File backend',
    icon: '🗂️',
    description: 'Tauri (Rust) fs / shell interface',
    capabilities: ['Truy cập file, folder, shell native'],
    models: [
      {
        id: 'tauri-fs',
        name: 'Tauri File System',
        description: 'Native file system operations via Rust backend',
        maxTokens: 0,
        features: ['File Operations', 'Directory Management', 'Shell Commands']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'memory-engine',
    name: 'Memory ngữ cảnh dài hạn',
    icon: '🧩',
    description: 'Chroma (vectorDB) + summarizer',
    capabilities: ['Ghi nhớ toàn bộ project'],
    models: [
      {
        id: 'chroma-memory',
        name: 'Chroma Vector Memory',
        description: 'Long-term memory with vector similarity search',
        maxTokens: 0,
        features: ['Vector Storage', 'Semantic Search', 'Context Summarization']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'feedback-learning',
    name: 'Tự học feedback',
    icon: '🧠',
    description: 'Track diff từ user + Lưu vector',
    capabilities: ['AI học từ lỗi trước đó'],
    models: [
      {
        id: 'feedback-learner',
        name: 'Feedback Learning System',
        description: 'Learn from user corrections and improve over time',
        maxTokens: 0,
        features: ['Diff Tracking', 'Pattern Recognition', 'Continuous Learning']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'test-engine',
    name: 'Test engine',
    icon: '🧪',
    description: 'Jest + Playwright / Vitest',
    capabilities: ['Sinh test tự động'],
    models: [
      {
        id: 'test-generator',
        name: 'Test Generator',
        description: 'Automatic test generation and execution',
        maxTokens: 100000,
        features: ['Unit Tests', 'Integration Tests', 'E2E Tests']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'cicd-engine',
    name: 'CI/CD engine',
    icon: '📦',
    description: 'GitHub Actions + Dockerfile AI-gen',
    capabilities: ['Tự deploy app'],
    models: [
      {
        id: 'cicd-automator',
        name: 'CI/CD Automator',
        description: 'Automated deployment pipeline generation',
        maxTokens: 50000,
        features: ['Pipeline Generation', 'Docker Configuration', 'Deployment Automation']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'ast-engine',
    name: 'AST engine',
    icon: '📚',
    description: 'Tree-sitter + custom patch engine',
    capabilities: ['Sửa chính xác dòng'],
    models: [
      {
        id: 'ast-editor',
        name: 'AST Code Editor',
        description: 'Precise code editing using Abstract Syntax Trees',
        maxTokens: 200000,
        features: ['Syntax-Aware Editing', 'Precise Modifications', 'Code Structure Analysis']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'plugin-engine',
    name: 'Plugin AI engine',
    icon: '🔌',
    description: 'Plugin loader từ Rust → JS agent',
    capabilities: ['AI chuyên biệt (ex: AI test, AI UI)'],
    models: [
      {
        id: 'plugin-system',
        name: 'Plugin System',
        description: 'Extensible AI plugin architecture',
        maxTokens: 100000,
        features: ['Plugin Loading', 'Specialized AI', 'Custom Workflows']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'context-manager',
    name: 'Context Manager',
    icon: '📋',
    description: 'Sliding window + Compression',
    capabilities: ['Không vượt token API'],
    models: [
      {
        id: 'context-optimizer',
        name: 'Context Optimizer',
        description: 'Intelligent context management and compression',
        maxTokens: 0,
        features: ['Token Management', 'Context Compression', 'Smart Windowing']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'log-analyzer',
    name: 'Log Analyzer',
    icon: '📊',
    description: 'Regex parser + lỗi phổ biến',
    capabilities: ['Fixer xử lý lỗi đúng'],
    models: [
      {
        id: 'log-parser',
        name: 'Log Parser',
        description: 'Intelligent log analysis and error detection',
        maxTokens: 50000,
        features: ['Error Detection', 'Pattern Matching', 'Solution Suggestions']
      }
    ],
    requiresApiKey: false
  },
  {
    id: 'task-builder',
    name: 'Task Tree Builder',
    icon: '🛠️',
    description: 'JSON → TTD → executor step',
    capabilities: ['Có cấu trúc rõ ràng'],
    models: [
      {
        id: 'task-executor',
        name: 'Task Executor',
        description: 'Structured task decomposition and execution',
        maxTokens: 100000,
        features: ['Task Planning', 'Step-by-step Execution', 'Progress Tracking']
      }
    ],
    requiresApiKey: false
  }
]; 