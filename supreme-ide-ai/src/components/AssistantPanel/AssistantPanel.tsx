import React, { useState } from 'react';
import styles from './AssistantPanel.module.css';
import AgentChat from './AgentChat';
import AIFileAgent from './AIFileAgent';

interface AssistantPanelProps {
  workspacePath?: string;
  onFileSelect?: (path: string, line?: number, column?: number) => void;
  onOpenFolder?: () => void;
  onFileChanged?: (filePath: string) => void;
  onWorkspaceChanged?: () => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ 
  workspacePath, 
  onFileSelect,
  onOpenFolder,
  onFileChanged,
  onWorkspaceChanged
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'fileAgent'>('chat');

  return (
    <div className={styles.assistantPanel}>
      <div className={styles.header}>
        <h3>🤖 AI Assistant</h3>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'fileAgent' ? styles.active : ''}`}
            onClick={() => setActiveTab('fileAgent')}
          >
            🗂️ File Agent
          </button>
        </div>
        <div className={styles.status}>
          <span className={styles.statusIndicator}></span>
          <span>Ready</span>
        </div>
      </div>
      
      <div className={styles.content}>
        {activeTab === 'chat' ? (
          <AgentChat 
            workspacePath={workspacePath}
            onFileSelect={onFileSelect}
            onOpenFolder={onOpenFolder}
          />
        ) : (
          <AIFileAgent
            workspacePath={workspacePath || ''}
            onFileChanged={onFileChanged}
            onWorkspaceChanged={onWorkspaceChanged}
          />
        )}
      </div>
    </div>
  );
};

export default AssistantPanel;