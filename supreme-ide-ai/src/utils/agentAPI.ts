import { invoke } from '@tauri-apps/api/core';
import { 
  AgentAction, 
  CodeEdit, 
  FileOperation, 
  ChatMessage 
} from '../types/agent';

// Agent API Response Types
export interface AgentResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  total_matches: number;
  files_searched: number;
}

export interface SearchMatch {
  file_path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
  context_before: string[];
  context_after: string[];
}

// API Functions
export class AgentAPI {
  /**
   * Execute any agent action
   */
  static async executeAction(action: AgentAction): Promise<AgentResponse> {
    try {
      const result = await invoke('agent_execute_action', { action });
      return {
        status: 'success',
        data: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error as string
      };
    }
  }

  /**
   * Search for files by name or content
   */
  static async searchFiles(
    query: string,
    searchType: 'file_search' | 'content_search' | 'symbol_search' = 'content_search',
    options?: {
      scope?: string;
      caseSensitive?: boolean;
      useRegex?: boolean;
    }
  ): Promise<SearchResult> {
    const request = {
      query,
      search_type: searchType,
      scope: options?.scope,
      case_sensitive: options?.caseSensitive,
      use_regex: options?.useRegex
    };

    try {
      const result = await invoke('agent_search_files', { request });
      return result as SearchResult;
    } catch (error) {
      console.error('Search failed:', error);
      return {
        matches: [],
        total_matches: 0,
        files_searched: 0
      };
    }
  }

  /**
   * Edit code at specific line
   */
  static async editCode(edit: CodeEdit): Promise<AgentResponse> {
    const request = {
      file_path: edit.filePath,
      line_number: edit.lineNumber,
      column_number: edit.columnNumber,
      old_code: edit.oldCode,
      new_code: edit.newCode,
      description: edit.description
    };

    try {
      const result = await invoke('agent_edit_code', { request });
      return {
        status: 'success',
        data: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error as string
      };
    }
  }

  /**
   * Manage files (read, write, delete, create, rename, move)
   */
  static async manageFile(operation: FileOperation): Promise<AgentResponse> {
    const request = {
      operation_type: operation.type,
      path: operation.path,
      content: operation.content,
      new_path: operation.newPath,
      line_range: operation.lineRange
    };

    try {
      const result = await invoke('agent_manage_files', { request });
      return {
        status: 'success',
        data: result
      };
    } catch (error) {
      return {
        status: 'error',
        error: error as string
      };
    }
  }

