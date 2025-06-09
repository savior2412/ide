import { invoke } from '@tauri-apps/api/core';

// Types
export interface AIAgentRequest {
  action: string;
  parameters: Record<string, any>;
  context?: string;
}

export interface AIAgentResponse {
  success: boolean;
  data: any;
  message: string;
  execution_time_ms: number;
}

export interface FileOperation {
  type: 'read' | 'write' | 'create' | 'delete' | 'rename' | 'search';
  path: string;
  content?: string;
  newPath?: string;
  query?: string;
}

export interface CodeAnalysis {
  file_path: string;
  total_lines: number;
  language: string;
  size_bytes: number;
  analysis: {
    imports: Array<{ line: number; statement: string }>;
    functions: Array<{ line: number; name: string; signature: string }>;
    classes: Array<any>;
    comments: number;
    empty_lines: number;
  };
}

// AI Agent Service Class
export class AIAgentService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private workspacePath: string;

  constructor(apiKey: string, model: string = 'gpt-4', baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
    this.workspacePath = '';
  }

  setWorkspace(path: string) {
    this.workspacePath = path;
  }

  // File System Operations
  async executeFileOperation(operation: FileOperation): Promise<AIAgentResponse> {
    const request: AIAgentRequest = {
      action: operation.type === 'read' ? 'read_file' :
              operation.type === 'write' ? 'write_file' :
              operation.type === 'create' ? 'create_file' :
              operation.type === 'delete' ? 'delete_file' :
              operation.type === 'rename' ? 'rename_file' :
              operation.type === 'search' ? 'search_content' : 'unknown',
      parameters: this.buildParameters(operation),
      context: `Workspace: ${this.workspacePath}`
    };

    try {
      const response = await invoke<AIAgentResponse>('ai_agent_file_operation', { request });
      console.log(`🤖 File operation ${operation.type} completed:`, response);
      return response;
    } catch (error) {
      console.error(`❌ File operation ${operation.type} failed:`, error);
      throw error;
    }
  }

  private buildParameters(operation: FileOperation): Record<string, any> {
    switch (operation.type) {
      case 'read':
        return { path: operation.path };
      
      case 'write':
        return { path: operation.path, content: operation.content || '' };
      
      case 'create':
        return { path: operation.path, content: operation.content || '' };
      
      case 'delete':
        return { path: operation.path };
      
      case 'rename':
        return { old_path: operation.path, new_path: operation.newPath || '' };
      
      case 'search':
        return { 
          query: operation.query || '', 
          workspace: this.workspacePath,
          case_sensitive: false 
        };
      
      default:
        return {};
    }
  }

  // Code Analysis
  async analyzeCode(filePath: string): Promise<CodeAnalysis> {
    try {
      const response = await invoke<CodeAnalysis>('ai_agent_code_analysis', { filePath });
      console.log(`🔍 Code analysis completed for ${filePath}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Code analysis failed for ${filePath}:`, error);
      throw error;
    }
  }

  // AI Chat with File Context
  async chatWithFileContext(
    message: string, 
    filePaths: string[] = [],
    includeWorkspaceContext: boolean = true
  ): Promise<string> {
    try {
      let context = '';
      
      // Gather file context
      if (filePaths.length > 0) {
        const fileContents = await Promise.all(
          filePaths.map(async (path) => {
            try {
              const response = await this.executeFileOperation({
                type: 'read',
                path
              });
              return {
                path,
                content: response.data.content,
                language: this.detectLanguage(path)
              };
            } catch (error) {
              console.warn(`Failed to read file ${path}:`, error);
              return null;
            }
          })
        );

        context += '\n\n📁 **File Context:**\n';
        fileContents.forEach(file => {
          if (file) {
            context += `\n### ${file.path} (${file.language})\n\`\`\`${file.language.toLowerCase()}\n${file.content}\n\`\`\`\n`;
          }
        });
      }

      // Add workspace context
      if (includeWorkspaceContext && this.workspacePath) {
        context += `\n\n🏠 **Workspace:** ${this.workspacePath}`;
        
        try {
          const workspaceFiles = await this.executeFileOperation({
            type: 'search',
            path: this.workspacePath,
            query: '' // Get all files
          });
          context += `\n📊 **Workspace Stats:** ${workspaceFiles.data.results?.files_searched || 0} files scanned`;
        } catch (error) {
          console.warn('Failed to get workspace context:', error);
        }
      }

      // Call AI API
      const aiResponse = await this.callAIAPI(message, context);
      return aiResponse;

    } catch (error) {
      console.error('❌ AI chat failed:', error);
      throw error;
    }
  }

  // Execute AI-Suggested Actions
  async executeAISuggestedAction(actionDescription: string): Promise<any> {
    console.log('🤖 Parsing AI action:', actionDescription);
    
    // Simple action parsing (can be improved with better NLP)
    const action = this.parseActionDescription(actionDescription);
    
    if (!action) {
      throw new Error('Unable to parse action description');
    }

    return await this.executeFileOperation(action);
  }

  private parseActionDescription(description: string): FileOperation | null {
    const lower = description.toLowerCase();
    
    if (lower.includes('create file') || lower.includes('make file')) {
      const pathMatch = description.match(/(?:create|make)\s+file\s+(?:at\s+)?["']?([^"'\s]+)["']?/i);
      if (pathMatch) {
        return {
          type: 'create',
          path: pathMatch[1],
          content: ''
        };
      }
    }
    
    if (lower.includes('delete file') || lower.includes('remove file')) {
      const pathMatch = description.match(/(?:delete|remove)\s+file\s+["']?([^"'\s]+)["']?/i);
      if (pathMatch) {
        return {
          type: 'delete',
          path: pathMatch[1]
        };
      }
    }
    
    if (lower.includes('read file') || lower.includes('open file')) {
      const pathMatch = description.match(/(?:read|open)\s+file\s+["']?([^"'\s]+)["']?/i);
      if (pathMatch) {
        return {
          type: 'read',
          path: pathMatch[1]
        };
      }
    }
    
    if (lower.includes('search for')) {
      const queryMatch = description.match(/search\s+for\s+["']?([^"'\n]+)["']?/i);
      if (queryMatch) {
        return {
          type: 'search',
          path: this.workspacePath,
          query: queryMatch[1]
        };
      }
    }
    
    return null;
  }

  private async callAIAPI(message: string, context: string): Promise<string> {
    const systemPrompt = `You are an AI coding assistant integrated with a file system. You can:

1. **File Operations**: Read, write, create, delete, rename files
2. **Code Analysis**: Analyze code structure, functions, imports
3. **Search**: Find content across the workspace
4. **Code Generation**: Write and modify code

Available file operations you can suggest:
- "Create file at path/to/file.ext"
- "Delete file path/to/file.ext" 
- "Read file path/to/file.ext"
- "Search for query_text"
- "Write to file path with content"

When suggesting file operations, be specific about paths and actions.
Current workspace: ${this.workspacePath}

${context}`;

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 4000,
      temperature: 0.7
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response from AI';
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript', 
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown'
    };
    
    return langMap[ext || ''] || 'text';
  }

  // Batch Operations
  async batchFileOperations(operations: FileOperation[]): Promise<AIAgentResponse[]> {
    console.log(`🔄 Executing ${operations.length} batch file operations`);
    
    const results = await Promise.allSettled(
      operations.map(op => this.executeFileOperation(op))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`❌ Batch operation ${index} failed:`, result.reason);
        return {
          success: false,
          data: null,
          message: result.reason?.toString() || 'Unknown error',
          execution_time_ms: 0
        };
      }
    });
  }

  // Get Workspace Summary
  async getWorkspaceSummary(): Promise<any> {
    if (!this.workspacePath) {
      throw new Error('No workspace set');
    }

    try {
      const listResult = await this.executeFileOperation({
        type: 'search',
        path: this.workspacePath,
        query: '' // Empty query to get file structure
      });

      return {
        workspace_path: this.workspacePath,
        summary: listResult.data
      };
    } catch (error) {
      console.error('❌ Failed to get workspace summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiAgent = new AIAgentService('');

// Helper functions
export function initializeAIAgent(apiKey: string, model: string = 'gpt-4', baseUrl?: string) {
  const agent = new AIAgentService(apiKey, model, baseUrl);
  return agent;
}

export default AIAgentService; 