import React, { useState, useRef, useEffect } from 'react';
import styles from './AIFileAgent.module.css';
import { AIAgentService, FileOperation, CodeAnalysis } from '../../utils/aiAgentService';

interface AIFileAgentProps {
  workspacePath: string;
  onFileChanged?: (filePath: string) => void;
  onWorkspaceChanged?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  fileContext?: string[];
  operations?: FileOperation[];
}

interface ActionSuggestion {
  id: string;
  description: string;
  operation: FileOperation;
  confidence: number;
}

const AIFileAgent: React.FC<AIFileAgentProps> = ({ 
  workspacePath, 
  onFileChanged, 
  onWorkspaceChanged 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiAgent, setAIAgent] = useState<AIAgentService | null>(null);
  const [selectedFiles] = useState<string[]>([]);
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestion[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<CodeAnalysis | null>(null);
  const [showFileSelector, setShowFileSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize AI Agent
  useEffect(() => {
    const apiKey = localStorage.getItem('ai_agent_api_key');
    const model = localStorage.getItem('ai_agent_model') || 'gpt-4';
    const baseUrl = localStorage.getItem('ai_agent_base_url') || undefined;

    if (apiKey) {
      const agent = new AIAgentService(apiKey, model, baseUrl);
      agent.setWorkspace(workspacePath);
      setAIAgent(agent);
      
      // Welcome message
      addSystemMessage(`🤖 AI File Agent khởi tạo thành công!
      
📁 **Workspace:** ${workspacePath}
🎯 **Khả năng:** Tôi có thể giúp bạn:
- 📖 Đọc và phân tích file
- ✏️ Tạo, sửa, xóa file
- 🔍 Tìm kiếm trong workspace  
- 🧮 Phân tích code structure
- 💡 Đề xuất cải thiện code

**Ví dụ câu lệnh:**
- "Đọc file src/App.tsx"
- "Tạo file component mới"  
- "Tìm kiếm function handleClick"
- "Phân tích file này"
- "Sửa lỗi trong file X"`);
    } else {
      addSystemMessage('⚠️ Vui lòng thiết lập API key trong Settings để sử dụng AI Agent');
    }
  }, [workspacePath]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (type: 'user' | 'ai' | 'system', content: string, fileContext?: string[], operations?: FileOperation[]) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      fileContext,
      operations
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addSystemMessage = (content: string) => {
    addMessage('system', content);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !aiAgent || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Check if this is a direct file operation command
      const directOperation = parseDirectCommand(userMessage);
      
      if (directOperation) {
        await executeDirectOperation(directOperation);
      } else {
        // Use AI chat with context
        await handleAIChat(userMessage);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      addMessage('ai', `❌ Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseDirectCommand = (message: string): FileOperation | null => {
    const lower = message.toLowerCase();
    
    // Đọc file
    if (lower.match(/^(đọc|read|open)\s+file?\s+/)) {
      const pathMatch = message.match(/(?:đọc|read|open)\s+file?\s+([^\s]+)/i);
      if (pathMatch) {
        return { type: 'read', path: pathMatch[1] };
      }
    }
    
    // Tạo file
    if (lower.match(/^(tạo|create|make)\s+file?\s+/)) {
      const pathMatch = message.match(/(?:tạo|create|make)\s+file?\s+([^\s]+)/i);
      if (pathMatch) {
        return { type: 'create', path: pathMatch[1], content: '' };
      }
    }
    
    // Xóa file
    if (lower.match(/^(xóa|delete|remove)\s+file?\s+/)) {
      const pathMatch = message.match(/(?:xóa|delete|remove)\s+file?\s+([^\s]+)/i);
      if (pathMatch) {
        return { type: 'delete', path: pathMatch[1] };
      }
    }
    
    // Tìm kiếm
    if (lower.match(/^(tìm|search|find)\s+/)) {
      const queryMatch = message.match(/(?:tìm|search|find)\s+(.+)/i);
      if (queryMatch) {
        return { type: 'search', path: workspacePath, query: queryMatch[1] };
      }
    }
    
    return null;
  };

  const executeDirectOperation = async (operation: FileOperation) => {
    try {
      const result = await aiAgent!.executeFileOperation(operation);
      
      let responseMessage = '';
      
      switch (operation.type) {
        case 'read':
          responseMessage = `📖 **Đọc file thành công:** \`${operation.path}\`
          
**Kích thước:** ${result.data.size} bytes
**Nội dung:**
\`\`\`
${result.data.content.substring(0, 2000)}${result.data.content.length > 2000 ? '\n... (truncated)' : ''}
\`\`\``;
          
          // Analyze code if it's a code file
          if (isCodeFile(operation.path)) {
            const analysis = await aiAgent!.analyzeCode(operation.path);
            setCurrentAnalysis(analysis);
            responseMessage += `\n\n🔍 **Code Analysis:**
- **Language:** ${analysis.language}
- **Lines:** ${analysis.total_lines}
- **Functions:** ${analysis.analysis.functions.length}
- **Imports:** ${analysis.analysis.imports.length}
- **Comments:** ${analysis.analysis.comments}`;
          }
          break;
          
        case 'create':
          responseMessage = `✅ **Tạo file thành công:** \`${operation.path}\``;
          onFileChanged?.(operation.path);
          break;
          
        case 'delete':
          responseMessage = `🗑️ **Xóa file thành công:** \`${operation.path}\``;
          onWorkspaceChanged?.();
          break;
          
        case 'search':
          const searchResults = result.data.results;
          responseMessage = `🔍 **Kết quả tìm kiếm:** "${operation.query}"
          
**Tìm thấy:** ${searchResults.total_matches} matches trong ${searchResults.files_searched} files
          
${searchResults.matches.slice(0, 5).map((match: any) => 
  `📄 **${match.file_path}** (line ${match.line_number}):
\`${match.line_content.trim()}\``
).join('\n\n')}

${searchResults.matches.length > 5 ? `\n... và ${searchResults.matches.length - 5} kết quả khác` : ''}`;
          break;
      }
      
      addMessage('ai', responseMessage, [operation.path], [operation]);
      
    } catch (error) {
      addMessage('ai', `❌ **Lỗi thực hiện ${operation.type}:** ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAIChat = async (message: string) => {
    try {
      const response = await aiAgent!.chatWithFileContext(
        message,
        selectedFiles,
        true
      );
      
      addMessage('ai', response, selectedFiles);
      
      // Extract suggested actions from AI response
      const suggestions = extractActionSuggestions(response);
      setActionSuggestions(suggestions);
      
    } catch (error) {
      addMessage('ai', `❌ **AI Chat Error:** ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const extractActionSuggestions = (aiResponse: string): ActionSuggestion[] => {
    const suggestions: ActionSuggestion[] = [];
    
    // Simple pattern matching for action suggestions
    const patterns = [
      { pattern: /create file (.+)/gi, type: 'create' as const },
      { pattern: /delete file (.+)/gi, type: 'delete' as const },
      { pattern: /read file (.+)/gi, type: 'read' as const },
      { pattern: /search for (.+)/gi, type: 'search' as const }
    ];
    
    patterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(aiResponse)) !== null) {
        suggestions.push({
          id: Date.now().toString() + Math.random(),
          description: match[0],
          operation: {
            type,
            path: type === 'search' ? workspacePath : match[1].trim(),
            query: type === 'search' ? match[1].trim() : undefined
          },
          confidence: 0.8
        });
      }
    });
    
    return suggestions;
  };

  const executeActionSuggestion = async (suggestion: ActionSuggestion) => {
    setIsLoading(true);
    try {
      await executeDirectOperation(suggestion.operation);
      setActionSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Error executing suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isCodeFile = (path: string): boolean => {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rs', '.java', '.cpp', '.c', '.go', '.rb', '.php', '.cs'];
    return codeExtensions.some(ext => path.toLowerCase().endsWith(ext));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.aiFileAgent}>
      <div className={styles.header}>
        <div className={styles.title}>
          🤖 AI File Agent
          {aiAgent && <span className={styles.status}>🟢 Connected</span>}
        </div>
        
        <div className={styles.controls}>
          <button 
            className={styles.fileSelector}
            onClick={() => setShowFileSelector(!showFileSelector)}
            title="Select files for context"
          >
            📁 Files ({selectedFiles.length})
          </button>
          
          {currentAnalysis && (
            <button 
              className={styles.analysisBtn}
              onClick={() => {/* Show analysis modal */}}
              title="View code analysis"
            >
              📊 Analysis
            </button>
          )}
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages.map((message) => (
          <div key={message.id} className={`${styles.message} ${styles[message.type]}`}>
            <div className={styles.messageHeader}>
              <span className={styles.messageType}>
                {message.type === 'user' ? '👤' : message.type === 'ai' ? '🤖' : '⚙️'}
              </span>
              <span className={styles.timestamp}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className={styles.messageContent}>
              {message.content}
            </div>
            {message.fileContext && message.fileContext.length > 0 && (
              <div className={styles.fileContext}>
                📁 Context: {message.fileContext.join(', ')}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.loading}>
              🤖 AI đang xử lý...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {actionSuggestions.length > 0 && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionsTitle}>💡 Gợi ý hành động:</div>
          {actionSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className={styles.suggestionBtn}
              onClick={() => executeActionSuggestion(suggestion)}
              disabled={isLoading}
            >
              {suggestion.description}
              <span className={styles.confidence}>
                {Math.round(suggestion.confidence * 100)}%
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập lệnh hoặc câu hỏi cho AI Agent... (VD: 'đọc file src/App.tsx', 'tìm function handleClick')"
          className={styles.input}
          disabled={!aiAgent || isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || !aiAgent || isLoading}
          className={styles.sendButton}
        >
          {isLoading ? '⏳' : '🚀'}
        </button>
      </div>

      {!aiAgent && (
        <div className={styles.noApiKey}>
          ⚠️ Thiết lập API key trong cài đặt để sử dụng AI Agent
        </div>
      )}
    </div>
  );
};

export default AIFileAgent; 