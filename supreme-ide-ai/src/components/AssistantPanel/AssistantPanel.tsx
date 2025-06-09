import React from 'react';
import styles from './AssistantPanel.module.css';
import AgentChat from './AgentChat';

interface AssistantPanelProps {
  workspacePath?: string;
  onFileSelect?: (path: string, line?: number, column?: number) => void;
  onOpenFolder?: () => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ 
  workspacePath, 
  onFileSelect,
  onOpenFolder
}) => {
  return (
    <div className={styles.assistantPanel}>
      <div className={styles.header}>
        <h3>🤖 AI Assistant</h3>
        <div className={styles.status}>
          <span className={styles.statusIndicator}></span>
          <span>Ready</span>
        </div>
      </div>
      
      <AgentChat 
        workspacePath={workspacePath}
        onFileSelect={onFileSelect}
        onOpenFolder={onOpenFolder}
      />
    </div>
  );
};

export default AssistantPanel;