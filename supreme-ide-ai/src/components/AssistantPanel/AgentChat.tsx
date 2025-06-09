import React, { useState, useRef, useEffect } from 'react';
import styles from './AgentChat.module.css';
import { ChatMessage, ChatAttachment } from '../../types/agent';
import { GeminiAPI } from '../../utils/agentAPI';
import AgentSettings, { AgentSettingsData } from './AgentSettings';

interface SimpleAgentConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: string[];
  description: string;
  systemPrompt: string;
}

const PREDEFINED_AGENTS: SimpleAgentConfig[] = [
  {
    id: 'llm-agent',
    name: 'LLM Agent',
    provider: 'gemini',
    model: 'gemini-2.5-pro-preview-05-06',
    capabilities: ['Code generation', 'Logic understanding', 'File operations', 'Project analysis'],
    description: 'Gemini 2.5 Flash Experimental',
    systemPrompt: 'You are a helpful AI assistant specialized in code generation and understanding.'
  },
  {
    id: 'multi-agent',
    name: 'Multi-Agent Engine',
    provider: 'crew',
    model: 'langgraph-style',
    capabilities: ['Planner → Fixer → Tester', 'Complex workflows', 'Team coordination'],
    description: 'LangGraph-style crew.ai',
    systemPrompt: 'You coordinate multiple specialized agents for complex tasks.'
  },
  {
    id: 'file-backend',
    name: 'File Backend',
    provider: 'tauri',
    model: 'rust-fs',
    capabilities: ['Native file system access', 'Folder operations', 'Cross-platform support'],
    description: 'Tauri Rust fs/shell interface',
    systemPrompt: 'You handle file system operations through Tauri Rust backend.'
  }
];

interface AgentChatProps {
  workspacePath?: string;
  onFileSelect?: (path: string, line?: number, column?: number) => void;
  onOpenFolder?: () => void;
}