  /**
   * Read file content
   */
  static async readFile(relativePath: string): Promise<string> {
    try {
      const content = await invoke('read_file_content', { relativePath });
      return content as string;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Get directory tree structure
   */
  static async getDirectoryTree(dirPath: string): Promise<any> {
    try {
      const tree = await invoke('get_directory_tree', { dirPath });
      return tree;
    } catch (error) {
      throw new Error(`Failed to get directory tree: ${error}`);
    }
  }

  /**
   * Search content in files (legacy method for compatibility)
   */
  static async searchInFiles(
    query: string,
    workspaceRoot: string,
    caseSensitive: boolean = false
  ): Promise<SearchResult> {
    try {
      const result = await invoke('search_in_files', {
        query,
        workspaceRoot,
        caseSensitive
      });
      return result as SearchResult;
    } catch (error) {
      console.error('Search in files failed:', error);
      return {
        matches: [],
        total_matches: 0,
        files_searched: 0
      };
    }
  }
}

// Gemini API Integration
export class GeminiAPI {
  private static apiKey: string | null = null;
  private static baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  static setApiKey(key: string) {
    this.apiKey = key;
  }

  static async generateContent(
    prompt: string,
    context?: {
      files?: Array<{ name: string; content: string }>;
      images?: Array<{ name: string; data: string }>;
      codeContext?: string;
    }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not set. Please configure your Gemini API key.');
    }

    const messages = [];
    
    // Add context if provided
    if (context) {
      if (context.codeContext) {
        messages.push({
          role: 'system',
          content: `Code Context:\n${context.codeContext}`
        });
      }
      
      if (context.files && context.files.length > 0) {
        const filesContext = context.files.map(file => 
          `File: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``
        ).join('\n\n');
        messages.push({
          role: 'system',
          content: `Attached Files:\n${filesContext}`
        });
      }
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await fetch(`${this.baseURL}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map(msg => ({
            role: msg.role === 'system' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No content generated from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

// Agent Orchestrator - Combines all agent capabilities
export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private agentConfigs: Map<string, any> = new Map();

  static getInstance(): AgentOrchestrator {
    if (!this.instance) {
      this.instance = new AgentOrchestrator();
    }
    return this.instance;
  }

  setAgentConfig(providerId: string, config: any) {
    this.agentConfigs.set(providerId, config);
    
    // Set API keys for external services
    if (providerId === 'gemini' && config.apiKey) {
      GeminiAPI.setApiKey(config.apiKey);
    }
  }

  async processMessage(
    message: ChatMessage,
    agentId: string,
    workspacePath?: string
  ): Promise<ChatMessage> {
    // const agentConfig = this.agentConfigs.get(agentId);
    
    try {
      let response: string;
      
      switch (agentId) {
        case 'gemini':
          response = await this.processWithGemini(message, workspacePath);
          break;
        case 'file-backend':
          response = await this.processWithFileBackend(message, workspacePath);
          break;
        case 'ast-engine':
          response = await this.processWithASTEngine(message, workspacePath);
          break;
        default:
          response = await this.processWithGenericAgent(message, agentId, workspacePath);
      }

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        actions: this.generateActionsFromResponse(message, response, workspacePath)
      };
    } catch (error) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Lỗi xử lý: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async processWithGemini(message: ChatMessage, workspacePath?: string): Promise<string> {
    const context: any = {};
    
    // Add file attachments to context
    if (message.attachments) {
      context.files = message.attachments
        .filter(att => att.type === 'file')
        .map(att => ({
          name: att.name,
          content: att.content || ''
        }));
      
      context.images = message.attachments
        .filter(att => att.type === 'image')
        .map(att => ({
          name: att.name,
          data: att.content || ''
        }));
    }

    // Add workspace context if available
    if (workspacePath) {
      try {
        const tree = await AgentAPI.getDirectoryTree(workspacePath);
        context.codeContext = `Workspace: ${workspacePath}\nStructure: ${JSON.stringify(tree, null, 2)}`;
      } catch (error) {
        console.warn('Could not get workspace context:', error);
      }
    }

    return await GeminiAPI.generateContent(message.content, context);
  }

  private async processWithFileBackend(message: ChatMessage, workspacePath?: string): Promise<string> {
    // Handle file operations
    const content = message.content.toLowerCase();
    
    if (content.includes('list') || content.includes('show files')) {
      try {
        const tree = await AgentAPI.getDirectoryTree(workspacePath || '.');
        return `📁 **File Structure:**\n\`\`\`\n${JSON.stringify(tree, null, 2)}\n\`\`\``;
      } catch (error) {
        return `❌ Could not list files: ${error}`;
      }
    }
    
    if (content.includes('search')) {
      const queryMatch = content.match(/search\s+(.+)/);
      if (queryMatch) {
        const query = queryMatch[1];
        try {
          const results = await AgentAPI.searchFiles(query, 'content_search');
          return `🔍 **Search Results for "${query}":**\n\nFound ${results.total_matches} matches in ${results.files_searched} files.`;
        } catch (error) {
          return `❌ Search failed: ${error}`;
        }
      }
    }

    return "🗂️ File Backend Agent ready. I can list files, search content, read/write files, and manage your project structure.";
  }

  private async processWithASTEngine(_message: ChatMessage, _workspacePath?: string): Promise<string> {
    // Handle precise code editing
    return "📚 AST Engine ready. I can perform precise code modifications, refactoring, and syntax-aware edits.";
  }

  private async processWithGenericAgent(_message: ChatMessage, agentId: string, _workspacePath?: string): Promise<string> {
    // Default response for other agents
    return `🤖 ${agentId} agent processed your request. Advanced capabilities coming soon!`;
  }

  private generateActionsFromResponse(message: ChatMessage, _response: string, workspacePath?: string): AgentAction[] {
    const actions: AgentAction[] = [];
    const content = message.content.toLowerCase();

    // Generate file operation actions
    if (content.includes('open') || content.includes('read')) {
      actions.push({
        id: `action-${Date.now()}`,
        type: 'file_operation',
        description: 'Open file',
        payload: { type: 'read', path: workspacePath },
        status: 'pending'
      });
    }

    // Generate search actions
    if (content.includes('search') || content.includes('find')) {
      actions.push({
        id: `action-${Date.now()}-search`,
        type: 'search',
        description: 'Search in codebase',
        payload: { query: 'component', type: 'content_search' },
        status: 'pending'
      });
    }

    return actions;
  }
} 