const AgentChat: React.FC<AgentChatProps> = ({ onOpenFolder }) => {
  const [selectedAgent, setSelectedAgent] = useState<SimpleAgentConfig>(PREDEFINED_AGENTS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 **Xin chào! Tôi là AI Assistant hoàn hảo của bạn!**\n\n🎯 **Tôi có thể giúp bạn:**\n\n🔍 **Tìm kiếm và phân tích code** - Tìm function, variable, pattern\n✏️ **Chỉnh sửa code chính xác** - Sửa đúng dòng, không ảnh hưởng code khác\n📁 **Quản lý file và folder** - Tạo, xóa, di chuyển, đổi tên\n🧪 **Sinh test tự động** - Unit test, integration test, E2E test\n🚀 **Deploy và CI/CD** - GitHub Actions, Docker, automation\n🧠 **Học từ feedback** - Ghi nhớ và cải thiện từ những lần trước\n\n💡 **Hãy chọn agent phù hợp và bắt đầu chat!**\n\n🔑 **Lưu ý:** Với Gemini Agent, bạn cần cung cấp API key để sử dụng đầy đủ tính năng.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [agentSettings, setAgentSettings] = useState<AgentSettingsData>({
    apiKey: '',
    selectedModel: 'gemini-2.5-pro-preview-05-06',
    customModel: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load settings from sessionStorage on mount
  useEffect(() => {
    const savedSettings = sessionStorage.getItem('agentSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setAgentSettings(parsed);
      } catch (error) {
        console.warn('Failed to parse saved agent settings:', error);
      }
    }
  }, []);

  // Auto-resize textarea function
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height 200px
      textarea.style.height = newHeight + 'px';
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    setTimeout(autoResizeTextarea, 0); // Use setTimeout to ensure DOM update
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    if (!agentSettings.apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "❌ Lỗi xử lý: Error: API key not set. Please configure your Gemini API key.",
        timestamp: new Date()
      }]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      GeminiAPI.setApiKey(agentSettings.apiKey);
      const response = await GeminiAPI.generateContent(
        inputMessage,
        {
          files: attachments
            .filter(att => att.type === 'file')
            .map(att => ({
              name: att.name,
              content: att.content || ''
            })),
          images: attachments
            .filter(att => att.type === 'image')
            .map(att => ({
              name: att.name,
              data: att.content || ''
            }))
        }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Lỗi xử lý: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: ChatAttachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          size: file.size,
          mimeType: file.type,
          content: e.target?.result as string
        };
        setAttachments(prev => [...prev, attachment]);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleAgentChange = (agent: SimpleAgentConfig) => {
    if (messages.length > 1) {
      const confirmMessage = `🔄 **Đã chuyển sang ${agent.name}**\n\n**Capabilities:**\n• ${agent.capabilities.join('\n• ')}`;
      
      const switchMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: confirmMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, switchMessage]);
    }
    setSelectedAgent(agent);
  };

  const handleSettingsSave = (newSettings: AgentSettingsData) => {
    setAgentSettings(newSettings);
    // Save to sessionStorage
    sessionStorage.setItem('agentSettings', JSON.stringify(newSettings));
    
    // Add success message
    const successMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "🔑 **API Key đã được lưu thành công!**\n\n✅ Agent **LLM Agent** hiện đã có thể truy cập đầy đủ các tính năng AI.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, successMessage]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  return (
    <div className={styles.agentChat}>
      <div className={styles.header}>
        <div className={styles.agentInfo}>
          <div className={styles.agentSelector}>
            <select 
              value={selectedAgent.id} 
              onChange={(e) => {
                const agent = PREDEFINED_AGENTS.find(a => a.id === e.target.value);
                if (agent) handleAgentChange(agent);
              }}
              className={styles.agentDropdown}
            >
              {PREDEFINED_AGENTS.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <span className={styles.agentDescription}>{selectedAgent.description}</span>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.settingsButton}
              onClick={() => setShowSettings(true)}
              title="Agent Settings"
            >
              🧠
            </button>
            <button 
              className={styles.capabilitiesButton}
              onClick={() => setShowCapabilities(!showCapabilities)}
              title="Show Capabilities"
            >
              💡 Capabilities
            </button>
          </div>
        </div>
        
        {showCapabilities && (
          <div className={styles.capabilities}>
            <h4>🛠️ **Capabilities:**</h4>
            <ul>
              {selectedAgent.capabilities.map((capability, index) => (
                <li key={index}>• {capability}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.messages}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageContent}>
              <div className={styles.messageText}>
                {message.content.split('\n').map((line, index) => (
                  <div key={index}>
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <strong>{line.slice(2, -2)}</strong>
                    ) : line.startsWith('• ') ? (
                      <div className={styles.listItem}>{line}</div>
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
              {message.attachments && (
                <div className={styles.messageAttachments}>
                  {message.attachments.map(attachment => (
                    <div key={attachment.id} className={styles.attachment}>
                      <span className={styles.attachmentIcon}>
                        {attachment.type === 'image' ? '🖼️' : '📄'}
                      </span>
                      <span className={styles.attachmentName}>{attachment.name}</span>
                      <span className={styles.attachmentSize}>({formatFileSize(attachment.size || 0)})</span>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.timestamp}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <div className={styles.typing}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {attachments.length > 0 && (
        <div className={styles.attachmentPreview}>
          <div className={styles.attachmentList}>
            {attachments.map(attachment => (
              <div key={attachment.id} className={styles.attachmentItem}>
                <span className={styles.attachmentIcon}>
                  {attachment.type === 'image' ? '🖼️' : '📄'}
                </span>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentName}>{attachment.name}</span>
                  <span className={styles.attachmentSize}>({formatFileSize(attachment.size || 0)})</span>
                </div>
                <button 
                  className={styles.removeAttachment}
                  onClick={() => removeAttachment(attachment.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.inputArea}>
        <div className={styles.inputActions}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.txt,.md,.js,.jsx,.ts,.tsx,.py,.rs,.css,.html,.json"
          />
          <button 
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            title="Attach files"
          >
            📎
          </button>
          <button 
            className={styles.imageButton}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
                fileInputRef.current.click();
                fileInputRef.current.accept = "image/*,.txt,.md,.js,.jsx,.ts,.tsx,.py,.rs,.css,.html,.json";
              }
            }}
            title="Upload image"
          >
            🖼️
          </button>
          <button 
            className={styles.codeButton}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = ".js,.jsx,.ts,.tsx,.py,.rs,.css,.html,.json,.txt,.md";
                fileInputRef.current.click();
                fileInputRef.current.accept = "image/*,.txt,.md,.js,.jsx,.ts,.tsx,.py,.rs,.css,.html,.json";
              }
            }}
            title="Upload code file"
          >
            💻
          </button>
          {onOpenFolder && (
            <button 
              className={styles.codeButton}
              onClick={onOpenFolder}
              title="Open folder"
            >
              📁
            </button>
          )}
        </div>
        
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Chat với LLM Agent..."
            className={styles.messageInput}
            rows={1}
            style={{ 
              minHeight: '48px',
              resize: 'none',
              overflow: 'hidden'
            }}
          />
          <button 
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && attachments.length === 0)}
          >
            🚀
          </button>
        </div>
      </div>

      <AgentSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        currentSettings={agentSettings}
      />
    </div>
  );
};

export default AgentChat; 